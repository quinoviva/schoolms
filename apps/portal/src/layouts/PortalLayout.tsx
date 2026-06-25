import { useState, useEffect, useRef } from 'react'
import { listNotifications, markNotificationRead, type Notification } from '@academix/shared'
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
    listNotifications(appUser.id).then(setNotifications)
  }, [appUser.id])

  useEffect(() => {
    const interval = setInterval(() => {
      listNotifications(appUser.id).then(setNotifications)
    }, 30000)
    return () => clearInterval(interval)
  }, [appUser.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    try { await markNotificationRead(id) } catch (err) { console.error('Failed to mark notification read:', err) }
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
      <div className={`fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-60 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar user={appUser} path={path} onNav={handleNav} onLogout={logout} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors">
              <Menu size={18} className="text-foreground" />
            </button>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:block">
              Academix Portal
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} aria-label="Toggle notifications" className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
                <Bell size={16} className="text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-white text-[0.5rem] flex items-center justify-center font-bold shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border border-border shadow-xl shadow-black/5 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-[0.55rem] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <button key={n.id} onClick={() => { markRead(n.id); setShowNotifs(false) }}
                        className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors flex items-start gap-3 ${
                          n.read ? 'opacity-50' : ''
                        }`}>
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          n.type === 'grade_released' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                        }`}>
                          {n.type === 'grade_released' ? <CheckCircle2 size={12} /> : <Megaphone size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs leading-relaxed ${n.read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>{n.message}</p>
                          <p className="text-[0.55rem] text-muted-foreground mt-1">{formatTime(n.createdAt)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 pl-2 border-l border-border ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
