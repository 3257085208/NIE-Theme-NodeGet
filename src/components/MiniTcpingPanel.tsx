import { Activity } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../utils/cn'
import {
  buildLatencyQualityRows,
  filterLatencyRowsByFamilyAndType,
  filterRowsByLatestSeries,
  inferLatencyBucketMs,
  parseLatencyTarget,
  providerLabelFromCode,
  latencyTargetDisplayLabel,
  qualitySegmentColor,
  latencySegmentHeight,
  type LatencyFamily,
} from '../utils/latency'
import { prefBool, prefString, splitPreferenceList } from '../utils/preferences'
import type { LatencyType, SiteUserPreferences, TaskQueryResult } from '../types'

const SEGMENTS = 22
const NAME_ORDER = ['电信', '联通', '移动']
const MIN_MINI_BUCKET_MS = 60 * 1000
const MAX_MINI_BUCKET_MS = 2 * 60 * 1000

interface Props {
  pingData: TaskQueryResult[]
  tcpData: TaskQueryResult[]
  loading?: boolean
  error?: string | null
  prefs?: SiteUserPreferences
}

interface SeriesSummary {
  name: string
  label: string
  values: (number | null | undefined)[]
  avg: number | null
  jitter: number | null
  lossRate: number
}

interface LatencyGroup {
  key: string
  title: string
  type: LatencyType
  family: LatencyFamily
  rows: TaskQueryResult[]
  series: SeriesSummary[]
}

export function MiniTcpingPanel({ pingData, tcpData, loading = false, error = null, prefs }: Props) {
  const groups = useMemo(() => summarizeLatencyGroups(pingData, tcpData, prefs), [pingData, tcpData, prefs])

  if (groups.length === 0) return null

  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-transparent px-3 py-3 sm:px-4 sm:py-3.5 mt-1">
      <div className="mb-2.5 sm:mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span>延迟监控</span>
        {loading && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      </div>

      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.key} className="space-y-2 sm:space-y-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/75">
              {group.title}
            </div>
            {group.series.map(item => (
              <TcpingRow key={item.name} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TcpingRow({ item }: { item: SeriesSummary }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_52px] sm:grid-cols-[76px_minmax(0,1fr)_58px] items-center gap-2 sm:gap-3 text-[11px]">
      <div className="truncate font-semibold text-muted-foreground" title={`${item.label} · ${item.name}`}>{item.label}</div>
      <div className="flex h-5 items-end gap-[2px] overflow-hidden rounded-none bg-transparent px-0 py-0 shadow-none">
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

function summarizeLatencyGroups(
  pingRows: TaskQueryResult[],
  tcpRows: TaskQueryResult[],
  prefs?: SiteUserPreferences,
): LatencyGroup[] {
  const includeTokens = splitPreferenceList(prefString(prefs, 'home_tcping_include', ''))
  const configs: Array<{
    key: string
    title: string
    family: LatencyFamily
    type: LatencyType
    source: TaskQueryResult[]
    enabled: boolean
  }> = [
    {
      key: 'ipv4_ping',
      title: 'IPv4 Ping',
      family: 'ipv4',
      type: 'ping',
      source: pingRows,
      enabled: prefBool(prefs, 'home_show_ipv4_ping', false),
    },
    {
      key: 'ipv4_tcping',
      title: 'IPv4 TCPing',
      family: 'ipv4',
      type: 'tcp_ping',
      source: tcpRows,
      enabled: prefBool(prefs, 'home_show_ipv4_tcping', true),
    },
    {
      key: 'ipv6_ping',
      title: 'IPv6 Ping',
      family: 'ipv6',
      type: 'ping',
      source: pingRows,
      enabled: prefBool(prefs, 'home_show_ipv6_ping', false),
    },
    {
      key: 'ipv6_tcping',
      title: 'IPv6 TCPing',
      family: 'ipv6',
      type: 'tcp_ping',
      source: tcpRows,
      enabled: prefBool(prefs, 'home_show_ipv6_tcping', false),
    },
  ]

  return configs
    .filter(config => config.enabled)
    .map<LatencyGroup | null>(config => {
      const rows = filterRowsByLatestSeries(
        filterLatencyRowsByFamilyAndType(config.source, config.family, config.type),
        config.type,
      )
      const series = buildSeries(rows, config.type, config.family)
        .filter(item => matchesInclude(item, includeTokens))
      if (series.length === 0) return null
      return {
        key: config.key,
        title: config.title,
        family: config.family,
        type: config.type,
        rows,
        series,
      }
    })
    .filter((group): group is LatencyGroup => group != null)
}

function buildSeries(rows: TaskQueryResult[], type: LatencyType, family: LatencyFamily): SeriesSummary[] {
  const bucketMs = inferLatencyBucketMs(rows, type, {
    minBucketMs: MIN_MINI_BUCKET_MS,
    maxBucketMs: MAX_MINI_BUCKET_MS,
    maxDeltaMs: 10 * MIN_MINI_BUCKET_MS,
  })

  return buildLatencyQualityRows(rows, type, SEGMENTS, {
    windowMs: SEGMENTS * bucketMs,
    bucketMs,
    buckets: SEGMENTS,
    includeCurrentBucket: false,
  }, family)
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

function matchesInclude(item: SeriesSummary, tokens: string[]) {
  if (tokens.length === 0) return true
  const target = parseLatencyTarget(item.name)
  const candidates = [
    item.name,
    item.label,
    latencyTargetDisplayLabel(item.name),
    target?.target,
    target ? `${target.city}-${target.provider}` : '',
  ]
    .filter(Boolean)
    .map(value => String(value).toLowerCase())

  return tokens.some(raw => {
    const token = raw.toLowerCase()
    return candidates.some(value => value.includes(token))
  })
}

function displayProvider(name: string) {
  const targetLabel = latencyTargetDisplayLabel(name)
  if (targetLabel) return targetLabel

  const target = parseLatencyTarget(name)
  const providerLabel = providerLabelFromCode(target?.provider)
  if (providerLabel) return providerLabel

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
