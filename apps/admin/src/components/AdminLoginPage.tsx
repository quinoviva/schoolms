import { useState } from 'react'
import { School, AlertTriangle, Loader2, Shield } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || '@schoolms.edu'

export default function AdminLoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)

   async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email.includes('@') ? email : email + EMAIL_DOMAIN, password)
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#8b6914] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            Admin Portal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ACADEMIX</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Admin ID</label>
            <input id="email"
              type="text"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="dev-cyril"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f] transition-all text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
            <input id="password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f] transition-all text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Sign In to Admin
          </button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <button type="button" onClick={() => setResetOpen(true)}
              className="text-[#1e3a5f] hover:text-[#8b6914] font-semibold transition-colors">
              Forgot Password?
            </button>
          </p>
        </form>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setResetOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-foreground">Reset Password</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-4">Enter your email to receive a password reset link.</p>
            <label htmlFor="admin-reset-email" className="sr-only">Admin email for password reset</label>
            <input id="admin-reset-email" type="text" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              placeholder={'dev-cyril' + EMAIL_DOMAIN}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-[#f5f1eb] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setResetOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground">Cancel</button>
              <button disabled={resetSending || !resetEmail} onClick={async () => {
                setResetSending(true)
                try {
                  await sendPasswordResetEmail(auth, resetEmail.includes('@') ? resetEmail : resetEmail + EMAIL_DOMAIN)
                  showToast('Reset link sent! Check your email.', 'success')
                  setResetOpen(false)
                } catch { showToast('Failed to send reset email.', 'error') }
                finally { setResetSending(false) }
              }}
                className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold disabled:opacity-50">
                {resetSending ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
