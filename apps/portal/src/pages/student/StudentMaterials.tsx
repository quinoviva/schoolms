import { useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, BookOpen } from 'lucide-react'
import {
  listEnrollments, listDriveLinks, getClass, listSubjects,
  type AppUser, type DriveLink, type Class, type Subject, getDriveIcon, getDriveViewUrl
} from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'

interface ClassWithSubject {
  id: string
  subject: Subject
  section: string
}

export default function StudentMaterials({ user }: { user: AppUser }) {
  useAuth()
  const schoolId = user.schoolId || ''
  const [classList, setClassList] = useState<ClassWithSubject[]>([])
  const [materials, setMaterials] = useState<Record<string, DriveLink[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const enrollments = await listEnrollments({ studentId: user.id })
        if (cancelled) return
        const classIds = enrollments.map(e => e.classId)

        const [classes, allLinks] = await Promise.all([
          Promise.all(classIds.map(cid => getClass(cid))),
          listDriveLinks(),
        ])
        if (cancelled) return
        const validClasses = classes.filter(Boolean) as Class[]
        const subjectIds = [...new Set(validClasses.map(c => c.subjectId))]
        const allSubjects = await listSubjects({ schoolId })
        if (cancelled) return
        const subjectsMap = new Map(allSubjects.map(s => [s.id, s]))

        const list: ClassWithSubject[] = validClasses
          .map(cls => {
            const subject = subjectsMap.get(cls.subjectId)
            return subject ? { id: cls.id, subject, section: cls.section } : null
          })
          .filter(Boolean) as ClassWithSubject[]
        setClassList(list)

        const grouped: Record<string, DriveLink[]> = {}
        for (const cid of classIds) grouped[cid] = []
        for (const link of allLinks) {
          if (grouped[link.classId]) grouped[link.classId].push(link)
        }
        setMaterials(grouped)
        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.id, schoolId])

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
