import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { Printer } from 'lucide-react'
import { db, fetchUsersByIds, mergeClassesWithSubjects, type AppUser, type Class, type Subject, type GradeScore, type AcademicTerm, computeFinalGrade, transmute, getGradeDescriptor } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

interface StudentInfo {
  id: string
  name: string
  section: string
}

interface StudentReport {
  student: StudentInfo
  scores: GradeScore[]
  final: number
  transmuted: number
  descriptor: string
}

export default function ReportCards({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<StudentReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const result = await mergeClassesWithSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)))
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return

    async function load() {
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', selectedClassId)))
      const studentIds = enrollSnap.docs.map(d => d.data().studentId)
      const userMap = await fetchUsersByIds(studentIds)
      const studentList: StudentInfo[] = studentIds
        .map(id => {
          const user = userMap.get(id)
          return user ? { id, name: user.name, section: user.section || cls!.section } : null
        })
        .filter(Boolean) as StudentInfo[]

      const gradesSnap = await getDocs(query(collection(db, 'grades'), where('classId', '==', selectedClassId)))
      const allScores = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore))

      const reports: StudentReport[] = studentList.map(s => {
        const scores = allScores.filter(g => g.studentId === s.id)
        const final = computeFinalGrade(scores, cls!.subject.gradingComponents)
        const t = transmute(final)
        return { student: s, scores, final, transmuted: t, descriptor: getGradeDescriptor(t) }
      })
      setStudents(reports)
    }
    load()
  }, [selectedClassId, classes])

  function handlePrint() {
    window.print()
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between mb-7 no-print">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">Report Cards</h1>
          {selectedClass && (
            <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} · {selectedClass.subject.title} · {selectedClass.section}</p>
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
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
          >
            <Printer size={14} /> Print All Cards
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-card { break-after: page; page-break-after: always; padding: 0.5in; }
          .report-card:last-child { break-after: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {students.map(({ student, scores, final, transmuted, descriptor }) => (
        <div key={student.id} className="report-card bg-white rounded-xl border border-border shadow-sm mb-6 p-8">
          <div className="text-center mb-6 border-b-2 border-[#1e3a5f] pb-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">ACADEMIX</h2>
            <p className="text-xs text-muted-foreground">Student Report Card</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p><span className="font-semibold">Student:</span> {student.name}</p>
              <p><span className="font-semibold">Section:</span> {student.section}</p>
            </div>
            <div>
              <p><span className="font-semibold">Subject:</span> {selectedClass?.subject.title} ({selectedClass?.subject.code})</p>
              <p><span className="font-semibold">Teacher:</span> {user.name}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-xs">
                <th className="text-left px-4 py-2.5 font-semibold">Component</th>
                <th className="text-center px-4 py-2.5 font-semibold">Weight</th>
                <th className="text-center px-4 py-2.5 font-semibold">Score</th>
                <th className="text-center px-4 py-2.5 font-semibold">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {selectedClass?.subject.gradingComponents.map(comp => {
                const compScores = scores.filter(s => s.componentId === comp.id)
                const avg = compScores.length
                  ? Math.round(compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length)
                  : 0
                return (
                  <tr key={comp.id} className="border-b border-border">
                    <td className="px-4 py-2 font-medium">{comp.name}</td>
                    <td className="px-4 py-2 text-center">{comp.weight}%</td>
                    <td className="px-4 py-2 text-center">{compScores.length ? `${avg}%` : '—'}</td>
                    <td className="px-4 py-2 text-center">{(avg * (comp.weight / 100)).toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="bg-[#f8f5f0] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Initial Grade:</span> {final || 'N/A'}</p>
              <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Transmuted:</span> {transmuted || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#1e3a5f]">{transmuted || '—'}</p>
              <p className="text-xs text-muted-foreground">{descriptor}</p>
            </div>
          </div>
        </div>
      ))}

      {students.length === 0 && selectedClassId && (
        <div className="text-center py-16 text-muted-foreground text-sm">No enrolled students with grade data.</div>
      )}
    </div>
  )
}
