import { useEffect, useState } from 'react'
import { listSchools, listUsers, listSubjects, listClasses, type School, type AppUser, type Subject, type Class } from '@academix/shared'
import { Building2, Users, GraduationCap, Activity, BookOpen, Layers } from 'lucide-react'

interface SchoolStats {
  school: School
  users: number
  teachers: number
  students: number
  subjects: number
  classes: number
}

const COLORS = ['#1a365d', '#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#1d4ed8', '#475569', '#0f172a', '#7c3aed', '#10b981']

export default function Dashboard() {
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const schools = await listSchools()
      const results = await Promise.all(schools.map(async (s) => {
        const [users, subjects, classes] = await Promise.all([
          listUsers({ schoolId: s.id }).catch(() => [] as AppUser[]),
          listSubjects({ schoolId: s.id }).catch(() => [] as Subject[]),
          listClasses({ schoolId: s.id }).catch(() => [] as Class[]),
        ])
        return {
          school: s,
          users: users.length,
          teachers: users.filter((u: AppUser) => u.role === 'teacher').length,
          students: users.filter((u: AppUser) => u.role === 'student').length,
          subjects: subjects.length,
          classes: classes.length,
        }
      }))
      setSchoolStats(results)
      setTotalUsers(results.reduce((s, r) => s + r.users, 0))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>

  const activeSchools = schoolStats.filter(s => s.school.isActive).length
  const totalTeachers = schoolStats.reduce((s, r) => s + r.teachers, 0)
  const totalStudents = schoolStats.reduce((s, r) => s + r.students, 0)
  const totalSubjects = schoolStats.reduce((s, r) => s + r.subjects, 0)
  const totalClasses = schoolStats.reduce((s, r) => s + r.classes, 0)
  const maxUsers = Math.max(...schoolStats.map(s => s.users), 1)

  const summaryCards = [
    { icon: Building2, label: 'Total Schools', value: schoolStats.length, sub: `${activeSchools} active`, color: 'bg-[#1e3a5f]' },
    { icon: Users, label: 'Total Users', value: totalUsers, sub: `${totalTeachers} teachers, ${totalStudents} students`, color: 'bg-[#8b6914]' },
    { icon: BookOpen, label: 'Subjects', value: totalSubjects, sub: 'across all schools', color: 'bg-emerald-600' },
    { icon: GraduationCap, label: 'Classes', value: totalClasses, sub: 'across all schools', color: 'bg-purple-600' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-[0.6rem] text-muted-foreground/60 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">Users per School</h3>
          <div className="space-y-3">
            {schoolStats.map((s, i) => (
              <div key={s.school.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground truncate">{s.school.name}</span>
                  <span className="font-bold text-muted-foreground ml-2">{s.users} ({s.teachers}T / {s.students}S)</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/70 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(s.users / maxUsers) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">Subjects per School</h3>
          <div className="space-y-3">
            {schoolStats.map((s, i) => (
              <div key={s.school.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground truncate">{s.school.name}</span>
                  <span className="font-bold text-muted-foreground ml-2">{s.subjects}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/70 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(s.subjects / Math.max(...schoolStats.map(x => x.subjects), 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">Classes per School</h3>
          <div className="space-y-3">
            {schoolStats.map((s, i) => (
              <div key={s.school.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground truncate">{s.school.name}</span>
                  <span className="font-bold text-muted-foreground ml-2">{s.classes}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/70 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(s.classes / Math.max(...schoolStats.map(x => x.classes), 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">School Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left pb-2 font-semibold">School</th>
                <th className="text-right pb-2 font-semibold">Status</th>
                <th className="text-right pb-2 font-semibold">Users</th>
                <th className="text-right pb-2 font-semibold">Subjects</th>
                <th className="text-right pb-2 font-semibold">Classes</th>
              </tr></thead>
              <tbody>
                {schoolStats.map(s => (
                  <tr key={s.school.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{s.school.name}</td>
                    <td className="py-2 text-right"><span className={`px-1.5 py-0.5 rounded-full text-[0.55rem] font-semibold ${s.school.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.school.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="py-2 text-right font-bold text-foreground">{s.users}</td>
                    <td className="py-2 text-right text-muted-foreground">{s.subjects}</td>
                    <td className="py-2 text-right text-muted-foreground">{s.classes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
