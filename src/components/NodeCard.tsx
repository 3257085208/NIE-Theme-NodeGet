import { ArrowDown, ArrowUp, Clock, Cpu, Gauge, HardDrive, MemoryStick, type LucideIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Flag } from './Flag'
import { MiniTcpingPanel } from './MiniTcpingPanel'
import { ResourceRing } from './ResourceRing'
import { StatusDot } from './StatusDot'
import { bytes, relativeAge, uptime } from '../utils/format'
import { cpuLabel, deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { cn, loadColor } from '../utils/cn'
import { homeMetricStyle } from '../utils/preferences'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useInViewport } from '../hooks/useInViewport'
import { useNodeLatency } from '../hooks/useNodeLatency'
import type { BackendPool } from '../api/pool'
import type { Node, SiteUserPreferences } from '../types'
import { nodeKey } from '../utils/nodeKey'
import type { ReactNode } from 'react'

export function NodeCard({ node, pool, prefs }: { node: Node; pool: BackendPool | null; prefs?: SiteUserPreferences }) {
  const u = deriveUsage(node)
  const tags = Array.isArray(node.meta?.tags) ? node.meta.tags : []
  const os = osLabel(node)
  const logo = distroLogo(node)
  const virt = virtLabel(node)
  const cpu = cpuLabel(node)
  const metricStyle = homeMetricStyle(prefs)
  const { ref, visible } = useInViewport<HTMLDivElement>({ rootMargin: '320px 0px' })
  const { pingData, tcpData, loading: latencyLoading, error: latencyError } = useNodeLatency(
    visible && node.online ? pool : null,
    node.source,
    node.uuid,
  )
  const detailHash = `#${encodeURIComponent(nodeKey(node))}`

  return (
    <div
      ref={ref}
      role="link"
      tabIndex={0}
      className="block h-full cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      onClick={event => {
        const target = event.target as HTMLElement
        if (target.closest('[data-card-action="true"]')) return
        window.location.hash = detailHash
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        const target = event.target as HTMLElement
        if (target.closest('[data-card-action="true"]')) return
        event.preventDefault()
        window.location.hash = detailHash
      }}
    >
      <Card
        className={cn(
          'group node-card-hover h-full min-h-[360px] sm:min-h-[430px] p-4 sm:p-5 transition-[border-color,box-shadow,opacity,background-color] duration-200 hover:border-primary/90 hover:bg-card flex flex-col gap-3.5 sm:gap-4',
          !node.online && 'opacity-75',
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-dashed border-border pb-3">
          <StatusDot online={node.online} />
          {logo && (
            <img src={logo} alt="" className="h-6 w-6 shrink-0 rounded-full object-contain" loading="lazy" />
          )}
          <span className="min-w-0 flex-1 truncate text-[14px] sm:text-[15px] font-bold tracking-wide text-foreground" title={displayName(node)}>
            {displayName(node)}
          </span>
          <Flag code={node.meta?.region} className="shrink-0" />
        </div>

        {(os || virt) && (
          <div className="truncate text-xs font-bold text-muted-foreground">
            {[os, virt].filter(Boolean).join(' · ')}
          </div>
        )}

        {metricStyle === 'bar' ? (
          <MetricBars node={node} />
        ) : (
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 py-1 sm:gap-3">
            <ResourceRing label="CPU" value={u.cpu} sub={cpu || null} subTitle={cpu || undefined} size={82} strokeWidth={9} />
            <ResourceRing
              label="内存"
              value={u.mem}
              sub={u.memTotal ? `${bytes(u.memUsed)} / ${bytes(u.memTotal)}` : null}
              size={82}
              strokeWidth={9}
            />
            <ResourceRing
              label="磁盘"
              value={u.disk}
              sub={u.diskTotal ? `${bytes(u.diskUsed)} / ${bytes(u.diskTotal)}` : null}
              size={82}
              strokeWidth={9}
            />
          </div>
        )}

        <MiniTcpingPanel
          pingData={pingData}
          tcpData={tcpData}
          loading={latencyLoading}
          error={latencyError}
          prefs={prefs}
        />

        <div className="mt-auto space-y-1.5 border-t border-dashed border-border pt-3 text-xs tabular-nums text-muted-foreground">
          <div className="flex items-center gap-3">
            <AnimatedSpeedStat icon={ArrowDown} value={u.netIn || 0} />
            <AnimatedSpeedStat icon={ArrowUp} value={u.netOut || 0} />
          </div>
          <div className="flex items-center gap-3">
            <Stat icon={Clock}>{uptime(u.uptime)}</Stat>
            <span className="ml-auto">{relativeAge(u.ts)}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <Badge key={t} variant="outline" className="rounded-full border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function MetricBars({ node }: { node: Node }) {
  const u = deriveUsage(node)
  const cores = node.static?.cpu?.logical_cores ?? node.static?.cpu?.physical_cores ?? node.static?.cpu?.per_core?.length ?? 1
  const loadOne = node.dynamic?.load_one
  const loadPercent = typeof loadOne === 'number' && Number.isFinite(loadOne)
    ? Math.min(100, Math.max(0, (loadOne / Math.max(1, cores)) * 100))
    : undefined

  const rows = [
    {
      label: 'CPU',
      icon: Cpu,
      value: u.cpu,
      valueText: u.cpu == null ? '—' : `${u.cpu.toFixed(2)}%`,
      sub: `${cores} 核`,
      activeClass: 'bg-blue-500',
    },
    {
      label: '内存',
      icon: MemoryStick,
      value: u.mem,
      valueText: u.mem == null ? '—' : `${u.mem.toFixed(2)}%`,
      sub: u.memTotal ? `${bytes(u.memUsed)} / ${bytes(u.memTotal)}` : '—',
      activeClass: 'bg-violet-500',
    },
    {
      label: '磁盘',
      icon: HardDrive,
      value: u.disk,
      valueText: u.disk == null ? '—' : `${u.disk.toFixed(1)}%`,
      sub: u.diskTotal ? `${bytes(u.diskUsed)} / ${bytes(u.diskTotal)}` : '—',
      activeClass: 'bg-orange-500',
    },
    {
      label: '负载',
      icon: Gauge,
      value: loadPercent,
      valueText: typeof loadOne === 'number' ? loadOne.toFixed(2) : '—',
      sub: typeof loadPercent === 'number' ? `${loadPercent.toFixed(0)}% of ${cores} 核` : '—',
      activeClass: typeof loadPercent === 'number' ? loadColor(loadPercent) : 'bg-blue-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-2">
      {rows.map(row => (
        <MetricBar key={row.label} {...row} />
      ))}
    </div>
  )
}

function MetricBar({
  label,
  icon: Icon,
  value,
  valueText,
  sub,
  activeClass,
}: {
  label: string
  icon: LucideIcon
  value?: number | null
  valueText: string
  sub?: string
  activeClass: string
}) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null
  const animated = useAnimatedNumber(safe ?? 0, 900)
  const valueTone = animated.animating
    ? animated.trend === 'up'
      ? 'text-amber-500'
      : 'text-sky-500'
    : 'text-foreground/90'

  return (
    <div className="min-w-0 space-y-2 text-[11px]">
      <div className="flex items-center gap-1.5 leading-none">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-foreground/85">{label}</span>
        <span className={cn('ml-auto tabular-nums font-semibold transition-colors duration-150', valueTone)}>{valueText}</span>
      </div>
      <div className="truncate text-[10px] leading-none text-muted-foreground" title={sub}>{sub}</div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
        {Array.from({ length: 18 }, (_, i) => {
          const exact = Math.max(0, Math.min(18, (animated.value / 100) * 18))
          const fullCells = Math.floor(exact)
          const hasPartialCell = exact - fullCells > 0.001 && fullCells < 18
          const state = i < fullCells ? 'full' : hasPartialCell && i === fullCells ? 'partial' : 'empty'

          return (
            <span
              key={i}
              className={cn(
                'h-2.5 rounded-[2px] transition-[background-color,opacity,box-shadow] duration-200',
                state === 'empty' ? 'bg-muted/70' : activeClass,
                state === 'partial' && 'opacity-40',
                animated.animating && state !== 'empty' && 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {children}
    </span>
  )
}

function AnimatedSpeedStat({ icon: Icon, value }: { icon: LucideIcon; value: number }) {
  const animated = useAnimatedNumber(value || 0, 950)
  const tone = animated.animating
    ? animated.trend === 'up'
      ? 'text-primary'
      : 'text-amber-500'
    : 'text-muted-foreground'

  return (
    <span className={cn('inline-flex items-center gap-1 transition-colors duration-150', tone)}>
      <Icon className="h-3 w-3" />
      <span>{bytes(animated.value)}/s</span>
    </span>
  )
}
