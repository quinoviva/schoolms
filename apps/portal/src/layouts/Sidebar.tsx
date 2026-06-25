import { LogOut, LayoutDashboard, BookOpen, FileText, School, CheckCircle2, PenLine, Calendar, Megaphone, User, Grid3x3, ClipboardCheck, FileSpreadsheet, FolderOpen, ClipboardList, ScrollText, GraduationCap } from 'lucide-react'
import type { AppUser, Role } from '@academix/shared'
import type { LucideIcon } from 'lucide-react'

const NAV: Record<Role, { icon: LucideIcon; label: string; path: string }[]> = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
    { icon: BookOpen, label: 'My Grades', path: 'grades' },
    { icon: FileText, label: 'Transcript', path: 'transcript' },
    { icon: Calendar, label: 'Schedule', path: 'schedule' },
    { icon: ClipboardList, label: 'Assignments', path: 'assignments' },
    { icon: FolderOpen, label: 'Materials', path: 'materials' },
    { icon: Megaphone, label: 'Announcements', path: 'announcements' },
    { icon: User, label: 'Profile', path: 'profile' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
    { icon: School, label: 'My Classes', path: 'classes' },
    { icon: Calendar, label: 'Schedule', path: 'schedule' },
    { icon: Grid3x3, label: 'Seat Plan', path: 'seatplan' },
    { icon: CheckCircle2, label: 'Attendance', path: 'attendance' },
    { icon: PenLine, label: 'Grade Entry', path: 'grades' },
    { icon: ClipboardCheck, label: 'Report Cards', path: 'reportcards' },
    { icon: FileSpreadsheet, label: 'Class Sheets', path: 'classsheets' },
    { icon: ScrollText, label: 'School Forms', path: 'forms' },
    { icon: ClipboardList, label: 'Assignments', path: 'assignments' },
    { icon: FolderOpen, label: 'Materials', path: 'materials' },
    { icon: Megaphone, label: 'Announcements', path: 'announcements' },
    { icon: User, label: 'Profile', path: 'profile' },
  ],
  admin: [],
  super_admin: [],
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('')
}

export default function Sidebar({
  user, path, onNav, onLogout,
}: {
  user: AppUser; path: string; onNav: (p: string) => void; onLogout: () => void
}) {
  const items = NAV[user.role]

  return (
    <aside className="w-60 flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">
              Academix
            </p>
            <p className="text-white/30 text-[0.6rem] tracking-wider uppercase">School Management</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/70 to-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-white/25 text-[0.55rem] font-mono truncate">{user.email}</p>
          </div>
        </div>
        <span className="mt-2 inline-block text-[0.55rem] px-2 py-0.5 rounded-full bg-accent/15 text-blue-300 font-semibold tracking-wide uppercase border border-accent/10">
          {user.role}
        </span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(({ icon: Icon, label, path: p }) => {
          const active = path === p
          return (
            <button
              key={p}
              onClick={() => onNav(p)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left ${
                active
                  ? 'bg-accent/15 text-white shadow-sm border-l-[3px] border-accent pl-[11px]'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <Icon size={15} className={active ? 'text-accent' : ''} />
              <span className="font-medium">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
