import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore'
import { schoolsCol, type School } from '@academix/shared'
import { Building2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

export default function SchoolsList({ onSelect }: { onSelect: (id: string) => void }) {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(schoolsCol, orderBy('createdAt', 'desc'))
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      setSchools(snap.docs.map(d => ({ ...d.data(), id: d.id } as School)))
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Schools</h1>
      {schools.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No schools yet</p>
          <p className="text-xs mt-1">Create your first school to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map(school => (
            <div
              key={school.id}
              onClick={() => onSelect(school.id)}
              className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="px-2 py-0.5 rounded-full bg-muted font-mono">{school.plan}</span>
                {school.isActive ? (
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={10} /> Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500"><XCircle size={10} /> Inactive</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{school.ownerName} &middot; {school.ownerEmail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
