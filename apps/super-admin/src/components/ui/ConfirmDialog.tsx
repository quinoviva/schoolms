import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-card rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-sm">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
