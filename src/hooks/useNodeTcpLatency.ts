import { useEffect, useMemo, useState } from 'react'
import { fetchLatencyRows, getLatencyCache, setLatencyCache } from './useNodeLatency'
import type { BackendPool } from '../api/pool'
import type { TaskQueryResult } from '../types'

const DEFAULT_REFRESH_MS = 180_000
const ERROR_RETRY_MS = 30_000
const QUERY_TIMEOUT_MS = 12_000
const AVAILABILITY_WINDOW_MS = 4 * 60 * 60 * 1000
const MAX_CONCURRENT = 2

type Priority = 'high' | 'normal'

interface UseNodeTcpLatencyOptions {
  enabled?: boolean
  refreshMs?: number
  priority?: Priority
  windowMs?: number
}

interface TcpLatencyState {
  key: string
  tcpData: TaskQueryResult[]
  loading: boolean
  error: string | null
  queried: boolean
  updatedAt: number
}

interface QueueItem {
  pool: BackendPool
  source: string
  uuid: string
  windowMs: number
  priority: Priority
}

const stateStore = new Map<string, TcpLatencyState>()
const listeners = new Map<string, Set<() => void>>()
const inflight = new Map<string, Promise<void>>()
const queued = new Map<string, QueueItem>()
let activeCount = 0

function queryKey(source: string | null, uuid: string | null) {
  return `${source ?? ''}::${uuid ?? ''}`
}

function hasQueryTarget(pool: BackendPool | null, source: string | null, uuid: string | null) {
  return Boolean(pool && source && uuid && pool.entries.some(e => e.name === source))
}

function getSnapshot(source: string | null, uuid: string | null, windowMs = AVAILABILITY_WINDOW_MS): TcpLatencyState {
  const key = queryKey(source, uuid)
  const existing = stateStore.get(key)
  if (existing) return { ...existing, tcpData: getLatencyCache(source, uuid, 'tcp_ping', windowMs) }
  return {
    key,
    tcpData: getLatencyCache(source, uuid, 'tcp_ping', windowMs),
    loading: false,
    error: null,
    queried: false,
    updatedAt: 0,
  }
}

function notify(key: string) {
  for (const fn of listeners.get(key) || []) fn()
}

function updateState(key: string, patch: Partial<TcpLatencyState>) {
  const prev = stateStore.get(key) || {
    key,
    tcpData: [],
    loading: false,
    error: null,
    queried: false,
    updatedAt: 0,
  }
  const next = { ...prev, ...patch }
  stateStore.set(key, next)
  notify(key)
}

function subscribe(key: string, fn: () => void) {
  let set = listeners.get(key)
  if (!set) listeners.set(key, (set = new Set()))
  set.add(fn)
  return () => {
    const current = listeners.get(key)
    if (!current) return
    current.delete(fn)
    if (!current.size) listeners.delete(key)
  }
}

function pickQueuedItem() {
  const items = [...queued.values()]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
      const aState = stateStore.get(queryKey(a.source, a.uuid))
      const bState = stateStore.get(queryKey(b.source, b.uuid))
      return (aState?.updatedAt ?? 0) - (bState?.updatedAt ?? 0)
    })
  return items[0] || null
}

function drainQueue() {
  while (activeCount < MAX_CONCURRENT) {
    const next = pickQueuedItem()
    if (!next) return
    const key = queryKey(next.source, next.uuid)
    queued.delete(key)
    if (inflight.has(key)) continue

    activeCount++
    const run = (async () => {
      const entry = next.pool.entries.find(e => e.name === next.source)
      if (!entry) {
        updateState(key, { loading: false, error: '后端连接不存在', queried: true })
        return
      }

      const previous = getSnapshot(next.source, next.uuid, next.windowMs)
      updateState(key, {
        loading: previous.tcpData.length === 0,
        error: null,
      })

      try {
        const rows = await fetchLatencyRows(entry.client, next.uuid, 'tcp_ping', QUERY_TIMEOUT_MS, next.windowMs)
        setLatencyCache(next.source, next.uuid, 'tcp_ping', rows)
        updateState(key, {
          tcpData: getLatencyCache(next.source, next.uuid, 'tcp_ping', next.windowMs),
          loading: false,
          error: null,
          queried: true,
          updatedAt: Date.now(),
        })
      } catch (error) {
        updateState(key, {
          tcpData: getLatencyCache(next.source, next.uuid, 'tcp_ping', next.windowMs),
          loading: false,
          error: error instanceof Error ? error.message : String(error),
          queried: true,
          updatedAt: Date.now(),
        })
      }
    })()

    inflight.set(key, run)
    run.finally(() => {
      inflight.delete(key)
      activeCount = Math.max(0, activeCount - 1)
      drainQueue()
    })
  }
}

function scheduleFetch(
  pool: BackendPool | null,
  source: string | null,
  uuid: string | null,
  {
    enabled = true,
    refreshMs = DEFAULT_REFRESH_MS,
    priority = 'normal',
    windowMs = AVAILABILITY_WINDOW_MS,
  }: UseNodeTcpLatencyOptions = {},
) {
  if (!enabled || !pool || !source || !uuid) return
  const key = queryKey(source, uuid)
  const state = getSnapshot(source, uuid, windowMs)
  const cooldownMs = state.error ? Math.min(refreshMs, ERROR_RETRY_MS) : refreshMs
  const isStale = !state.updatedAt || Date.now() - state.updatedAt >= cooldownMs
  if (!isStale || inflight.has(key)) return

  const existing = queued.get(key)
  if (!existing || (existing.priority !== 'high' && priority === 'high')) {
    queued.set(key, { pool, source, uuid, windowMs, priority })
  }
  drainQueue()
}

export function useNodeTcpLatency(
  pool: BackendPool | null,
  source: string | null,
  uuid: string | null,
  options: UseNodeTcpLatencyOptions = {},
) {
  const {
    enabled = true,
    refreshMs = DEFAULT_REFRESH_MS,
    priority = 'normal',
    windowMs = AVAILABILITY_WINDOW_MS,
  } = options

  const currentKey = useMemo(() => queryKey(source, uuid), [source, uuid])
  const [state, setState] = useState<TcpLatencyState>(() => getSnapshot(source, uuid, windowMs))
  const canQuery = hasQueryTarget(pool, source, uuid)

  useEffect(() => {
    setState(getSnapshot(source, uuid, windowMs))
    const unsubscribe = subscribe(currentKey, () => {
      setState(getSnapshot(source, uuid, windowMs))
    })

    scheduleFetch(pool, source, uuid, { enabled, refreshMs, priority, windowMs })
    if (!enabled || !pool || !source || !uuid) return unsubscribe

    const triggerFetch = (nextPriority: Priority = priority) => {
      scheduleFetch(pool, source, uuid, { enabled: true, refreshMs, priority: nextPriority, windowMs })
    }
    const onWake = () => {
      if (document.visibilityState === 'visible') triggerFetch('high')
    }

    const timer = window.setInterval(() => {
      triggerFetch(priority)
    }, Math.max(15_000, refreshMs))
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [pool, source, uuid, currentKey, enabled, refreshMs, priority, windowMs])

  return {
    tcpData: state.tcpData,
    loading: canQuery && enabled && (state.loading || (!state.queried && state.tcpData.length === 0)),
    error: state.error,
  }
}
