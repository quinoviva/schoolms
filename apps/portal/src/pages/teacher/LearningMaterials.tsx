import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { Plus, Link, ExternalLink, Trash2, FolderOpen } from 'lucide-react'
import { db, type AppUser, type Class, type Subject, type DriveLink, extractDriveFileId, getDriveIcon, getDriveViewUrl } from '@pbclc/shared'
import Spinner from '../../components/ui/Spinner'
import { showToast } from '../../components/ui/toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function LearningMaterials({ user }: { user: AppUser }) {
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [materials, setMaterials] = useState<DriveLink[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id)),
      async (snap) => {
        const result: (Class & { subject: Subject })[] = []
        for (const d of snap.docs) {
          const cls = { id: d.id, ...d.data() } as Class
          const subjSnap = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', cls.subjectId)))
          if (!subjSnap.empty) {
            result.push({ ...cls, subject: { id: subjSnap.docs[0].id, ...subjSnap.docs[0].data() } as Subject })
          }
        }
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) { setMaterials([]); return }
    const unsub = onSnapshot(
      query(collection(db, 'materials'), where('classId', '==', selectedClassId)),
      (snap) => {
        setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as DriveLink)))
      }
    )
    return unsub
  }, [selectedClassId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedClassId) return
    const fileId = extractDriveFileId(driveUrl)
    if (!fileId) { showToast('Invalid Google Drive URL.', 'error'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'materials'), {
        classId: selectedClassId,
        teacherId: user.id,
        title: title || driveUrl,
        driveUrl,
        driveFileId: fileId,
        createdAt: Date.now(),
      } satisfies Omit<DriveLink, 'id'>)
      setTitle(''); setDriveUrl(''); setShowForm(false)
      showToast('Material added!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to add material.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDoc(doc(db, 'materials', deleteTarget.id))
      showToast('Material removed.', 'success')
    } catch { showToast('Failed to delete.', 'error') }
    setDeleteTarget(null)
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">Learning Materials</h1>
          {selectedClass && (
            <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} · {selectedClass.section}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.subject.code} — {c.section}</option>
            ))}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add from Drive'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground">Add Google Drive File</h2>
          <p className="text-xs text-muted-foreground">Paste a Google Drive share link. Students will be redirected to Drive to view the file.</p>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Chapter 1: Introduction"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Google Drive URL</label>
            <input required value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
          </div>
          {driveUrl && extractDriveFileId(driveUrl) && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <FolderOpen size={11} /> File ID detected: {extractDriveFileId(driveUrl)}
            </p>
          )}
          {driveUrl && !extractDriveFileId(driveUrl) && (
            <p className="text-xs text-red-500">Could not detect a Google Drive file ID. Check the URL.</p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setTitle(''); setDriveUrl('') }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !extractDriveFileId(driveUrl)}
              className="px-6 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50">
              {saving ? 'Adding...' : 'Add to Class'}
            </button>
          </div>
        </form>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <Link size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No learning materials added yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add Google Drive files for your students to access.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map(m => (
            <div key={m.id} className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3">
                <img src={getDriveIcon()} alt="" className="w-10 h-10 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate">{m.title}</p>
                  <p className="text-[0.6rem] text-muted-foreground font-mono mt-0.5 truncate">{m.driveFileId}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <a href={getDriveViewUrl(m.driveFileId)} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#1e3a5f] hover:text-[#8b6914] flex items-center gap-1 font-semibold transition-colors">
                  <ExternalLink size={11} /> Open in Drive
                </a>
                <button onClick={() => setDeleteTarget({ id: m.id, title: m.title })}
                  className="text-xs text-red-400 hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Material"
        message={`Remove "${deleteTarget?.title}"? Students will no longer see it.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
