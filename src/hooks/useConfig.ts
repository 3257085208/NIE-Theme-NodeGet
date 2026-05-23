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

function normalizeConfig(raw: unknown): SiteConfig {
  const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawPrefs = obj.user_preferences && typeof obj.user_preferences === 'object'
    ? obj.user_preferences as SiteUserPreferences
    : {}

  const userPreferences: SiteUserPreferences = {
    ...rawPrefs,
    site_name: asString(obj.site_name, asString(rawPrefs.site_name, 'NodeGet Status')),
    site_logo: asString(obj.site_logo, asString(rawPrefs.site_logo, '')),
    footer: asString(obj.footer, asString(rawPrefs.footer, 'Powered by NodeGet')),
  }

  const refreshInterval = asPositiveNumber(obj.refresh_interval_ms, asPositiveNumber(rawPrefs.refresh_interval_ms))
  if (refreshInterval) userPreferences.refresh_interval_ms = refreshInterval

  return {
    user_preferences: userPreferences,
    site_name: userPreferences.site_name,
    site_logo: userPreferences.site_logo,
    footer: userPreferences.footer,
    refresh_interval_ms: userPreferences.refresh_interval_ms,
    site_tokens: normalizeTokens(obj.site_tokens),
  }
}

export function useConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetch('config.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`config.json ${r.status}`)
        return r.json() as Promise<unknown>
      })
      .then(c => alive && setConfig(normalizeConfig(c)))
      .catch(e => alive && setError(e))
    return () => {
      alive = false
    }
  }, [])

  return { config, error }
}
