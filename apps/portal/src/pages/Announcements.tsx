import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, getDoc, orderBy } from 'firebase/firestore'
import { Megaphone } from 'lucide-react'
import { db, type AppUser, type Announcement, type Class, type Subject, type Enrollment } from '@pbclc/shared'
import Spinner from '../components/ui/Spinner'
import { showToast } from '../components/ui/toast'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export default function Announcements({ user }: { user: AppUser }) {
  const [announcements, setAnnouncements] = useState<(Announcement & { teacherName?: string; className?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [classId, setClassId] = useState('')
  const [teacherClasses, setTeacherClasses] = useState<(Class & { subject: Subject })[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function init() {
      if (user.role !== 'teacher') return
      const snap = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', user.id)))
      const result: (Class & { subject: Subject })[] = []
      for (const d of snap.docs) {
        const cls = { id: d.id, ...d.data() } as Class
        const subjSnap = await getDoc(doc(db, 'subjects', cls.subjectId))
        if (!subjSnap.exists()) continue
        const subject = { id: subjSnap.id, ...subjSnap.data() } as Subject
        result.push({ ...cls, subject })
      }
      setTeacherClasses(result)
    }
    init()
  }, [user])

  useEffect(() => {
    if (user.role === 'teacher') {
      const unsub = onSnapshot(
        query(collection(db, 'announcements'), where('teacherId', '==', user.id), orderBy('createdAt', 'desc')),
        (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))
          setAnnouncements(list)
          setLoading(false)
        }
      )
      return unsub
    } else {
      let unsubAnnounce: (() => void) | null = null
      const unsubEnroll = onSnapshot(
        query(collection(db, 'enrollments'), where('studentId', '==', user.id)),
        (enrollSnap) => {
          const classIds = enrollSnap.docs.map(d => (d.data() as Enrollment).classId)
          setClassIdsSnapshot(classIds)
        }
      )
      return () => {
        unsubEnroll()
        unsubAnnounce?.()
      }
    }
  }, [user])

  const [classIdsSnapshot, setClassIdsSnapshot] = useState<string[]>([])

  useEffect(() => {
    if (classIdsSnapshot.length === 0) {
      setAnnouncements([])
      setLoading(false)
      return
    }
    const batchSize = 10
    const classIds = classIdsSnapshot.slice(0, batchSize)
    const unsub = onSnapshot(
      query(collection(db, 'announcements'), where('classId', 'in', classIds), orderBy('createdAt', 'desc')),
      async (annSnap) => {
        const list = await Promise.all(
          annSnap.docs.map(async (d) => {
            const a = { id: d.id, ...d.data() } as Announcement
            let teacherName = ''
            let className = ''
            const userSnap = await getDoc(doc(db, 'users', a.teacherId))
            if (userSnap.exists()) teacherName = userSnap.data().name || ''
            const classSnap = await getDoc(doc(db, 'classes', a.classId))
            if (classSnap.exists()) {
              const clsData = classSnap.data() as Class
              const subjSnap = await getDoc(doc(db, 'subjects', clsData.subjectId))
              if (subjSnap.exists()) className = (subjSnap.data() as Subject).code
            }
            return { ...a, teacherName, className }
          })
        )
        setAnnouncements(list)
        setLoading(false)
      }
    )
    return unsub
  }, [classIdsSnapshot])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !classId) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'announcements'), {
        classId,
        teacherId: user.id,
        title: title.trim(),
        content: content.trim(),
        createdAt: Date.now(),
      } satisfies Omit<Announcement, 'id'>)
      setTitle('')
      setContent('')
      setClassId('')
      setShowForm(false)
      showToast('Announcement posted!', 'success')
    } catch {
      showToast('Failed to post announcement.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.name}</p>
        </div>
        {user.role === 'teacher' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Announcement'}
          </button>
        )}
      </div>

      {user.role === 'teacher' && showForm && (
        <form onSubmit={handlePost} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-foreground text-lg">
            New Announcement
          </h2>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Class</label>
            <select
              required value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
            >
              <option value="">Select a class...</option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.subject.code} â€” {c.section} ({c.schedule})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Content</label>
            <textarea
              required value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your announcement..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      )}

      {announcements.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {user.role === 'teacher'
            ? 'No announcements yet. Post one to get started.'
            : 'No announcements yet. They will appear once your teachers post them.'}
        </p>
      )}

      <div className="space-y-4">
        {announcements.map(a => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0 bg-[#c4a32a]/10 text-[#8b6914]">
                <Megaphone size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-bold text-foreground text-base">
                    {a.title}
                  </h3>
                  <span className="text-[0.65rem] text-muted-foreground shrink-0 pt-0.5">{timeAgo(a.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.className && <>For {a.className} &middot; </>}
                  {a.teacherName && <>{a.teacherName}</>}
                </p>
                <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
