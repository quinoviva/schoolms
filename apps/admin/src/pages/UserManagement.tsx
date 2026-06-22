import { useEffect, useRef, useState } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { db, auth, functions, type AppUser, type Role } from '@pbclc/shared'
import { Search, Plus, AlertTriangle, Pencil, Upload, Users, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { createAuditLog } from '../utils/auditLog'

const ROLE_STYLES: Record<string, string> = {
  Student: 'bg-blue-50 text-blue-700',
  Teacher: 'bg-emerald-50 text-emerald-700',
  Admin: 'bg-[#8b6914]/10 text-[#8b6914]',
}

export default function UserManagement() {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'student' as Role, section: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; section: string; role: Role } | null>(null)
  const [editForm, setEditForm] = useState({ name: '', section: '', role: 'student' as Role })
  const [editSaving, setEditSaving] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null])
  const [totalEstimate, setTotalEstimate] = useState(0)

  const [importing, setImporting] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [bulkResults, setBulkResults] = useState<{ line: number; id: string; name: string; success: boolean; error?: string }[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadPage(pageNum: number) {
    setLoading(true)
    const cursor = pageCursors[pageNum - 1] || null
    let q = query(collection(db, 'users'), orderBy('name'), limit(PAGE_SIZE))
    if (cursor) q = query(collection(db, 'users'), orderBy('name'), startAfter(cursor), limit(PAGE_SIZE))
    const snap = await getDocs(q)
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser & { id: string }))
    setUsers(results)
    const lastDoc = snap.docs[snap.docs.length - 1]
    const newCursors = [...pageCursors]
    newCursors[pageNum] = lastDoc ? lastDoc.data().name : null
    setPageCursors(newCursors)
    setLoading(false)
  }

  useEffect(() => { loadPage(1) }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        email: form.email,
        name: form.name,
        role: form.role,
        section: form.role === 'student' ? form.section : '',
        createdAt: Date.now(),
      } satisfies AppUser)
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'create', 'users', cred.user.uid, 'Created user: ' + form.name)
      setForm({ email: '', password: '', name: '', role: 'student', section: '' })
      setShowForm(false)
      showToast('User created successfully', 'success')
    } catch (err: any) {
      setError(err.message || 'Failed to create user.')
      showToast(err.message || 'Failed to create user.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { id } = deleteTarget
    try {
      await deleteDoc(doc(db, 'users', id))
      try {
        const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser')
        await deleteAuthUser({ uid: id })
      } catch {
        // Cloud Function not deployed — Auth account remains
      }
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'delete', 'users', id, 'Deleted user: ' + deleteTarget.name)
      showToast('User deleted successfully', 'success')
    } catch {
      showToast('Failed to delete user', 'error')
    }
    setDeleteTarget(null)
  }

  function openEdit(user: AppUser & { id: string }) {
    setEditTarget({ id: user.id, name: user.name, section: user.section || '', role: user.role })
    setEditForm({ name: user.name, section: user.section || '', role: user.role })
  }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await updateDoc(doc(db, 'users', editTarget.id), {
        name: editForm.name,
        section: editForm.role === 'student' ? editForm.section : '',
        role: editForm.role,
      })
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'update', 'users', editTarget.id, 'Updated user: ' + editForm.name)
      showToast('User updated successfully', 'success')
      setEditTarget(null)
    } catch {
      showToast('Failed to update user', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = pageCursors[page] !== null ? page + 1 : page
  const safePage = Math.min(page, totalPages)

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    loadPage(1)
  }

  function goToPage(p: number) {
    setPage(p)
    loadPage(p)
  }

  function handleExportCSV() {
    const headers = ['Name', 'Email', 'Role', 'Section']
    const rows = users.map(u => [u.name, u.email, u.role, u.section || ''])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users_export.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Users exported to CSV', 'success')
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const nameIdx = header.indexOf('name')
      const emailIdx = header.indexOf('email')
      const passwordIdx = header.indexOf('password')
      const roleIdx = header.indexOf('role')
      const sectionIdx = header.indexOf('section')
      if (nameIdx === -1 || emailIdx === -1 || passwordIdx === -1 || roleIdx === -1) {
        throw new Error('CSV must have Name, Email, Password, and Role columns')
      }
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        const name = cols[nameIdx]
        const email = cols[emailIdx]
        const password = cols[passwordIdx]
        const role = (cols[roleIdx] || 'student').toLowerCase() as Role
        const section = sectionIdx !== -1 ? cols[sectionIdx] || '' : ''
        if (!email || !password) continue
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          await setDoc(doc(db, 'users', cred.user.uid), {
            id: cred.user.uid,
            email,
            name: name || email,
            role,
            section: role === 'student' ? section : '',
            createdAt: Date.now(),
          } satisfies AppUser)
          await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'create', 'users', cred.user.uid, 'Imported user: ' + (name || email))
          showToast(`Imported ${name || email}`, 'success')
        } catch (err: any) {
          showToast(`Failed to import ${email}: ${err.message}`, 'error')
        }
      }
      showToast('CSV import complete', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to import CSV', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleBulkCreate() {
    const lines = bulkData.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) { showToast('Paste student data first.', 'error'); return }
    setBulkRunning(true)
    setBulkResults([])
    const results: typeof bulkResults = []

    async function createOne(parts: string[], lineNum: number) {
      if (parts.length < 4) {
        return { line: lineNum, id: '', name: parts[1] || '', success: false, error: 'Invalid format. Use: ID,Last,First,Section,Birthday' }
      }
      const [idNum, lastName, firstName, section, birthdate] = parts
      const email = `${idNum}@x`
      const password = `${lastName}.${firstName}(${birthdate || ''})`
      const name = `${firstName} ${lastName}`
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await setDoc(doc(db, 'users', cred.user.uid), {
          id: cred.user.uid, email, name, role: 'student', section, createdAt: Date.now(),
        } satisfies AppUser)
        await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'create', 'users', cred.user.uid, 'Bulk created: ' + name)
        return { line: lineNum, id: idNum, name, success: true }
      } catch (err: any) {
        return { line: lineNum, id: idNum, name, success: false, error: err.message }
      }
    }

    const concurrency = 5
    for (let i = 0; i < lines.length; i += concurrency) {
      const batch = lines.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map((line, idx) => createOne(line.split(',').map(p => p.trim()), i + idx + 1))
      )
      results.push(...batchResults)
      setBulkResults([...results])
      if (i + concurrency < lines.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    setBulkRunning(false)
    const ok = results.filter(r => r.success).length
    showToast(`Created ${ok}/${lines.length} students`, ok === lines.length ? 'success' : 'error')
  }

  if (loading) return <Spinner text="Loading users..." />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">All registered accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/5 transition-colors disabled:opacity-50"
          >
            <Upload size={14} /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/5 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowBulkForm(!showBulkForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/5 transition-colors"
          >
            <Users size={14} /> Bulk Create
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors shadow-sm"
          >
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {showBulkForm && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Bulk Create Students</h2>
            <span className="text-xs text-muted-foreground">Format: ID,LastName,FirstName,Section,Birthday(YYYYMMDD)</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Username = ID number &middot; Password = <code>LastName.FirstName(Birthday)</code>
          </p>
          <textarea value={bulkData} onChange={e => setBulkData(e.target.value)}
            placeholder={'2024001,DelaCruz,Juan,G7-A,20100115\n2024002,Santos,Maria,G7-A,20100220'}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 resize-y" />
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => { setShowBulkForm(false); setBulkData(''); setBulkResults([]) }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button onClick={handleBulkCreate} disabled={bulkRunning || !bulkData.trim()}
              className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm">
              {bulkRunning ? 'Creating...' : `Create ${bulkData.trim().split('\n').filter(l => l.trim()).length || 0} Students`}
            </button>
          </div>
          {bulkResults.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-1">
              {bulkResults.map(r => (
                <div key={r.line} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded ${r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {r.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span className="font-semibold">#{r.line}</span>
                  <span>{r.name || r.id}</span>
                  {r.error && <span className="text-red-500 ml-auto">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground">Create New User</h2>
          {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Full Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role, section: e.target.value !== 'student' ? '' : f.section }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'student' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1">Section</label>
                <input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                  placeholder="e.g., 11-A (Grace)"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
              </div>
            )}
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm">
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-secondary/20">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search current page by name, email, or role..." value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground" />
          <button onClick={() => loadPage(safePage)} className="text-xs text-[#1e3a5f] font-semibold hover:underline shrink-0">Refresh</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/10">
              <th className="text-left px-5 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Email</th>
              <th className="px-4 py-3 font-semibold text-center">Role</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.section || 'â€”'}</p>
                </td>
                <td className="px-4 py-3.5 text-muted-foreground text-xs hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${ROLE_STYLES[u.role] ?? ''}`}>
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)}
                      className="text-xs text-[#1e3a5f] hover:text-[#8b6914] font-semibold px-2.5 py-1 rounded hover:bg-[#1e3a5f]/5 transition-colors flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-secondary/30 text-xs text-muted-foreground flex items-center justify-between">
          <span>Showing {filtered.length} of ~{totalEstimate} users</span>
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1}
              className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium">{safePage}</span>
            <button onClick={() => goToPage(safePage + 1)} disabled={filtered.length < PAGE_SIZE}
              className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteTarget?.name || 'this user'}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg">Edit User</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Full Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role, section: e.target.value !== 'student' ? '' : f.section }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editForm.role === 'student' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Section</label>
                  <input value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}
                    placeholder="e.g., 11-A (Grace)"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving || !editForm.name}
                className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
