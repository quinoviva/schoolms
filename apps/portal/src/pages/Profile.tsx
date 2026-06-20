import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth } from 'firebase/auth'
import { db, type AppUser } from '@pbclc/shared'
import Spinner from '../components/ui/Spinner'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

export default function Profile({ user }: { user: AppUser }) {
  const { refreshUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [section, setSection] = useState(user.section || '')
  const [saving, setSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { showToast('Name is required.', 'error'); return }
    setSaving(true)
    try {
      const updateData: Record<string, string> = { name: name.trim() }
      if (user.role === 'student') updateData.section = section.trim()
      await updateDoc(doc(db, 'users', user.id), updateData)
      await refreshUser()
      showToast('Profile updated!', 'success')
    } catch {
      showToast('Failed to update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw) { showToast('Fill in both password fields.', 'error'); return }
    if (newPw.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return }
    setChangingPw(true)
    try {
      const auth = getAuth()
      const fbUser = auth.currentUser
      if (!fbUser || !fbUser.email) { showToast('Not authenticated.', 'error'); return }
      const credential = EmailAuthProvider.credential(fbUser.email, currentPw)
      await reauthenticateWithCredential(fbUser, credential)
      await updatePassword(fbUser, newPw)
      setCurrentPw('')
      setNewPw('')
      showToast('Password changed!', 'success')
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password') showToast('Current password is incorrect.', 'error')
      else if (err?.code === 'auth/weak-password') showToast('New password is too weak.', 'error')
      else showToast('Failed to change password.', 'error')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-7">
        Profile Settings
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="font-bold text-foreground text-lg mb-5">
            Personal Info
          </h2>

          <div className="space-y-1 mb-5 pb-4 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          </div>
          <div className="space-y-1 mb-5 pb-4 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Role</p>
            <p className="text-sm font-medium text-foreground capitalize">{user.role}</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Name</label>
              <input
                required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
              />
            </div>
            {user.role === 'student' && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Section</label>
                <input
                  value={section} onChange={e => setSection(e.target.value)}
                  placeholder="e.g., 11-A (Grace)"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="font-bold text-foreground text-lg mb-5">
            Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Current Password</label>
              <input
                type="password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">New Password</label>
              <input
                type="password" required value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={changingPw}
              className="px-5 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm"
            >
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
