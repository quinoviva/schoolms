import { useEffect, useState } from 'react'
import { BookOpen, Lock } from 'lucide-react'
import {
  listEnrollments, listGrades, listGradeReleases,
  getClass, listSubjects,
  type GradeScore, type Subject, type Class, type AppUser, type GradeRelease
} from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'

interface SubjectWithGrades {
  subject: Subject
  scores: GradeScore[]
  final: number
  released: boolean
  classId: string
}

export default function MyGrades({ user }: { user: AppUser }) {
  useAuth()
  const schoolId = user.schoolId || ''
  const [subjects, setSubjects] = useState<SubjectWithGrades[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [enrollments, scores, releases] = await Promise.all([
          listEnrollments({ studentId: user.id }),
          listGrades({ studentId: user.id }),
          listGradeReleases(),
        ])
        if (cancelled) return
        const classIds = enrollments.map(e => e.classId)
        const releasedSet = new Set(
          releases.filter(r => r.isReleased && classIds.includes(r.classId)).map(r => r.classId)
        )

        if (!classIds.length) {
          setSubjects([])
          setLoading(false)
          return
        }

        const classes = (await Promise.all(classIds.map(cid => getClass(cid)))).filter(Boolean) as Class[]
        if (cancelled) return
        const subjIds = [...new Set(classes.map(c => c.subjectId))]
        const allSubjects = await listSubjects({ schoolId })
        if (cancelled) return
        const subjMap = new Map(allSubjects.map(s => [s.id, s]))

        const result: SubjectWithGrades[] = []
        for (const cls of classes) {
          const subject = subjMap.get(cls.subjectId)
          if (!subject) continue
          const clsScores = scores.filter(s => s.classId === cls.id)
          let final = 0
          for (const comp of subject.gradingComponents) {
            const compScores = clsScores.filter(s => s.componentId === comp.id)
            const avg = compScores.length ? compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length : 0
            final += avg * (comp.weight / 100)
          }
          result.push({ subject, scores: clsScores, final: Math.round(final), released: releasedSet.has(cls.id), classId: cls.id })
        }
        setSubjects(result)
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

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-6">
        My Grades
      </h1>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={40} className="text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">No grades available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Grades will appear once your teacher records them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(({ subject, scores, final, released, classId }) => (
            <div key={subject.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#1e3a5f] text-white flex items-center justify-between">
                <div>
                  <p className="font-bold">{subject.title}</p>
                  <p className="text-xs text-white/60 mt-0.5">{subject.code}</p>
                </div>
                {!released && <Lock size={16} className="text-white/40" />}
              </div>
              {released ? (
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {subject.gradingComponents.map(comp => {
                      const compScores = scores.filter(s => s.componentId === comp.id)
                      const avg = compScores.length
                        ? Math.round(compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length)
                        : 0
                      return (
                        <div key={comp.id} className="text-center p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground">{comp.name}</p>
                          <p className="text-xl font-bold text-[#1e3a5f]">{compScores.length ? avg : '—'}</p>
                          <p className="text-[0.65rem] text-muted-foreground">{comp.weight}% weight</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">Final Grade</span>
                    <span className={`text-2xl font-bold ${final >= 75 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {final || '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center py-8">
                  <Lock size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Grades not yet released</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Check back after your teacher releases them.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
