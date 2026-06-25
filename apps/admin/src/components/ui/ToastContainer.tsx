import { useEffect, useState } from 'react'
import { setToastHandler, type Toast } from './toast'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'bg-emerald-600 text-white shadow-emerald-200/50',
  error: 'bg-red-600 text-white shadow-red-200/50',
  info: 'bg-accent text-white shadow-blue-200/50',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => setToastHandler((action) => {
    if (action.type === 'add') setToasts(prev => [...prev, action.toast])
    else setToasts(prev => prev.filter(t => t.id !== action.id))
  }), [])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm">
      {toasts.map(t => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium backdrop-blur-sm ${STYLES[t.type]}`}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
