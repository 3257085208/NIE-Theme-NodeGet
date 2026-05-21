import { useEffect, useState } from 'react'
import { taskQuery } from '../api/methods'
import { normalizeTs } from '../utils/latency'
import type { RpcClient } from '../api/client'
import type { BackendPool } from '../api/pool'
import type { LatencyType, TaskQueryResult } from '../types'

const WINDOW_MS = 60 * 60 * 1000
const REFRESH_MS = 120_000
const QUERY_TIMEOUT_MS = 20_000
const CACHE_LIMIT = 1200
const QUERY_LIMIT = 500

export interface LatencyQueryState {
  pingData: TaskQueryResult[]
  tcpData: TaskQueryResult[]
  loading: boolean
  error: string | null
}

const latencyCache = new Map<string, TaskQueryResult[]>()
const latencyInflight = new Map<string, Promise<TaskQueryResult[]>>()
const clientIds = new WeakMap<RpcClient, number>()
let clientSeq = 0

function clientKey(client: RpcClient) {
  let id = clientIds.get(client)
  if (!id) {
    id = ++clientSeq
    clientIds.set(client, id)
  }
  return id
}

function cacheKey(source: string, uuid: string, type: LatencyType) {
  return `${source}::${uuid}::${type}`
}

function clean(rows: TaskQueryResult[] | undefined): TaskQueryResult[] {
  return (rows ?? [])
    .filter(r => r.cron_source && r.cron_source !== '未知')
    .sort((a, b) => normalizeTs(a.timestamp) - normalizeTs(b.timestamp))
}

export function getLatencyCache(source: string | null, uuid: string | null, type: LatencyType, windowMs = WINDOW_MS) {
  if (!source || !uuid) return []
  const cutoff = Date.now() - windowMs
  return (latencyCache.get(cacheKey(source, uuid, type)) || []).filter(row => normalizeTs(row.timestamp) >= cutoff)
}

export function setLatencyCache(source: string, uuid: string, type: LatencyType, rows: TaskQueryResult[]) {
  const key = cacheKey(source, uuid, type)
  const merged = new Map<string, TaskQueryResult>()
  for (const row of latencyCache.get(key) || []) {
    merged.set(`${normalizeTs(row.timestamp)}:${row.cron_source || ''}:${row.success ? 1 : 0}`, row)
  }
  for (const row of rows) {
    merged.set(`${normalizeTs(row.timestamp)}:${row.cron_source || ''}:${row.success ? 1 : 0}`, row)
  }
  latencyCache.set(key, clean([...merged.values()]).slice(-CACHE_LIMIT))
}

export async function fetchLatencyRows(
  client: RpcClient,
  uuid: string,
  type: LatencyType,
  timeoutMs = QUERY_TIMEOUT_MS,
  windowMs = WINDOW_MS,
) {
  const key = `${clientKey(client)}::${uuid}::${type}::${windowMs}`
  const existing = latencyInflight.get(key)
  if (existing) return existing

  const request = (async () => {
    const now = Date.now()
    const window: [number, number] = [now - windowMs, now]

    return clean(
      await taskQuery(
        client,
        [{ uuid }, { timestamp_from_to: window }, { type }, { limit: QUERY_LIMIT }],
        timeoutMs,
      ),
    )
  })()

  latencyInflight.set(key, request)
  try {
    return await request
  } finally {
    if (latencyInflight.get(key) === request) latencyInflight.delete(key)
  }
}

export function useNodeLatency(
  pool: BackendPool | null,
  source: string | null,
  uuid: string | null,
): LatencyQueryState {
  const [pingData, setPingData] = useState<TaskQueryResult[]>(() => getLatencyCache(source, uuid, 'ping'))
  const [tcpData, setTcpData] = useState<TaskQueryResult[]>(() => getLatencyCache(source, uuid, 'tcp_ping'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPingData(getLatencyCache(source, uuid, 'ping'))
    setTcpData(getLatencyCache(source, uuid, 'tcp_ping'))
    setError(null)

    if (!pool || !source || !uuid) return
    const entry = pool.entries.find(e => e.name === source)
    if (!entry) return

    let cancelled = false

    const fetchOnce = async () => {
      setLoading(true)

      const [ping, tcp] = await Promise.allSettled([
        fetchLatencyRows(entry.client, uuid, 'ping'),
        fetchLatencyRows(entry.client, uuid, 'tcp_ping'),
      ])

      if (cancelled) return

      if (ping.status === 'fulfilled') {
        setLatencyCache(source, uuid, 'ping', ping.value)
        setPingData(getLatencyCache(source, uuid, 'ping'))
      }
      if (tcp.status === 'fulfilled') {
        setLatencyCache(source, uuid, 'tcp_ping', tcp.value)
        setTcpData(getLatencyCache(source, uuid, 'tcp_ping'))
      }

      const messages = [ping, tcp]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)))

      setError(messages.length ? messages.join('；') : null)
      setLoading(false)
    }

    fetchOnce()
    const timer = setInterval(fetchOnce, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [pool, source, uuid])

  return { pingData, tcpData, loading, error }
}
