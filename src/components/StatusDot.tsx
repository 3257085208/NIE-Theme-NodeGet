import { cn } from '../utils/cn'

export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      title={online ? '在线' : '离线'}
      className={cn(
        'inline-block w-2 h-2 rounded-full shrink-0',
        online ? 'bg-emerald-500 ring-2 ring-emerald-500/25' : 'bg-rose-500 ring-2 ring-rose-500/25',
        className,
      )}
    />
  )
}
