import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ResourceRing } from './ResourceRing'
import { Flag } from './Flag'
import { StatusDot } from './StatusDot'
import { bytes, pct, relativeAge, uptime } from '../utils/format'
import { deriveUsage, displayName, distroLogo, osLabel, virtLabel } from '../utils/derive'
import { cycleProgress, hasCost, remainingDays, remainingValue } from '../utils/cost'
import { cn } from '../utils/cn'
import {
  buildLatencyChart,
  buildLatencyQualityRows,
  filterRowsByLatestSeries,
  qualitySegmentColor,
  type LatencyQualityRow,
} from '../utils/latency'
import { useNodeLatency } from '../hooks/useNodeLatency'
import { useIsMobile } from '../hooks/useIsMobile'
import type { BackendPool } from '../api/pool'
import type { HistorySample, LatencyType, Node, NodeMeta, TaskQueryResult } from '../types'

const TOOLTIP_STYLE = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 11,
}

interface Props {
  node: Node | null
  onClose: () => void
  showSource?: boolean
  pool: BackendPool | null
}

export function NodeDetail({ node, onClose, showSource, pool }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    if (!node) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [node, onClose])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setStuck(false)
    const onScroll = () => {
      const h = headerRef.current?.offsetHeight ?? 60
      setStuck(el.scrollTop > h)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [node])

  const isMobile = useIsMobile()
  const { pingData, tcpData, loading: latencyLoading, error: latencyError } = useNodeLatency(
    pool,
    node?.source ?? null,
    node?.uuid ?? null,
  )
  if (!node) return null

  const u = deriveUsage(node)
  const d = node.dynamic
  const s = node.static?.system
  const cpu = node.static?.cpu
  const tags = node.meta?.tags ?? []
  const virt = virtLabel(node)
  const logo = distroLogo(node)
  const loadAvg =
    d?.load_one != null && d?.load_five != null && d?.load_fifteen != null
      ? `${d.load_one.toFixed(2)} / ${d.load_five.toFixed(2)} / ${d.load_fifteen.toFixed(2)}`
      : null
  const history = node.history || []
  const trendHistory = history.slice(-120)
  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div
        ref={headerRef}
        className={`sticky top-0 z-10 transition-[background-color,backdrop-filter,border-color] duration-200 ${
          stuck
            ? 'border-b border-border/40 backdrop-blur bg-background/70'
            : 'border-b border-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="返回" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <StatusDot online={node.online} />
          {logo && (
            <img src={logo} alt="" className="w-5 h-5 shrink-0 object-contain" loading="lazy" />
          )}
          <span className="font-semibold truncate min-w-0">{displayName(node)}</span>
          <Flag code={node.meta?.region} className="shrink-0" />
          <span className="hidden md:inline truncate text-xs font-mono text-muted-foreground">
            {node.uuid}
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5 shrink-0">
            {node.meta?.region && <Badge variant="secondary">{node.meta.region}</Badge>}
            {showSource && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {node.source}
              </Badge>
            )}
            {virt && <Badge variant="secondary">{virt}</Badge>}
            {tags.map(t => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <Section title="资源">
          <div className="grid grid-cols-2 place-items-center gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-8">
            <ResourceRing label="CPU" value={u.cpu} sub={loadAvg ?? undefined} size={isMobile ? 112 : 124} strokeWidth={10} centerClassName="text-[18px] font-black text-foreground" labelClassName="mt-2 text-base font-semibold text-foreground" subClassName="mt-3 max-w-[9rem] truncate text-sm font-mono text-muted-foreground" />
            <ResourceRing
              label="内存"
              value={u.mem}
              sub={u.memTotal ? `${bytes(u.memUsed)} / ${bytes(u.memTotal)}` : undefined}
              size={isMobile ? 112 : 124}
              strokeWidth={10}
              centerClassName="text-[18px] font-black text-foreground"
              labelClassName="mt-2 text-base font-semibold text-foreground"
              subClassName="mt-3 max-w-[9rem] truncate text-sm font-mono text-muted-foreground"
            />
            <ResourceRing
              label="磁盘"
              value={u.disk}
              sub={u.diskTotal ? `${bytes(u.diskUsed)} / ${bytes(u.diskTotal)}` : undefined}
              size={isMobile ? 112 : 124}
              strokeWidth={10}
              centerClassName="text-[18px] font-black text-foreground"
              labelClassName="mt-2 text-base font-semibold text-foreground"
              subClassName="mt-3 max-w-[9rem] truncate text-sm font-mono text-muted-foreground"
            />
            <ResourceRing
              label="Swap"
              value={u.swap}
              sub={u.swapTotal ? `${bytes(u.swapUsed)} / ${bytes(u.swapTotal)}` : '无 Swap'}
              size={isMobile ? 112 : 124}
              strokeWidth={10}
              centerClassName="text-[18px] font-black text-foreground"
              labelClassName="mt-2 text-base font-semibold text-foreground"
              subClassName="mt-3 max-w-[9rem] truncate text-sm font-mono text-muted-foreground"
            />
          </div>
        </Section>

        {trendHistory.length > 1 && (
          <Section title="最近实时趋势">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Spark
                data={trendHistory}
                dataKey="cpu"
                label="CPU %"
                stroke="#3b82f6"
                domain={[0, 100]}
                format={pct}
              />
              <Spark
                data={trendHistory}
                dataKey="mem"
                label="内存 %"
                stroke="#10b981"
                domain={[0, 100]}
                format={pct}
              />
              <Spark
                data={trendHistory}
                dataKey="netIn"
                label="下行"
                stroke="#8b5cf6"
                format={v => `${bytes(v)}/s`}
              />
              <Spark
                data={trendHistory}
                dataKey="netOut"
                label="上行"
                stroke="#f59e0b"
                format={v => `${bytes(v)}/s`}
              />
            </div>
          </Section>
        )}

        <LatencyBlock
          title="TCP Ping"
          rows={tcpData}
          type="tcp_ping"
          loading={latencyLoading}
          error={latencyError}
        />
        <LatencyBlock title="Ping" rows={pingData} type="ping" loading={latencyLoading} error={latencyError} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Section title="系统">
            <KV k="主机名" v={s?.system_host_name} />
            <KV k="操作系统" v={osLabel(node)} />
            <KV k="内核" v={s?.system_kernel || s?.system_kernel_version} />
            <KV k="CPU 架构" v={s?.arch || s?.cpu_arch} />
            <KV k="虚拟化" v={virt} />
            <KV k="CPU 型号" v={cpu?.brand || cpu?.per_core?.[0]?.brand} />
            <KV
              k="核心"
              v={
                cpu?.physical_cores != null
                  ? `${cpu.physical_cores} 物理 / ${cpu.logical_cores} 逻辑`
                  : cpu?.per_core?.length
                    ? `${cpu.per_core.length} 核`
                    : null
              }
            />
          </Section>

          <Section title="网络与负载">
            <KV k="累计接收" v={d?.total_received != null ? bytes(d.total_received) : null} />
            <KV k="累计发送" v={d?.total_transmitted != null ? bytes(d.total_transmitted) : null} />
            <KV k="磁盘读" v={d?.read_speed != null ? `${bytes(d.read_speed)}/s` : null} />
            <KV k="磁盘写" v={d?.write_speed != null ? `${bytes(d.write_speed)}/s` : null} />
            <KV k="进程数" v={d?.process_count} />
            <KV
              k="TCP / UDP"
              v={
                d?.tcp_connections != null || d?.udp_connections != null
                  ? `${d?.tcp_connections ?? '—'} / ${d?.udp_connections ?? '—'}`
                  : null
              }
            />
            <KV k="运行时长" v={uptime(d?.uptime)} />
            <KV k="数据更新" v={relativeAge(d?.timestamp)} />
          </Section>

          {hasCost(node.meta) && <CostSection meta={node.meta} />}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{title}</div>
      {children}
    </Card>
  )
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  if (v == null || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-sm py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right truncate">{v}</span>
    </div>
  )
}

interface SparkProps {
  data: HistorySample[]
  dataKey: keyof HistorySample
  label: string
  stroke: string
  domain?: [number, number]
  format: (v: number) => string
}

function Spark({ data, dataKey, label, stroke, domain, format }: SparkProps) {
  const last = Number(data.at(-1)?.[dataKey] ?? 0)
  const id = `g-${dataKey}`
  return (
    <div className="rounded-md border bg-card/50 p-3">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{format(last)}</span>
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={domain ?? ['auto', 'auto']} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={t => new Date(t).toLocaleTimeString()}
              formatter={(v: number) => [format(v), label]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface LatencyBlockProps {
  title: string
  rows: TaskQueryResult[]
  type: LatencyType
  loading: boolean
  error?: string | null
}

const ms = (v: number) => `${v.toFixed(1)} ms`

function LatencyBlock({ title, rows, type, loading, error }: LatencyBlockProps) {
  const isMobile = useIsMobile()
  const filteredRows = useMemo(() => filterRowsByLatestSeries(rows, type), [rows, type])
  const { data, series } = useMemo(() => buildLatencyChart(rows, type), [rows, type])
  const qualityRows = useMemo(
    () => buildLatencyQualityRows(filteredRows, type, isMobile ? 30 : 60),
    [filteredRows, type, isMobile],
  )
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const empty = series.length === 0

  const visibleSeries = series.filter(s => !hidden.has(s.name))

  const toggle = (name: string) =>
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <Section title={`${title} · 近 1 小时`}>
      <div className="relative h-60">
        {empty && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-center">
            <div className="max-w-[560px] rounded-xl border border-dashed border-border bg-secondary/30 px-5 py-3 text-center text-xs leading-5 text-muted-foreground">
              {loading ? '加载中…' : error ? simplifyTaskError(error) : `暂无 ${type} 数据`}
            </div>
          </div>
        )}
        {!empty && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={t => new Date(t).toLocaleTimeString()}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={v => `${v}ms`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                width={48}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={t => new Date(Number(t)).toLocaleTimeString()}
                formatter={(v: number) => ms(Number(v))}
              />
              {visibleSeries.map(s => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        {!empty && loading && (
          <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      {qualityRows.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="hidden md:grid grid-cols-[minmax(0,170px)_minmax(0,1fr)_110px_90px_80px] items-center gap-4 px-2 pb-2 text-[11px] text-muted-foreground">
            <span>来源</span>
            <span>质量</span>
            <span className="text-right">平均延迟</span>
            <span className="text-right">抖动</span>
            <span className="text-right">丢包率</span>
          </div>
          <div className="space-y-1.5">
            {qualityRows.map(row => (
              <LatencyQualityView
                key={row.name}
                row={row}
                hidden={hidden.has(row.name)}
                compact={isMobile}
                onToggle={() => toggle(row.name)}
              />
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

function LatencyQualityView({
  row,
  hidden,
  compact,
  onToggle,
}: {
  row: LatencyQualityRow
  hidden: boolean
  compact: boolean
  onToggle: () => void
}) {
  const { name, color, avg, jitter, lossRate, values } = row

  if (compact) {
    return (
      <div
        onClick={onToggle}
        className={cn(
          'rounded-xl border border-dashed border-border px-3 py-3 text-xs cursor-pointer transition-opacity active:bg-secondary/30',
          hidden && 'opacity-35',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 rounded-full shrink-0" style={{ background: color }} />
          <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
          <span className="font-mono text-foreground/90">{avg != null ? ms(avg) : '—'}</span>
        </div>
        <div className="mt-2 flex h-5 items-stretch gap-[1px] overflow-hidden rounded-md bg-border/55 p-1">
          {values.map((v, i) => (
            <span key={i} className="block flex-1 rounded-[1px]" style={{ backgroundColor: qualitySegmentColor(v) }} />
          ))}
        </div>
        <div className="mt-2 flex justify-end gap-4 text-[11px] text-muted-foreground font-mono">
          <span>抖动 {jitter != null ? ms(jitter) : '—'}</span>
          <span className={cn(lossRate >= 5 && 'text-red-500 font-medium')}>丢包 {lossRate.toFixed(1)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onToggle}
      className={cn(
        'grid grid-cols-[minmax(0,170px)_minmax(0,1fr)_110px_90px_80px] items-center gap-4 rounded-xl px-2 py-2 text-xs cursor-pointer select-none transition-opacity hover:bg-muted/45',
        hidden && 'opacity-35',
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="inline-block w-4 h-0.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="truncate">{name}</span>
      </span>
      <div className="flex h-5 items-stretch gap-[1px] overflow-hidden rounded-md bg-border/55 p-1">
        {values.map((v, i) => (
          <span key={i} className="block flex-1 rounded-[1px]" style={{ backgroundColor: qualitySegmentColor(v) }} />
        ))}
      </div>
      <span className="text-right tabular-nums font-mono">{avg != null ? ms(avg) : '—'}</span>
      <span className="text-right tabular-nums font-mono">{jitter != null ? ms(jitter) : '—'}</span>
      <span className={cn('text-right tabular-nums font-mono', lossRate >= 5 && 'text-red-500 font-medium')}>
        {lossRate.toFixed(1)}%
      </span>
    </div>
  )
}

function simplifyTaskError(error: string) {
  const lower = error.toLowerCase()
  if (lower.includes('permission denied') || lower.includes('insufficient permissions')) {
    return '当前 Token 没有 Task 读取权限，无法展示该图表。'
  }
  return `Task 查询失败：${error}`
}

function CostSection({ meta }: { meta: NodeMeta }) {
  const days = remainingDays(meta.expireTime)
  const value = remainingValue(meta)
  const progress = cycleProgress(meta)
  const unit = meta.priceUnit || '$'

  let daysLabel: string
  let daysClass = ''
  if (days == null) daysLabel = '未设置'
  else if (days < 0) {
    daysLabel = `已过期 ${Math.abs(days)} 天`
    daysClass = 'text-red-500'
  } else if (days <= 7) {
    daysLabel = `${days} 天`
    daysClass = 'text-red-500'
  } else if (days <= 30) {
    daysLabel = `${days} 天`
    daysClass = 'text-orange-500'
  } else {
    daysLabel = `${days} 天`
  }

  const barColor =
    days == null || days < 0
      ? 'bg-muted-foreground/40'
      : days <= 7
        ? 'bg-red-500'
        : days <= 30
          ? 'bg-orange-500'
          : 'bg-emerald-500'

  return (
    <Section title="费用">
      <KV k="月费" v={meta.price > 0 ? `${unit}${meta.price} / ${meta.priceCycle} 天` : null} />
      <KV k="到期" v={meta.expireTime || null} />
      <KV k="剩余" v={<span className={daysClass}>{daysLabel}</span>} />
      <KV k="剩余价值" v={meta.price > 0 ? `${unit}${value.toFixed(2)}` : null} />

      {meta.expireTime && days != null && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Section>
  )
}
