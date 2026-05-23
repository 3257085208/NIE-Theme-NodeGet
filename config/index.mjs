import { buildDefaultConfig } from './default.mjs'
import { buildEnvConfig } from './env.mjs'

export function buildConfig() {
  const defaultConfig = buildDefaultConfig()
  const envConfig = buildEnvConfig()
  const hasTokens = Array.isArray(envConfig.site_tokens) && envConfig.site_tokens.length > 0

  return {
    ...defaultConfig,
    ...envConfig,
    user_preferences: {
      ...(defaultConfig.user_preferences ?? {}),
      ...(hasTokens ? (envConfig.user_preferences ?? {}) : {}),
    },
    site_tokens: hasTokens ? envConfig.site_tokens : defaultConfig.site_tokens,
  }
}
