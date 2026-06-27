import { useEffect, useState } from 'react'
import { Printer, FileText, CalendarCheck, ScrollText } from 'lucide-react'
import {
  listClasses, listSubjects, listEnrollments, getUser, listGrades, listAttendance,
  computeFinalGrade, transmute, getGradeDescriptor,
  type AppUser, type Class, type Subject, type AttendanceRecord,
} from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

type Tab = 'sf1' | 'sf2' | 'sf10'

interface StudentInfo {
  id: string
  name: string
  lrn?: string
  section?: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function SchoolForms({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [tab, setTab] = useState<Tab>('sf1')
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [sf2Month, setSf2Month] = useState(new Date().getMonth())
  const [sf2Year, setSf2Year] = useState(new Date().getFullYear())
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])

  const [sf10StudentId, setSf10StudentId] = useState('')
  const [sf10Grades, setSf10Grades] = useState<{ subject: Subject; initial: number; transmuted: number; descriptor: string }[]>([])

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
    let cancelled = false
    async function load() {
      const enrollData = await listEnrollments({ classId: selectedClassId })
      const studentIds = enrollData.map(e => e.studentId)
      const users = (await Promise.all(studentIds.map(id => getUser(id)))).filter(Boolean) as AppUser[]
      const list = studentIds
        .map(id => {
          const u = users.find(uu => uu.id === id)
          return u ? { id: u.id, name: u.name, lrn: u.lrn, section: u.section } : null
        })
        .filter(Boolean) as StudentInfo[]
      if (cancelled) return
      setStudents(list)
    }
    load()

