import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const manifest = 'nodeget-theme-files.json'

if (!existsSync(dist)) {
  console.warn('[build-filelist] dist 不存在，跳过')
  process.exit(0)
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    const st = statSync(path)
    const rel = relative(dist, path).split(sep).join('/')
    if (st.isDirectory()) {
      walk(path, files)
    } else if (st.isFile() && rel !== 'nodeget-theme.zip') {
      files.push(rel)
    }
  }
  return files
}

let files = walk(dist).filter(Boolean).sort((a, b) => a.localeCompare(b))
if (!files.includes(manifest)) files.push(manifest)
files = [...new Set(files)].sort((a, b) => a.localeCompare(b))

// NodeGet 控制面板读取的 nodeget-theme-files.json 需要是“字符串数组”，
// 官方示例脚本也是直接输出数组，而不是 { files: [...] }。
// 如果输出对象，远程导入可能成功，但预览静态 Bucket 里没有正确写入 index.html，导致 File not found。
writeFileSync(resolve(dist, manifest), JSON.stringify(files, null, 2) + '\n')
console.log(`[build-filelist] wrote ${files.length} files to dist/${manifest}`)
