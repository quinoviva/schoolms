import { useEffect, useState, useRef } from 'react'
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db, type AppUser, type Class, type Subject, type AttendanceStatus, type AttendanceRecord } from '@pbclc/shared'
import { CheckCircle2 } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { showToast } from '../../components/ui/toast'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('')
}

export default function Attendance({ user }: { user: AppUser }) {
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const studentsRef = useRef<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id)),
      async (snap) => {
        const result: (Class & { subject: Subject })[] = []
        for (const d of snap.docs) {
          const cls = { id: d.id, ...d.data() } as Class
          const subjSnap = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', cls.subjectId)))
          if (!subjSnap.empty) {
            const subject = { id: subjSnap.docs[0].id, ...subjSnap.docs[0].data() } as Subject
            result.push({ ...cls, subject })
          }
        }
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('classId', '==', selectedClassId)),
      async (snap) => {
        const studentIds = snap.docs.map(d => d.data().studentId)
        const result: { id: string; name: string }[] = []
        for (const sid of studentIds) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', sid)))
          if (!userSnap.empty) {
            result.push({ id: sid, name: userSnap.docs[0].data().name })
          }
        }
        setStudents(result)
        studentsRef.current = result
      }
    )
    return unsub
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedClassId || !date) return
    const unsub = onSnapshot(
      query(
        collection(db, 'attendance'),
        where('classId', '==', selectedClassId),
        where('date', '==', date),
      ),
      (snap) => {
        const att: Record<string, AttendanceStatus> = {}
        snap.docs.forEach(d => {
          const data = d.data() as AttendanceRecord
          att[data.studentId] = data.status
        })
        studentsRef.current.forEach(s => {
          if (!att[s.id]) att[s.id] = 'PRESENT'
        })
        setAttendance(att)
      }
    )
    return unsub
  }, [selectedClassId, date])

  async function handleSave() {
    if (!selectedClassId) return
    setSaving(true)
    try {
      const batch = writeBatch(db)
      const existingSnap = await getDocs(query(
        collection(db, 'attendance'),
        where('classId', '==', selectedClassId),
        where('date', '==', date),
      ))
      existingSnap.docs.forEach(d => batch.delete(doc(db, 'attendance', d.id)))

      for (const [studentId, status] of Object.entries(attendance)) {
        const ref = doc(collection(db, 'attendance'))
        batch.set(ref, {
          studentId, classId: selectedClassId, date, status,
          remarks: '', recordedBy: user.id,
        } satisfies Omit<AttendanceRecord, 'id'>)
      }
      await batch.commit()
      showToast('Attendance saved!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to save attendance.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'EXCUSED', 'TARDY']
  const statusStyle: Record<AttendanceStatus, string> = {
    PRESENT: 'text-emerald-600', ABSENT: 'text-red-600', EXCUSED: 'text-amber-600', TARDY: 'text-blue-600',
  }
  const counts = statuses.map(v => ({ v, n: Object.values(attendance).filter(a => a === v).length }))

  const selectedClass = classes.find(c => c.id === selectedClassId)

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Daily Attendance
          </h1>
          {selectedClass && (
            <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} Â· {selectedClass.section}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      <div className="flex gap-4 mb-5">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25"
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.subject.code} â€” {c.section}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25"
        />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {counts.map(({ v, n }) => (
          <div key={v} className="bg-card rounded-xl border border-border px-4 py-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${statusStyle[v]}`}>{n}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{v.charAt(0) + v.slice(1).toLowerCase()}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-5 py-3 bg-[#1e3a5f] text-white text-xs font-semibold">
          <span className="col-span-2">Student Name</span>
          {statuses.map(v => <span key={v} className="text-center opacity-90">{v}</span>)}
        </div>
        {students.map((s, i) => (
          <div key={s.id} className={`grid grid-cols-6 gap-4 px-5 py-4 items-center border-b border-border/60 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
            <div className="col-span-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] text-xs font-bold shrink-0">
                {initials(s.name)}
              </div>
              <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
            </div>
            {statuses.map(v => (
              <div key={v} className="flex justify-center">
                <input
                  type="radio"
                  name={s.id}
                  checked={attendance[s.id] === v}
                  onChange={() => setAttendance(prev => ({ ...prev, [s.id]: v }))}
                  className="w-4 h-4 cursor-pointer accent-[#1e3a5f]"
                />
              </div>
            ))}
          </div>
        ))}
        <div className="px-5 py-3 bg-secondary/30 text-xs text-muted-foreground flex justify-between">
          <span>{students.length} students Â· {date}</span>
        </div>
      </div>
    </div>
  )
}
