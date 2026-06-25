import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import {
  listEnrollments, listGrades, listGradeReleases,
  getClass, listSubjects, listTerms,
  type GradeScore, type Subject, type Class, type AcademicTerm, type AppUser, type GradeRelease
} from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'

interface TermRecord {
  term: AcademicTerm
  subjects: { subject: Subject; grade: number }[]
  gwa: number
}

export default function Transcript({ user }: { user: AppUser }) {
  useAuth()
  const schoolId = user.schoolId || ''
  const [records, setRecords] = useState<TermRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [terms, enrollments, scores, releases] = await Promise.all([
          listTerms(schoolId),
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
          setRecords([])
          setLoading(false)
          return
        }

        const released = classIds.filter(cid => releasedSet.has(cid))
        const classes = (await Promise.all(released.map(cid => getClass(cid)))).filter(Boolean) as Class[]
        if (cancelled) return
        const subjIds = [...new Set(classes.map(c => c.subjectId))]
        const allSubjects = await listSubjects({ schoolId })
        if (cancelled) return
        const subjMap = new Map(allSubjects.map(s => [s.id, s]))

        const temp: { cls: Class; subject: Subject; grade: number }[] = []
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
          temp.push({ cls, subject, grade: Math.round(final) })
        }

        const recordsByTerm = new Map<string, TermRecord>()
        for (const term of terms) {
          const termClasses = temp
            .filter(r => r.cls.termId === term.id)
            .map(r => ({ subject: r.subject, grade: r.grade }))
          if (termClasses.length) {
            const gwa = Math.round(termClasses.reduce((a, s) => a + s.grade, 0) / termClasses.length * 100) / 100
            recordsByTerm.set(term.id, { term, subjects: termClasses, gwa })
          }
        }
        setRecords([...recordsByTerm.values()])
        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.id, schoolId])

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
        <p className="text-sm text-muted-foreground mb-6">{user.name} · {user.id}</p>

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
                    {rec.term.label} — {rec.term.semester}
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
