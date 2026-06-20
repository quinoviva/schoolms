import { useState } from 'react'
import { Bell, Menu, X } from 'lucide-react'
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
  if (!appUser) return null

  function handleNav(p: string) {
    onNav(p)
    setSidebarOpen(false)
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
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Menu size={18} className="text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Owly School Management System
            </p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <button className="relative p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Bell size={15} className="text-muted-foreground" />
            </button>
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
