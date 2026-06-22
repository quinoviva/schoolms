import { useState, useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore'
import { db, type Notification } from '@academix/shared'
import { Bell, Menu, X, Megaphone, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'
import Sidebar from './Sidebar'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('')
}

export default function PortalLayout({
  path, onNav, children,
}: {
  path: string; onNav: (p: string) => void; children: React.ReactNode
}) {
  const { appUser, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  if (!appUser) return null

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', appUser.id), orderBy('createdAt', 'desc'), limit(10)),
      snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)))
    )
    return unsub
  }, [appUser.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }) } catch (err) { console.error('Failed to mark notification read:', err) }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  function handleNav(p: string) {
    onNav(p)
    setSidebarOpen(false)
  }

  function formatTime(ts: number) {
    const diff = Date.now() - ts
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <div className={`fixed inset-0 z-20 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-60 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar user={appUser} path={path} onNav={handleNav} onLogout={logout} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/96 backdrop-blur-sm border-b border-border px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Menu size={18} className="text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground hidden sm:block">
              ACADEMIX
            </p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} aria-label="Toggle notifications" className="relative p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Bell size={15} className="text-muted-foreground" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[0.55rem] flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</p>
                    {unreadCount > 0 && <span className="text-[0.6rem] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <button key={n.id} onClick={() => { markRead(n.id); setShowNotifs(false) }}
                        className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/20 transition-colors flex items-start gap-3 ${
                          n.read ? 'opacity-60' : ''
                        }`}>
                        <div className={`p-1 rounded-full shrink-0 mt-0.5 ${
                          n.type === 'grade_released' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                        }`}>
                          {n.type === 'grade_released' ? <CheckCircle2 size={12} /> : <Megaphone size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${n.read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>{n.message}</p>
                          <p className="text-[0.6rem] text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold">
                {initials(appUser.name)}
              </div>
              <span className="text-foreground font-semibold text-xs hidden sm:block">{appUser.name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
