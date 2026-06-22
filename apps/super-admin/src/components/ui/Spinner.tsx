import { Loader2 } from 'lucide-react'

export default function Spinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 text-muted-foreground py-16">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}
