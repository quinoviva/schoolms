import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { ExternalLink, FolderOpen, BookOpen } from 'lucide-react'
import { db, type AppUser, type DriveLink, type Class, type Subject, getDriveIcon, getDriveViewUrl } from '@pbclc/shared'
import Spinner from '../../components/ui/Spinner'

interface ClassWithSubject {
  id: string
  subject: Subject
  section: string
}

export default function StudentMaterials({ user }: { user: AppUser }) {
  const [classList, setClassList] = useState<ClassWithSubject[]>([])
  const [materials, setMaterials] = useState<Record<string, DriveLink[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.id)),
      async (snap) => {
        const classIds = snap.docs.map(d => d.data().classId)
        const list: ClassWithSubject[] = []
        for (const cid of classIds) {
          const classSnap = await getDocs(query(collection(db, 'classes'), where('__name__', '==', cid)))
          if (classSnap.empty) continue
          const cls = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() } as Class
          const subjSnap = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', cls.subjectId)))
          if (subjSnap.empty) continue
          const subject = { id: subjSnap.docs[0].id, ...subjSnap.docs[0].data() } as Subject
          list.push({ id: cls.id, subject, section: cls.section })
        }
        setClassList(list)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!classList.length) { setMaterials({}); setLoading(false); return }
    const classIds = classList.map(c => c.id)
    const unsubs = classIds.map(cid =>
      onSnapshot(
        query(collection(db, 'materials'), where('classId', '==', cid)),
        (snap) => {
          setMaterials(prev => ({
            ...prev,
            [cid]: snap.docs.map(d => ({ id: d.id, ...d.data() } as DriveLink)),
          }))
        }
      )
    )
    setLoading(false)
    return () => unsubs.forEach(u => u())
  }, [classList])

  if (loading) return <Spinner />

  const hasAny = classList.some(c => (materials[c.id] || []).length > 0)

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-6">Learning Materials</h1>

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={40} className="text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">No materials available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Your teachers haven't shared any Google Drive files.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {classList.map(c => {
            const cMaterials = materials[c.id] || []
            if (!cMaterials.length) return null
            return (
              <div key={c.id}>
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] text-xs">{c.subject.code}</span>
                  {c.subject.title}
                  <span className="text-xs text-muted-foreground font-normal">· {c.section}</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cMaterials.map(m => (
                    <a key={m.id} href={getDriveViewUrl(m.driveFileId)} target="_blank" rel="noopener noreferrer"
                      className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all hover:border-[#1e3a5f]/20 flex items-start gap-3 group">
                      <img src={getDriveIcon()} alt="" className="w-9 h-9 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate group-hover:text-[#1e3a5f] transition-colors">{m.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <ExternalLink size={10} /> Open in Drive
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
