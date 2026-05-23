import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'NodeGet-StatusShow.zip') continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, out)
    else {
      const buf = readFileSync(full)
      out.push({
        path: relative(dist, full).replaceAll('\\\\', '/'),
        size: stat.size,
        sha256: createHash('sha256').update(buf).digest('hex'),
      })
    }
  }
  return out
}

if (!existsSync(dist)) {
  console.warn('[build-filelist] dist does not exist, skipped')
  process.exit(0)
}

const files = walk(dist).sort((a, b) => a.path.localeCompare(b.path))
writeFileSync(resolve(dist, 'filelist.json'), JSON.stringify(files, null, 2) + '\n')
console.log(`[build-filelist] wrote ${files.length} files`)
