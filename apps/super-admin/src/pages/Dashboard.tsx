import { useEffect, useState } from 'react'
import { collection, getDocs, getCountFromServer } from 'firebase/firestore'
import { db, type School } from '@academix/shared'
import { Building2, Users, GraduationCap, Activity } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, users: 0, activeSchools: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [schoolCount, userCount, activeSnap] = await Promise.all([
        getCountFromServer(collection(db, 'schools')),
        getCountFromServer(collection(db, 'users')),
        getDocs(collection(db, 'schools')),
      ])
      const active = activeSnap.docs.filter(d => d.data().isActive).length
      setStats({ schools: schoolCount.data().count, users: userCount.data().count, activeSchools: active })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { icon: Building2, label: 'Total Schools', value: stats.schools, color: 'bg-[#1e3a5f]' },
    { icon: Users, label: 'Total Users', value: stats.users, color: 'bg-[#8b6914]' },
    { icon: GraduationCap, label: 'Active Schools', value: stats.activeSchools, color: 'bg-emerald-600' },
    { icon: Activity, label: 'Platform', value: 'ACADEMIX', color: 'bg-[#0f1926]' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Super Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
