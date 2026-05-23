import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf8'))
}

if (!existsSync(dist)) {
  console.warn('[build-template-config] dist 不存在，跳过')
  process.exit(0)
}

const pkg = readJson('package.json')
const theme = readJson('nodeget-theme.json')
theme.version = pkg.version || theme.version || '0.0.0'

writeFileSync(resolve(dist, 'nodeget-theme.json'), JSON.stringify(theme, null, 2) + '\n')
console.log('[build-template-config] wrote dist/nodeget-theme.json')
