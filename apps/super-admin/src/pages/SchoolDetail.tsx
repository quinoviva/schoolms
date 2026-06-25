import { useEffect, useRef, useState } from 'react'
import {
  listSchools, listUsers, listSubjects, listClasses, listTerms, listSections, listEnrollments,
  listAuditLogs, updateSchool,
  createUser, updateUser, deleteUser,
  createSubject, updateSubject, deleteSubject,
  createTerm, updateTerm,
  createSection, updateSection, deleteSection,
  createClass, updateClass, deleteClass,
  deleteEnrollment, batchCreateEnrollments,
  type School, type AppUser, type Subject, type AcademicTerm, type Section, type Class,
  type Enrollment, type AuditLog, type SchoolLevel, type GradingComponent, type MatatagSubjectPreset,
  SCHOOL_LEVELS, getGradesForLevels, DEPED_COMPONENT_WEIGHTS, MATATAG_SUBJECTS, getMatatagPresets, generateSubjectCode,
} from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { ArrowLeft, Users, BookOpen, CalendarDays, Layers, GraduationCap, Building2, Plus, Pencil, Trash2, Save, X, RefreshCw, Link2, Unlink, FileDown, Upload, History } from 'lucide-react'

type Tab = 'overview' | 'users' | 'subjects' | 'terms' | 'sections' | 'classes' | 'enrollments' | 'audit'

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'terms', label: 'Terms', icon: CalendarDays },
  { key: 'sections', label: 'Sections', icon: Layers },
  { key: 'classes', label: 'Classes', icon: GraduationCap },
  { key: 'enrollments', label: 'Enrollments', icon: Link2 },
  { key: 'audit', label: 'Audit Logs', icon: History },
]

export default function SchoolDetail({ schoolId, onBack }: { schoolId: string; onBack: () => void }) {
  const [school, setSchool] = useState<School | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [editSchool, setEditSchool] = useState(false)
  const [schoolForm, setSchoolForm] = useState({ name: '', slug: '', ownerName: '', ownerEmail: '', isActive: true, levels: [] as SchoolLevel[] })
  const [savingSchool, setSavingSchool] = useState(false)

  async function refreshSchool() {
    const schools = await listSchools()
    setSchool(schools.find(s => s.id === schoolId) || null)
  }

  useEffect(() => {
    async function load() {
      const schools = await listSchools()
      setSchool(schools.find(s => s.id === schoolId) || null)
      setLoading(false)
    }
    load()
  }, [schoolId])

  async function handleEditSchool() {
    if (!school) return
    setSchoolForm({ name: school.name, slug: school.slug, ownerName: school.ownerName || '', ownerEmail: school.ownerEmail || '', isActive: school.isActive, levels: school.levels || [] })
    setEditSchool(true)
  }

  async function handleSaveSchool() {
    if (!school || !schoolForm.name) return
    setSavingSchool(true)
    await updateSchool(school.id, {
      name: schoolForm.name,
      slug: schoolForm.slug,
      ownerName: schoolForm.ownerName,
      ownerEmail: schoolForm.ownerEmail,
      isActive: schoolForm.isActive,
      levels: schoolForm.levels,
    })
    setSavingSchool(false)
    setEditSchool(false)
    await refreshSchool()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>
  if (!school) return <div className="flex items-center justify-center py-20 text-muted-foreground">School not found.</div>

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Schools
      </button>
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] flex items-center justify-center shrink-0">
            <Building2 size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{school.name}</h1>
            <p className="text-sm text-muted-foreground">{school.slug} · {school.isActive ? 'Active' : 'Inactive'}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(school.levels || []).map(level => (
                <span key={level} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold uppercase tracking-wider">
                  {SCHOOL_LEVELS[level as SchoolLevel]?.label || level}
                </span>
              ))}
            </div>
          </div>
          <button onClick={handleEditSchool} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={14} /> Edit
          </button>
        </div>
        {editSchool && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input placeholder="School Name" value={schoolForm.name} onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
              <input placeholder="Slug" value={schoolForm.slug} onChange={e => setSchoolForm({ ...schoolForm, slug: e.target.value })}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
              <input placeholder="Owner Name" value={schoolForm.ownerName} onChange={e => setSchoolForm({ ...schoolForm, ownerName: e.target.value })}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
              <input placeholder="Owner Email" value={schoolForm.ownerEmail} onChange={e => setSchoolForm({ ...schoolForm, ownerEmail: e.target.value })}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={schoolForm.isActive} onChange={e => setSchoolForm({ ...schoolForm, isActive: e.target.checked })}
                  className="rounded border-border" />
                Active
              </label>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">School Levels</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SCHOOL_LEVELS) as SchoolLevel[]).map(level => (
                    <button key={level} type="button" onClick={() => setSchoolForm(f => ({
                      ...f, levels: f.levels.includes(level) ? f.levels.filter(l => l !== level) : [...f.levels, level]
                    }))}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold border transition-colors ${schoolForm.levels.includes(level) ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-transparent text-muted-foreground border-border hover:text-foreground'}`}>
                      {SCHOOL_LEVELS[level].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveSchool} disabled={savingSchool}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2a4a75]">
                <Save size={14} /> {savingSchool ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditSchool(false)}
                className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 flex-wrap border-b border-border pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors ${tab === t.key ? 'bg-card border border-border border-b-white font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview school={school} schoolId={schoolId} />}
      {tab === 'users' && <UsersView schoolId={schoolId} />}
      {tab === 'subjects' && <SubjectsView schoolId={schoolId} levels={school.levels || []} />}
      {tab === 'terms' && <TermsView schoolId={schoolId} />}
      {tab === 'sections' && <SectionsView schoolId={schoolId} levels={school.levels || []} />}
      {tab === 'classes' && <ClassesView schoolId={schoolId} />}
      {tab === 'enrollments' && <EnrollmentsView schoolId={schoolId} />}
      {tab === 'audit' && <AuditLogsView schoolId={schoolId} />}
    </div>
  )
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  URL.revokeObjectURL(a.href)
}

