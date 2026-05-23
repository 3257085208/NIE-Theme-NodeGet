import { useEffect, useState } from 'react'
import type { SiteConfig, UserPreferences } from '../types'
import { useThemeConfig } from './useThemeConfig'
import { useUserConfig } from './useUserConfig'

function defaultPreferencesFromTheme(config: SiteConfig): UserPreferences {
  const out: UserPreferences = {}
  for (const item of config.user_preferences_form?.items ?? []) {
    if (item?.key) out[item.key as keyof UserPreferences] = item.default ?? ''
  }
  return out
}

export function useConfig() {
  const { config: userConfig, error: userError } = useUserConfig()
  const { config: themeConfig, error: themeError } = useThemeConfig()
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (userError) {
      setError(userError)
      return
    }
    if (themeError) {
      setError(themeError)
      return
    }
    if (!userConfig || !themeConfig) return

    const mergedBase = { ...themeConfig, ...userConfig } as SiteConfig
    const userPreferences = {
      ...defaultPreferencesFromTheme(mergedBase),
      ...(userConfig.user_preferences ?? {}),
    }

    const merged: SiteConfig = {
      ...mergedBase,
      user_preferences: userPreferences,
      site_name: userPreferences.site_name ?? userConfig.site_name,
      site_logo: userPreferences.site_logo ?? userConfig.site_logo,
      footer: userPreferences.footer ?? userConfig.footer,
      site_tokens: userConfig.site_tokens ?? [],
    }

    setConfig(merged)
    setError(null)
  }, [userConfig, themeConfig, userError, themeError])

  return { config, error }
}
