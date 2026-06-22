import { useEffect, useState } from 'react'
import { doc, getDoc, getCountFromServer, query, where, collection } from 'firebase/firestore'
import { db, type School } from '@academix/shared'
import { ArrowLeft, Building2, Users, BookOpen, GraduationCap } from 'lucide-react'

export default function SchoolDetail({ schoolId, onBack }: { schoolId: string; onBack: () => void }) {
  const [school, setSchool] = useState<School | null>(null)
  const [counts, setCounts] = useState({ users: 0, subjects: 0, classes: 0, students: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'schools', schoolId))
      if (!snap.exists()) return
      setSchool({ id: snap.id, ...snap.data() } as School)

      const [usersCount, subjectsCount, classesCount] = await Promise.all([
        getCountFromServer(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
        getCountFromServer(query(collection(db, 'subjects'), where('schoolId', '==', schoolId))),
        getCountFromServer(query(collection(db, 'classes'), where('schoolId', '==', schoolId))),
      ])
      setCounts({
        users: usersCount.data().count,
        subjects: subjectsCount.data().count,
        classes: classesCount.data().count,
        students: 0,
      })
      setLoading(false)
    }
    load()
  }, [schoolId])

  if (loading || !school) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cards = [
    { icon: Users, label: 'Users', value: counts.users, color: 'bg-[#1e3a5f]' },
    { icon: BookOpen, label: 'Subjects', value: counts.subjects, color: 'bg-[#8b6914]' },
    { icon: GraduationCap, label: 'Classes', value: counts.classes, color: 'bg-emerald-600' },
  ]

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Schools
      </button>

      <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{school.name}</h1>
            <p className="text-sm text-muted-foreground">{school.slug}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Plan</p>
            <p className="font-semibold text-foreground capitalize">{school.plan}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <p className={`font-semibold ${school.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
              {school.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Owner</p>
            <p className="font-semibold text-foreground">{school.ownerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-semibold text-foreground">{school.ownerEmail}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
