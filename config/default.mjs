import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf8'))
}

export const defaultSiteTokens = [
  {
    name: 'master server node 1',
    backend_url: 'wss://your-backend.example.com',
    token: 'YOUR_TOKEN_HERE',
  },
]

export function defaultUserPreferences() {
  const nodegetTheme = readJson('nodeget-theme.json')
  const form = nodegetTheme.user_preferences_form
  const out = {}
  if (form?.items?.length) {
    for (const item of form.items) {
      if (item?.key) out[item.key] = item.default ?? ''
    }
  }
  return out
}

export function buildDefaultConfig() {
  return {
    user_preferences: defaultUserPreferences(),
    site_tokens: defaultSiteTokens,
  }
}
