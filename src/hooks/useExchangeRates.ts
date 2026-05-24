import { useEffect, useMemo, useState } from 'react'
import { FALLBACK_CNY_RATES, normalizeCurrencyUnit } from '../utils/cost'

const API_BASE = 'https://api.frankfurter.dev/v2'
const REFRESH_MS = 60 * 60 * 1000

type RateStatus = 'live' | 'fallback'

interface ExchangeRateState {
  rates: Record<string, number>
  status: RateStatus
  loading: boolean
  error: string | null
  updatedAt: number | null
}

interface FrankfurterRatesResponse {
  rates?: Record<string, number>
}

interface FrankfurterPairResponse {
  rate?: number
}

function uniqueCurrencyCodes(units: (string | null | undefined)[]) {
  return [...new Set(units.map(normalizeCurrencyUnit).filter(code => code && code !== 'CNY'))]
}

function fallbackRates(codes: string[]) {
  const rates: Record<string, number> = { CNY: 1 }
  for (const code of codes) rates[code] = FALLBACK_CNY_RATES[code] ?? 1
  return rates
}

async function fetchCnyRates(codes: string[], signal?: AbortSignal) {
  if (codes.length === 0) return { CNY: 1 }

  const rates: Record<string, number> = { CNY: 1 }
  const params = new URLSearchParams({ base: 'CNY', quotes: codes.join(',') })
  const res = await fetch(`${API_BASE}/rates?${params.toString()}`, {
    signal,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`汇率接口返回 ${res.status}`)

  const data = (await res.json()) as FrankfurterRatesResponse
  const quoteRates = data.rates || {}

  for (const code of codes) {
    const quotePerCny = quoteRates[code]
    if (typeof quotePerCny === 'number' && Number.isFinite(quotePerCny) && quotePerCny > 0) {
      rates[code] = 1 / quotePerCny
    }
  }

  const missing = codes.filter(code => rates[code] == null)
  if (missing.length > 0) {
    const pairResults = await Promise.allSettled(
      missing.map(async code => {
        const pair = await fetch(`${API_BASE}/rate/${encodeURIComponent(code)}/CNY`, {
          signal,
          cache: 'no-store',
        })
        if (!pair.ok) throw new Error(`${code} 汇率返回 ${pair.status}`)
        const pairData = (await pair.json()) as FrankfurterPairResponse
        if (typeof pairData.rate !== 'number' || !Number.isFinite(pairData.rate) || pairData.rate <= 0) {
          throw new Error(`${code} 汇率数据无效`)
        }
        return [code, pairData.rate] as const
      }),
    )

    for (const item of pairResults) {
      if (item.status === 'fulfilled') rates[item.value[0]] = item.value[1]
    }
  }

  return { ...fallbackRates(codes), ...rates }
}

export function useCnyExchangeRates(units: (string | null | undefined)[]) {
  const codesKey = useMemo(() => uniqueCurrencyCodes(units).sort().join(','), [units])
  const codes = useMemo(() => codesKey.split(',').filter(Boolean), [codesKey])

  const [state, setState] = useState<ExchangeRateState>(() => ({
    rates: fallbackRates(codes),
    status: 'fallback',
    loading: codes.length > 0,
    error: null,
    updatedAt: null,
  }))

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const refresh = async () => {
      if (codes.length === 0) {
        setState({ rates: { CNY: 1 }, status: 'live', loading: false, error: null, updatedAt: Date.now() })
        return
      }

      setState(prev => ({
        ...prev,
        rates: { ...fallbackRates(codes), ...prev.rates },
        loading: true,
      }))

      try {
        const liveRates = await fetchCnyRates(codes, controller.signal)
        if (cancelled) return
        setState({ rates: liveRates, status: 'live', loading: false, error: null, updatedAt: Date.now() })
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        setState({
          rates: fallbackRates(codes),
          status: 'fallback',
          loading: false,
          error: error instanceof Error ? error.message : String(error),
          updatedAt: null,
        })
      }
    }

    const onWake = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    const timer = window.setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [codesKey])

  return state
}
