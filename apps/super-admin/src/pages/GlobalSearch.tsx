import { useEffect, useState } from 'react'
import { listSchools, listUsers, getUser, updateUser, type School, type AppUser } from '@academix/shared'
import { Search, Users, X, Pencil, Save, Mail, Shield, Building2, Layers, Calendar } from 'lucide-react'

interface SearchResult {
  user: AppUser & { id: string }
  school: School
}

export default function GlobalSearch() {
  const [schools, setSchools] = useState<School[]>([])
  const [allUsers, setAllUsers] = useState<SearchResult[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterSchool, setFilterSchool] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', section: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const schoolsData = await listSchools()
    setSchools(schoolsData)
    const results: SearchResult[] = []
    for (const school of schoolsData) {
      const users = await listUsers({ schoolId: school.id }).catch(() => [] as AppUser[])
      results.push(...users.map((u: AppUser & { id: string }) => ({ user: u, school })))
    }
    setAllUsers(results)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = allUsers.filter(r => {
    if (filterSchool && r.school.id !== filterSchool) return false
    if (filterRole && r.user.role !== filterRole) return false
    if (!query) return true
    const q = query.toLowerCase()
    return r.user.name?.toLowerCase().includes(q) ||
      r.user.email?.toLowerCase().includes(q) ||
      r.user.section?.toLowerCase().includes(q) ||
      r.school.name.toLowerCase().includes(q)
  })

  async function selectUser(r: SearchResult) {
    const fresh = await getUser(r.user.id)
    if (fresh) setSelected({ ...r, user: fresh as AppUser & { id: string } })
    else setSelected(r)
    setEditing(false)
  }

  async function handleSaveUser() {
    if (!selected || !editForm.name) return
    setSaving(true)
    await updateUser(selected.user.id, { name: editForm.name, section: editForm.section, role: editForm.role as AppUser['role'] })
    setSaving(false)
    setEditing(false)
    const fresh = await getUser(selected.user.id)
    if (fresh) setSelected({ ...selected, user: fresh as AppUser & { id: string } })
    load()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-2">Global Search</h1>
      <p className="text-xs text-muted-foreground mb-6">Search across all schools, users, and roles</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, section, or school..."
            value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
        </div>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
          <option value="">All Schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">School</th>
                <th className="text-left px-4 py-3 font-semibold">Section</th>
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.user.id}
                    onClick={() => selectUser(r)}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selected?.user.id === r.user.id ? 'bg-[#1e3a5f]/5' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{r.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.user.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                        r.user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        r.user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{r.user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.school.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.user.section || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''} found</p>
        </div>

        {selected && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">User Details</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>

            {!editing ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-lg">
                    {(selected.user.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selected.user.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail size={12} /><span className="text-foreground">{selected.user.email}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Shield size={12} /><span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-semibold ${
                    selected.user.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                    selected.user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    selected.user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{selected.user.role}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Building2 size={12} /><span className="text-foreground">{selected.school.name}</span></div>
                  {selected.user.section && <div className="flex items-center gap-2 text-muted-foreground"><Layers size={12} /><span className="text-foreground">{selected.user.section}</span></div>}
                  <div className="flex items-center gap-2 text-muted-foreground"><Calendar size={12} /><span className="text-foreground">{new Date(selected.user.createdAt).toLocaleDateString()}</span></div>
                </div>

                <button onClick={() => { setEditForm({ name: selected.user.name || '', email: selected.user.email || '', role: selected.user.role || '', section: selected.user.section || '' }); setEditing(true) }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground">
                  <Pencil size={14} /> Edit User
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <input placeholder="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
                <input placeholder="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} disabled
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-muted-foreground" />
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <input placeholder="Section" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveUser} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg">
                    <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