function Overview({ schoolId }: { school: School; schoolId: string }) {
  const [counts, setCounts] = useState({ users: 0, teachers: 0, students: 0, subjects: 0, classes: 0, terms: 0, sections: 0, enrollments: 0 })
  useEffect(() => {
    async function load() {
      const [users, subjects, classes, terms, sections, enrollments] = await Promise.all([
        listUsers({ schoolId }).catch(() => []),
        listSubjects({ schoolId }).catch(() => []),
        listClasses({ schoolId }).catch(() => []),
        listTerms(schoolId).catch(() => []),
        listSections({ schoolId }).catch(() => []),
        listEnrollments().catch(() => []),
      ])
      setCounts({
        users: users.length, teachers: users.filter((u: AppUser) => u.role === 'teacher').length,
        students: users.filter((u: AppUser) => u.role === 'student').length,
        subjects: subjects.length, classes: classes.length, terms: terms.length,
        sections: sections.length, enrollments: enrollments.length,
      })
    }
    load()
  }, [schoolId])

  const cards = [
    { label: 'Teachers', value: counts.teachers, color: 'bg-blue-600' },
    { label: 'Students', value: counts.students, color: 'bg-emerald-600' },
    { label: 'Subjects', value: counts.subjects, color: 'bg-[#8b6914]' },
    { label: 'Classes', value: counts.classes, color: 'bg-purple-600' },
    { label: 'Terms', value: counts.terms, color: 'bg-cyan-600' },
    { label: 'Sections', value: counts.sections, color: 'bg-rose-600' },
    { label: 'Enrollments', value: counts.enrollments, color: 'bg-orange-600' },
    { label: 'Total Users', value: counts.users, color: 'bg-[#1e3a5f]' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
            <Users size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-foreground">{c.value}</p>
          <p className="text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Users ── */
function UsersView({ schoolId }: { schoolId: string }) {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'student' as string, section: '' })
  const [edit, setEdit] = useState<{ id: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [roleTab, setRoleTab] = useState<'all' | 'admin' | 'teacher' | 'student'>('all')
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'role'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function load() {
    setLoading(true)
    listUsers({ schoolId }).then(d => { setUsers(d as (AppUser & { id: string })[]); setLoading(false) })
  }
  useEffect(load, [schoolId])

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const roleFiltered = roleTab === 'all' ? users : users.filter(u => u.role === roleTab)
  const searched = roleFiltered.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...searched].sort((a, b) => {
    const av = (a[sortKey] || '').toLowerCase()
    const bv = (b[sortKey] || '').toLowerCase()
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  async function handleSave() {
    if (!form.name || !form.email) return
    setSaving(true)
    const data = { ...form, schoolId, id: crypto.randomUUID(), nfcUid: null, createdAt: Date.now() }
    if (edit) {
      await updateUser(edit.id, { name: form.name, section: form.section, role: form.role as AppUser['role'] })
    } else {
      await createUser(data as any)
    }
    setSaving(false); setShowForm(false); setEdit(null); setForm({ email: '', name: '', role: 'student', section: '' }); load()
  }

  async function handleDelete(id: string) { if (!confirm('Delete this user?')) return; await deleteUser(id); load() }

  function startEdit(u: AppUser & { id: string }) {
    setEdit({ id: u.id }); setForm({ email: u.email || '', name: u.name || '', role: u.role || 'student', section: u.section || '' }); setShowForm(true)
  }

  async function handleBulkImport() {
    const lines = bulkText.trim().split('\n').filter(Boolean)
    let created = 0
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 3) continue
      const [lrn, lastName, firstName, section] = parts
      const email = `${lrn}@schoolms.edu`
      const name = `${firstName} ${lastName}`
      await createUser({ id: crypto.randomUUID(), email, name, role: 'student', schoolId, section: section || '', lrn, nfcUid: null, createdAt: Date.now() } as any)
      created++
    }
    setBulkText(''); setShowBulk(false); load()
    alert(`Created ${created} student(s)`)
  }

  function exportCsv() {
    downloadCsv(`users-${schoolId.slice(0, 8)}.csv`,
      ['Name', 'Email', 'Role', 'LRN', 'Section'],
      sorted.map(u => [u.name || '', u.email, u.role, u.lrn || '', u.section || ''])
    )
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  const roleTabs = [
    { key: 'all' as const, label: 'All', count: users.length },
    { key: 'admin' as const, label: 'Admins', count: users.filter(u => u.role === 'admin').length },
    { key: 'teacher' as const, label: 'Teachers', count: users.filter(u => u.role === 'teacher').length },
    { key: 'student' as const, label: 'Students', count: users.filter(u => u.role === 'student').length },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 border border-border">
          {roleTabs.map(t => (
            <button key={t.key} onClick={() => setRoleTab(t.key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${roleTab === t.key ? 'bg-[#1e3a5f] text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
        <button onClick={() => { setEdit(null); setForm({ email: '', name: '', role: 'student', section: '' }); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2a4a75]">
          <Plus size={14} /> Add {roleTab === 'all' ? 'User' : roleTab === 'admin' ? 'Admin' : roleTab === 'teacher' ? 'Teacher' : 'Student'}
        </button>
        <button onClick={() => setShowBulk(!showBulk)}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground">
          <Upload size={14} /> Bulk
        </button>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground">
          <FileDown size={14} /> Export
        </button>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>

      {showBulk && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Bulk Import Students</p>
          <p className="text-[0.6rem] text-muted-foreground mb-2">Format per line: <code className="text-blue-600">LRN,LastName,FirstName,Section</code></p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
            placeholder={`123456789012,Smith,John,G7-A\n123456789013,Doe,Jane,G7-B`}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground mb-3 font-mono" />
          <div className="flex gap-2">
            <button onClick={handleBulkImport} disabled={!bulkText.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Upload size={14} /> Import</button>
            <button onClick={() => { setShowBulk(false); setBulkText('') }}
              className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" disabled={!!edit} />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <input placeholder="Section" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg">
              <Save size={14} /> {saving ? 'Saving...' : (edit ? 'Update' : 'Create')}
            </button>
            <button onClick={() => { setShowForm(false); setEdit(null) }}
              className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            {(['name', 'email', 'role'] as const).map(k => (
              <th key={k} onClick={() => handleSort(k)} className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground">
                {k === 'name' ? 'Name' : k === 'email' ? 'Email' : 'Role'}
                {sortKey === k && <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
              </th>
            ))}
            <th className="text-left px-4 py-3 font-semibold">LRN</th>
            <th className="text-left px-4 py-3 font-semibold">Section</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'teacher' ? 'bg-blue-100 text-blue-700' : u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.lrn || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.section || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(u)} className="p-1 text-muted-foreground hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1 text-muted-foreground hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Subjects ── */
function SubjectsView({ schoolId, levels }: { schoolId: string; levels: SchoolLevel[] }) {
  const [subjects, setSubjects] = useState<(Subject & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', title: '', gradeLevel: '', subjectGroup: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    listSubjects({ schoolId }).then(d => { setSubjects(d as (Subject & { id: string })[]); setLoading(false) })
  }
  useEffect(load, [schoolId])

  async function handleSave() {
    if (!form.code || !form.title) return
    setSaving(true)
    const preset = form.subjectGroup ? DEPED_COMPONENT_WEIGHTS[form.subjectGroup] : null
    const gradingComponents = preset
      ? preset.map(c => ({ id: crypto.randomUUID(), name: c.label, weight: c.weight }))
      : []
    if (edit) {
      await updateSubject(edit, { code: form.code, title: form.title, gradeLevel: form.gradeLevel, gradingComponents })
    } else {
      await createSubject({ id: crypto.randomUUID(), code: form.code, title: form.title, gradeLevel: form.gradeLevel, gradingComponents, schoolId, teacherId: '', termId: '', createdAt: Date.now() } as any)
    }
    setSaving(false); setShowForm(false); setEdit(null); setForm({ code: '', title: '', gradeLevel: '', subjectGroup: '' }); load()
  }

  async function handleDelete(id: string) { if (confirm('Delete this subject?')) { await deleteSubject(id); load() } }

  function startEdit(s: Subject & { id: string }) {
    setEdit(s.id); setForm({ code: s.code, title: s.title, gradeLevel: s.gradeLevel || '', subjectGroup: '' }); setShowForm(true)
  }

  function exportCsv() {
    downloadCsv(`subjects-${schoolId.slice(0, 8)}.csv`,
      ['Code', 'Title', 'Grade Level'],
      subjects.map(s => [s.code, s.title, s.gradeLevel])
    )
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setEdit(null); setForm({ code: '', title: '', gradeLevel: '', subjectGroup: '' }); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2a4a75]"><Plus size={14} /> Add Subject</button>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground"><FileDown size={14} /> Export</button>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>

          {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input placeholder="Code (e.g. MATH7)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
              <option value="">Select grade level</option>
              {getGradesForLevels(levels).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {form.gradeLevel && getMatatagPresets(form.gradeLevel).length > 0 && (
              <div className="flex gap-2">
                <select onChange={e => {
                  const preset = getMatatagPresets(form.gradeLevel).find(p => p.shortCode === e.target.value)
                  if (preset) setForm(f => ({
                    ...f,
                    title: preset.title,
                    code: generateSubjectCode(preset.shortCode, form.gradeLevel),
                    subjectGroup: preset.subjectGroup,
                  }))
                }} value="" className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
                  <option value="">MATATAG Preset</option>
                  {getMatatagPresets(form.gradeLevel).map(p => (
                    <option key={p.shortCode} value={p.shortCode}>{p.title} ({generateSubjectCode(p.shortCode, form.gradeLevel)})</option>
                  ))}
                </select>
                <button type="button" onClick={async () => {
                  const presets = getMatatagPresets(form.gradeLevel)
                  for (const p of presets) {
                    const id = crypto.randomUUID()
                    const comps = (DEPED_COMPONENT_WEIGHTS[p.subjectGroup] || []).map(c => ({
                      id: crypto.randomUUID(), name: c.label, weight: c.weight,
                    }))
                    await createSubject({
                      id, code: generateSubjectCode(p.shortCode, form.gradeLevel),
                      title: p.title, teacherId: '', termId: '',
                      gradeLevel: form.gradeLevel, gradingComponents: comps, schoolId,
                      createdAt: Date.now(),
                    } as any)
                  }
                  showToast(`${presets.length} MATATAG subjects created!`, 'success')
                  load()
                }} className="shrink-0 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors">
                  Create All
                </button>
              </div>
            )}
          </div>
          {!edit && (
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 mb-3">
              <select value={form.subjectGroup} onChange={e => setForm({ ...form, subjectGroup: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
                <option value="">DepEd Subject Group (sets grading weights)</option>
                {Object.entries(DEPED_COMPONENT_WEIGHTS).map(([group, comps]) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          )}
          {form.subjectGroup && (
            <div className="flex flex-wrap gap-1 mb-3">
              {DEPED_COMPONENT_WEIGHTS[form.subjectGroup]?.map(c => (
                <span key={c.label} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-[#1e3a5f]/8 text-[#1e3a5f]">{c.label} {c.weight}%</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Save size={14} /> {saving ? 'Saving...' : (edit ? 'Update' : 'Create')}</button>
            <button onClick={() => { setShowForm(false); setEdit(null) }} className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Code</th><th className="text-left px-4 py-3 font-semibold">Title</th>
            <th className="text-left px-4 py-3 font-semibold">Grade Level</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {subjects.map(s => {
              return <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{s.code}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(s)} className="p-1 text-muted-foreground hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-muted-foreground hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            })}
            {subjects.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No subjects</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Terms ── */
function TermsView({ schoolId }: { schoolId: string }) {
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', semester: '' })
  const [saving, setSaving] = useState(false)

  function load() { setLoading(true); listTerms(schoolId).then(d => { setTerms(d); setLoading(false) }) }
  useEffect(load, [schoolId])

  async function handleSave() {
    if (!form.label) return; setSaving(true)
    if (edit) { await updateTerm(edit, form) } else { await createTerm({ id: crypto.randomUUID(), schoolId, ...form, isActive: terms.length === 0, isArchived: false, createdAt: Date.now() } as any) }
    setSaving(false); setShowForm(false); setEdit(null); setForm({ label: '', semester: '' }); load()
  }

  async function toggleActive(term: AcademicTerm) {
    await updateTerm(term.id, { isActive: !term.isActive })
    load()
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setEdit(null); setForm({ label: '', semester: '' }); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Plus size={14} /> Add Term</button>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input placeholder="Label (e.g. SY 2025-2026)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <input placeholder="Semester (e.g. 1st)" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Save size={14} /> {saving ? 'Saving...' : (edit ? 'Update' : 'Create')}</button>
            <button onClick={() => { setShowForm(false); setEdit(null) }} className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Label</th><th className="text-left px-4 py-3 font-semibold">Semester</th>
            <th className="text-left px-4 py-3 font-semibold">Active</th><th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {terms.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{t.label}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.semester || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(t)} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{t.isActive ? 'Active' : 'Inactive'}</button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEdit(t.id); setForm({ label: t.label, semester: t.semester || '' }); setShowForm(true) }} className="p-1 text-muted-foreground hover:text-blue-600"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
            {terms.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No terms</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Sections ── */
function SectionsView({ schoolId, levels }: { schoolId: string; levels: SchoolLevel[] }) {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', gradeLevel: '' })
  const [saving, setSaving] = useState(false)

  function load() { setLoading(true); listSections({ schoolId }).then(d => { setSections(d); setLoading(false) }) }
  useEffect(load, [schoolId])

  async function handleSave() {
    if (!form.name || !form.gradeLevel) return; setSaving(true)
    if (edit) { await updateSection(edit, form) } else { await createSection({ id: crypto.randomUUID(), schoolId, ...form } as any) }
    setSaving(false); setShowForm(false); setEdit(null); setForm({ name: '', gradeLevel: '' }); load()
  }

  async function handleDelete(id: string) { if (confirm('Delete this section?')) { await deleteSection(id); load() } }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setEdit(null); setForm({ name: '', gradeLevel: '' }); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Plus size={14} /> Add Section</button>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input placeholder="Name (e.g. G7-A)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
              <option value="">Select grade level</option>
              {getGradesForLevels(levels).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Save size={14} /> {saving ? 'Saving...' : (edit ? 'Update' : 'Create')}</button>
            <button onClick={() => { setShowForm(false); setEdit(null) }} className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold">Grade Level</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {sections.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEdit(s.id); setForm({ name: s.name, gradeLevel: s.gradeLevel }); setShowForm(true) }} className="p-1 text-muted-foreground hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-muted-foreground hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {sections.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No sections</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Classes ── */
function ClassesView({ schoolId }: { schoolId: string }) {
  const [classes, setClasses] = useState<(Class & { id: string })[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [form, setForm] = useState({ subjectId: '', teacherId: '', section: '', schedule: '', room: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      listClasses({ schoolId }).then(d => setClasses(d as (Class & { id: string })[])),
      listSubjects({ schoolId }).then(setSubjects),
      listUsers({ schoolId, role: 'teacher' }).then(setTeachers),
    ]).then(() => setLoading(false))
  }
  useEffect(load, [schoolId])

  async function handleSave() {
    if (!form.subjectId || !form.teacherId || !form.section) return; setSaving(true)
    const activeTerms = (await listTerms(schoolId)).filter(t => t.isActive)
    const termId = activeTerms[0]?.id || ''
    if (edit) { await updateClass(edit, { ...form, termId }) } else { await createClass({ id: crypto.randomUUID(), schoolId, ...form, termId, createdAt: Date.now() } as any) }
    setSaving(false); setShowForm(false); setEdit(null); setForm({ subjectId: '', teacherId: '', section: '', schedule: '', room: '' }); load()
  }

  async function handleDelete(id: string) { if (confirm('Delete this class?')) { await deleteClass(id); load() } }

  function startEdit(c: Class & { id: string }) {
    setEdit(c.id); setForm({ subjectId: c.subjectId, teacherId: c.teacherId, section: c.section, schedule: c.schedule || '', room: c.room || '' }); setShowForm(true)
  }

  function exportCsv() {
    downloadCsv(`classes-${schoolId.slice(0, 8)}.csv`,
      ['Subject', 'Teacher', 'Section', 'Schedule', 'Room'],
      classes.map(c => {
        const s = subjects.find(sj => sj.id === c.subjectId)
        const t = teachers.find(tc => tc.id === c.teacherId)
        return [s?.code || '', t?.name || '', c.section, c.schedule || '', c.room || '']
      })
    )
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setEdit(null); setForm({ subjectId: '', teacherId: '', section: '', schedule: '', room: '' }); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Plus size={14} /> Add Class</button>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground"><FileDown size={14} /> Export</button>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.title}</option>)}
            </select>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input placeholder="Section (e.g. G7-A)" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <input placeholder="Schedule (e.g. MWF 8:00-9:00)" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
            <input placeholder="Room" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg"><Save size={14} /> {saving ? 'Saving...' : (edit ? 'Update' : 'Create')}</button>
            <button onClick={() => { setShowForm(false); setEdit(null) }} className="px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Subject</th><th className="text-left px-4 py-3 font-semibold">Teacher</th>
            <th className="text-left px-4 py-3 font-semibold">Section</th><th className="text-left px-4 py-3 font-semibold">Schedule</th>
            <th className="text-left px-4 py-3 font-semibold">Room</th><th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {classes.map(c => {
              const subject = subjects.find(s => s.id === c.subjectId)
              const teacher = teachers.find(t => t.id === c.teacherId)
              return <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{subject?.code || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{teacher?.name || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.section}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.schedule || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.room || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(c)} className="p-1 text-muted-foreground hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-muted-foreground hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            })}
            {classes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No classes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Enrollments ── */
function EnrollmentsView({ schoolId }: { schoolId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<{ id: string; name: string; section: string }[]>([])
  const [classes, setClasses] = useState<(Class & { id: string })[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      listEnrollments().then(d => setEnrollments(d)),
      listUsers({ schoolId }).then(d => setStudents(d.filter((u: AppUser) => u.role === 'student').map((u: AppUser & { id: string }) => ({ id: u.id, name: u.name || '', section: u.section || '' })))),
      listClasses({ schoolId }).then(d => setClasses(d as (Class & { id: string })[])),
      listSubjects({ schoolId }).then(setSubjects),
    ]).then(() => setLoading(false))
  }
  useEffect(load, [schoolId])

  async function handleEnroll() {
    if (!selectedStudent || !selectedClass) return
    const c = classes.find(cl => cl.id === selectedClass)
    await batchCreateEnrollments([{
      id: crypto.randomUUID(), studentId: selectedStudent, classId: selectedClass, termId: c?.termId || '',
      schoolId,
    } as any])
    setSelectedStudent(''); setSelectedClass(''); load()
  }

  async function handleUnenroll(id: string) { if (confirm('Remove this enrollment?')) { await deleteEnrollment(id); load() } }

  function exportCsv() {
    downloadCsv(`enrollments-${schoolId.slice(0, 8)}.csv`,
      ['Student', 'Class', 'Subject'],
      enrollments.map(e => {
        const student = students.find(s => s.id === e.studentId)
        const cls = classes.find(c => c.id === e.classId)
        const subj = cls ? subjects.find(s => s.id === cls.subjectId) : null
        return [student?.name || '', cls?.section || '', subj?.code || '']
      })
    )
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  const enrolledClassIds = enrollments.map(e => e.classId)
  const enrolledStudentIds = enrollments.map(e => e.studentId)
  const availableStudents = students.filter(s => !enrolledStudentIds.includes(s.id) || search === '')

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground"><FileDown size={14} /> Export</button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Enroll Student in Class</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.section})</option>)}
          </select>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground">
            <option value="">Select class</option>
            {classes.map(c => {
              const subj = subjects.find(s => s.id === c.subjectId)
              return <option key={c.id} value={c.id}>{subj?.code || '-'} - {c.section} ({c.schedule || ''})</option>
            })}
          </select>
          <button onClick={handleEnroll} disabled={!selectedStudent || !selectedClass}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2a4a75] disabled:opacity-50">
            <Link2 size={14} /> Enroll
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Student</th><th className="text-left px-4 py-3 font-semibold">Class</th>
            <th className="text-left px-4 py-3 font-semibold">Subject</th><th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {enrollments.map(e => {
              const student = students.find(s => s.id === e.studentId)
              const cls = classes.find(c => c.id === e.classId)
              const subj = cls ? subjects.find(s => s.id === cls.subjectId) : null
              return <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{student?.name || e.studentId.slice(0, 8)}</td>
                <td className="px-4 py-3 text-muted-foreground">{cls?.section || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{subj?.code || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleUnenroll(e.id)} className="p-1 text-muted-foreground hover:text-red-600"><Unlink size={14} /></button>
                </td>
              </tr>
            })}
            {enrollments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No enrollments</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Audit Logs ── */
function AuditLogsView({ schoolId }: { schoolId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  function load() { setLoading(true); listAuditLogs(schoolId).then(d => { setLogs(d as AuditLog[]); setLoading(false) }) }
  useEffect(load, [schoolId])

  const filtered = logs.filter(l => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return l.userEmail?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.collection?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q)
  })

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input type="text" placeholder="Filter logs..." value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-semibold">Time</th>
            <th className="text-left px-4 py-3 font-semibold">User</th>
            <th className="text-left px-4 py-3 font-semibold">Action</th>
            <th className="text-left px-4 py-3 font-semibold">Collection</th>
            <th className="text-left px-4 py-3 font-semibold">Details</th>
          </tr></thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.userEmail}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    l.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                    l.action === 'update' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{l.action}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{l.collection}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={l.details}>{l.details}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No audit logs found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
