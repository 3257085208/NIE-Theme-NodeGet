import type { LatencyType, TaskQueryResult } from '../types'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

const FALLBACK_VALUE_KEYS = [
  'latency',
  'delay',
  'rtt',
  'time',
  'ms',
  'avg',
  'value',
  'result',
  'duration',
]

export const LATENCY_BUCKET_COLORS = {
  deepGreen: '#16a34a',
  lightGreen: '#84cc16',
  lightYellow: '#fde047',
  deepYellow: '#f59e0b',
  lightRed: '#f87171',
  deepRed: '#dc2626',
}

export function latencyColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export function qualitySegmentColor(v: number | null | undefined) {
  if (v === undefined) return 'rgba(148, 163, 184, 0.36)'
  if (v == null) return LATENCY_BUCKET_COLORS.deepRed
  if (v <= 45) return LATENCY_BUCKET_COLORS.deepGreen
  if (v <= 90) return LATENCY_BUCKET_COLORS.lightGreen
  if (v <= 160) return LATENCY_BUCKET_COLORS.lightYellow
  if (v <= 300) return LATENCY_BUCKET_COLORS.deepYellow
  return LATENCY_BUCKET_COLORS.lightRed
}

export function normalizeTs(ts: number) {
  return ts < 1_000_000_000_000 ? ts * 1000 : ts
}

function numberFromString(s: string) {
  const match = s.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? n : null
}

function readNumber(value: unknown, depth = 0): number | null {
  if (depth > 5 || value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return numberFromString(value)
  if (typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const v = readNumber(value[i], depth + 1)
      if (v != null) return v
    }
    return null
  }

  const obj = value as Record<string, unknown>
  for (const key of FALLBACK_VALUE_KEYS) {
    if (key in obj) {
      const v = readNumber(obj[key], depth + 1)
      if (v != null) return v
    }
  }
  for (const v of Object.values(obj)) {
    const n = readNumber(v, depth + 1)
    if (n != null) return n
  }
  return null
}

export function extractLatencyValue(row: TaskQueryResult, type: LatencyType): number | null {
  if (!row.success) return null
  const result = row.task_event_result
  if (!result) return null

  const direct = (result as Record<string, unknown>)[type]
  if (typeof direct === 'number') return Number.isFinite(direct) ? direct : null

  const directNested = readNumber(direct)
  if (directNested != null) return directNested

  return readNumber(result)
}

export function latencySeriesName(row: TaskQueryResult, type?: LatencyType) {
  const name = row.cron_source || (type === 'tcp_ping' ? 'TCP Ping' : type === 'ping' ? 'Ping' : '未知')
  return name.trim() || '未知'
}


export function providerKeyFromSeries(name: string) {
  const lower = name.toLowerCase()
  if (name.includes('电信') || /(^|[^a-z])ct([^a-z]|$)/.test(lower) || lower.includes('telecom')) return 'telecom'
  if (name.includes('联通') || /(^|[^a-z])cu([^a-z]|$)/.test(lower) || lower.includes('unicom')) return 'unicom'
  if (name.includes('移动') || /(^|[^a-z])cm([^a-z]|$)/.test(lower) || lower.includes('mobile')) return 'mobile'
  return null
}

export function selectLatestSeriesNames(rows: TaskQueryResult[], type: LatencyType) {
  const latest = new Map<string, { name: string; ts: number }>()
  const passthrough = new Set<string>()

  for (const row of rows) {
    const name = latencySeriesName(row, type)
    const ts = normalizeTs(row.timestamp)
    const provider = providerKeyFromSeries(name)
    if (!provider) {
      passthrough.add(name)
      continue
    }
    const current = latest.get(provider)
    if (!current || ts > current.ts || (ts === current.ts && name.localeCompare(current.name) > 0)) {
      latest.set(provider, { name, ts })
    }
  }

  return new Set<string>([
    ...passthrough,
    ...[...latest.values()].map(item => item.name),
  ])
}

export function filterRowsByLatestSeries(rows: TaskQueryResult[], type: LatencyType) {
  const keep = selectLatestSeriesNames(rows, type)
  return rows.filter(row => keep.has(latencySeriesName(row, type)))
}