    if (tab === 'sf2') loadAttendance()
    if (tab === 'sf10') { setSf10StudentId(''); setSf10Grades([]) }
    return () => { cancelled = true }
  }, [selectedClassId, tab])

  async function loadAttendance() {
    if (!selectedClassId) return
    const all = await listAttendance({ classId: selectedClassId })
    const filtered = all.filter(r => {
      const d = new Date(r.date)
      return d.getMonth() === sf2Month && d.getFullYear() === sf2Year
    })
    setAttendanceData(filtered)
  }

  useEffect(() => {
    if (tab === 'sf2' && selectedClassId) loadAttendance()
  }, [sf2Month, sf2Year, tab])

  useEffect(() => {
    if (!sf10StudentId || !selectedClassId) return
    async function load() {
      const enrollData = await listEnrollments({ studentId: sf10StudentId })
      const classIds = enrollData.map(e => e.classId)
      const allScores = await listGrades({ studentId: sf10StudentId })
      const results = []
      for (const cid of classIds) {
        const cls = classes.find(c => c.id === cid)
        if (!cls) continue
        const scores = allScores.filter(g => g.classId === cid)
        const initial = computeFinalGrade(scores, cls.subject.gradingComponents)
        const t = transmute(initial)
        results.push({ subject: cls.subject, initial, transmuted: t, descriptor: getGradeDescriptor(t) })
      }
      setSf10Grades(results)
    }
    load()
  }, [sf10StudentId, selectedClassId])

  function handlePrint() {
    window.print()
  }

  function daysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getAttendanceForDay(studentId: string, day: number) {
    const dateStr = `${sf2Year}-${String(sf2Month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const rec = attendanceData.find(r => r.studentId === studentId && r.date.startsWith(dateStr))
    return rec?.status || ''
  }

  function countStatus(studentId: string, status: string) {
    return attendanceData.filter(r => r.studentId === studentId && r.status === status).length
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between mb-6 no-print">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">School Forms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">DepEd forms generation</p>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
          <Printer size={14} /> Print
        </button>
      </div>

      <div className="flex gap-1 mb-5 no-print">
        {([
          { key: 'sf1' as Tab, label: 'SF1 — Class Registry', icon: FileText },
          { key: 'sf2' as Tab, label: 'SF2 — Daily Attendance', icon: CalendarCheck },
          { key: 'sf10' as Tab, label: 'SF10 — Permanent Record', icon: ScrollText },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-[#1e3a5f] text-white' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5 no-print">
        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.subject.code} — {c.section}</option>
          ))}
        </select>
        {tab === 'sf2' && (
          <>
            <select value={sf2Month} onChange={e => setSf2Month(Number(e.target.value))}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={sf2Year} onChange={e => setSf2Year(Number(e.target.value))}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        {tab === 'sf10' && (
          <select value={sf10StudentId} onChange={e => setSf10StudentId(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
            <option value="">-- Select student --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.lrn || '—'})</option>)}
          </select>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .form-page { padding: 0.3in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sf2-grid td, .sf2-grid th { font-size: 0.5rem; padding: 1px 2px; }
        }
      `}</style>

      {tab === 'sf1' && (
        <div className="form-page bg-white rounded-xl border border-border p-6">
          <div className="text-center border-b-2 border-[#1e3a5f] pb-3 mb-4">
            <h2 className="text-base font-bold text-[#1e3a5f]">CLASS REGISTRY</h2>
            <p className="text-[0.6rem] text-muted-foreground">(SF1 — School Form 1)</p>
          </div>
          <div className="flex justify-between text-[0.65rem] mb-4">
            <div>
              <p><span className="font-semibold">School:</span> ACADEMIX</p>
              <p><span className="font-semibold">Subject:</span> {selectedClass?.subject.title} ({selectedClass?.subject.code})</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Grade Level:</span> {selectedClass?.subject.gradeLevel}</p>
              <p><span className="font-semibold">Section:</span> {selectedClass?.section}</p>
              <p><span className="font-semibold">Adviser:</span> {user.name}</p>
            </div>
          </div>
          <table className="w-full text-[0.6rem] border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-2 py-1.5 border border-[#2a4a75] text-center w-6">#</th>
                <th className="px-3 py-1.5 border border-[#2a4a75] text-left font-semibold">LRN</th>
                <th className="px-3 py-1.5 border border-[#2a4a75] text-left font-semibold">Learner's Name</th>
                <th className="px-2 py-1.5 border border-[#2a4a75] text-center font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono">{s.lrn || '\u2014'}</td>
                  <td className="px-3 py-1.5 font-medium">{s.name}</td>
                  <td className="px-2 py-1.5"></td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No students enrolled.</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-6 flex justify-between text-[0.55rem] text-muted-foreground">
            <p>Prepared by: ___________________________</p>
            <p>Noted by: ___________________________</p>
          </div>
        </div>
      )}

      {tab === 'sf2' && (
        <div className="form-page bg-white rounded-xl border border-border p-6 overflow-x-auto">
          <div className="text-center border-b-2 border-[#1e3a5f] pb-3 mb-4">
            <h2 className="text-base font-bold text-[#1e3a5f]">DAILY ATTENDANCE REPORT</h2>
            <p className="text-[0.6rem] text-muted-foreground">(SF2 — School Form 2)</p>
          </div>
          <div className="flex justify-between text-[0.65rem] mb-4">
            <div>
              <p><span className="font-semibold">School:</span> ACADEMIX</p>
              <p><span className="font-semibold">Subject:</span> {selectedClass?.subject.title}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Month:</span> {MONTHS[sf2Month]} {sf2Year}</p>
              <p><span className="font-semibold">Grade/Section:</span> {selectedClass?.subject.gradeLevel} — {selectedClass?.section}</p>
            </div>
          </div>
          <table className="w-full text-[0.55rem] border-collapse sf2-grid">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-1 py-1 border border-[#2a4a75] text-left w-6">#</th>
                <th className="px-2 py-1 border border-[#2a4a75] text-left">LRN</th>
                <th className="px-2 py-1 border border-[#2a4a75] text-left">Name</th>
                {Array.from({ length: daysInMonth(sf2Month, sf2Year) }, (_, i) => (
                  <th key={i} className="px-0.5 py-1 border border-[#2a4a75] text-center w-4">{i + 1}</th>
                ))}
                <th className="px-1 py-1 border border-[#2a4a75] text-center w-6">P</th>
                <th className="px-1 py-1 border border-[#2a4a75] text-center w-6">A</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const present = countStatus(s.id, 'PRESENT')
                const absent = countStatus(s.id, 'ABSENT')
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-1 py-0.5 text-center">{i + 1}</td>
                    <td className="px-2 py-0.5 font-mono">{s.lrn || '\u2014'}</td>
                    <td className="px-2 py-0.5 font-medium whitespace-nowrap">{s.name}</td>
                    {Array.from({ length: daysInMonth(sf2Month, sf2Year) }, (_, day) => {
                      const status = getAttendanceForDay(s.id, day + 1)
                      return (
                        <td key={day} className={`px-0.5 py-0.5 text-center font-mono ${
                          status === 'P' ? 'text-emerald-700' : status === 'A' ? 'text-red-600' : ''
                        }`}>
                          {status === 'P' ? 'P' : status === 'A' ? 'A' : status === 'T' ? 'T' : status === 'E' ? 'E' : ''}
                        </td>
                      )
                    })}
                    <td className="px-1 py-0.5 text-center font-semibold">{present || ''}</td>
                    <td className="px-1 py-0.5 text-center font-semibold">{absent || ''}</td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr><td colSpan={daysInMonth(sf2Month, sf2Year) + 5} className="px-3 py-4 text-center text-muted-foreground">No data.</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 flex gap-6 text-[0.5rem] text-muted-foreground">
            <span><span className="font-semibold">P</span> — Present</span>
            <span><span className="font-semibold">A</span> — Absent</span>
            <span><span className="font-semibold">T</span> — Tardy</span>
            <span><span className="font-semibold">E</span> — Excused</span>
          </div>
          <div className="mt-6 flex justify-between text-[0.55rem] text-muted-foreground">
            <p>Prepared by: ___________________________</p>
            <p>Noted by: ___________________________</p>
          </div>
        </div>
      )}

      {tab === 'sf10' && sf10StudentId && (
        <div className="form-page bg-white rounded-xl border border-border p-6">
          {(() => {
            const stu = students.find(s => s.id === sf10StudentId)
            if (!stu) return null
            return (
              <>
                <div className="text-center border-b-2 border-[#1e3a5f] pb-3 mb-4">
                  <h2 className="text-base font-bold text-[#1e3a5f]">PERMANENT RECORD</h2>
                  <p className="text-[0.6rem] text-muted-foreground">(SF10 — School Form 10 / Form 137)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[0.65rem] mb-5 border border-border rounded-lg p-3 bg-[#f8f5f0]">
                  <div>
                    <p className="font-semibold">Learner: <span className="font-normal">{stu.name}</span></p>
                    <p className="font-semibold mt-1">LRN: <span className="font-normal font-mono">{stu.lrn || '\u2014'}</span></p>
                    <p className="font-semibold mt-1">Adviser: <span className="font-normal">{user.name}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Grade Level: <span className="font-normal">{selectedClass?.subject.gradeLevel}</span></p>
                    <p className="font-semibold mt-1">Section: <span className="font-normal">{selectedClass?.section}</span></p>
                    <p className="font-semibold mt-1">School Year: <span className="font-normal">2025-2026</span></p>
                  </div>
                </div>
                <table className="w-full text-[0.6rem] border-collapse">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-3 py-1.5 border border-[#2a4a75] text-left">Subject</th>
                      <th className="px-2 py-1.5 border border-[#2a4a75] text-center">Initial</th>
                      <th className="px-2 py-1.5 border border-[#2a4a75] text-center">Final Rating</th>
                      <th className="px-2 py-1.5 border border-[#2a4a75] text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sf10Grades.map(g => (
                      <tr key={g.subject.id} className="border-b border-border">
                        <td className="px-3 py-1.5 font-medium">{g.subject.title} ({g.subject.code})</td>
                        <td className="px-2 py-1.5 text-center font-mono">{g.initial || '\u2014'}</td>
                        <td className="px-2 py-1.5 text-center font-bold text-[#1e3a5f]">{g.transmuted || '\u2014'}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            g.transmuted >= 75 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                          }`}>
                            {g.transmuted >= 75 ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sf10Grades.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No grade data available.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-5 pt-3 border-t border-border flex justify-between text-[0.55rem] text-muted-foreground">
                  <div className="text-center flex-1">
                    <p>___________________________</p>
                    <p className="font-semibold text-foreground mt-0.5">Teacher / Adviser</p>
                  </div>
                  <div className="text-center flex-1">
                    <p>___________________________</p>
                    <p className="font-semibold text-foreground mt-0.5">Principal / School Head</p>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
      {tab === 'sf10' && !sf10StudentId && (
        <div className="py-16 text-center text-muted-foreground text-sm">Select a student to view their permanent record.</div>
      )}
    </div>
  )
}
