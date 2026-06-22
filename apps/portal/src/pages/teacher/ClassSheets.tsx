import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { Printer, FileText, CheckSquare, Table } from 'lucide-react'
import { db, fetchSubjectsByIds, fetchUsersByIds, type AppUser, type Class, type Subject, type GradeScore, type AttendanceRecord, computeFinalGrade, transmute, getGradeDescriptor } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

type SheetTab = 'roster' | 'attendance' | 'grades'

export default function ClassSheets({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [tab, setTab] = useState<SheetTab>('roster')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [scores, setScores] = useState<GradeScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const classData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))
        const subjectMap = await fetchSubjectsByIds(classData.map(c => c.subjectId))
        const result = classData
          .map(cls => {
            const subject = subjectMap.get(cls.subjectId)
            return subject ? { ...cls, subject } as Class & { subject: Subject } : null
          })
          .filter(Boolean) as (Class & { subject: Subject })[]
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    async function load() {
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', selectedClassId)))
      const studentIds = enrollSnap.docs.map(d => d.data().studentId)
      const userMap = await fetchUsersByIds(studentIds)
      const list = studentIds
        .map(id => {
          const user = userMap.get(id)
          return user ? { id, name: user.name } : null
        })
        .filter(Boolean) as { id: string; name: string }[]
      setStudents(list)

      const attSnap = await getDocs(query(collection(db, 'attendance'), where('classId', '==', selectedClassId)))
      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))

      const grSnap = await getDocs(query(collection(db, 'grades'), where('classId', '==', selectedClassId)))
      setScores(grSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore)))
    }
    load()
  }, [selectedClassId])

  function handlePrint() { window.print() }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const dates = [...new Set(attendance.map(a => a.date))].sort()

  if (loading) return <Spinner />

  const TABS: { key: SheetTab; icon: typeof FileText; label: string }[] = [
    { key: 'roster', icon: FileText, label: 'Class Roster' },
    { key: 'attendance', icon: CheckSquare, label: 'Attendance Sheet' },
    { key: 'grades', icon: Table, label: 'Grade Sheet' },
  ]

  return (
    <div>
      <div className="flex items-start justify-between mb-7 no-print">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">Class Sheets</h1>
          {selectedClass && (
            <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} · {selectedClass.section}</p>
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
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 no-print">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-[#1e3a5f] text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}>
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {tab === 'roster' && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-[#1e3a5f] text-center">
            <h2 className="text-base font-bold text-[#1e3a5f]">Class Roster</h2>
            <p className="text-xs text-muted-foreground">{selectedClass?.subject.title} ({selectedClass?.subject.code}) — {selectedClass?.section}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-xs">
                <th className="text-left px-5 py-3 font-semibold w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold">Student Name</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="px-5 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No students enrolled.</p>}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-x-auto">
          <div className="px-6 py-4 border-b-2 border-[#1e3a5f] text-center">
            <h2 className="text-base font-bold text-[#1e3a5f]">Attendance Sheet</h2>
            <p className="text-xs text-muted-foreground">{selectedClass?.subject.title} ({selectedClass?.subject.code}) — {selectedClass?.section}</p>
          </div>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-xs">
                <th className="text-left px-3 py-3 font-semibold sticky left-0 bg-[#1e3a5f]">Student</th>
                {dates.map(d => (
                  <th key={d} className="px-2 py-3 font-semibold text-center min-w-[40px]">{new Date(d).getDate()}</th>
                ))}
                {dates.length === 0 && <th className="px-4 py-3 font-semibold text-center">No records</th>}
                <th className="px-3 py-3 font-semibold text-center">P</th>
                <th className="px-3 py-3 font-semibold text-center">A</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const studentAtt = attendance.filter(a => a.studentId === s.id)
                const present = studentAtt.filter(a => a.status === 'PRESENT').length
                const absent = studentAtt.filter(a => a.status === 'ABSENT').length
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-white">{s.name}</td>
                    {dates.map(d => {
                      const rec = studentAtt.find(a => a.date === d)
                      const status = rec?.status || ''
                      return (
                        <td key={d} className={`px-2 py-2 text-center text-xs font-bold ${
                          status === 'PRESENT' ? 'text-emerald-600' :
                          status === 'ABSENT' ? 'text-red-600' :
                          status === 'EXCUSED' ? 'text-amber-600' :
                          status === 'TARDY' ? 'text-orange-600' : ''
                        }`}>
                          {status === 'PRESENT' ? '/' : status === 'ABSENT' ? 'X' : status === 'EXCUSED' ? 'E' : status === 'TARDY' ? 'T' : ''}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-center text-xs font-bold text-emerald-600">{present}</td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-red-600">{absent}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'grades' && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-x-auto">
          <div className="px-6 py-4 border-b-2 border-[#1e3a5f] text-center">
            <h2 className="text-base font-bold text-[#1e3a5f]">Grade Sheet</h2>
            <p className="text-xs text-muted-foreground">{selectedClass?.subject.title} ({selectedClass?.subject.code}) — {selectedClass?.section}</p>
          </div>
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-xs">
                <th className="text-left px-4 py-3 font-semibold">Student</th>
                {selectedClass?.subject.gradingComponents.map(comp => (
                  <th key={comp.id} className="px-3 py-3 font-semibold text-center">{comp.name} ({comp.weight}%)</th>
                ))}
                <th className="px-3 py-3 font-semibold text-center">Initial</th>
                <th className="px-3 py-3 font-semibold text-center">Transmuted</th>
                <th className="px-3 py-3 font-semibold text-center">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const studentScores = scores.filter(g => g.studentId === s.id)
                const final = selectedClass ? computeFinalGrade(studentScores, selectedClass.subject.gradingComponents) : 0
                const t = transmute(final)
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    {selectedClass?.subject.gradingComponents.map(comp => {
                      const compScores = studentScores.filter(g => g.componentId === comp.id)
                      const avg = compScores.length ? Math.round(compScores.reduce((a, g) => a + (g.score / g.maxScore) * 100, 0) / compScores.length) : 0
                      return <td key={comp.id} className="px-3 py-2.5 text-center text-xs font-mono">{avg || '—'}</td>
                    })}
                    <td className="px-3 py-2.5 text-center font-bold">{final || '—'}</td>
                    <td className="px-3 py-2.5 text-center font-bold">{t || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{t ? getGradeDescriptor(t) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {students.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No students enrolled.</p>}
        </div>
      )}
    </div>
  )
}
