import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { School, Users, CheckCircle2, TrendingUp, Calendar } from 'lucide-react'
import { db, mergeClassesWithSubjects, type AppUser, type Class, type Subject } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'

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

export default function TeacherDashboard({ user, onNav }: { user: AppUser; onNav?: (p: string) => void }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [todayClasses, setTodayClasses] = useState<(Class & { subject: Subject })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const result = await mergeClassesWithSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)))
        setClasses(result)

        const classIds = result.map(c => c.id)
        let studentCount = 0
        if (classIds.length) {
          const enrollSnaps = await Promise.all(classIds.map(cid => getDocs(query(collection(db, 'enrollments'), where('classId', '==', cid)))))
          studentCount = [...new Set(enrollSnaps.flatMap(e => e.docs.map(d => d.data().studentId)))].length
        }
        setTotalStudents(studentCount)

        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
        const todayCls = result.filter(c => c.schedule.toUpperCase().includes(today))
        setTodayClasses(todayCls.slice(0, 5))
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Welcome, {user.name.split(' ')[0]}.
      </h1>
      <p className="text-sm text-muted-foreground mb-7">Teacher Dashboard</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={School} label="Active Classes" value={classes.length} />
        <StatCard icon={Users} label="Total Students" value={totalStudents} />
        <StatCard icon={CheckCircle2} label="Today's Classes" value={todayClasses.length} />
        <StatCard icon={TrendingUp} label="Subjects" value={classes.filter((c, i, a) => a.findIndex(x => x.subjectId === c.subjectId) === i).length} />
      </div>

      {todayClasses.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-8">
          <h2 className="text-sm font-bold text-[#1e3a5f] mb-4 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} /> Today's Schedule
          </h2>
          <div className="space-y-2">
            {todayClasses.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-secondary/40 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.subject.code} — {c.section}</p>
                  <p className="text-xs text-muted-foreground">{c.schedule} · {c.room}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onNav?.('grades')}
                    className="text-xs px-2.5 py-1 rounded bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors">
                    Grades
                  </button>
                  <button onClick={() => onNav?.('attendance')}
                    className="text-xs px-2.5 py-1 rounded bg-white border border-border text-foreground font-semibold hover:bg-secondary transition-colors">
                    Attendance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {classes.length === 0 && (
        <div className="text-center py-16">
          <School size={40} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">No classes assigned yet. Contact the admin.</p>
        </div>
      )}
    </div>
  )
}
