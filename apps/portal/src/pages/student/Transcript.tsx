import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore'
import { Printer } from 'lucide-react'
import { db, type GradeScore, type Subject, type Class, type AcademicTerm, type AppUser, type GradeRelease } from '@pbclc/shared'
import Spinner from '../../components/ui/Spinner'

interface TermRecord {
  term: AcademicTerm
  subjects: { subject: Subject; grade: number }[]
  gwa: number
}

export default function Transcript({ user }: { user: AppUser }) {
  const [classIds, setClassIds] = useState<string[]>([])
  const [allScores, setAllScores] = useState<GradeScore[]>([])
  const [releasedSet, setReleasedSet] = useState<Set<string>>(new Set())
  const [records, setRecords] = useState<TermRecord[]>([])
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
    if (!classIds.length) { setReleasedSet(new Set()); return }
    const unsub = onSnapshot(
      query(collection(db, 'gradeReleases'), where('classId', 'in', classIds)),
      (snap) => {
        const s = new Set<string>()
        snap.docs.forEach(d => {
          const r = d.data() as GradeRelease
          if (r.isReleased) s.add(r.classId)
        })
        setReleasedSet(s)
      }
    )
    return unsub
  }, [classIds])

  useEffect(() => {
    async function compute() {
      if (!classIds.length) {
        setRecords([])
        setLoading(false)
        return
      }

      const termsSnap = await getDocs(collection(db, 'terms'))
      const terms = termsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTerm))

      const batchSize = 10
      const result: TermRecord[] = []
      const released = classIds.filter(cid => releasedSet.has(cid))

      for (let i = 0; i < released.length; i += batchSize) {
        const batch = released.slice(i, i + batchSize)
        const classPromises = batch.map(cid => getDoc(doc(db, 'classes', cid)))
        const classSnaps = await Promise.all(classPromises)
        const classes = classSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as Class))

        const subjIds = [...new Set(classes.map(c => c.subjectId))]
        const subjPromises = subjIds.map(sid => getDoc(doc(db, 'subjects', sid)))
        const subjSnaps = await Promise.all(subjPromises)
        const subjMap = new Map(subjSnaps.filter(s => s.exists()).map(s => [s.id, { id: s.id, ...s.data() } as Subject]))

        for (const cls of classes) {
          const subject = subjMap.get(cls.subjectId)
          if (!subject) continue
          const scores = allScores.filter(s => s.classId === cls.id)
          let final = 0
          for (const comp of subject.gradingComponents) {
            const compScores = scores.filter(s => s.componentId === comp.id)
            const avg = compScores.length ? compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length : 0
            final += avg * (comp.weight / 100)
          }
          result.push({ cls, subject, grade: Math.round(final) })
        }
      }

      const recordsByTerm = new Map<string, TermRecord>()
      for (const term of terms) {
        const termClasses = result
          .filter(r => r.cls.termId === term.id)
          .map(r => ({ subject: r.subject, grade: r.grade }))
        if (termClasses.length) {
          const gwa = Math.round(termClasses.reduce((a, s) => a + s.grade, 0) / termClasses.length * 100) / 100
          recordsByTerm.set(term.id, { term, subjects: termClasses, gwa })
        }
      }
      setRecords([...recordsByTerm.values()])
      setLoading(false)
    }
    compute()
  }, [classIds, allScores, releasedSet])

  function handlePrint() {
    window.print()
  }

  if (loading) return <Spinner />

  if (!records.length) {
    return (
      <div>
        <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
          Academic Transcript
        </h1>
        <p className="text-sm text-muted-foreground mt-6">No academic records yet.</p>
      </div>
    )
  }

  const cgpa = Math.round(records.reduce((a, r) => a + r.gwa, 0) / records.length * 100) / 100

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
          Academic Transcript
        </h1>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors print:hidden"
        >
          <Printer size={15} />
          Download as PDF
        </button>
      </div>

      <div id="transcript-content">
        <p className="text-sm text-muted-foreground mb-6">{user.name} Â· {user.id}</p>

        <div className="bg-[#1e3a5f] rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">Cumulative GPA</p>
            <p className="text-5xl font-bold text-white leading-none">{cgpa}</p>
          </div>
          <div className="text-sm text-white/50 space-y-1.5 sm:text-right">
            <p>Terms Completed: <span className="text-white font-bold">{records.length}</span></p>
          </div>
        </div>

        <div className="space-y-4">
          {records.map((rec, i) => (
            <div key={i} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-secondary/40 flex items-center justify-between border-b border-border">
                <div>
                  <p className="font-bold text-foreground text-sm">
                    {rec.term.label} â€” {rec.term.semester}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Term GPA</p>
                  <p className="text-lg font-bold text-[#1e3a5f]">{rec.gwa}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/20">
                    <th className="text-left px-5 py-2.5 font-semibold">Subject</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.subjects.map(s => (
                    <tr key={s.subject.id} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                      <td className="px-5 py-3 text-foreground">
                        <p className="font-semibold">{s.subject.title}</p>
                        <p className="text-xs text-muted-foreground">{s.subject.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.grade >= 75 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                          {s.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #transcript-content, #transcript-content * { visibility: visible; }
          #transcript-content { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
