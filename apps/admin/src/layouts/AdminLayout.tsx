import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'
import { LogOut, LayoutDashboard, Users, Calendar, BookOpenCheck, Layers, BookOpen, Menu } from 'lucide-react'

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
      <div className={`fixed inset-0 z-20 bg-black/40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-56 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <aside className="w-56 bg-[#1e3a5f] flex flex-col h-full shrink-0">
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-white font-bold text-sm">
              ACADEMIX Admin
            </p>
            <p className="text-white/40 text-[0.65rem]">Management Console</p>
          </div>

          <div className="px-4 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#8b6914]/35 flex items-center justify-center text-[#c4a32a] text-xs font-bold shrink-0">
                {initials(appUser.name)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{appUser.name}</p>
                <p className="text-white/35 text-[0.6rem] font-mono">{appUser.id}</p>
              </div>
            </div>
            <span className="mt-2 inline-block text-[0.6rem] px-2 py-0.5 rounded-full bg-[#8b6914]/30 text-[#c4a32a] font-semibold tracking-wide uppercase">Admin</span>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ icon: Icon, label, path: p }) => (
              <button key={p} onClick={() => handleNav(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                  path === p ? 'bg-white/15 text-white border-l-2 border-[#c4a32a] pl-[10px]' : 'text-white/55 hover:bg-white/8 hover:text-white/85'
                }`}>
                <Icon size={15} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>

          <div className="px-3 pb-4 pt-2 border-t border-white/10">
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/75 hover:bg-white/8 transition-all">
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/96 backdrop-blur-sm border-b border-border px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Menu size={18} className="text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground">ACADEMIX â€” Admin</p>
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