function seriesNames(rows: TaskQueryResult[], type: LatencyType) {
  const set = new Set<string>()
  for (const r of rows) set.add(latencySeriesName(r, type))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export interface ChartPoint {
  t: number
  [series: string]: number | null
}

export interface ChartSeries {
  name: string
  color: string
}

export interface LatencyStats {
  name: string
  color: string
  avg: number | null
  jitter: number | null
  lossRate: number
}

export interface LatencyQualityRow extends LatencyStats {
  values: (number | null | undefined)[]
}

export interface LatencyBucketOptions {
  windowMs?: number
  bucketMs?: number
  buckets?: number
  now?: number
  includeCurrentBucket?: boolean
  fillEmptyWithNull?: boolean
}

interface BucketAgg {
  success: number[]
  failed: number
  total: number
}

function alignedWindow({ windowMs, bucketMs, buckets, now = Date.now(), includeCurrentBucket = false }: LatencyBucketOptions) {
  const safeBucketMs = bucketMs ?? (buckets && windowMs ? Math.max(1, Math.floor(windowMs / buckets)) : 60_000)
  const safeBuckets = buckets ?? (windowMs ? Math.max(1, Math.ceil(windowMs / safeBucketMs)) : 60)
  const lastCompletedEnd = Math.floor(now / safeBucketMs) * safeBucketMs
  const windowEnd = includeCurrentBucket ? lastCompletedEnd + safeBucketMs : lastCompletedEnd
  const windowStart = windowEnd - safeBuckets * safeBucketMs
  return { bucketMs: safeBucketMs, buckets: safeBuckets, windowStart, windowEnd }
}

function emptyPoint(t: number, names: string[]): ChartPoint {
  const pt: ChartPoint = { t }
  for (const n of names) pt[n] = null
  return pt
}

function aggregateRows(rows: TaskQueryResult[], type: LatencyType, options: LatencyBucketOptions = {}) {
  const names = seriesNames(rows, type)
  const series: ChartSeries[] = names.map(name => ({ name, color: latencyColor(name) }))
  const { bucketMs, buckets, windowStart, windowEnd } = alignedWindow(options)
  const bySeries = new Map<string, BucketAgg[]>()

  for (const name of names) {
    bySeries.set(
      name,
      Array.from({ length: buckets }, () => ({ success: [], failed: 0, total: 0 })),
    )
  }

  for (const row of rows) {
    const t = normalizeTs(row.timestamp)
    if (t < windowStart || t >= windowEnd) continue
    const name = latencySeriesName(row, type)
    const list = bySeries.get(name)
    if (!list) continue
    const idx = Math.floor((t - windowStart) / bucketMs)
    if (idx < 0 || idx >= buckets) continue
    const bucket = list[idx]
    bucket.total++
    const value = extractLatencyValue(row, type)
    if (value == null) bucket.failed++
    else bucket.success.push(value)
  }

  return { names, series, bySeries, bucketMs, buckets, windowStart, windowEnd }
}

function avg(values: number[]) {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null
}

function bucketValue(bucket: BucketAgg, fillEmptyWithNull = true) {
  if (!bucket.total) return fillEmptyWithNull ? null : undefined
  return avg(bucket.success)
}

function jitter(values: number[]) {
  if (values.length < 2) return null
  return values.slice(1).reduce((sum, v, i) => sum + Math.abs(v - values[i]), 0) / (values.length - 1)
}

function lossRateFromValues(values: (number | null | undefined)[]) {
  const observed = values.filter(v => v !== undefined)
  return observed.length ? (observed.filter(v => v == null).length / observed.length) * 100 : 0
}

export function latencyRowsToHistory(rows: TaskQueryResult[], type: LatencyType) {
  return rows
    .filter(row => row.success && extractLatencyValue(row, type) != null)
    .map(row => ({
      t: normalizeTs(row.timestamp),
      cpu: null,
      mem: null,
      disk: null,
      netIn: 0,
      netOut: 0,
    }))
    .sort((a, b) => a.t - b.t)
}

function chartSeriesNames(rows: TaskQueryResult[]) {
  const set = new Set<string>()
  for (const r of rows) set.add(r.cron_source || '未知')
  return [...set].sort((a, b) => a.localeCompare(b))
}

function pickChartValue(row: TaskQueryResult, type: LatencyType): number | null {
  const v = row.task_event_result?.[type]
  return row.success && typeof v === 'number' ? v : null
}

function forwardFill(data: ChartPoint[], names: string[]) {
  const last: Record<string, number | null> = {}
  for (const n of names) last[n] = null
  for (const pt of data) {
    for (const n of names) {
      const v = pt[n]
      if (v == null) pt[n] = last[n]
      else last[n] = v
    }
  }
}

export function buildLatencyChart(rows: TaskQueryResult[], type: LatencyType) {
  const names = chartSeriesNames(rows)
  const series: ChartSeries[] = names.map(name => ({ name, color: latencyColor(name) }))
  const byTs = new Map<number, ChartPoint>()

  for (const r of rows) {
    const t = normalizeTs(r.timestamp)
    let pt = byTs.get(t)
    if (!pt) {
      pt = { t }
      for (const n of names) pt[n] = null
      byTs.set(t, pt)
    }
    pt[r.cron_source || '未知'] = pickChartValue(r, type)
  }

  const data = [...byTs.values()].sort((a, b) => a.t - b.t)
  forwardFill(data, names)
  return { data, series }
}

export function buildLatencyQualityRows(
  rows: TaskQueryResult[],
  type: LatencyType,
  segments = 72,
  options: LatencyBucketOptions = {},
): LatencyQualityRow[] {
  const { names, bySeries } = aggregateRows(rows, type, {
    bucketMs: 60_000,
    buckets: segments,
    includeCurrentBucket: false,
    ...options,
  })

  return names
    .map<LatencyQualityRow>(name => {
      const buckets = bySeries.get(name) || []
      const values = buckets.map(bucket => bucketValue(bucket, false))
      const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      return {
        name,
        color: latencyColor(name),
        avg: avg(valid),
        jitter: jitter(valid),
        lossRate: lossRateFromValues(values),
        values,
      }
    })
    .sort((a, b) => {
      const av = a.avg ?? Infinity
      const bv = b.avg ?? Infinity
      if (av !== bv) return av - bv
      const aj = a.jitter ?? Infinity
      const bj = b.jitter ?? Infinity
      if (aj !== bj) return aj - bj
      return a.lossRate - b.lossRate
    })
}

export function computeLatencyStats(rows: TaskQueryResult[], type: LatencyType): LatencyStats[] {
  return buildLatencyQualityRows(rows, type, 72).map(({ name, color, avg, jitter, lossRate }) => ({
    name,
    color,
    avg,
    jitter,
    lossRate,
  }))
}
