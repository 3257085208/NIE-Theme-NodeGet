import { useEffect, useState } from 'react'
import type { SiteConfig, SiteToken, SiteUserPreferences } from '../types'

type RawObject = Record<string, unknown>

function asObject(value: unknown): RawObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawObject : {}
}

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
      const obj = asObject(item)
      return {
        name: asString(obj.name, `master-${index + 1}`),
        backend_url: asString(obj.backend_url ?? obj.websocket ?? obj.ws ?? obj.url),
        token: asString(obj.token),
      }
    })
    .filter(item => item.backend_url && item.token)
}

function readPrefsFromObject(obj: RawObject): SiteUserPreferences {
  const prefs: SiteUserPreferences = {}
  if (typeof obj.site_name === 'string') prefs.site_name = obj.site_name
  if (typeof obj.site_logo === 'string') prefs.site_logo = obj.site_logo
  if (typeof obj.site_log === 'string') prefs.site_logo = obj.site_log
  if (typeof obj.logo === 'string') prefs.site_logo = obj.logo
  if (typeof obj.footer === 'string') prefs.footer = obj.footer

  const refreshInterval = asPositiveNumber(obj.refresh_interval_ms, asPositiveNumber(obj.refresh_interval))
  if (refreshInterval) prefs.refresh_interval_ms = refreshInterval
  return prefs
}

function readRawPrefs(obj: RawObject): SiteUserPreferences {
  const userPreferences = asObject(obj.user_preferences)
  const themeConfig = asObject(obj.theme_config)
  const themeConfigUserPreferences = asObject(themeConfig.user_preferences)

  return {
    ...readPrefsFromObject(obj),
    ...themeConfig,
    ...themeConfigUserPreferences,
    ...userPreferences,
    ...readPrefsFromObject(themeConfig),
    ...readPrefsFromObject(themeConfigUserPreferences),
    ...readPrefsFromObject(userPreferences),
  }
}

function normalizeConfig(userRaw: unknown, themeRaw?: unknown): SiteConfig {
  const userObj = asObject(userRaw)
  const themeObj = asObject(themeRaw)

  const themeDefaults = new Map<string, unknown>()
  const form = asObject(themeObj.user_preferences_form)
  const items = Array.isArray(form.items) ? form.items : []
  for (const item of items) {
    const row = asObject(item)
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
    site_log: siteLogo,
    footer,
    refresh_interval_ms: refreshInterval,
    theme_config: {
      ...asObject(userObj.theme_config),
      ...userPreferences,
    },
    site_tokens: normalizeTokens(userObj.site_tokens),
  }
}

function applySiteMeta(config: SiteConfig) {
  if (typeof document === 'undefined') return
  const prefs = config.user_preferences ?? {}
  const title = asString(prefs.site_name, asString(config.site_name, 'NodeGet Status'))
  if (title) document.title = title

  const logo = asString(prefs.site_logo, asString(config.site_logo ?? config.site_log, ''))
  if (!logo) return
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.href = logo
  if (logo.endsWith('.svg')) icon.type = 'image/svg+xml'
  else if (logo.endsWith('.png')) icon.type = 'image/png'
  else if (logo.endsWith('.ico')) icon.type = 'image/x-icon'
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
      fetchJson('./config.json', true),
      fetchJson('./nodeget-theme.json', false),
    ])
      .then(([userConfig, themeConfig]) => {
        if (!alive) return
        const normalized = normalizeConfig(userConfig, themeConfig)
        applySiteMeta(normalized)
        setConfig(normalized)
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
