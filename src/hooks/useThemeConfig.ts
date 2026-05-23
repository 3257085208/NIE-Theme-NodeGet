import { useEffect, useState } from 'react'
import type { ThemeConfig } from '../types'

const fallbackTheme: ThemeConfig = {
  name: 'NIE-Theme',
  short: 'NIE-Theme',
  description: 'NodeGet Status theme',
  author: '3257085208',
  repository: 'https://github.com/3257085208/NIE-Theme-NodeGet',
  dist_page: '',
  user_preferences_form: {
    version: '0.0.1',
    items: [
      { key: 'site_name', default: 'NodeGet Status' },
      { key: 'site_logo', default: '' },
      { key: 'footer', default: 'Powered by NodeGet' },
    ],
  },
}

export function useThemeConfig() {
  const [config, setConfig] = useState<ThemeConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    const rand = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    fetch(`${import.meta.env.BASE_URL}nodeget-theme.json?${rand}`, { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`nodeget-theme.json ${r.status}`)
        return r.json() as Promise<ThemeConfig>
      })
      .then(c => alive && setConfig(c))
      .catch(e => {
        if (!alive) return
        console.warn('[useThemeConfig] fallback theme used:', e)
        setConfig(fallbackTheme)
        setError(null)
      })
    return () => {
      alive = false
    }
  }, [])

  return { config, error }
}
