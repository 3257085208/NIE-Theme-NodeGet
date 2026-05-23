import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targetArg = process.argv[2] || 'public'
const targetDir = targetArg === 'dist' ? resolve(root, 'dist') : resolve(root, 'public')
const out = resolve(targetDir, 'config.json')

function loadDotEnvFile(name) {
  const file = resolve(root, name)
  if (!existsSync(file)) return
  const raw = readFileSync(file, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key] !== undefined) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    value = value.replace(/\\n/g, '\n')
    process.env[key] = value
  }
}

loadDotEnvFile('.env')
loadDotEnvFile('.env.local')

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

const pkg = readJson(resolve(root, 'package.json'), {})
const theme = readJson(resolve(root, 'nodeget-theme.json'), {})

function defaultsFromTheme() {
  const prefs = {}
  const items = theme?.user_preferences_form?.items
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && item.key && item.type !== 'title' && 'default' in item) prefs[item.key] = item.default
    }
  }
  return {
    site_name: prefs.site_name || 'NodeGet Status',
    site_logo: prefs.site_logo || '',
    footer: prefs.footer || 'Powered by NodeGet',
    refresh_interval_ms: Number(prefs.refresh_interval_ms) || 10000,
  }
}

function parseSite(raw) {
  const out = {}
  const re = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^,]*))(?:\s*,\s*|\s*$)/g
  let m
  while ((m = re.exec(raw))) {
    const key = m[1]
    const val = m[2] !== undefined ? m[2].replace(/\\(.)/g, '$1') : m[3] !== undefined ? m[3].replace(/\\(.)/g, '$1') : (m[4] ?? '').trim()
    out[key] = val
  }
  return out
}

function legacySiteTokens() {
  const tokens = []
  for (let i = 1; ; i++) {
    const raw = process.env[`SITE_${i}`]
    if (!raw) break
    const fields = parseSite(raw)
    const backend = fields.backend_url || fields.websocket || fields.ws || fields.url || ''
    const token = fields.token || ''
    if (!backend && !token) continue
    tokens.push({
      name: fields.name || `master-${i}`,
      backend_url: backend,
      token,
    })
  }
  return tokens
}

function normalizeConfig(input) {
  const defaults = defaultsFromTheme()
  const prefs = {
    ...defaults,
    ...(input?.user_preferences && typeof input.user_preferences === 'object' ? input.user_preferences : {}),
  }

  if (typeof input?.site_name === 'string') prefs.site_name = input.site_name
  if (typeof input?.site_logo === 'string') prefs.site_logo = input.site_logo
  if (typeof input?.site_log === 'string') prefs.site_logo = input.site_log
  if (typeof input?.footer === 'string') prefs.footer = input.footer
  if (Number.isFinite(Number(input?.refresh_interval_ms))) prefs.refresh_interval_ms = Number(input.refresh_interval_ms)

  const refreshFromEnv = Number(process.env.REFRESH_INTERVAL_MS)
  if (Number.isFinite(refreshFromEnv) && refreshFromEnv > 0) prefs.refresh_interval_ms = refreshFromEnv
  if (process.env.SITE_NAME) prefs.site_name = process.env.SITE_NAME
  if (process.env.SITE_LOGO !== undefined) prefs.site_logo = process.env.SITE_LOGO
  if (process.env.SITE_FOOTER) prefs.footer = process.env.SITE_FOOTER

  const siteTokens = Array.isArray(input?.site_tokens) ? input.site_tokens : legacySiteTokens()
  const cleanedTokens = siteTokens
    .map((item, index) => ({
      name: String(item?.name || `master-${index + 1}`),
      backend_url: String(item?.backend_url || item?.websocket || item?.ws || item?.url || ''),
      token: String(item?.token || ''),
    }))
    .filter(item => item.backend_url || item.token)

  return {
    user_preferences: prefs,
    site_tokens: cleanedTokens,
  }
}

function readNodegetConfig() {
  const raw = process.env.NODEGET_CONFIG
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`[build-config] NODEGET_CONFIG JSON 解析失败：${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

let source = readNodegetConfig()
if (!source) {
  const tokens = legacySiteTokens()
  if (tokens.length) source = { site_tokens: tokens }
}

if (!source) {
  const existing = readJson(out, null)
  if (existing && Array.isArray(existing.site_tokens) && existing.site_tokens.length) {
    source = existing
  } else {
    source = { site_tokens: [] }
  }
}

const config = normalizeConfig(source)
writeFileSync(out, JSON.stringify(config, null, 2) + '\n')
console.log(`[build-config] wrote ${config.site_tokens.length} site_tokens to ${out}`)

if (pkg.version && targetArg === 'dist') {
  console.log(`[build-config] ${theme.short || theme.name || 'theme'} v${pkg.version}`)
}
