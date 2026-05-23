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
        // NodeGet 主题开发文档示例里是 websocket，官方 StatusShow 新版是 backend_url；两种都兼容。
        backend_url: asString(obj.backend_url ?? obj.websocket ?? obj.ws ?? obj.url),
        token: asString(obj.token),
      }
    })
    .filter(item => item.backend_url && item.token)
}

function readPrefsFromObject(obj: RawObject): SiteUserPreferences {
  const prefs: SiteUserPreferences = {}
  if (typeof obj.site_name === 'string') prefs.site_name = obj.site_name
  // 兼容文档里的 site_log 拼写、常见 logo 别名，以及官方新版的 site_logo。
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

  // 兼容两套配置结构：
  // 1. NodeGet 规范主题：config.json -> user_preferences
  // 2. 旧/第三方主题常见结构：config.json -> site_name/site_log/theme_config
  //
  // 注意：后台“用户配置”通常只改 user_preferences，旧版构建脚本可能还会留下
  // 顶层 site_name/site_logo 这些兼容字段。如果顶层旧值优先，就会把后台新配置覆盖掉。
  // 所以这里必须让 user_preferences 优先级最高，HudsonStatus 这类主题也是只依赖
  // config.json 里的 user_preferences 来更新站点名和 Logo。
  return {
    ...readPrefsFromObject(obj),
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
    // 同步写回旧字段，避免组件或后续扩展读旧字段时拿不到新配置。
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
