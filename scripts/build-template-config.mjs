import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDefaultConfig } from '../config/default.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
mkdirSync(dist, { recursive: true })

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const theme = JSON.parse(readFileSync(resolve(root, 'nodeget-theme.json'), 'utf8'))
theme.version = pkg.version
if (!theme.license && pkg.license) theme.license = pkg.license

writeFileSync(resolve(dist, 'nodeget-theme.json'), JSON.stringify(theme, null, 2) + '\n')
writeFileSync(resolve(dist, 'template_config.json'), JSON.stringify(buildDefaultConfig(), null, 2) + '\n')

const sourceConfig = resolve(root, 'public/config.json')
const distConfig = resolve(dist, 'config.json')
if (existsSync(sourceConfig) && !existsSync(distConfig)) {
  copyFileSync(sourceConfig, distConfig)
}

console.log('[build-template-config] wrote nodeget-theme.json and template_config.json')
