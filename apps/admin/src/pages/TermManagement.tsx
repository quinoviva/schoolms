import { useEffect, useState } from 'react'
import { listTerms, createTerm, updateTerm, sanitizeString, type AcademicTerm } from '@academix/shared'
import { Plus, AlertTriangle, Archive, Eye, EyeOff } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

export default function TermManagement() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', semester: '' })
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  async function loadData() {
    if (!schoolId) return
    const data = await listTerms(schoolId)
    setTerms(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [schoolId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      await createTerm({
        id,
        label: sanitizeString(form.label, 100),
        semester: sanitizeString(form.semester, 50),
        isActive: terms.length === 0,
        isArchived: false,
        schoolId,
        createdAt: Date.now(),
      } as AcademicTerm)
      setForm({ label: '', semester: '' })
      setShowForm(false)
      showToast('Term created successfully', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to create term', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string) {
    try {
      await Promise.all(terms.filter(t => t.isActive).map(t => updateTerm(t.id, { isActive: false })))
      await updateTerm(id, { isActive: true })
      showToast('Active term updated', 'success')
    } catch {
      showToast('Failed to update term', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      // No delete API for terms in current routes, deactivate instead
      await updateTerm(deleteTarget.id, { isArchived: true })
      showToast('Term archived', 'success')
    } catch {
      showToast('Failed to archive term', 'error')
    }
    setDeleteTarget(null)
  }

  async function handleArchive(id: string) {
    try {
      await updateTerm(id, { isArchived: true })
      showToast('Term archived', 'success')
    } catch {
      showToast('Failed to archive term', 'error')
    }
  }

  const visibleTerms = showArchived ? terms : terms.filter(t => !t.isArchived)

  if (loading) return <Spinner text="Loading terms..." />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Academic Terms
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage school years and semesters</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/5 transition-colors">
            {showArchived ? <EyeOff size={14} /> : <Eye size={14} />} {showArchived ? 'Hide' : 'Show'} Archived
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add Term'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground">New Academic Term</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">School Year</label>
              <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g., S.Y. 2024-2025"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Semester</label>
              <input required value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                placeholder="e.g., 1st Semester"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm">
            {saving ? 'Creating...' : 'Create Term'}
          </button>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/10">
              <th className="text-left px-5 py-3 font-semibold">School Year</th>
              <th className="text-left px-4 py-3 font-semibold">Semester</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Archived</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTerms.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-foreground">{t.label}</td>
                <td className="px-4 py-3.5 text-muted-foreground">{t.semester}</td>
                <td className="px-4 py-3.5 text-center">
                  {t.isActive
                    ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active</span>
                    : <button onClick={() => toggleActive(t.id)} className="text-xs text-[#1e3a5f] hover:text-[#8b6914] font-semibold">Set Active</button>
                  }
                </td>
                <td className="px-4 py-3.5 text-center">
                  {t.isArchived
                    ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"><Archive size={12} /> Archived</span>
                    : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">Active</span>
                  }
                </td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {!t.isArchived && (
                      <button onClick={() => handleArchive(t.id)}
                        className="text-xs text-[#8b6914] hover:text-[#c4a32a] font-semibold px-2.5 py-1 rounded hover:bg-[#8b6914]/5 transition-colors flex items-center gap-1">
                        <Archive size={11} /> Archive
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget({ id: t.id, label: t.label })}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleTerms.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No terms yet. Create your first academic term.</div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Archive Term"
        message={`Are you sure you want to archive "${deleteTarget?.label || 'this term'}"?`}
        confirmLabel="Archive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
