import { useEffect, useState } from 'react'
import { subscribeToasts, type Toast } from './toast'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-[#1e3a5f] text-white',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-[slideUp_0.3s_ease-out] ${STYLES[t.type]}`}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
