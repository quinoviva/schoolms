import { useState } from 'react'
import { GraduationCap, AlertTriangle, Loader2 } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || '@schoolms.edu'

export default function LoginPage() {
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
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#0a1628] via-[#0f1e3a] to-[#15294a] flex-col items-center justify-center px-16 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center mx-auto mb-7 shadow-xl shadow-accent/20">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-[2.5rem] font-bold text-white leading-tight mb-2 tracking-tight">
            Academix
          </h1>
          <p className="text-blue-300/80 text-lg font-medium mb-1">
            School Management System
          </p>
          <div className="w-12 h-0.5 bg-gradient-to-r from-accent to-blue-400 mx-auto my-6 rounded-full" />
          <p className="text-white/50 text-sm leading-relaxed italic">
            &ldquo;Train up a child in the way he should go; even when he is old he will not depart from it.&rdquo;
          </p>
          <p className="text-blue-300/60 text-sm mt-3 not-italic">&mdash; Proverbs 22:6</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <GraduationCap size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Academix
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your academic portal</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Username</label>
              <input id="email"
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="e.g. john.smith"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5 bg-destructive/5 px-3 py-2 rounded-lg">
                <AlertTriangle size={13} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-blue-600 text-white font-semibold hover:from-accent hover:to-blue-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-accent/20"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Sign In to Portal
            </button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              <button type="button" onClick={() => setResetOpen(true)}
                className="text-accent hover:text-accent/80 font-semibold transition-colors">
                Forgot Password?
              </button>
            </p>
          </form>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setResetOpen(false)}>
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-foreground">Reset Password</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-4">Enter your username to receive a password reset link.</p>
            <label htmlFor="reset-email" className="sr-only">Username for password reset</label>
            <input id="reset-email" type="text" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setResetOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button disabled={resetSending || !resetEmail} onClick={async () => {
                setResetSending(true)
                const fullEmail = resetEmail.includes('@') ? resetEmail : resetEmail + EMAIL_DOMAIN
                try {
                  await sendPasswordResetEmail(auth, fullEmail)
                  showToast('Reset link sent! Check your email.', 'success')
                  setResetOpen(false)
                } catch { showToast('Failed to send reset email.', 'error') }
                finally { setResetSending(false) }
              }}
                className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm">
                {resetSending ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
