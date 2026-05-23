import { existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const zipName = 'NodeGet-StatusShow.zip'
const out = resolve(dist, zipName)

if (!existsSync(dist)) {
  console.warn('[build-zip] dist does not exist, skipped')
  process.exit(0)
}

if (existsSync(out)) rmSync(out)
const result = spawnSync('zip', ['-qr', zipName, '.', '-x', zipName], { cwd: dist, stdio: 'inherit' })
if (result.error) {
  console.warn('[build-zip] zip command is unavailable, skipped')
  process.exit(0)
}
if (result.status !== 0) process.exit(result.status ?? 1)
console.log(`[build-zip] wrote dist/${zipName}`)
