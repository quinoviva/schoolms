import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { BookOpen } from 'lucide-react'
import { db, type GradeScore, type Subject, type Class, type AppUser } from '@pbclc/shared'
import Spinner from '../../components/ui/Spinner'

interface SubjectWithGrades {
  subject: Subject
  scores: GradeScore[]
  final: number
}

export default function MyGrades({ user }: { user: AppUser }) {
  const [classIds, setClassIds] = useState<string[]>([])
  const [allScores, setAllScores] = useState<GradeScore[]>([])
  const [subjects, setSubjects] = useState<SubjectWithGrades[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.id)),
      (snap) => {
        setClassIds(snap.docs.map(d => d.data().classId))
      }
    )
    return unsub
  }, [user.id])

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'grades'), where('studentId', '==', user.id)),
      (snap) => {
        setAllScores(snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore)))
      }
    )
    return unsub
  }, [user.id])

  useEffect(() => {
    async function compute() {
      if (!classIds.length) {
        setSubjects([])
        setLoading(false)
        return
      }

      const result: SubjectWithGrades[] = []
      for (const cid of classIds) {
        const classSnap = await getDoc(doc(db, 'classes', cid))
        if (!classSnap.exists()) continue
        const cls = { id: classSnap.id, ...classSnap.data() } as Class
        const subjSnap = await getDoc(doc(db, 'subjects', cls.subjectId))
        if (!subjSnap.exists()) continue
        const subject = { id: subjSnap.id, ...subjSnap.data() } as Subject
        const scores = allScores.filter(s => s.classId === cid)
        let final = 0
        for (const comp of subject.gradingComponents) {
          const compScores = scores.filter(s => s.componentId === comp.id)
          const avg = compScores.length ? compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length : 0
          final += avg * (comp.weight / 100)
        }
        result.push({ subject, scores, final: Math.round(final) })
      }
      setSubjects(result)
      setLoading(false)
    }
    compute()
  }, [classIds, allScores])

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
          {subjects.map(({ subject, scores, final }) => (
            <div key={subject.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#1e3a5f] text-white">
                <p className="font-bold">{subject.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{subject.code}</p>
              </div>
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
                        <p className="text-xl font-bold text-[#1e3a5f]">{compScores.length ? avg : 'â€”'}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{comp.weight}% weight</p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Final Grade</span>
                  <span className={`text-2xl font-bold ${final >= 75 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {final || 'â€”'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
