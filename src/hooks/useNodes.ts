import { useEffect, useMemo, useState } from 'react'
import { BackendPool } from '../api/pool'
import {
  dynamicDataMulti,
  dynamicSummaryMulti,
  kvGetMulti,
  listAgentUuids,
  staticDataMulti,
} from '../api/methods'
import { isOnline, normalizeMs } from '../utils/status'
import { nodeKeyFrom } from '../utils/nodeKey'
import type { DynamicDataResponse, DynamicSummary, HistorySample, Node, NodeMeta, SiteConfig } from '../types'

type Agent = Pick<Node, 'uuid' | 'source' | 'meta' | 'static'>

interface BackendError {
  source: string
  error: unknown
}

interface DynamicUpdate {
  source: string
  row: DynamicSummary
}

const STATIC_FIELDS = ['cpu', 'system']
const DYNAMIC_FIELDS = [
  'cpu_usage',
  'used_memory',
  'total_memory',
  'available_memory',
  'used_swap',
  'total_swap',
  'total_space',
  'available_space',
  'read_speed',
  'write_speed',
  'receive_speed',
  'transmit_speed',
  'total_received',
  'total_transmitted',
  'load_one',
  'load_five',
  'load_fifteen',
  'uptime',
  'boot_time',
  'process_count',
  'tcp_connections',
  'udp_connections',
]

const DYNAMIC_DATA_FIELDS = ['cpu', 'ram', 'load', 'system', 'disk', 'network']
const META_KEYS = [
  'metadata_name',
  'metadata_region',
  'metadata_tags',
  'metadata_hidden',
  'metadata_virtualization',
  'metadata_latitude',
  'metadata_longitude',
  'metadata_order',
  'metadata_price',
  'metadata_price_unit',
  'metadata_price_cycle',
  'metadata_expire_time',
]

const DEFAULT_DYN_INTERVAL_MS = 2_000
const MIN_DYN_INTERVAL_MS = 1_000
const MAX_DYN_INTERVAL_MS = 60_000
const HIDDEN_DYN_INTERVAL_MS = 60_000
const LIVE_HISTORY_LIMIT = 180
const META_CACHE_KEY = 'nodeget.meta.cache.v2'

function emptyMeta(): NodeMeta {
  return { name: '', region: '', tags: [], hidden: false, virtualization: '', lat: null, lng: null, order: 0, price: 0, priceUnit: '$', priceCycle: 30, expireTime: '' }
}

function blankAgent(uuid: string, source: string, meta?: NodeMeta): Agent {
  return { uuid, source, meta: meta ?? emptyMeta(), static: {} }
}

