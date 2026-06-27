import { useState } from 'react'
import { createSchool, SCHOOL_LEVELS, type SchoolLevel } from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { Building2, Loader2, Copy, Check } from 'lucide-react'

const ALL_LEVELS = Object.keys(SCHOOL_LEVELS) as SchoolLevel[]

export default function CreateSchool({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    levels: ALL_LEVELS,
  })
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function generateId() {
    return 'school_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  }

  function toggleLevel(level: SchoolLevel) {
    setForm(f => ({
      ...f,
      levels: f.levels.includes(level) ? f.levels.filter(l => l !== level) : [...f.levels, level],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug || !form.ownerName || !form.ownerEmail) {
      showToast('Please fill in all required fields.', 'error')
      return
    }
    if (form.levels.length === 0) {
      showToast('Select at least one school level.', 'error')
      return
    }
    setSaving(true)
    try {
      const id = generateId()
      const result = await createSchool({
        id,
        name: form.name,
        slug: form.slug,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        levels: form.levels,
        isActive: true,
      })
      if (result.adminEmail && result.adminPassword) {
        setCredentials({ email: result.adminEmail, password: result.adminPassword })
      }
      showToast('School created successfully!', 'success')
      setForm({ name: '', slug: '', ownerName: '', ownerEmail: '', levels: ALL_LEVELS })
    } catch (err: any) {
      showToast(err.message || 'Failed to create school.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function copyCredentials() {
    if (!credentials) return
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Create School</h1>
      <div className="max-w-lg">
        {credentials ? (
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">School Created!</h2>
            <p className="text-xs text-muted-foreground text-center mb-6">An admin account was auto-created. Save these credentials.</p>
            <div className="bg-muted/50 rounded-lg p-4 mb-4 font-mono text-sm space-y-2">
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{credentials.email}</span></div>
              <div><span className="text-muted-foreground">Password:</span> <span className="text-foreground">{credentials.password}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={copyCredentials}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1e3a5f] text-white text-sm rounded-lg hover:bg-[#2a4a75]">
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button onClick={() => { setCredentials(null); onCreated() }}
                className="flex-1 px-3 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:text-foreground">
                Go to Schools
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">School Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Riverside High School"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Slug *</label>
              <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="riverside-high"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Owner Name *</label>
                <input type="text" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Owner Email *</label>
                <input type="email" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))}
                  placeholder="jane@school.edu"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">School Levels *</label>
              <div className="flex flex-wrap gap-2">
                {ALL_LEVELS.map(level => (
                  <button key={level} type="button" onClick={() => toggleLevel(level)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold border transition-colors ${form.levels.includes(level) ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-transparent text-muted-foreground border-border hover:text-foreground'}`}>
                    {SCHOOL_LEVELS[level].label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create School
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
