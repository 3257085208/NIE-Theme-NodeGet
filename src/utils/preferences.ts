import type { BackgroundPattern, BackgroundSettings, SiteUserPreferences } from '../types'

export type HomeMetricStyle = 'circle' | 'bar'
export type DetailResourceMetricStyle = 'circle' | 'bar'

export function prefString(
  prefs: SiteUserPreferences | undefined,
  key: string,
  fallback = '',
) {
  const value = prefs?.[key]
  return typeof value === 'string' ? value : fallback
}

export function prefBool(
  prefs: SiteUserPreferences | undefined,
  key: string,
  fallback = false,
) {
  const value = prefs?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on', '开启', '显示'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off', '关闭', '隐藏'].includes(normalized)) return false
  }
  return fallback
}

export function prefNumber(
  prefs: SiteUserPreferences | undefined,
  key: string,
  fallback = 0,
) {
  const value = prefs?.[key]
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

export function homeMetricStyle(prefs: SiteUserPreferences | undefined): HomeMetricStyle {
  return prefString(prefs, 'home_card_metric_style', 'circle') === 'bar' ? 'bar' : 'circle'
}

export function detailResourceMetricStyle(prefs: SiteUserPreferences | undefined): DetailResourceMetricStyle {
  return prefString(prefs, 'detail_resource_metric_style', 'circle') === 'bar' ? 'bar' : 'circle'
}

export function splitPreferenceList(value: string) {
  return value
    .split(/[，,\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}


const BACKGROUND_PALETTES: Record<string, { baseColor: string; accentColor: string }> = {
  cloud: { baseColor: '#f5f8fb', accentColor: '#b7c4d6' },
  mint: { baseColor: '#f2fbf6', accentColor: '#34d399' },
  blue: { baseColor: '#f2f7ff', accentColor: '#60a5fa' },
  purple: { baseColor: '#f7f3ff', accentColor: '#a78bfa' },
  peach: { baseColor: '#fff7ed', accentColor: '#fb923c' },
  rose: { baseColor: '#fff1f2', accentColor: '#fb7185' },
  yellow: { baseColor: '#fffbea', accentColor: '#facc15' },
  slate: { baseColor: '#eef2f7', accentColor: '#64748b' },
  sea: { baseColor: '#eef8ff', accentColor: '#0ea5e9' },
  forest: { baseColor: '#eef9f0', accentColor: '#22c55e' },
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function backgroundSettingsFromPreferences(prefs: SiteUserPreferences | undefined): BackgroundSettings {
  const paletteKey = prefString(prefs, 'background_palette', 'cloud')
  const palette = BACKGROUND_PALETTES[paletteKey] ?? BACKGROUND_PALETTES.cloud
  const patternRaw = prefString(prefs, 'background_pattern', 'grid')
  const pattern: BackgroundPattern = patternRaw === 'solid' || patternRaw === 'dots' ? patternRaw : 'grid'
  const density = clamp(prefNumber(prefs, 'background_density', 22), 12, 48)
  const opacityRaw = prefNumber(prefs, 'background_opacity', 10)
  const opacity = clamp(opacityRaw > 1 ? opacityRaw / 100 : opacityRaw, 0.02, 0.24)

  return {
    pattern,
    baseColor: palette.baseColor,
    accentColor: palette.accentColor,
    density,
    opacity,
  }
}
