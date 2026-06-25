import { Loader2 } from 'lucide-react'

export default function Spinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-muted-foreground py-20">
      <div className="relative">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}
