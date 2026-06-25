import { useEffect, useState } from 'react'
import { createSection, listSections, deleteSection as apiDeleteSection, updateSection as apiUpdateSection, getSchool,
  sanitizeString, getGradesForLevels, type Section, type SchoolLevel } from '@academix/shared'
import { Search, Plus, Pencil } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

export default function SectionManagement() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const [sections, setSections] = useState<Section[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', gradeLevel: '' })
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<Section | null>(null)
  const [editForm, setEditForm] = useState({ name: '', gradeLevel: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [gradeOptions, setGradeOptions] = useState<string[]>([])

  async function loadData() {
    if (!schoolId) return
    const [data, school] = await Promise.all([
      listSections({ schoolId }),
      getSchool(schoolId),
    ])
    setSections(data)
    if (school?.levels) setGradeOptions(getGradesForLevels(school.levels as SchoolLevel[]))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [schoolId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      await createSection({
        id, name: sanitizeString(form.name, 50),
        gradeLevel: sanitizeString(form.gradeLevel, 10), schoolId,
      } as Section)
      setForm({ name: '', gradeLevel: '' })
      setShowForm(false)
      showToast('Section created successfully', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to create section', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await apiDeleteSection(deleteTarget.id)
      showToast('Section deleted successfully', 'success')
    } catch {
      showToast('Failed to delete section', 'error')
    }
    setDeleteTarget(null)
  }

  function openEdit(section: Section) {
    setEditTarget(section)
    setEditForm({ name: section.name, gradeLevel: section.gradeLevel })
  }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await apiUpdateSection(editTarget.id, {
        name: sanitizeString(editForm.name, 50),
        gradeLevel: sanitizeString(editForm.gradeLevel, 10),
      })
      showToast('Section updated successfully', 'success')
      setEditTarget(null)
    } catch {
      showToast('Failed to update section', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const filtered = sections.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.gradeLevel.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Spinner text="Loading sections..." />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Section Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage class sections and grade levels</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors shadow-sm"
        >
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add Section'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground">Create New Section</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Section Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., 11-A (Grace)"
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
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm">
            {saving ? 'Creating...' : 'Create Section'}
          </button>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-secondary/20">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search by name or grade level..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/10">
              <th className="text-left px-5 py-3 font-semibold">Section Name</th>
              <th className="text-left px-4 py-3 font-semibold">Grade Level</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-foreground">{s.name}</td>
                <td className="px-4 py-3.5 text-muted-foreground">{s.gradeLevel}</td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)}
                      className="text-xs text-[#1e3a5f] hover:text-[#8b6914] font-semibold px-2.5 py-1 rounded hover:bg-[#1e3a5f]/5 transition-colors flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
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
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            {sections.length === 0 ? 'No sections yet. Create your first section.' : 'No sections match your search.'}
          </div>
        )}
        <div className="px-5 py-3 bg-secondary/30 text-xs text-muted-foreground">
          Showing {filtered.length} of {sections.length} sections
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Section"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'this section'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg">Edit Section</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Section Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Grade Level</label>
                <select value={editForm.gradeLevel} onChange={e => setEditForm(f => ({ ...f, gradeLevel: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
                  <option value="">-- Select grade level --</option>
                  {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
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
