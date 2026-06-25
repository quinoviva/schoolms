import { useEffect, useState } from 'react'
import { listSubjects, createSubject, updateSubject, deleteSubject, getSchool,
  sanitizeString, getGradesForLevels, DEPED_COMPONENT_WEIGHTS, MATATAG_SUBJECTS, getMatatagPresets,
  generateSubjectCode, type Subject, type SchoolLevel, type GradingComponent, type MatatagSubjectPreset } from '@academix/shared'
import { Plus, Pencil, Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

const PAGE_SIZE = 20

export default function SubjectManagement() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const [subjects, setSubjects] = useState<(Subject & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', title: '', gradeLevel: '', subjectGroup: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string } & Subject | null>(null)
  const [editForm, setEditForm] = useState({ code: '', title: '', gradeLevel: '' })
  const [editSaving, setEditSaving] = useState(false)

  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [gradeOptions, setGradeOptions] = useState<string[]>([])

  useEffect(() => {
    if (!schoolId) return
    getSchool(schoolId).then(school => {
      if (school?.levels) setGradeOptions(getGradesForLevels(school.levels as SchoolLevel[]))
    })
    loadPage(0)
  }, [schoolId])

  async function loadPage(idx: number) {
    setLoading(true)
    const all = await listSubjects({ schoolId })
    setSubjects(all as (Subject & { id: string })[])
    setHasMore(all.length === PAGE_SIZE)
    setPage(idx)
    setLoading(false)
  }

  function resetForm() {
    setForm({ code: '', title: '', gradeLevel: '', subjectGroup: '' })
    setError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const id = crypto.randomUUID()
      const preset = form.subjectGroup ? DEPED_COMPONENT_WEIGHTS[form.subjectGroup] : null
      const gradingComponents: GradingComponent[] = preset
        ? preset.map(c => ({ id: crypto.randomUUID(), name: c.label, weight: c.weight }))
        : []
      await createSubject({
        id, code: sanitizeString(form.code, 20), title: sanitizeString(form.title, 100),
        teacherId: '', termId: '', gradeLevel: sanitizeString(form.gradeLevel, 10),
        gradingComponents, schoolId, createdAt: Date.now(),
      } as Subject)
      resetForm(); setShowForm(false)
      loadPage(page)
      showToast('Subject created', 'success')
    } catch (err: any) { setError(err.message); showToast(err.message, 'error') }
    finally { setSaving(false) }
  }

  function openEdit(subj: Subject & { id: string }) {
    setEditTarget(subj)
    setEditForm({ code: subj.code, title: subj.title, gradeLevel: subj.gradeLevel || '' })
  }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await updateSubject(editTarget.id, {
        code: sanitizeString(editForm.code, 20), title: sanitizeString(editForm.title, 100),
        teacherId: '', termId: '',
        gradeLevel: sanitizeString(editForm.gradeLevel, 10),
        gradingComponents: [],
      })
      setEditTarget(null)
      loadPage(page)
      showToast('Subject updated', 'success')
    } catch { showToast('Failed to update subject', 'error') }
    finally { setEditSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteSubject(deleteTarget.id)
      loadPage(page)
      showToast('Subject deleted', 'success')
    } catch { showToast('Failed to delete subject', 'error') }
    setDeleteTarget(null)
  }

  const filtered = subjects.filter(s =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.gradeLevel || '').toLowerCase().includes(search.toLowerCase())
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
                placeholder="e.g., MATH7"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Mathematics 7"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Grade Level</label>
              <select required value={form.gradeLevel} onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="">-- Select grade level --</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {form.gradeLevel && getMatatagPresets(form.gradeLevel).length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  MATATAG Preset <span className="text-muted-foreground font-normal">(auto-fills fields)</span>
                </label>
                <div className="flex gap-2">
                  <select onChange={e => {
                    const preset = getMatatagPresets(form.gradeLevel).find(p => p.shortCode === e.target.value)
                    if (preset) setForm(f => ({
                      ...f,
                      title: preset.title,
                      code: generateSubjectCode(preset.shortCode, form.gradeLevel),
                      subjectGroup: preset.subjectGroup,
                    }))
                  }} value="" className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                    <option value="">-- Select a MATATAG subject --</option>
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
                      } as Subject)
                    }
                    showToast(`${presets.length} MATATAG subjects created!`, 'success')
                    loadPage(page)
                  }} className="shrink-0 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    Create All
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                DepEd Subject Group <span className="text-muted-foreground font-normal">(sets grading weights)</span>
              </label>
              <select value={form.subjectGroup} onChange={e => setForm(f => ({ ...f, subjectGroup: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                <option value="">-- Custom weights (no components) --</option>
                {Object.entries(DEPED_COMPONENT_WEIGHTS).map(([group, comps]) => (
                  <option key={group} value={group}>{group} ({comps.map(c => `${c.label.split('(')[0].trim()} ${c.weight}%`).join(', ')})</option>
                ))}
              </select>
            </div>
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
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">{s.code}</td>
                <td className="px-4 py-3.5 font-semibold text-foreground">{s.title}</td>
                <td className="px-4 py-3.5 text-xs hidden sm:table-cell"><span className="px-2 py-0.5 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold">{s.gradeLevel || '\u2014'}</span></td>
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
              <div className="grid sm:grid-cols-3 gap-4">
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
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
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
