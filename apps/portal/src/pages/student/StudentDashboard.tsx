import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, orderBy, limit, updateDoc } from 'firebase/firestore'
import { BookOpen, Award, TrendingUp, CheckCircle2, Megaphone } from 'lucide-react'
import { db, fetchDocsByIds, fetchSubjectsByIds, type AppUser, type GradeScore, type AttendanceRecord, type Subject, type Class, type Notification } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

interface SubjectGrade {
  code: string
  title: string
  grade: number
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex gap-4 items-start shadow-sm">
      <div className="p-2.5 rounded-lg shrink-0 bg-[#1e3a5f]/8 text-[#1e3a5f]">
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.7rem] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  )
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function StudentDashboard({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [classIds, setClassIds] = useState<string[]>([])
  const [allScores, setAllScores] = useState<GradeScore[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([])
  const [averageGrade, setAverageGrade] = useState<number | null>(null)
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.id), where('schoolId', '==', schoolId)),
      (snap) => {
        setEnrolledCount(snap.size)
        setClassIds(snap.docs.map(d => d.data().classId))
      }
    )
    return unsub
  }, [user.id, schoolId])

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'grades'), where('studentId', '==', user.id), where('schoolId', '==', schoolId)),
      (snap) => {
        setAllScores(snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore)))
      }
    )
    return unsub
  }, [user.id, schoolId])

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'attendance'), where('studentId', '==', user.id), where('schoolId', '==', schoolId)),
      (snap) => {
        setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))
      }
    )
    return unsub
  }, [user.id, schoolId])

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(10)),
      (snap) => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))
        setNotifications(notifs)
        setUnreadCount(notifs.filter(n => !n.read).length)
      }
    )
    return unsub
  }, [user.id])

  useEffect(() => {
    if (!classIds.length) return
    const unsub = onSnapshot(
      query(collection(db, 'gradeReleases'), where('classId', 'in', classIds)),
      (snap) => {
        snap.docs.forEach(d => {
          const r = d.data() as { isReleased: boolean; classId: string }
          if (r.isReleased) compute()
        })
      }
    )
    return unsub
  }, [classIds])

  async function compute() {
    if (!classIds.length) {
      setSubjectGrades([])
      setAverageGrade(null)
      setAttendanceRate(null)
      setReady(true)
      return
    }

    const classesMap = await fetchDocsByIds<Class>('classes', classIds)
    const subjectIds = [...new Set([...classesMap.values()].map(c => c.subjectId).filter(Boolean))]
    const subjectsMap = await fetchSubjectsByIds(subjectIds)

    const grades: SubjectGrade[] = []
    for (const cls of classesMap.values()) {
      const subject = subjectsMap.get(cls.subjectId)
      if (!subject) continue
      const scores = allScores.filter(s => s.classId === cls.id)
      let final = 0
      for (const comp of subject.gradingComponents) {
        const compScores = scores.filter(s => s.componentId === comp.id)
        const avg = compScores.length
          ? compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length
          : 0
        final += avg * (comp.weight / 100)
      }
      grades.push({ code: subject.code, title: subject.title, grade: Math.round(final) })
    }
    setSubjectGrades(grades)

    if (grades.length) {
      setAverageGrade(Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length))
    } else {
      setAverageGrade(null)
    }

    if (attendanceRecords.length) {
      const present = attendanceRecords.filter(a => a.status === 'PRESENT').length
      setAttendanceRate(Math.round((present / attendanceRecords.length) * 100))
    } else {
      setAttendanceRate(null)
    }

    setReady(true)
  }

  useEffect(() => {
    compute()
  }, [classIds, allScores, attendanceRecords])

  async function markNotificationRead(id: string) {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true })
    } catch (err) { console.error('Failed to mark notification read:', err) }
  }

  if (!ready) return <Spinner />

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Welcome, {user.name.split(' ')[0]}.
      </h1>
      {user.section && <p className="text-sm text-muted-foreground mb-7">{user.section}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Enrolled Subjects" value={enrolledCount} />
        <StatCard icon={Award} label="Current Average" value={averageGrade !== null ? averageGrade : '—'} />
        <StatCard icon={TrendingUp} label="Subjects with Grade" value={subjectGrades.length} />
        <StatCard icon={CheckCircle2} label="Attendance Rate" value={attendanceRate !== null ? `${attendanceRate}%` : '—'} />
      </div>

      {subjectGrades.length > 0 && (
        <div className="mt-8 bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#1e3a5f] mb-4 uppercase tracking-wider">
            Grade Overview
          </h2>
          <div className="space-y-3">
            {subjectGrades.map((sg) => {
              const pct = Math.min(sg.grade, 100)
              const barColor = sg.grade >= 75 ? 'bg-emerald-500' : 'bg-red-400'
              return (
                <div key={sg.code} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground w-24 truncate shrink-0">{sg.code}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right shrink-0 ${sg.grade >= 75 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {sg.grade}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h2>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  n.read ? 'bg-secondary/20' : 'bg-[#1e3a5f]/5 border border-[#1e3a5f]/15'
                }`}
              >
                <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${
                  n.type === 'grade_released' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                }`}>
                  {n.type === 'grade_released' ? <CheckCircle2 size={16} /> : <Megaphone size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {enrolledCount === 0 && (
        <div className="mt-8 text-center text-muted-foreground text-sm">
          No data yet. Your grades and subjects will appear once your teacher adds them.
        </div>
      )}
    </div>
  )
}
