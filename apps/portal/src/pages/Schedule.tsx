import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore'
import { CalendarDays } from 'lucide-react'
import { db, type AppUser, type Class, type Subject, type Enrollment } from '@pbclc/shared'
import Spinner from '../components/ui/Spinner'

interface ScheduleItem {
  classId: string
  subjectCode: string
  subjectTitle: string
  section: string
  time: string
  room: string
  days: string[]
}

const DAY_ABBR: Record<string, string> = { M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', S: 'Sat' }
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseSchedule(schedule: string): { days: string[]; time: string } {
  const parts = schedule.split(' ')
  if (parts.length < 2) return { days: [], time: schedule }
  const raw = parts[0]
  const time = parts.slice(1).join(' ')
  const days: string[] = []
  let i = 0
  while (i < raw.length) {
    if (raw[i] === 'T' && raw[i + 1] === 'h') { days.push('Th'); i += 2; continue }
    days.push(raw[i]); i++
  }
  return { days: days.map(d => DAY_ABBR[d]).filter(Boolean), time }
}

function ScheduleCard({ item }: { item: ScheduleItem }) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="text-xs font-mono font-bold text-[#1e3a5f] bg-[#1e3a5f]/8 px-1.5 py-0.5 rounded inline-block mb-1.5">
        {item.subjectCode}
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight mb-1 line-clamp-2">{item.subjectTitle}</p>
      <p className="text-[0.65rem] text-[#8b6914] font-semibold mb-1">{item.section}</p>
      <p className="text-[0.65rem] text-muted-foreground">{item.time}</p>
      <p className="text-[0.65rem] text-muted-foreground mt-0.5">{item.room}</p>
    </div>
  )
}

export default function Schedule({ user }: { user: AppUser }) {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (user.role === 'teacher') {
        return loadTeacherSchedule()
      } else {
        return loadStudentSchedule()
      }
    }
    load().finally(() => setLoading(false))
  }, [user])

  function loadTeacherSchedule() {
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id)),
      async (snap) => {
        const result: ScheduleItem[] = []
        for (const d of snap.docs) {
          const cls = { id: d.id, ...d.data() } as Class
          const subjSnap = await getDoc(doc(db, 'subjects', cls.subjectId))
          if (!subjSnap.exists()) continue
          const subject = { id: subjSnap.id, ...subjSnap.data() } as Subject
          const { days, time } = parseSchedule(cls.schedule)
          if (!days.length) continue
          result.push({
            classId: cls.id,
            subjectCode: subject.code,
            subjectTitle: subject.title,
            section: cls.section,
            time,
            room: cls.room,
            days,
          })
        }
        setItems(result)
      }
    )
    return unsub
  }

  function loadStudentSchedule() {
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.id)),
      async (snap) => {
        const enrollmentIds = snap.docs.map(d => (d.data() as Enrollment).classId)
        if (!enrollmentIds.length) { setItems([]); return }
        const result: ScheduleItem[] = []
        for (const classId of enrollmentIds) {
          const classSnap = await getDoc(doc(db, 'classes', classId))
          if (!classSnap.exists()) continue
          const cls = { id: classSnap.id, ...classSnap.data() } as Class
          const subjSnap = await getDoc(doc(db, 'subjects', cls.subjectId))
          if (!subjSnap.exists()) continue
          const subject = { id: subjSnap.id, ...subjSnap.data() } as Subject
          const { days, time } = parseSchedule(cls.schedule)
          if (!days.length) continue
          result.push({
            classId: cls.id,
            subjectCode: subject.code,
            subjectTitle: subject.title,
            section: cls.section,
            time,
            room: cls.room,
            days,
          })
        }
        setItems(result)
      }
    )
    return unsub
  }

  const grid = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {}
    for (const day of DAY_ORDER) map[day] = []
    for (const item of items) {
      for (const day of item.days) {
        if (map[day]) map[day].push(item)
      }
    }
    return map
  }, [items])

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Class Schedule
      </h1>
      <p className="text-sm text-muted-foreground mb-7">{user.name} &middot; {user.role === 'teacher' ? 'Teacher' : user.section || 'Student'}</p>

      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">No scheduled classes yet. {user.role === 'teacher' ? 'Create a class to get started.' : 'Your schedule will appear once you are enrolled in classes.'}</p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-6 gap-3">
          {DAY_ORDER.map(day => (
            <div key={day}>
              <div className="text-center text-xs font-bold text-[#1e3a5f] uppercase tracking-wider bg-[#1e3a5f]/8 rounded-lg py-2 mb-3">
                {day}
              </div>
              <div className="space-y-2">
                {grid[day].length === 0 && (
                  <p className="text-[0.6rem] text-muted-foreground text-center py-4">â€”</p>
                )}
                {grid[day].map(item => (
                  <ScheduleCard key={item.classId + day} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
