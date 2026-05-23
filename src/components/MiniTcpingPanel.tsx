import { Activity } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../utils/cn'
import {
  buildLatencyQualityRows,
  filterLatencyRowsByFamilyAndType,
  filterRowsByLatestSeries,
  parseLatencyTarget,
  providerLabelFromCode,
  qualitySegmentColor,
  latencySegmentHeight,
} from '../utils/latency'
import type { Node, TaskQueryResult } from '../types'

const SEGMENTS = 22
const NAME_ORDER = ['电信', '联通', '移动']
const MINI_WINDOW_MS = 22 * 60 * 1000
const MINI_BUCKET_MS = 60 * 1000

interface Props {
  node: Node
  tcpData: TaskQueryResult[]
  loading?: boolean
  error?: string | null
  compact?: boolean
}

interface SeriesSummary {
  name: string
  label: string
  values: (number | null | undefined)[]
  avg: number | null
  jitter: number | null
  lossRate: number
}

export function MiniTcpingPanel({ node, tcpData, loading = false, error = null, compact = false }: Props) {
  const series = useMemo(() => summarizeTcping(tcpData), [tcpData])

  if (series.length === 0) return null

  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-secondary/45 px-3 py-3 sm:px-4 sm:py-3.5 mt-1">
      <div className="mb-2.5 sm:mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span>三网 IPv4 TCPing</span>
        {loading && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {series.slice(0, 3).map(item => (
          <TcpingRow key={item.name} item={item} />
        ))}
      </div>
    </div>
  )
}

function TcpingRow({ item }: { item: SeriesSummary }) {
  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)_52px] sm:grid-cols-[44px_minmax(0,1fr)_58px] items-center gap-2 sm:gap-3 text-[11px]">
      <div className="truncate font-semibold text-muted-foreground" title={item.name}>{item.label}</div>
      <div className="flex h-7 items-end gap-[2px] overflow-hidden rounded-lg bg-border/45 px-1.5 py-1 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
        {item.values.map((v, i) => (
          <span
            key={i}
            className="block flex-1 rounded-[3px] transition-[height,background-color,opacity] duration-300"
            style={{
              height: latencySegmentHeight(v),
              backgroundColor: qualitySegmentColor(v),
            }}
            title={`${item.label} ${v === undefined ? '无数据' : v == null ? '丢包' : `${v.toFixed(1)} ms`}`}
          />
        ))}
      </div>
      <div className="text-right leading-[1.15] tabular-nums">
        <div className="font-bold text-foreground/90">{item.avg == null ? '—' : `${item.avg.toFixed(0)}ms`}</div>
        <div className={cn('mt-0.5 text-[10px]', item.lossRate >= 10 ? 'text-rose-500' : 'text-muted-foreground')}>
          {item.lossRate.toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

function summarizeTcping(rows: TaskQueryResult[]): SeriesSummary[] {
  const ipv4TcpRows = filterLatencyRowsByFamilyAndType(rows, 'ipv4', 'tcp_ping')
  const filteredRows = filterRowsByLatestSeries(ipv4TcpRows, 'tcp_ping')

  return buildLatencyQualityRows(filteredRows, 'tcp_ping', SEGMENTS, {
    windowMs: MINI_WINDOW_MS,
    bucketMs: MINI_BUCKET_MS,
    buckets: SEGMENTS,
    includeCurrentBucket: true,
  }, 'ipv4')
    .filter(row => row.values.some(v => v !== undefined))
    .map(row => ({
      name: row.name,
      label: displayProvider(row.name),
      values: row.values,
      avg: row.avg,
      jitter: row.jitter,
      lossRate: row.lossRate,
    }))
    .sort((a, b) => providerRank(a.name) - providerRank(b.name) || (a.avg ?? Infinity) - (b.avg ?? Infinity))
}

function displayProvider(name: string) {
  const target = parseLatencyTarget(name)
  const targetLabel = providerLabelFromCode(target?.provider)
  if (targetLabel) return targetLabel

  const cleaned = name
    .replace(/^tcping[-_]?/i, '')
    .replace(/^tcp[-_]?ping[-_]?/i, '')
    .replace(/^ping[-_]?/i, '')
    .replace(/[\s_-]+$/g, '')
  if (cleaned.includes('电信')) return '电信'
  if (cleaned.includes('联通')) return '联通'
  if (cleaned.includes('移动')) return '移动'
  return cleaned || name
}

function providerRank(name: string) {
  const label = displayProvider(name)
  const idx = NAME_ORDER.findIndex(k => label.includes(k))
  return idx === -1 ? 99 : idx
}

function simplifyError(error: string) {
  const lower = error.toLowerCase()
  if (lower.includes('permission denied') || lower.includes('insufficient permissions')) {
    return '当前 Token 没有 Task 读取权限'
  }
  return `TCPing 查询失败：${error}`
}
