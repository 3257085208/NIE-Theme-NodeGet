import type { NodeMeta } from '../types'

const DAY_MS = 86400000

const CNY_RATES: Record<string, number> = {
  CNY: 1,
  RMB: 1,
  '¥': 1,
  '￥': 1,

  USD: 7.2,
  '$': 7.2,
  USDT: 7.2,

  EUR: 7.8,
  '€': 7.8,

  GBP: 9.1,
  '£': 9.1,

  JPY: 0.05,
  '円': 0.05,

  HKD: 0.92,
  'HK$': 0.92,

  TWD: 0.22,
  NTD: 0.22,
  'NT$': 0.22,

  SGD: 5.35,
  'S$': 5.35,

  AUD: 4.7,
  CAD: 5.25,
  KRW: 0.0052,
  RUB: 0.078,
  TRY: 0.23,
}

export function remainingDays(expireTime: string) {
  if (!expireTime) return null
  const exp = new Date(expireTime).setHours(0, 0, 0, 0)
  if (!Number.isFinite(exp)) return null
  const today = new Date().setHours(0, 0, 0, 0)
  return Math.round((exp - today) / DAY_MS)
}

function safeCycle(cycle: number) {
  return cycle > 0 ? cycle : 30
}

export function currencyToCnyRate(unit?: string | null) {
  const key = String(unit || 'CNY').trim().toUpperCase()
  return CNY_RATES[key] ?? 1
}

export function priceToCny(price: number, unit?: string | null) {
  if (!Number.isFinite(price) || price <= 0) return 0
  return price * currencyToCnyRate(unit)
}

export function monthlyCostCny(meta: NodeMeta) {
  if (!meta.price) return 0
  return priceToCny(meta.price, meta.priceUnit) * (30 / safeCycle(meta.priceCycle))
}

export function remainingValue(meta: NodeMeta) {
  const days = remainingDays(meta.expireTime)
  if (days == null || days <= 0) return 0
  const ratio = Math.min(days / safeCycle(meta.priceCycle), 1)
  return meta.price * ratio
}

export function remainingValueCny(meta: NodeMeta) {
  const days = remainingDays(meta.expireTime)
  if (days == null || days <= 0) return 0
  const ratio = Math.min(days / safeCycle(meta.priceCycle), 1)
  return priceToCny(meta.price, meta.priceUnit) * ratio
}

export function cycleProgress(meta: NodeMeta) {
  const days = remainingDays(meta.expireTime)
  if (days == null) return 0
  if (days <= 0) return 0
  const cycle = safeCycle(meta.priceCycle)
  if (days >= cycle) return 100
  return Math.round((days / cycle) * 100)
}

export function hasCost(meta: NodeMeta) {
  return meta.price > 0 || !!meta.expireTime
}

export function formatCny(value: number) {
  return `¥${(Number.isFinite(value) ? value : 0).toFixed(2)}`
}
