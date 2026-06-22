import { useEffect, useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, limit, startAfter, where } from 'firebase/firestore'
import { db, auth, sanitizeString, type Subject, type GradingComponent, type AppUser, type AcademicTerm } from '@pbclc/shared'
import { Plus, Pencil, Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { createAuditLog } from '../utils/auditLog'

const PAGE_SIZE = 20

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<(Subject & { id: string })[]>([])
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', title: '', teacherId: '', termId: '', gradeLevel: '' })
  const [components, setComponents] = useState<GradingComponent[]>([{ id: crypto.randomUUID(), name: '', weight: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string } & Subject | null>(null)
  const [editForm, setEditForm] = useState({ code: '', title: '', teacherId: '', termId: '', gradeLevel: '' })
  const [editComponents, setEditComponents] = useState<GradingComponent[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const [page, setPage] = useState(0)
  const [cursors, setCursors] = useState<any[]>([null])
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'terms'), orderBy('label')))
      .then(snap => setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTerm & { id: string }))))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'), orderBy('name'))
    getDocs(q).then(snap => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser & { id: string })))
    })
  }, [])

  useEffect(() => {
    loadPage(0)
  }, [])

  function loadPage(idx: number) {
    setLoading(true)
    const cursor = cursors[idx]
    let q = query(collection(db, 'subjects'), orderBy('code'), limit(PAGE_SIZE))
    if (cursor) q = query(q, startAfter(cursor))
    getDocs(q).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject & { id: string }))
      setSubjects(list)
      setHasMore(snap.docs.length === PAGE_SIZE)
      if (cursors.length <= idx + 1 && snap.docs.length === PAGE_SIZE) {
        setCursors(prev => [...prev, snap.docs[snap.docs.length - 1]])
      }
      setPage(idx)
      setLoading(false)
    })
  }

  function addComponent() {
    setComponents(prev => [...prev, { id: crypto.randomUUID(), name: '', weight: 0 }])
  }

  function updateComponent(id: string, field: 'name' | 'weight', value: string | number) {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function removeComponent(id: string) {
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  function validateComponents(list: GradingComponent[]) {
    if (list.length === 0) return 'At least one grading component is required.'
    if (list.some(c => !c.name.trim())) return 'All components must have a name.'
    if (list.some(c => c.weight <= 0 || c.weight > 100)) return 'Each weight must be between 1 and 100.'
    const total = list.reduce((s, c) => s + Number(c.weight), 0)
    if (Math.abs(total - 100) > 0.01) return `Weights must sum to 100% (currently ${total}%).`
    return ''
  }

  function resetForm() {
    setForm({ code: '', title: '', teacherId: '', termId: '', gradeLevel: '' })
    setComponents([{ id: crypto.randomUUID(), name: '', weight: 0 }])
    setError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const err = validateComponents(components)
    if (err) { setError(err); return }
    setSaving(true); setError('')
    try {
      await addDoc(collection(db, 'subjects'), {
        code: sanitizeString(form.code, 20), title: sanitizeString(form.title, 100), teacherId: form.teacherId, termId: form.termId,
        gradeLevel: sanitizeString(form.gradeLevel, 10),
        gradingComponents: components, createdAt: Date.now(),
      } satisfies Omit<Subject, 'id'>)
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'create', 'subjects', '', 'Created subject: ' + form.code)
      resetForm(); setShowForm(false)
      loadPage(page)
      showToast('Subject created', 'success')
    } catch (err: any) { setError(err.message); showToast(err.message, 'error') }
    finally { setSaving(false) }
  }

  function openEdit(subj: Subject & { id: string }) {
    setEditTarget(subj)
    setEditForm({ code: subj.code, title: subj.title, teacherId: subj.teacherId, termId: subj.termId || '', gradeLevel: subj.gradeLevel || '' })
    setEditComponents(subj.gradingComponents.map(c => ({ ...c })))
  }

  async function handleEditSave() {
    if (!editTarget) return
    const err = validateComponents(editComponents)
    if (err) { showToast(err, 'error'); return }
    setEditSaving(true)
    try {
      await updateDoc(doc(db, 'subjects', editTarget.id), {
        code: sanitizeString(editForm.code, 20), title: sanitizeString(editForm.title, 100), teacherId: editForm.teacherId, termId: editForm.termId,
        gradeLevel: sanitizeString(editForm.gradeLevel, 10),
        gradingComponents: editComponents,
      })
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'update', 'subjects', editTarget.id, 'Updated subject: ' + editForm.code)
      setEditTarget(null)
      loadPage(page)
      showToast('Subject updated', 'success')
    } catch { showToast('Failed to update subject', 'error') }
    finally { setEditSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc(doc(db, 'subjects', deleteTarget.id))
      await createAuditLog(auth.currentUser!.uid, auth.currentUser!.email, 'delete', 'subjects', deleteTarget.id, 'Deleted subject: ' + deleteTarget.title)
      loadPage(page)
      showToast('Subject deleted', 'success')
    } catch { showToast('Failed to delete subject', 'error') }
    setDeleteTarget(null)
  }

  function getTeacherName(id: string) {
    return teachers.find(t => t.id === id)?.name || 'Unassigned'
  }

  function getTermLabel(id: string) {
    return terms.find(t => t.id === id)?.label || '—'
  }

  const filtered = subjects.filter(s =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.gradeLevel || '').toLowerCase().includes(search.toLowerCase()) ||
    getTeacherName(s.teacherId).toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Spinner text="Loading subjects..." />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">Subject Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and assign subjects to teachers</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors shadow-sm">
          <Plus size={14} /> {showForm ? 'Cancel' : 'New Subject'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground">Create New Subject</h2>
          {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Subject Code</label>
              <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g., MATH-101"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Algebra I"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Grade Level</label>
              <select required value={form.gradeLevel} onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="">-- Select grade level --</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={`G${g}`}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Teacher</label>
              <select required value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="">-- Select teacher --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Term</label>
              <select required value={form.termId} onChange={e => setForm(f => ({ ...f, termId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="">-- Select term --</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-foreground">Grading Components</label>
              <button type="button" onClick={addComponent}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold hover:bg-[#1e3a5f]/20 transition-colors">
                + Add Component
              </button>
            </div>
            <p className="text-[0.6rem] text-muted-foreground mb-3">Weights must sum to 100%.</p>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <input value={c.name} onChange={e => updateComponent(c.id, 'name', e.target.value)}
                    placeholder="Component name"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={c.weight || ''} onChange={e => updateComponent(c.id, 'weight', Math.min(100, Math.max(0, Number(e.target.value))))}
                      placeholder="%"
                      className="w-20 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-center" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  {components.length > 1 && (
                    <button type="button" onClick={() => removeComponent(c.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-bold px-1">×</button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {components.reduce((s, c) => s + Number(c.weight), 0)}%
            </p>
          </div>

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm">
            {saving ? 'Creating...' : 'Create Subject'}
          </button>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-secondary/20">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search by code, title, or teacher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{filtered.length} subjects</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/10">
              <th className="text-left px-5 py-3 font-semibold">Code</th>
              <th className="text-left px-4 py-3 font-semibold">Title</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Grade</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Teacher</th>
              <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Term</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">{s.code}</td>
                <td className="px-4 py-3.5 font-semibold text-foreground">{s.title}</td>
                <td className="px-4 py-3.5 text-xs hidden sm:table-cell"><span className="px-2 py-0.5 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold">{s.gradeLevel || '—'}</span></td>
                <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell">{getTeacherName(s.teacherId)}</td>
                <td className="px-4 py-3.5 text-muted-foreground text-xs hidden lg:table-cell">{getTermLabel(s.termId)}</td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)}
                      className="text-xs text-[#1e3a5f] hover:text-[#8b6914] font-semibold px-2.5 py-1 rounded hover:bg-[#1e3a5f]/5 transition-colors flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget({ id: s.id, title: s.title })}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">No subjects found.</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mt-4">
        <button onClick={() => loadPage(page - 1)} disabled={page === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <button onClick={() => loadPage(page + 1)} disabled={!hasMore}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
          Next <ChevronRight size={14} />
        </button>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Subject"
        message={`Delete "${deleteTarget?.title}"? Classes and grades linked to this subject will remain.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg mb-4">Edit Subject</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Code</label>
                  <input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Grade Level</label>
                  <select value={editForm.gradeLevel} onChange={e => setEditForm(f => ({ ...f, gradeLevel: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                    <option value="">-- Select --</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={`G${g}`}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Teacher</label>
                  <select value={editForm.teacherId} onChange={e => setEditForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                    <option value="">-- Select --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Term</label>
                  <select value={editForm.termId} onChange={e => setEditForm(f => ({ ...f, termId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                    <option value="">-- Select --</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">Grading Components</label>
                  <button type="button" onClick={() => setEditComponents(prev => [...prev, { id: crypto.randomUUID(), name: '', weight: 0 }])}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold hover:bg-[#1e3a5f]/20 transition-colors">
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {editComponents.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <input value={c.name} onChange={e => setEditComponents(prev => prev.map(p => p.id === c.id ? { ...p, name: e.target.value } : p))}
                        placeholder="Component name"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
                      <input type="number" value={c.weight || ''} onChange={e => setEditComponents(prev => prev.map(p => p.id === c.id ? { ...p, weight: Math.min(100, Math.max(0, Number(e.target.value))) } : p))}
                        className="w-20 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-center" />
                      <span className="text-xs text-muted-foreground">%</span>
                      {editComponents.length > 1 && (
                        <button onClick={() => setEditComponents(prev => prev.filter(p => p.id !== c.id))}
                          className="text-red-400 hover:text-red-600 text-xs font-bold px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={editSaving}
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
