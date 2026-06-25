import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { listClasses, listSubjects, listEnrollments, getUser, listGrades, type AppUser, type Class, type Subject, type GradeScore, computeFinalGrade, transmute, getGradeDescriptor, PROFICIENCY_LEVELS } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

interface StudentInfo {
  id: string
  name: string
  section: string
  lrn?: string
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
    let cancelled = false
    async function load() {
      const classesData = await listClasses({ teacherId: user.id, schoolId })
      const subjects = await listSubjects({ schoolId })
      const result = classesData
        .map(c => {
          const subject = subjects.find(s => s.id === c.subjectId)
          return subject ? { ...c, subject } as Class & { subject: Subject } : null
        })
        .filter(Boolean) as (Class & { subject: Subject })[]
      if (cancelled) return
      setClasses(result)
      if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return

    async function load() {
      const enrollData = await listEnrollments({ classId: selectedClassId })
      const studentIds = enrollData.map(e => e.studentId)
      const users = (await Promise.all(studentIds.map(id => getUser(id)))).filter(Boolean) as AppUser[]
      const studentList: StudentInfo[] = studentIds
        .map(id => {
          const u = users.find(uu => uu.id === id)
          return u ? { id: u.id, name: u.name, section: u.section || cls!.section, lrn: u.lrn } : null
        })
        .filter(Boolean) as StudentInfo[]

      const allScores = await listGrades({ classId: selectedClassId })

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

      {students.map(({ student, scores, final, transmuted, descriptor }) => {
        const schoolName = 'ACADEMIX'
        const gradeLevel = selectedClass?.subject.gradeLevel || ''
        return (
        <div key={student.id} className="report-card bg-white rounded-xl border border-border shadow-sm mb-6 p-8">
          <div className="text-center border-b-2 border-[#1e3a5f] pb-3 mb-5">
            <h2 className="text-base font-bold text-[#1e3a5f] tracking-wide">{schoolName}</h2>
            <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">Learner Progress Report Card</p>
            <p className="text-[0.55rem] text-muted-foreground">(Formerly Form 138) &mdash; SF9</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-[0.7rem] mb-5 border border-border rounded-lg p-3 bg-[#f8f5f0]">
            <div>
              <p className="font-semibold text-foreground">Learner: <span className="font-normal">{student.name}</span></p>
              <p className="font-semibold text-foreground mt-1">LRN: <span className="font-normal font-mono">{student.lrn || '\u2014'}</span></p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Grade Level: <span className="font-normal">{gradeLevel}</span></p>
              <p className="font-semibold text-foreground mt-1">Section: <span className="font-normal">{student.section}</span></p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Subject: <span className="font-normal">{selectedClass?.subject.title} ({selectedClass?.subject.code})</span></p>
              <p className="font-semibold text-foreground mt-1">Adviser: <span className="font-normal">{user.name}</span></p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="text-left px-3 py-2 font-semibold border border-[#2a4a75]">Component</th>
                <th className="text-center px-3 py-2 font-semibold border border-[#2a4a75]">Weight</th>
                <th className="text-center px-3 py-2 font-semibold border border-[#2a4a75]">Raw Score</th>
                <th className="text-center px-3 py-2 font-semibold border border-[#2a4a75]">PS</th>
                <th className="text-center px-3 py-2 font-semibold border border-[#2a4a75]">WS</th>
              </tr>
            </thead>
            <tbody>
              {selectedClass?.subject.gradingComponents.map(comp => {
                const compScores = scores.filter(s => s.componentId === comp.id)
                const ps = compScores.length
                  ? Math.round(compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length)
                  : 0
                const ws = ps * (comp.weight / 100)
                return (
                  <tr key={comp.id} className="border-b border-border">
                    <td className="px-3 py-1.5 font-medium">{comp.name}</td>
                    <td className="px-3 py-1.5 text-center">{comp.weight}%</td>
                    <td className="px-3 py-1.5 text-center font-mono">{compScores.length ? `${compScores[0].score}/${compScores[0].maxScore}` : '\u2014'}</td>
                    <td className="px-3 py-1.5 text-center font-mono">{ps || '\u2014'}</td>
                    <td className="px-3 py-1.5 text-center font-mono">{ws ? ws.toFixed(1) : '\u2014'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="border border-border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="px-3 py-1.5 text-left font-semibold border border-[#2a4a75]">Initial Grade</th>
                  <th className="px-3 py-1.5 text-center font-semibold border border-[#2a4a75]">Transmuted</th>
                  <th className="px-3 py-1.5 text-center font-semibold border border-[#2a4a75]" colSpan={2}>Proficiency Level</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-3 py-2 text-center font-mono text-sm">{final || '\u2014'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-lg font-bold text-[#1e3a5f]">{transmuted || '\u2014'}</span>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">{descriptor}</td>
                  <td className="px-3 py-2 text-center text-[0.55rem] text-muted-foreground">
                    {transmuted >= 75 ? 'PASSED' : 'FAILED'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[0.55rem] text-muted-foreground border-t border-border pt-3 mt-4">
            <p className="font-semibold mb-1">Proficiency Level Legends:</p>
            <div className="grid grid-cols-5 gap-2">
              {PROFICIENCY_LEVELS.map(pl => (
                <div key={pl.label} className="text-center">
                  <span className="font-semibold">{pl.label}</span>
                  <br />({pl.min}{pl.min === 90 ? '\u2013100' : pl.min === 75 ? '\u201379' : pl.min === 0 ? ' below' : `\u2013${pl.min + 4}`})
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border flex justify-between text-[0.6rem] text-muted-foreground">
            <div className="text-center flex-1">
              <p>___________________________</p>
              <p className="font-semibold text-foreground mt-0.5">Teacher / Adviser</p>
            </div>
            <div className="text-center flex-1">
              <p>___________________________</p>
              <p className="font-semibold text-foreground mt-0.5">Parent / Guardian Signature</p>
            </div>
          </div>
        </div>
        )
      })}

      {students.length === 0 && selectedClassId && (
        <div className="text-center py-16 text-muted-foreground text-sm">No enrolled students with grade data.</div>
      )}
    </div>
  )
}
