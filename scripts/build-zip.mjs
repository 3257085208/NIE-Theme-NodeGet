import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const manifestPath = resolve(dist, 'nodeget-theme-files.json')
const out = resolve(dist, 'nodeget-theme.zip')

if (!existsSync(manifestPath)) {
  console.warn('[build-zip] nodeget-theme-files.json 不存在，跳过')
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const files = (Array.isArray(manifest) ? manifest : manifest.files || [])
  .filter(name => typeof name === 'string' && name && name !== 'nodeget-theme.zip')

function u16(n) { return Buffer.from([n & 255, (n >>> 8) & 255]) }
function u32(n) { return Buffer.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]) }

const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[i] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunks = []
const central = []
let offset = 0

for (const rel of files) {
  const path = resolve(dist, rel)
  if (!existsSync(path) || !statSync(path).isFile()) continue
  const name = Buffer.from(rel.replace(/^\/+/, ''))
  const data = readFileSync(path)
  const crc = crc32(data)
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
    u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
  ])
  chunks.push(local, name, data)
  central.push({ name, crc, size: data.length, offset })
  offset += local.length + name.length + data.length
}

const cdStart = offset
for (const file of central) {
  const head = Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
    u32(file.crc), u32(file.size), u32(file.size), u16(file.name.length), u16(0), u16(0),
    u16(0), u16(0), u32(0), u32(file.offset),
  ])
  chunks.push(head, file.name)
  offset += head.length + file.name.length
}
const cdSize = offset - cdStart
chunks.push(Buffer.concat([
  u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
  u32(cdSize), u32(cdStart), u16(0),
]))

writeFileSync(out, Buffer.concat(chunks))
console.log(`[build-zip] wrote dist/nodeget-theme.zip (${central.length} files)`)