function parseBoolean(value: unknown) {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'on'
  }
  return false
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  const raw = value.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean)
  } catch {}
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function stringValue(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

function parseMeta(raw: Record<string, unknown>): NodeMeta {
  const lat = Number(raw.metadata_latitude)
  const lng = Number(raw.metadata_longitude)
  const order = Number(raw.metadata_order)
  const price = Number(raw.metadata_price)
  const cycle = Number(raw.metadata_price_cycle)
  return {
    name: stringValue(raw.metadata_name),
    region: stringValue(raw.metadata_region),
    tags: parseTags(raw.metadata_tags),
    hidden: parseBoolean(raw.metadata_hidden),
    virtualization: stringValue(raw.metadata_virtualization),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    order: Number.isFinite(order) ? order : 0,
    price: Number.isFinite(price) ? price : 0,
    priceUnit: stringValue(raw.metadata_price_unit) || '$',
    priceCycle: Number.isFinite(cycle) && cycle > 0 ? cycle : 30,
    expireTime: stringValue(raw.metadata_expire_time),
  }
}

function hasOwn(raw: Record<string, unknown> | undefined, key: string) {
  return Boolean(raw && Object.prototype.hasOwnProperty.call(raw, key))
}

function mergeMeta(prev: NodeMeta | undefined, next: NodeMeta, raw?: Record<string, unknown>): NodeMeta {
  const base = prev ?? emptyMeta()
  return {
    name: next.name || base.name,
    region: next.region || base.region,
    tags: next.tags.length ? next.tags : base.tags,
    hidden: hasOwn(raw, 'metadata_hidden') ? next.hidden : base.hidden,
    virtualization: next.virtualization || base.virtualization,
    lat: hasOwn(raw, 'metadata_latitude') ? next.lat : base.lat,
    lng: hasOwn(raw, 'metadata_longitude') ? next.lng : base.lng,
    order: hasOwn(raw, 'metadata_order') ? next.order : base.order,
    price: hasOwn(raw, 'metadata_price') ? next.price : base.price,
    priceUnit: next.priceUnit || base.priceUnit,
    priceCycle: hasOwn(raw, 'metadata_price_cycle') ? next.priceCycle : base.priceCycle,
    expireTime: next.expireTime || base.expireTime,
  }
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function timestampOf(row: { timestamp?: number; time?: number } | null | undefined) {
  return finiteNumber(row?.timestamp) ?? finiteNumber(row?.time)
}

function timestampMs(row: { timestamp?: number; time?: number } | null | undefined) {
  const ts = timestampOf(row)
  return ts == null ? null : normalizeMs(ts)
}

function sumFinite<T>(items: T[] | undefined, getter: (item: T) => unknown) {
  if (!Array.isArray(items)) return undefined
  let total = 0
  let seen = false
  for (const item of items) {
    const value = finiteNumber(getter(item))
    if (value == null) continue
    total += value
    seen = true
  }
  return seen ? total : undefined
}

function summaryFromDynamicData(row: DynamicDataResponse): DynamicSummary | null {
  const timestamp = timestampOf(row)
  if (!row.uuid || !timestamp) return null
  const disk = row.disk || []
  const interfaces = row.network?.interfaces || []
  return {
    uuid: row.uuid,
    timestamp,
    cpu_usage: finiteNumber(row.cpu?.total_cpu_usage),
    used_memory: finiteNumber(row.ram?.used_memory),
    total_memory: finiteNumber(row.ram?.total_memory),
    available_memory: finiteNumber(row.ram?.available_memory),
    used_swap: finiteNumber(row.ram?.used_swap),
    total_swap: finiteNumber(row.ram?.total_swap),
    total_space: sumFinite(disk, item => item.total_space),
    available_space: sumFinite(disk, item => item.available_space),
    read_speed: sumFinite(disk, item => item.read_speed),
    write_speed: sumFinite(disk, item => item.write_speed),
    receive_speed: sumFinite(interfaces, item => item.receive_speed),
    transmit_speed: sumFinite(interfaces, item => item.transmit_speed),
    total_received: sumFinite(interfaces, item => item.total_received),
    total_transmitted: sumFinite(interfaces, item => item.total_transmitted),
    load_one: finiteNumber(row.load?.one),
    load_five: finiteNumber(row.load?.five),
    load_fifteen: finiteNumber(row.load?.fifteen),
    uptime: finiteNumber(row.system?.uptime),
    boot_time: finiteNumber(row.system?.boot_time),
    process_count: finiteNumber(row.system?.process_count),
    tcp_connections: finiteNumber(row.network?.tcp_connections),
    udp_connections: finiteNumber(row.network?.udp_connections),
  }
}

function sampleFrom(row: DynamicSummary): HistorySample {
  const memTotal = row.total_memory || 0
  const diskTotal = row.total_space || 0
  return {
    t: timestampMs(row)!,
    cpu: row.cpu_usage ?? null,
    mem: memTotal && row.used_memory != null ? (row.used_memory / memTotal) * 100 : null,
    disk: diskTotal && row.available_space != null ? ((diskTotal - row.available_space) / diskTotal) * 100 : null,
    netIn: row.receive_speed ?? 0,
    netOut: row.transmit_speed ?? 0,
  }
}

function isUsableHistoryRow(row: DynamicSummary | null | undefined) {
  return Boolean(row?.uuid && timestampMs(row))
}

function mergeHistory(existing: HistorySample[] | undefined, incoming: HistorySample[]) {
  const byTime = new Map<number, HistorySample>()
  for (const item of existing || []) byTime.set(item.t, item)
  for (const item of incoming) byTime.set(item.t, item)
  return [...byTime.values()].sort((a, b) => a.t - b.t).slice(-LIVE_HISTORY_LIMIT)
}

function normalizeRefreshInterval(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DYN_INTERVAL_MS
  return Math.min(MAX_DYN_INTERVAL_MS, Math.max(MIN_DYN_INTERVAL_MS, n))
}

function historyUpdatesFromDynamicRows(updates: DynamicUpdate[]) {
  const grouped = new Map<string, HistorySample[]>()
  for (const { source, row } of updates) {
    if (!isUsableHistoryRow(row)) continue
    const key = nodeKeyFrom(source, row.uuid)
    const sample = sampleFrom(row)
    grouped.set(key, [...(grouped.get(key) || []), sample])
  }
  return grouped
}

function readJsonMap<T>(key: string, isValid: (value: unknown) => value is T) {
  if (typeof window === 'undefined') return new Map<string, T>()
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
    if (!raw) return new Map<string, T>()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const map = new Map<string, T>()
    for (const [k, v] of Object.entries(parsed || {})) {
      if (isValid(v)) map.set(k, v)
    }
    return map
  } catch {
    return new Map<string, T>()
  }
}

function writeJsonMap<T>(key: string, map: Map<string, T>, storage: Storage = sessionStorage) {
  if (typeof window === 'undefined') return
  try {
    const payload: Record<string, T> = {}
    for (const [k, v] of map) payload[k] = v
    storage.setItem(key, JSON.stringify(payload))
  } catch {}
}

function isMeta(value: unknown): value is NodeMeta {
  return Boolean(value && typeof value === 'object' && 'name' in value && 'tags' in value)
}

function loadMetaCache() {
  return readJsonMap<NodeMeta>(META_CACHE_KEY, isMeta)
}

export function useNodes(config: SiteConfig | null) {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map())
  const [live, setLive] = useState<Map<string, DynamicSummary>>(new Map())
  const [history, setHistory] = useState<Map<string, HistorySample[]>>(() => new Map())
  const [errors, setErrors] = useState<BackendError[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [pool, setPool] = useState<BackendPool | null>(null)

  useEffect(() => {
    setErrors([])
    setAgents(new Map())
    setLive(new Map())
    setHistory(new Map())
    if (!config?.site_tokens?.length) {
      setLoading(false)
      return
    }
    const pool = new BackendPool(config.site_tokens)
    setPool(pool)
    setLoading(true)

    const sourceUuids = new Map<string, string[]>()
    const metaCache = loadMetaCache()
    const dynamicIntervalMs = normalizeRefreshInterval(config.refresh_interval_ms)
    let dynamicInFlight = false
    let stopped = false
    let dynTimer: number | null = null

    const applyMetaAndStatic = async (entry: BackendPool['entries'][number], uuids: string[]) => {
      if (!uuids.length) return
      const kvItems = uuids.flatMap(u => META_KEYS.map(k => ({ namespace: u, key: k })))
      const [meta, stat] = await Promise.allSettled([kvGetMulti(entry.client, kvItems), staticDataMulti(entry.client, uuids, STATIC_FIELDS)])
      const parsedMetaByKey = new Map<string, NodeMeta>()
      if (meta.status === 'fulfilled' && meta.value) {
        const grouped = new Map<string, Record<string, unknown>>()
        for (const row of meta.value) {
          if (!row || row.value == null) continue
          let bucket = grouped.get(row.namespace)
          if (!bucket) grouped.set(row.namespace, (bucket = {}))
          bucket[row.key] = row.value
        }
        for (const uuid of uuids) {
          const raw = grouped.get(uuid)
          if (!raw) continue
          const key = nodeKeyFrom(entry.name, uuid)
          const cached = metaCache.get(key)
          const parsed = mergeMeta(cached, parseMeta(raw), raw)
          parsedMetaByKey.set(key, parsed)
          metaCache.set(key, parsed)
        }
        writeJsonMap(META_CACHE_KEY, metaCache, localStorage)
      } else if (meta.status === 'rejected') {
        setErrors(prev => [...prev, { source: entry.name, error: meta.reason }])
      }
      setAgents(prev => {
        const next = new Map(prev)
        for (const uuid of uuids) {
          const key = nodeKeyFrom(entry.name, uuid)
          const parsed = parsedMetaByKey.get(key)
          if (!parsed) continue
          const cur = next.get(key) ?? blankAgent(uuid, entry.name, metaCache.get(key))
          next.set(key, { ...cur, meta: mergeMeta(cur.meta, parsed) })
        }
        if (stat.status === 'fulfilled' && stat.value) {
          for (const row of stat.value) {
            if (!row.uuid) continue
            const key = nodeKeyFrom(entry.name, row.uuid)
            const cur = next.get(key) ?? blankAgent(row.uuid, entry.name, metaCache.get(key))
            next.set(key, { ...cur, static: row })
          }
        }
        return next
      })
      if (stat.status === 'rejected') setErrors(prev => [...prev, { source: entry.name, error: stat.reason }])
    }

    const tickDynamic = async () => {
      if (stopped || dynamicInFlight) return
      dynamicInFlight = true
      const updates: DynamicUpdate[] = []
      try {
        await Promise.allSettled(pool.entries.map(async entry => {
          const uuids = sourceUuids.get(entry.name) || []
          if (!uuids.length) return
          const seen = new Set<string>()
          try {
            const rows = await dynamicSummaryMulti(entry.client, uuids, DYNAMIC_FIELDS)
            for (const row of rows || []) {
              if (!row?.uuid) continue
              updates.push({ source: entry.name, row })
              seen.add(row.uuid)
            }
          } catch {}
          const missing = uuids.filter(uuid => !seen.has(uuid))
          if (!missing.length) return
          try {
            const rows = await dynamicDataMulti(entry.client, missing, DYNAMIC_DATA_FIELDS)
            for (const row of rows || []) {
              const summary = summaryFromDynamicData(row)
              if (summary) updates.push({ source: entry.name, row: summary })
            }
          } catch {}
        }))
        if (!updates.length || stopped) return
        setLive(prev => {
          const next = new Map(prev)
          for (const { source, row } of updates) {
            const key = nodeKeyFrom(source, row.uuid)
            const cur = next.get(key)
            const rowTs = timestampMs(row) ?? 0
            const curTs = timestampMs(cur) ?? 0
            if (!cur || rowTs >= curTs) next.set(key, row)
          }
          return next
        })
        const grouped = historyUpdatesFromDynamicRows(updates)
        if (grouped.size) {
          setHistory(prev => {
            const next = new Map(prev)
            for (const [key, samples] of grouped) next.set(key, mergeHistory(next.get(key), samples))
            return next
          })
        }
      } finally {
        dynamicInFlight = false
      }
    }

    const clearDynamicTimer = () => {
      if (!dynTimer) return
      window.clearTimeout(dynTimer)
      dynTimer = null
    }

    const scheduleDynamicTick = () => {
      if (stopped) return
      clearDynamicTimer()
      const delay = document.visibilityState === 'hidden' ? HIDDEN_DYN_INTERVAL_MS : dynamicIntervalMs
      dynTimer = window.setTimeout(async () => {
        dynTimer = null
        await tickDynamic()
        scheduleDynamicTick()
      }, delay)
    }

    const bootstrap = async () => {
      const agentsRes = await pool.fanout(listAgentUuids)
      setErrors(prev => [...prev, ...agentsRes.errors])
      const seed = new Map<string, Agent>()
      for (const { source, rows } of agentsRes.ok) {
        const uuids = rows ?? []
        sourceUuids.set(source, uuids)
        for (const uuid of uuids) seed.set(nodeKeyFrom(source, uuid), blankAgent(uuid, source, metaCache.get(nodeKeyFrom(source, uuid))))
      }
      setAgents(seed)
      const metaAndStatic = Promise.all(pool.entries.map(entry => applyMetaAndStatic(entry, sourceUuids.get(entry.name) || [])))
      await tickDynamic()
      setLoading(false)
      scheduleDynamicTick()
      void metaAndStatic.catch((e: unknown) => setErrors(prev => [...prev, { source: '*', error: e }]))
    }

    bootstrap().catch((e: unknown) => {
      setErrors(prev => [...prev, { source: '*', error: e }])
      setLoading(false)
    })

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearDynamicTimer()
        void tickDynamic().finally(scheduleDynamicTick)
      } else {
        scheduleDynamicTick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    const clockTimer = window.setInterval(() => setTick(t => t + 1), 5000)
    return () => {
      stopped = true
      clearDynamicTimer()
      window.clearInterval(clockTimer)
      document.removeEventListener('visibilitychange', onVisible)
      setPool(null)
      pool.close()
    }
  }, [config])

  const nodes = useMemo(() => {
    const now = Date.now()
    const out = new Map<string, Node>()
    for (const [key, a] of agents) {
      const dyn = live.get(key) || null
      out.set(key, { ...a, dynamic: dyn, history: history.get(key) || [], online: isOnline(timestampOf(dyn), now) })
    }
    return out
  }, [agents, live, history, tick])

  return { nodes, errors, loading, pool }
}
