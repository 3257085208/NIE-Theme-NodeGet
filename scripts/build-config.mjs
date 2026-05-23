import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from '../config/index.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/config.json')
const config = buildConfig()

mkdirSync(resolve(root, 'public'), { recursive: true })
writeFileSync(out, JSON.stringify(config, null, 2) + '\n')
console.log(`[build-config] wrote ${config.site_tokens?.length ?? 0} site_tokens to public/config.json`)
