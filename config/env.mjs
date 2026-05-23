function parseSiteEnv(rawEnv) {
  const site = {}
  const pattern = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,]*))(?:\s*,\s*|\s*$)/g
  let match
  while ((match = pattern.exec(rawEnv))) {
    const key = match[1]
    const value = match[2] !== undefined ? match[2].replace(/\\(.)/g, '$1') : (match[3] ?? '').trim()
    site[key] = value
  }
  return site
}

function removeEmptyValue(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export function buildEnvConfigOld() {
  const siteTokens = []
  for (let i = 1; ; i++) {
    const envVar = process.env[`SITE_${i}`]
    if (!envVar) break
    const fields = parseSiteEnv(envVar)
    siteTokens.push({
      name: fields.name || `master-${i}`,
      backend_url: fields.backend_url || fields.url || '',
      token: fields.token || '',
    })
  }

  const refreshIntervalMs = Number(process.env.REFRESH_INTERVAL_MS)
  return {
    user_preferences: removeEmptyValue({
      site_name: process.env.SITE_NAME,
      site_logo: process.env.SITE_LOGO,
      footer: process.env.SITE_FOOTER,
    }),
    ...(Number.isFinite(refreshIntervalMs) && refreshIntervalMs > 0 ? { refresh_interval_ms: refreshIntervalMs } : {}),
    site_tokens: siteTokens,
  }
}

export function buildEnvConfig() {
  if (process.env.NODEGET_CONFIG) {
    try {
      const config = JSON.parse(process.env.NODEGET_CONFIG)
      if (!config || !Array.isArray(config.site_tokens)) throw new Error('bad NODEGET_CONFIG')
      return {
        ...config,
        user_preferences: config.user_preferences ?? {
          site_name: config.site_name,
          site_logo: config.site_logo,
          footer: config.footer,
        },
      }
    } catch (error) {
      console.error('[build-config] NODEGET_CONFIG parse failed:', error)
      return { user_preferences: {}, site_tokens: [] }
    }
  }

  return buildEnvConfigOld()
}
