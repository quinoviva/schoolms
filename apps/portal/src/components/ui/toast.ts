type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

type ToastAction =
  | { type: 'add'; toast: Toast }
  | { type: 'remove'; id: string }

let handler: ((action: ToastAction) => void) | null = null

export function setToastHandler(fn: (action: ToastAction) => void) {
  handler = fn
  return () => { handler = null }
}

export function showToast(message: string, type: ToastType = 'info') {
  const id = crypto.randomUUID()
  handler?.({ type: 'add', toast: { id, message, type } })
  setTimeout(() => handler?.({ type: 'remove', id }), 3500)
}

export type { Toast, ToastType }
