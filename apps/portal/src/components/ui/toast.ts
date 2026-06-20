type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
let listeners: Listener[] = []

function notify() {
  listeners.forEach(l => l([...toasts]))
}

export function showToast(message: string, type: ToastType = 'info') {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, message, type }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 3500)
}

export function subscribeToasts(fn: Listener) {
  listeners.push(fn)
  fn([...toasts])
  return () => { listeners = listeners.filter(l => l !== fn) }
}

export type { Toast, ToastType }
