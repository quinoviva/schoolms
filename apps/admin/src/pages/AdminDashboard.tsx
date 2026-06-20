import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, getDocs, query, where } from 'firebase/firestore'
import { db, type AppUser, type Class, type Subject, type GradeScore, type AttendanceRecord, type AcademicTerm } from '@pbclc/shared'
import { GraduationCap, Users, School, Award, Layers, BookOpenCheck, CalendarDays, Loader2 } from 'lucide-react'
import Spinner from '../components/ui/Spinner'

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string | number }) {
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
  const [attendanceRates, setAttendanceRates] = useState<AttendanceRate[]>([])
  const [subjectAvgs, setSubjectAvgs] = useState<SubjectAvg[]>([])
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const all = snap.docs.map(d => d.data() as { role: string })
      setStudents(all.filter(u => u.role === 'student').length)
      setTeachers(all.filter(u => u.role === 'teacher').length)
    })
    const unsubClasses = onSnapshot(collection(db, 'classes'), snap => setClasses(snap.size))
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.size))
    const unsubSections = onSnapshot(collection(db, 'sections'), snap => setSections(snap.size))
    const unsubEnroll = onSnapshot(collection(db, 'enrollments'), snap => setEnrollments(snap.size))
    const unsubTerms = onSnapshot(collection(db, 'terms'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTerm))
      setTermList(all)
      setTerms(all.length)
      setActiveTerms(all.filter(t => t.isActive).length)
    })
    return () => { unsubUsers(); unsubClasses(); unsubSubjects(); unsubSections(); unsubEnroll(); unsubTerms() }
  }, [])

  const activeTermId = selectedTermId || termList.find(t => t.isActive)?.id || ''

  useEffect(() => {
    async function loadAnalytics() {
      const classQuery = activeTermId ? query(collection(db, 'classes'), where('termId', '==', activeTermId)) : collection(db, 'classes')
      const enrollQuery = activeTermId ? query(collection(db, 'enrollments'), where('termId', '==', activeTermId)) : collection(db, 'enrollments')

      const [userSnap, classSnap, subjSnap, enrollSnap, sectSnap, attSnap, gradeSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(classQuery),
        getDocs(collection(db, 'subjects')),
        getDocs(enrollQuery),
        getDocs(collection(db, 'sections')),
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'grades')),
      ])

      const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser & { id: string }))
      const classList = classSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class & { id: string }))
      const subjList = subjSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject & { id: string }))
      const sectList = sectSnap.docs.map(d => ({ id: d.id, ...d.data() } as { name: string; gradeLevel?: string }))
      const enrollList = enrollSnap.docs.map(d => d.data() as { studentId: string; classId: string })
      const attList = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord & { id: string }))
      const gradeList = gradeSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore & { id: string }))

      const studentsData = users.filter(u => u.role === 'student')
      const teachersData = users.filter(u => u.role === 'teacher')

      // Enrollment by grade level
      const sectionMap: Record<string, string> = {}
      for (const s of sectList) sectionMap[s.name] = s.gradeLevel || ''
      const gradeMap: Record<string, number> = {}
      for (const s of studentsData) {
        const gl = sectionMap[s.section] || s.section || 'Ungrouped'
        gradeMap[gl] = (gradeMap[gl] || 0) + 1
      }
      setGradeLevels(
        Object.entries(gradeMap)
          .map(([level, count]) => ({ level, count }))
          .sort((a, b) => a.level.localeCompare(b.level))
      )

      // Teacher workload
      const loadMap: Record<string, number> = {}
      for (const c of classList) {
        loadMap[c.teacherId] = (loadMap[c.teacherId] || 0) + 1
      }
      setTeacherLoad(
        Object.entries(loadMap)
          .map(([id, count]) => ({
            name: teachersData.find(t => t.id === id)?.name || id.slice(0, 8),
            count,
          }))
          .sort((a, b) => b.count - a.count)
      )

      // Attendance rate per class
      if (attList.length) {
        const attByClass: Record<string, { present: number; total: number }> = {}
        for (const a of attList) {
          if (!attByClass[a.classId]) attByClass[a.classId] = { present: 0, total: 0 }
          attByClass[a.classId].total++
          if (a.status === 'PRESENT') attByClass[a.classId].present++
        }
        setAttendanceRates(
          Object.entries(attByClass).map(([cid, d]) => {
            const cls = classList.find(c => c.id === cid)
            const subj = cls ? subjList.find(s => s.id === cls.subjectId) : undefined
            return {
              className: subj?.code || cid.slice(0, 8),
              rate: Math.round((d.present / d.total) * 100),
            }
          }).sort((a, b) => a.rate - b.rate).slice(0, 10)
        )
      }

      // Subject grade averages
      if (gradeList.length && subjList.length) {
        const gradeByComp: Record<string, { total: number; count: number }> = {}
        for (const g of gradeList) {
          if (!gradeByComp[g.componentId]) gradeByComp[g.componentId] = { total: 0, count: 0 }
          gradeByComp[g.componentId].total += (g.score / g.maxScore) * 100
          gradeByComp[g.componentId].count++
        }
        const avgByClass: Record<string, number> = {}
        for (const g of gradeList) {
          if (!avgByClass[g.classId]) {
            const cls = classList.find(c => c.id === g.classId)
            const subj = cls ? subjList.find(s => s.id === cls.subjectId) : undefined
            if (!subj?.gradingComponents) continue
            let weighted = 0
            for (const comp of subj.gradingComponents) {
              const stats = gradeByComp[comp.id]
              if (stats) {
                weighted += (stats.total / stats.count) * (comp.weight / 100)
              }
            }
            avgByClass[g.classId] = Math.round(weighted)
          }
        }
        setSubjectAvgs(
          Object.entries(avgByClass).map(([cid, avg]) => {
            const cls = classList.find(c => c.id === cid)
            const subj = cls ? subjList.find(s => s.id === cls.subjectId) : undefined
            return {
              name: subj?.code || cid.slice(0, 8),
              avg,
            }
          }).sort((a, b) => b.avg - a.avg)
        )
      }

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

          {attendanceRates.length > 0 && (
            <BarChart
              title="Attendance Rate (Worst → Best)"
              items={attendanceRates.map(a => ({
                label: a.className,
                value: a.rate,
                color: a.rate >= 80 ? '#2d5a8e' : a.rate >= 60 ? '#8b6914' : '#c0392b',
              }))}
            />
          )}

          {subjectAvgs.length > 0 && (
            <BarChart
              title="Average Grade per Subject"
              items={subjectAvgs.map(s => ({
                label: s.name,
                value: s.avg,
                color: s.avg >= 85 ? '#2d5a8e' : s.avg >= 75 ? '#8b6914' : '#c0392b',
              }))}
              max={100}
            />
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
