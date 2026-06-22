import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={15} className="text-muted-foreground" /> : <Moon size={15} className="text-muted-foreground" />}
    </button>
  )
}
