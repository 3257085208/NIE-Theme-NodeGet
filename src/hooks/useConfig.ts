import { useEffect, useState } from 'react'
import type { SiteConfig, SiteToken, SiteUserPreferences } from '../types'

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asPositiveNumber(value: unknown, fallback?: number) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function normalizeTokens(value: unknown): SiteToken[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      return {
        name: asString(obj.name, `master-${index + 1}`),
        backend_url: asString(obj.backend_url ?? obj.url),
        token: asString(obj.token),
      }
    })
    .filter(item => item.backend_url && item.token)
}

function readRawPrefs(obj: Record<string, unknown>): SiteUserPreferences {
  const nested = obj.user_preferences && typeof obj.user_preferences === 'object'
    ? obj.user_preferences as SiteUserPreferences
    : {}

  const prefs: SiteUserPreferences = { ...nested }
  if (typeof obj.site_name === 'string') prefs.site_name = obj.site_name
  if (typeof obj.site_logo === 'string') prefs.site_logo = obj.site_logo
  if (typeof obj.footer === 'string') prefs.footer = obj.footer

  const refreshInterval = asPositiveNumber(obj.refresh_interval_ms, asPositiveNumber(nested.refresh_interval_ms))
  if (refreshInterval) prefs.refresh_interval_ms = refreshInterval

  return prefs
}

function normalizeConfig(userRaw: unknown, themeRaw?: unknown): SiteConfig {
  const userObj = userRaw && typeof userRaw === 'object' ? userRaw as Record<string, unknown> : {}
  const themeObj = themeRaw && typeof themeRaw === 'object' ? themeRaw as Record<string, unknown> : {}

  const themeDefaults = new Map<string, unknown>()
  const form = themeObj.user_preferences_form && typeof themeObj.user_preferences_form === 'object'
    ? themeObj.user_preferences_form as Record<string, unknown>
    : null
  const items = Array.isArray(form?.items) ? form.items : []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.key === 'string' && 'default' in row) themeDefaults.set(row.key, row.default)
  }

  const rawPrefs = readRawPrefs(userObj)
  const siteName = asString(rawPrefs.site_name, asString(themeDefaults.get('site_name'), 'NodeGet Status'))
  const siteLogo = asString(rawPrefs.site_logo, asString(themeDefaults.get('site_logo'), ''))
  const footer = asString(rawPrefs.footer, asString(themeDefaults.get('footer'), 'Powered by NodeGet'))
  const refreshInterval = asPositiveNumber(rawPrefs.refresh_interval_ms, asPositiveNumber(themeDefaults.get('refresh_interval_ms')))

  const userPreferences: SiteUserPreferences = {
    ...Object.fromEntries(themeDefaults),
    ...rawPrefs,
    site_name: siteName,
    site_logo: siteLogo,
    footer,
  }
  if (refreshInterval) userPreferences.refresh_interval_ms = refreshInterval

  return {
    ...(themeObj as Partial<SiteConfig>),
    ...(userObj as Partial<SiteConfig>),
    user_preferences: userPreferences,
    site_name: siteName,
    site_logo: siteLogo,
    footer,
    refresh_interval_ms: refreshInterval,
    site_tokens: normalizeTokens(userObj.site_tokens),
  }
}

function cacheBustUrl(path: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    : Math.random().toString(36).slice(2)
  return `${path}?t=${Date.now()}-${random}`
}

async function fetchJson(path: string, required: boolean) {
  const response = await fetch(cacheBustUrl(path), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  if (!response.ok) {
    if (!required) return null
    throw new Error(`${path} ${response.status}`)
  }
  return response.json() as Promise<unknown>
}

export function useConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchJson('config.json', true),
      fetchJson('nodeget-theme.json', false),
    ])
      .then(([userConfig, themeConfig]) => {
        if (!alive) return
        setConfig(normalizeConfig(userConfig, themeConfig))
        setError(null)
      })
      .catch(e => {
        if (!alive) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  return { config, error }
}
