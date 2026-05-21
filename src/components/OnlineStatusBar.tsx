import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { cn } from '../utils/cn'
import type { HistorySample } from '../types'

interface OnlineStatusBarProps {
  history: HistorySample[]
  online: boolean
  compact?: boolean
  intervalMinutes?: number
  slots?: number
  title?: string
  mobileHalf?: boolean
  loading?: boolean
}

interface TimelineSlot {
  active: boolean
  start: number
  end: number
  sample: HistorySample | null
  reason: 'agent' | 'empty'
}

export function OnlineStatusBar({
  history,
  online,
  compact = false,
  intervalMinutes = 3,
  slots = 80,
  title = '在线状态',
  mobileHalf = true,
  loading = false,
}: OnlineStatusBarProps) {
  const isMobile = useIsMobile()
  const effectiveSlots = mobileHalf && isMobile ? Math.max(1, Math.floor(slots / 2)) : slots
  const agentHistory = history || []
  const pending = loading && agentHistory.length === 0
  const timeline = useMemo(
    () => pending
      ? buildEmptyTimeline(intervalMinutes, effectiveSlots)
      : buildAgentTimeline(agentHistory, online, intervalMinutes, effectiveSlots),
    [agentHistory, online, intervalMinutes, effectiveSlots, pending],
  )
  const activeCount = timeline.filter(item => item.active).length
  const availability = timeline.length ? (activeCount / timeline.length) * 100 : 0
  const [hovered, setHovered] = useState<number | null>(null)
  const activeSlot = hovered != null ? timeline[hovered] : null
  const activeLeft = hovered != null ? `${((hovered + 0.5) / timeline.length) * 100}%` : '50%'

  return (
    <div
      className={cn(
        'rounded-md border border-dashed border-border bg-secondary/35',
        compact ? 'px-3 py-2.5' : 'px-5 py-4',
      )}
    >
      <div className={cn('flex items-center gap-2', compact ? 'text-[11px]' : 'text-sm')}>
        <span className="inline-flex items-center gap-1.5 font-bold text-primary">
          <Activity className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          {title}
        </span>
        <span className={cn('ml-auto font-black text-primary', compact ? 'text-[12px]' : 'text-base')}>
          {pending ? '…' : `${availability.toFixed(0)}%`}
        </span>
      </div>

      <div
        className="relative mt-2"
        aria-label={`Agent 通信在线率 ${pending ? '读取中' : `${availability.toFixed(0)}%`}`}
        onMouseLeave={() => setHovered(null)}
      >
        {activeSlot && !pending && <StatusTooltip compact={compact} slot={activeSlot} left={activeLeft} />}

        <div
          className={cn('grid items-stretch', compact ? 'gap-[3px]' : 'gap-1')}
          style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}
        >
          {timeline.map((slot, index) => (
            <span
              key={index}
              className={cn(
                'block cursor-default border border-transparent transition-colors duration-200',
                compact ? 'h-7 sm:h-7' : 'h-8 sm:h-8',
                slot.active ? 'bg-primary shadow-[0_0_0_1px_rgba(66,185,131,0.09)]' : 'bg-border/90',
              )}
              style={{ borderRadius: 2 }}
              title={pending ? '读取 Agent 通信状态…' : buildTitle(slot)}
              onMouseEnter={() => setHovered(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusTooltip({ compact, slot, left }: { compact: boolean; slot: TimelineSlot; left: string }) {
  const timeLabel = formatTimeRange(slot.start, slot.end)

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full z-20 mb-3 -translate-x-1/2 rounded-sm border border-[hsl(var(--border))] bg-card px-3 py-2.5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-black/5',
        compact ? 'w-[176px] text-[10px]' : 'w-[210px] text-[11px]',
      )}
      style={{ left, backdropFilter: 'none', opacity: 1 }}
    >
      <div className="font-mono text-muted-foreground">{timeLabel}</div>
      <div className={cn('mt-0.5 flex items-center gap-1 font-semibold', slot.active ? 'text-primary' : 'text-rose-500')}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
        {slot.active ? '已连接到 Server' : '未检测到连接'}
      </div>
      <div className="mt-2 text-[10px] leading-4 text-muted-foreground">
        来源：Agent 最近上报 / Server 最近收到通信。
      </div>
    </div>
  )
}

function buildTitle(slot: TimelineSlot) {
  return [
    formatTimeRange(slot.start, slot.end),
    slot.active ? '已连接到 Server' : '未检测到 Agent 与 Server 通信',
    '来源：Agent 最近上报 / Server 最近收到通信',
  ].join('\n')
}

function formatTimeRange(start: number, end: number) {
  const startDate = new Date(start)
  const endDate = new Date(end - 1)
  const sameDay = startDate.toDateString() === endDate.toDateString()
  if (sameDay) {
    const fmt = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${fmt(start)} - ${fmt(end)}`
  }
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  return `${fmt(start)} - ${fmt(end)}`
}

function buildEmptyTimeline(intervalMinutes = 3, slots = 80, now = Date.now()): TimelineSlot[] {
  const intervalMs = intervalMinutes * 60 * 1000
  const windowEnd = Math.ceil(now / intervalMs) * intervalMs
  const windowStart = windowEnd - slots * intervalMs
  return Array.from({ length: slots }, (_, index) => {
    const start = windowStart + index * intervalMs
    return { active: false, start, end: start + intervalMs, sample: null, reason: 'empty' }
  })
}

function lastSampleInWindow(sorted: HistorySample[], slotStart: number, slotEnd: number) {
  let sample: HistorySample | null = null
  for (const item of sorted) {
    if (item.t < slotStart) continue
    if (item.t >= slotEnd) break
    sample = item
  }
  return sample
}

export function buildAgentTimeline(
  agentHistory: HistorySample[],
  online: boolean,
  intervalMinutes = 3,
  slots = 80,
  now = Date.now(),
): TimelineSlot[] {
  const intervalMs = intervalMinutes * 60 * 1000
  const sorted = [...agentHistory].sort((a, b) => a.t - b.t)
  const windowEnd = Math.ceil(now / intervalMs) * intervalMs
  const windowStart = windowEnd - slots * intervalMs

  return Array.from({ length: slots }, (_, index) => {
    const start = windowStart + index * intervalMs
    const end = start + intervalMs
    const sample = lastSampleInWindow(sorted, start, end)
    const active = Boolean(sample)
    return {
      active,
      start,
      end,
      sample,
      reason: active ? 'agent' : 'empty',
    }
  })
}
