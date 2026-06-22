import { useState } from 'react'
import { addDoc } from 'firebase/firestore'
import { schoolsCol } from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { Building2, Loader2 } from 'lucide-react'

export default function CreateSchool({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    plan: 'free' as 'free' | 'basic' | 'pro',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug || !form.ownerName || !form.ownerEmail) {
      showToast('Please fill in all required fields.', 'error')
      return
    }
    setSaving(true)
    try {
      await addDoc(schoolsCol as any, {
        ...form,
        isActive: true,
        createdAt: Date.now(),
      })
      showToast('School created successfully!', 'success')
      setForm({ name: '', slug: '', ownerName: '', ownerEmail: '', plan: 'free' })
      onCreated()
    } catch (err: any) {
      showToast(err.message || 'Failed to create school.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Create School</h1>
      <div className="max-w-lg">
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
            <label className="block text-sm font-semibold text-foreground mb-1.5">Plan</label>
            <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value as any }))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Create School
          </button>
        </form>
      </div>
    </div>
  )
}
