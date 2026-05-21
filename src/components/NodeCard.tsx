import { ArrowDown, ArrowUp, Clock, type LucideIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Flag } from './Flag'
import { MiniTcpingPanel } from './MiniTcpingPanel'
import { ResourceRing } from './ResourceRing'
import { StatusDot } from './StatusDot'
import { bytes, relativeAge, uptime } from '../utils/format'
import { cpuLabel, deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { cn } from '../utils/cn'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useInViewport } from '../hooks/useInViewport'
import { useNodeTcpLatency } from '../hooks/useNodeTcpLatency'
import type { BackendPool } from '../api/pool'
import type { Node } from '../types'
import { nodeKey } from '../utils/nodeKey'
import type { ReactNode } from 'react'

export function NodeCard({ node, pool }: { node: Node; pool: BackendPool | null }) {
  const u = deriveUsage(node)
  const tags = Array.isArray(node.meta?.tags) ? node.meta.tags : []
  const os = osLabel(node)
  const logo = distroLogo(node)
  const virt = virtLabel(node)
  const cpu = cpuLabel(node)
  const { ref, visible } = useInViewport<HTMLAnchorElement>({ rootMargin: '320px 0px' })
  const { tcpData, loading: tcpLoading, error: tcpError } = useNodeTcpLatency(pool, node.source, node.uuid, {
    enabled: visible && node.online,
    refreshMs: 180_000,
    priority: visible ? 'high' : 'normal',
  })
  return (
    <a ref={ref} href={`#${encodeURIComponent(nodeKey(node))}`} className="block h-full">
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
          <span className="min-w-0 flex-1 truncate text-[14px] sm:text-[15px] font-black tracking-wide text-foreground" title={displayName(node)}>
            {displayName(node)}
          </span>
          <Flag code={node.meta?.region} className="shrink-0" />
        </div>

        {(os || virt) && (
          <div className="truncate text-xs font-bold text-muted-foreground">
            {[os, virt].filter(Boolean).join(' · ')}
          </div>
        )}

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

        <MiniTcpingPanel node={node} tcpData={tcpData} loading={tcpLoading} error={tcpError} />

        <div className="mt-auto space-y-1.5 border-t border-dashed border-border pt-3 font-mono text-xs text-muted-foreground">
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
              <Badge key={t} variant="outline" className="rounded-full border-border bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground hover:border-primary hover:text-primary">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </a>
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
