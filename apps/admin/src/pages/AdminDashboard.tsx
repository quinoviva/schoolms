import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@pbclc/shared'
import { GraduationCap, Users, School, Award } from 'lucide-react'
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

export default function AdminDashboard() {
  const [students, setStudents] = useState<number | null>(null)
  const [teachers, setTeachers] = useState<number | null>(null)
  const [classes, setClasses] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<number | null>(null)

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const all = snap.docs.map(d => d.data() as { role: string })
      setStudents(all.filter(u => u.role === 'student').length)
      setTeachers(all.filter(u => u.role === 'teacher').length)
    })
    const unsubClasses = onSnapshot(collection(db, 'classes'), snap => setClasses(snap.size))
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.size))
    return () => { unsubUsers(); unsubClasses(); unsubSubjects() }
  }, [])

  const loading = students === null || teachers === null || classes === null || subjects === null

  if (loading) return <Spinner text="Loading dashboard..." />

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Administrative Dashboard
      </h1>
      <p className="text-sm text-muted-foreground mb-7">Owly School Management System</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Total Students" value={students} />
        <StatCard icon={Users} label="Teaching Staff" value={teachers} />
        <StatCard icon={School} label="Active Classes" value={classes} />
        <StatCard icon={Award} label="Subjects" value={subjects} />
      </div>

      {students === 0 && (
        <div className="mt-12 text-center">
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
