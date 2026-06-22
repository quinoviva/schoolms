import { useEffect, useState, useMemo, useCallback } from 'react'
import { collection, onSnapshot, getDocs, query, where, getCountFromServer, limit } from 'firebase/firestore'
import { db, type AppUser, type Class, type Subject, type GradeScore, type AttendanceRecord, type AcademicTerm } from '@pbclc/shared'
import { GraduationCap, Users, School, Award, Layers, BookOpenCheck, CalendarDays, Loader2, RefreshCw } from 'lucide-react'
import Spinner from '../components/ui/Spinner'

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

interface BarItem {
  label: string
  value: number
  color: string
}

function BarChart({ items, title, max }: { items: BarItem[]; title?: string; max?: number }) {
  const maxVal = max ?? Math.max(...items.map(i => i.value), 1)
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      {title && <h3 className="text-sm font-bold text-foreground mb-4">{title}</h3>}
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground truncate">{item.label}</span>
              <span className="font-bold text-muted-foreground ml-2">{item.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary/70 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TeacherLoad {
  name: string
  count: number
}

interface GradeLevelCount {
  level: string
  count: number
}

interface AttendanceRate {
  className: string
  rate: number
}

interface SubjectAvg {
  name: string
  avg: number
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<number | null>(null)
  const [teachers, setTeachers] = useState<number | null>(null)
  const [classes, setClasses] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<number | null>(null)
  const [sections, setSections] = useState<number | null>(null)
  const [enrollments, setEnrollments] = useState<number | null>(null)
  const [terms, setTerms] = useState(0)
  const [activeTerms, setActiveTerms] = useState(0)
  const [termList, setTermList] = useState<AcademicTerm[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')

  const [gradeLevels, setGradeLevels] = useState<GradeLevelCount[]>([])
  const [teacherLoad, setTeacherLoad] = useState<TeacherLoad[]>([])
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)

  useEffect(() => {
    async function loadCounts() {
      const [stuCount, tchCount, clsCount, subjCount, sectCount, enrollCount] = await Promise.all([
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'))),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'teacher'))),
        getCountFromServer(collection(db, 'classes')),
        getCountFromServer(collection(db, 'subjects')),
        getCountFromServer(collection(db, 'sections')),
        getCountFromServer(collection(db, 'enrollments')),
      ])
      setStudents(stuCount.data().count)
      setTeachers(tchCount.data().count)
      setClasses(clsCount.data().count)
      setSubjects(subjCount.data().count)
      setSections(sectCount.data().count)
      setEnrollments(enrollCount.data().count)
    }
    loadCounts()

    const unsubTerms = onSnapshot(collection(db, 'terms'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTerm))
      setTermList(all)
      setTerms(all.length)
      setActiveTerms(all.filter(t => t.isActive).length)
    })
    return () => unsubTerms()
  }, [])

  const activeTermId = selectedTermId || termList.find(t => t.isActive)?.id || ''

  useEffect(() => {
    async function loadAnalytics() {
      const classQuery = activeTermId ? query(collection(db, 'classes'), where('termId', '==', activeTermId)) : collection(db, 'classes')
      const enrollQuery = activeTermId ? query(collection(db, 'enrollments'), where('termId', '==', activeTermId)) : collection(db, 'enrollments')

      const classSnap = await getDocs(classQuery)
      const classList = classSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class & { id: string }))

      const enrollSnap = await getDocs(enrollQuery)
      const enrollList = enrollSnap.docs.map(d => d.data() as { studentId: string; classId: string })

      const uniqueStudentIds = [...new Set(enrollList.map(e => e.studentId))]
      const uniqueTeacherIds = [...new Set(classList.map(c => c.teacherId))]

      // Teacher workload
      const loadMap: Record<string, number> = {}
      for (const c of classList) loadMap[c.teacherId] = (loadMap[c.teacherId] || 0) + 1
      const topTeachers = Object.entries(loadMap).sort((a, b) => b[1] - a[1]).slice(0, 20)

      const teacherNamePromises = topTeachers.map(async ([id, count]) => {
        const snap = await getDocs(query(collection(db, 'users'), where('__name__', '==', id), limit(1)))
        const name = snap.empty ? id.slice(0, 8) : snap.docs[0].data().name
        return { name, count }
      })
      const teacherLoadList = await Promise.all(teacherNamePromises)
      setTeacherLoad(teacherLoadList)

      setAnalyticsLoaded(true)
    }
    loadAnalytics()
  }, [activeTermId])

  const loading = students === null || teachers === null || classes === null || subjects === null

  if (loading) return <Spinner text="Loading dashboard..." />

  const COLORS = ['#1e3a5f', '#4a7db5', '#8b6914', '#c4a32a', '#2d5a8e', '#6b8c42', '#b5651d', '#5a7a9a']

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Administrative Dashboard
      </h1>
      <p className="text-sm text-muted-foreground mb-7">Owly School Management System</p>

      <div className="mb-6">
        <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
          <option value="">All Terms</option>
          {termList.map(t => (
            <option key={t.id} value={t.id}>{t.label} ({t.semester}){t.isActive ? ' • Active' : ''}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard icon={GraduationCap} label="Students" value={students ?? 0} />
        <StatCard icon={Users} label="Teachers" value={teachers ?? 0} />
        <StatCard icon={BookOpenCheck} label="Enrollments" value={enrollments ?? 0} />
        <StatCard icon={School} label="Classes" value={classes ?? 0} />
        <StatCard icon={Award} label="Subjects" value={subjects ?? 0} />
        <StatCard icon={Layers} label="Sections" value={sections ?? 0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CalendarDays} label="Total Terms" value={terms} />
        <StatCard icon={CalendarDays} label="Active Terms" value={activeTerms} />
      </div>

      {!analyticsLoaded ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading analytics...
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {gradeLevels.length > 0 && (
            <BarChart
              title="Enrollment by Grade Level"
              items={gradeLevels.map((g, i) => ({ label: g.level, value: g.count, color: COLORS[i % COLORS.length] }))}
            />
          )}

          {teacherLoad.length > 0 && (
            <BarChart
              title="Teacher Workload (Classes per Teacher)"
              items={teacherLoad.map((t, i) => ({ label: t.name, value: t.count, color: COLORS[i % COLORS.length] }))}
            />
          )}

          {gradeLevels.length === 0 && teacherLoad.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
              Select a term to view analytics.
            </div>
          )}
        </div>
      )}

      {students === 0 && (
        <div className="mt-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/5 flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} className="text-[#1e3a5f]/40" />
          </div>
          <p className="text-muted-foreground font-medium">No data yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Start by adding users and creating terms.</p>
        </div>
      )}
    </div>
  )
}
