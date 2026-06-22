import { useState } from 'react'
import { School, AlertTriangle, Loader2, Mail } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@academix/shared'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

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
      await signIn(email.includes('@') ? email : email + '@schoolms.edu', password)
    } catch (err: any) {
      setError(err.message || 'Invalid ID number or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] flex">
      <div className="hidden lg:flex w-[45%] bg-[#1e3a5f] flex-col items-center justify-center px-16 py-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0f1f33]/60 to-transparent" />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-[#8b6914] flex items-center justify-center mx-auto mb-7 shadow-2xl">
            <School size={40} className="text-white" />
          </div>
          <h1 className="text-[2.2rem] font-bold text-white leading-tight mb-2">
            ACADEMIX
          </h1>
          <p className="text-[#c4a32a] text-lg mb-1">
            School Management System
          </p>
          <div className="w-12 h-0.5 bg-[#8b6914] mx-auto my-6" />
          <p className="text-white/60 text-sm leading-relaxed italic">
            &ldquo;Train up a child in the way he should go; even when he is old he will not depart from it.&rdquo;
          </p>
          <p className="text-[#c4a32a] text-sm mt-2 not-italic">&mdash; Proverbs 22:6</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-3">
              <School size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#1e3a5f]">
              ACADEMIX
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-[#1e3a5f] mb-1">
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-sm mb-7">Sign in to your academic portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">ID Number</label>
              <input
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="00-0000-00"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="��������"
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
              className="w-full py-3 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Sign In to Portal
            </button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              <button type="button" onClick={() => setResetOpen(true)}
                className="text-[#1e3a5f] hover:text-[#8b6914] font-semibold transition-colors">
                Forgot Password?
              </button>
            </p>
          </form>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setResetOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-foreground">Reset Password</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-4">Enter your ID number to receive a password reset link.</p>
            <input type="text" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              placeholder="00-0000-00"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-[#f5f1eb] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setResetOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground">Cancel</button>
              <button disabled={resetSending || !resetEmail} onClick={async () => {
                setResetSending(true)
                const fullEmail = resetEmail.includes('@') ? resetEmail : resetEmail + '@schoolms.edu'
                try {
                  await sendPasswordResetEmail(auth, fullEmail)
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
