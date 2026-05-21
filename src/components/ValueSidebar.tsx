import type { ComponentType } from 'react'
import { AlertTriangle, Coins, Server } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { displayName } from '../utils/derive'
import { cycleProgress, hasCost, remainingDays, remainingValue } from '../utils/cost'
import type { Node } from '../types'

interface Props {
  nodes: Node[]
}

export function ValueSidebar({ nodes }: Props) {
  const visible = nodes.filter(n => !n.meta?.hidden)
  const billable = visible.filter(n => hasCost(n.meta))
  const online = visible.filter(n => n.online).length
  const expiringSoon = billable
    .map(node => ({ node, days: remainingDays(node.meta.expireTime) }))
    .filter((item): item is { node: Node; days: number } => item.days != null && item.days >= 0)
    .sort((a, b) => a.days - b.days)

  const within30 = expiringSoon.filter(item => item.days <= 30).length
  const monthlyCny = billable.reduce((sum, node) => sum + monthlyCost(node.meta.price, node.meta.priceCycle), 0)
  const remainingCny = billable.reduce((sum, node) => sum + remainingValue(node.meta), 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:hidden">
        <CompactCard icon={Server} label="在线 / 总节点" value={`${online} / ${visible.length}`} />
        <CompactCard icon={Coins} label="剩余价值" value={formatCny(remainingCny)} />
      </div>

      <div className="hidden space-y-4 xl:sticky xl:top-28 xl:block">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-bold">剩余价值统计</div>
              <div className="text-xs text-muted-foreground">按 CNY 统计</div>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border px-3 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">折算月成本</span>
              <span className="font-mono text-lg font-black text-foreground">{formatCny(monthlyCny)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>剩余价值</span>
              <span className="font-mono">{formatCny(remainingCny)}</span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <StatCard icon={Server} label="在线 / 总节点" value={`${online} / ${visible.length}`} sub="当前可见节点" />
          <StatCard icon={AlertTriangle} label="30 天内到期" value={`${within30}`} sub="建议优先关注" />
        </div>

        <Card className="p-4 space-y-4">
          <div>
            <div className="text-sm font-bold">临近到期</div>
            <div className="text-xs text-muted-foreground">显示最需要关注的几台</div>
          </div>
          <div className="space-y-3">
            {expiringSoon.length === 0 && <div className="text-sm text-muted-foreground">暂无已设置到期时间的节点</div>}
            {expiringSoon.slice(0, 6).map(({ node, days }) => (
              <div key={`${node.source}:${node.uuid}`} className="rounded-lg border border-dashed border-border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{displayName(node)}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{node.uuid.slice(0, 8)}</div>
                  </div>
                  <Badge variant="secondary" className={days <= 30 ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400' : ''}>
                    {days === 0 ? '今天' : `剩余 ${days} 天`}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Progress value={cycleProgress(node.meta)} className="h-1.5 rounded-sm" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{node.meta.expireTime || '未设置'}</span>
                    {node.meta.price > 0 ? <span>{formatCny(remainingValue(node.meta))}</span> : <span>—</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function CompactCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-xl font-black tracking-tight">{value}</div>
        </div>
      </div>
    </Card>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: ComponentType<{ className?: string }>; label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="mt-1 text-xl font-black tracking-tight">{value}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Card>
  )
}

function monthlyCost(price: number, cycle: number) {
  if (!price) return 0
  const safeCycle = cycle > 0 ? cycle : 30
  return price * (30 / safeCycle)
}

function formatCny(value: number) {
  return `¥${(Number.isFinite(value) ? value : 0).toFixed(2)}`
}
