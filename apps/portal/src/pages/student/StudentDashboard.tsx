import { useEffect, useState } from 'react'
import { BookOpen, Award, TrendingUp, CheckCircle2, Megaphone } from 'lucide-react'
import {
  listEnrollments, listGrades, listAttendance, listNotifications,
  getClass, listSubjects,
  markNotificationRead as markNotifRead,
  type AppUser, type GradeScore, type AttendanceRecord, type Subject,
  type Class, type Notification
} from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'

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
  useAuth()
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
    let cancelled = false
    async function load() {
      try {
        const [enrollments, scores, attendance, notifs] = await Promise.all([
          listEnrollments({ studentId: user.id }),
          listGrades({ studentId: user.id }),
          listAttendance({ studentId: user.id }),
          listNotifications(user.id),
        ])
        if (cancelled) return
        const cids = enrollments.map(e => e.classId)
        setEnrolledCount(cids.length)
        setClassIds(cids)
        setAllScores(scores)
        setAttendanceRecords(attendance)
        setNotifications(notifs)
        setUnreadCount(notifs.filter(n => !n.read).length)

        if (cids.length) {
          const classes = (await Promise.all(cids.map(cid => getClass(cid)))).filter(Boolean) as Class[]
          if (cancelled) return
          const subjectIds = [...new Set(classes.map(c => c.subjectId).filter(Boolean))]
          const allSubjects = await listSubjects({ schoolId })
          if (cancelled) return
          const subjectsMap = new Map(allSubjects.map(s => [s.id, s]))

          const grades: SubjectGrade[] = []
          for (const cls of classes) {
            const subject = subjectsMap.get(cls.subjectId)
            if (!subject) continue
            const clsScores = scores.filter(s => s.classId === cls.id)
            let final = 0
            for (const comp of subject.gradingComponents) {
              const compScores = clsScores.filter(s => s.componentId === comp.id)
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

          if (attendance.length) {
            const present = attendance.filter(a => a.status === 'P').length
            setAttendanceRate(Math.round((present / attendance.length) * 100))
          } else {
            setAttendanceRate(null)
          }
        } else {
          setSubjectGrades([])
          setAverageGrade(null)
          setAttendanceRate(null)
        }
        setReady(true)
      } catch (err) {
        console.error(err)
        setReady(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.id, schoolId])

  async function markNotificationRead(id: string) {
    try {
      await markNotifRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
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
