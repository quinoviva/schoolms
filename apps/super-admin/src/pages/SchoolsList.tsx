import { useEffect, useState } from 'react'
import { listSchools, listUsers, listSubjects, updateSchool, SCHOOL_LEVELS, type School, type AppUser, type Subject, type SchoolLevel } from '@academix/shared'
import { Building2, CheckCircle, XCircle, ExternalLink, Users, BookOpen, Search, RefreshCw } from 'lucide-react'

export default function SchoolsList({ onSelect }: { onSelect: (id: string) => void }) {
  const [schools, setSchools] = useState<School[]>([])
  const [counts, setCounts] = useState<Record<string, { users: number; subjects: number }>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await listSchools()
    setSchools(data)
    const countsMap: Record<string, { users: number; subjects: number }> = {}
    await Promise.all(data.map(async (s) => {
      const [users, subjects] = await Promise.all([
        listUsers({ schoolId: s.id }).catch(() => [] as AppUser[]),
        listSubjects({ schoolId: s.id }).catch(() => [] as Subject[]),
      ])
      countsMap[s.id] = { users: users.length, subjects: subjects.length }
    }))
    setCounts(countsMap)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggleActive(school: School) {
    setToggling(school.id)
    await updateSchool(school.id, { isActive: !school.isActive })
    setToggling(null)
    load()
  }

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-foreground flex-1">Schools ({schools.length})</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-56 pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-transparent text-foreground" />
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground"><RefreshCw size={16} /></button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No schools match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(school => {
            const c = counts[school.id] || { users: 0, subjects: 0 }
            return (
              <div key={school.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div onClick={() => onSelect(school.id)} className="p-5 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
                        <Building2 size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{school.name}</p>
                        <p className="text-xs text-muted-foreground">{school.slug}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users size={10} /> {c.users}</span>
                    <span className="flex items-center gap-1"><BookOpen size={10} /> {c.subjects}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(school.levels || []).map(level => (
                      <span key={level} className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold uppercase tracking-wider">
                        {level === 'senior_highschool' ? 'SHS' : level.slice(0, 4)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{school.ownerName} &middot; {school.ownerEmail}</p>
                </div>
                <div className="border-t border-border px-5 py-2 flex justify-between items-center">
                  <span className="text-[0.6rem] text-muted-foreground">Click to manage</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(school) }}
                    disabled={toggling === school.id}
                    className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                      school.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'
                    }`}>
                    {school.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    {toggling === school.id ? '...' : (school.isActive ? 'Active' : 'Inactive')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
