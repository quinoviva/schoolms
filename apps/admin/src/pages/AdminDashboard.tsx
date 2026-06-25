import { useEffect, useState } from 'react'
import { listUsers, listClasses, listSubjects, listSections, listEnrollments, listTerms,
  type AppUser, type Class, type AcademicTerm } from '@academix/shared'
import { GraduationCap, Users, School, Award, Layers, BookOpenCheck, CalendarDays, Loader2 } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../contexts/AuthContext'

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

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
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
    if (!schoolId) return
    async function load() {
      const [allUsers, allClasses, allSubjects, allSections, allEnrollments, allTerms] = await Promise.all([
        listUsers({ schoolId }),
        listClasses({ schoolId }),
        listSubjects({ schoolId }),
        listSections({ schoolId }),
        listEnrollments(),
        listTerms(schoolId),
      ])
      setStudents(allUsers.filter(u => u.role === 'student').length)
      setTeachers(allUsers.filter(u => u.role === 'teacher').length)
      setClasses(allClasses.length)
      setSubjects(allSubjects.length)
      setSections(allSections.length)
      setEnrollments(allEnrollments.length)
      setTermList(allTerms)
      setTerms(allTerms.length)
      setActiveTerms(allTerms.filter(t => t.isActive).length)
    }
    load()
  }, [schoolId])

  const activeTermId = selectedTermId || termList.find(t => t.isActive)?.id || ''

  useEffect(() => {
    if (!schoolId) return
    async function loadAnalytics() {
      const allClasses = await listClasses({ schoolId, termId: activeTermId || undefined })
      const allEnrollments = await listEnrollments()
      const classEnrollments = activeTermId
        ? allEnrollments.filter(e => e.termId === activeTermId)
        : allEnrollments

      const uniqueTeacherIds = [...new Set(allClasses.map(c => c.teacherId))]

      const loadMap: Record<string, number> = {}
      for (const c of allClasses) loadMap[c.teacherId] = (loadMap[c.teacherId] || 0) + 1
      const topTeachers = Object.entries(loadMap).sort((a, b) => b[1] - a[1]).slice(0, 20)

      const allSubjects = await listSubjects({ schoolId })
      const allUsers = await listUsers({ schoolId })
      const teacherLoadList = topTeachers.map(([id, count]) => {
        const user = allUsers.find(u => u.id === id)
        return { name: user?.name || id.slice(0, 8), count }
      })
      setTeacherLoad(teacherLoadList)

      const enrollByClass: Record<string, number> = {}
      for (const e of classEnrollments) {
        enrollByClass[e.classId] = (enrollByClass[e.classId] || 0) + 1
      }

      const gradeLevelsMap: Record<string, number> = {}
      for (const cls of allClasses) {
        const subject = allSubjects.find(s => s.id === cls.subjectId)
        const level = subject?.gradeLevel || 'Unknown'
        gradeLevelsMap[level] = (gradeLevelsMap[level] || 0) + (enrollByClass[cls.id] || 0)
      }
      setGradeLevels(Object.entries(gradeLevelsMap).map(([level, count]) => ({ level, count })))

      setAnalyticsLoaded(true)
    }
    loadAnalytics()
  }, [activeTermId, schoolId])

  const loading = students === null || teachers === null || classes === null || subjects === null

  if (loading) return <Spinner text="Loading dashboard..." />

  const COLORS = ['#1a365d', '#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#1d4ed8', '#0f172a', '#475569']

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Administrative Dashboard
      </h1>
      <p className="text-sm text-muted-foreground mb-7">ACADEMIX</p>

      <div className="mb-6">
        <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
          <option value="">All Terms</option>
          {termList.map(t => (
            <option key={t.id} value={t.id}>{t.label} ({t.semester}){t.isActive ? ' — Active' : ''}</option>
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
