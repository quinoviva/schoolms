import { LogOut, LayoutDashboard, BookOpen, FileText, School, CheckCircle2, PenLine, Calendar, Megaphone, User, Grid3x3, ClipboardCheck, FileSpreadsheet, FolderOpen, ClipboardList } from 'lucide-react'
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
    <aside className="w-60 bg-[#1e3a5f] flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#8b6914] flex items-center justify-center shrink-0">
            <School size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">
              ACADEMIX
            </p>
            <p className="text-white/40 text-[0.65rem]">Management System</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#8b6914]/35 flex items-center justify-center text-[#c4a32a] text-xs font-bold shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-white/35 text-[0.6rem] font-mono">{user.id}</p>
          </div>
        </div>
        <span className="mt-2 inline-block text-[0.6rem] px-2 py-0.5 rounded-full bg-[#8b6914]/30 text-[#c4a32a] font-semibold tracking-wide uppercase">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                active
                  ? 'bg-white/15 text-white border-l-2 border-[#c4a32a] pl-[10px]'
                  : 'text-white/55 hover:bg-white/8 hover:text-white/85'
              }`}
            >
              <Icon size={15} />
              <span className="font-medium">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/75 hover:bg-white/8 transition-all"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
