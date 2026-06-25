import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Loader2, AlertTriangle, Check } from 'lucide-react'

export default function ChangePasswordForm() {
  const { handlePasswordChange, dismissPasswordChange, logout } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      await handlePasswordChange(newPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Password Changed</h1>
          <p className="text-sm text-muted-foreground mb-6">Your password has been updated successfully.</p>
          <button onClick={dismissPasswordChange}
            className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f]">
            Continue to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#8b6914] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Change Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Default password detected. Please set a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError('') }}
              placeholder="Min 6 characters" autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</p>}

          <button type="submit" disabled={saving || !newPassword || !confirm}
            className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Change Password
          </button>

          <p className="text-center text-xs text-muted-foreground">
            <button type="button" onClick={logout} className="text-red-500 hover:text-red-700 font-semibold">
              Sign out
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
