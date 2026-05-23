import { useEffect, useState } from 'react'
import type { UserConfig } from '../types'

function parseEnvConfig(): UserConfig | null {
  const raw = import.meta.env.NODEGET_CONFIG
  if (!raw) return null
  const parsed = JSON.parse(raw)
  return {
    ...parsed,
    user_preferences: parsed.user_preferences ?? {
      site_name: parsed.site_name,
      site_logo: parsed.site_logo,
      footer: parsed.footer,
    },
  }
}

export function useUserConfig() {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true

    try {
      if (import.meta.env.DEV) {
        const envConfig = parseEnvConfig()
        if (envConfig) {
          setConfig(envConfig)
          return () => {
            alive = false
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      return () => {
        alive = false
      }
    }

    const rand = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    fetch(`${import.meta.env.BASE_URL}config.json?${rand}`, { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`config.json ${r.status}`)
        return r.json() as Promise<UserConfig>
      })
      .then(c => {
        if (!alive) return
        setConfig({
          ...c,
          user_preferences: c.user_preferences ?? {
            site_name: (c as any).site_name,
            site_logo: (c as any).site_logo,
            footer: (c as any).footer,
          },
        })
      })
      .catch(e => alive && setError(e instanceof Error ? e : new Error(String(e))))

    return () => {
      alive = false
    }
  }, [])

  return { config, error }
}
