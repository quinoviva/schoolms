import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'
import { LogOut, LayoutDashboard, Users, Calendar, BookOpenCheck, Layers, BookOpen, Menu, GraduationCap } from 'lucide-react'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Layers, label: 'Sections', path: '/sections' },
  { icon: BookOpen, label: 'Subjects', path: '/subjects' },
  { icon: Calendar, label: 'Terms', path: '/terms' },
  { icon: BookOpenCheck, label: 'Enrollments', path: '/enrollments' },
]

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('')
}

export default function AdminLayout({
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
      <div className={`fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-56 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <aside className="w-56 flex flex-col h-full shrink-0">
          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Academix</p>
                <p className="text-white/30 text-[0.55rem] tracking-wider uppercase">Admin Console</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/70 to-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
                {initials(appUser.name)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{appUser.name}</p>
                <p className="text-white/25 text-[0.55rem] font-mono truncate">{appUser.email}</p>
              </div>
            </div>
            <span className="mt-2 inline-block text-[0.55rem] px-2 py-0.5 rounded-full bg-accent/15 text-blue-300 font-semibold tracking-wide uppercase border border-accent/10">Admin</span>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ icon: Icon, label, path: p }) => (
              <button key={p} onClick={() => handleNav(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left ${
                  path === p ? 'bg-accent/15 text-white shadow-sm border-l-[3px] border-accent pl-[11px]' : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                }`}>
                <Icon size={15} className={path === p ? 'text-accent' : ''} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>

          <div className="px-3 pb-4 pt-2 border-t border-white/5">
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200">
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors">
              <Menu size={18} className="text-foreground" />
            </button>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Academix — Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground">{appUser.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
