import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, type User } from 'firebase/auth'
import { auth, setTokenProvider, getUser, type AppUser } from '@academix/shared'

interface AuthContextValue {
  firebaseUser: User | null
  appUser: AppUser | null
  loading: boolean
  mustChangePassword: boolean
  signIn: (email: string, password: string) => Promise<void>
  handlePasswordChange: (newPassword: string) => Promise<void>
  dismissPasswordChange: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    setTokenProvider(async () => {
      const token = await auth.currentUser?.getIdToken()
      return token || null
    })

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        try {
          const data = await getUser(user.uid)
          if (data && data.role !== 'admin') {
            await signOut(auth)
            setAppUser(null)
          } else {
            setAppUser(data)
          }
        } catch {
          setAppUser(null)
        }
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const user = await getUser(cred.user.uid)
    if (!user || user.role !== 'admin') {
      await signOut(auth)
      throw new Error('Access denied. Admin credentials required.')
    }
    setAppUser(user)

    const created = new Date(cred.user.metadata.creationTime || 0).getTime()
    const lastSignIn = new Date(cred.user.metadata.lastSignInTime || 0).getTime()
    if (created === lastSignIn) {
      setMustChangePassword(true)
    }
  }

  async function handlePasswordChange(newPassword: string) {
    if (!auth.currentUser) throw new Error('No user signed in')
    await updatePassword(auth.currentUser, newPassword)
    setMustChangePassword(false)
  }

  function dismissPasswordChange() {
    setMustChangePassword(false)
  }

  async function logout() {
    await signOut(auth)
    setAppUser(null)
    setMustChangePassword(false)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, mustChangePassword, signIn, handlePasswordChange, dismissPasswordChange, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
