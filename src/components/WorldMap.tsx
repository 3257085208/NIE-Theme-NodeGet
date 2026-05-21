import { useMemo, useRef, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { Card } from './ui/card'
import { bytes, pct, uptime } from '../utils/format'
import { deriveUsage, displayName } from '../utils/derive'
import { cn } from '../utils/cn'
import type { Node } from '../types'
import { nodeKey } from '../utils/nodeKey'
import { Globe3DMap } from './ThreeGlobeMap'

interface Props {
  nodes: Node[]
  onOpen?: (id: string) => void
}

interface NodeGroup {
  key: string
  lat: number
  lng: number
  nodes: Node[]
}

const MAP_W = 900
const MAP_H = 460
const GEO_URL = `${import.meta.env.BASE_URL}world-110m.json`

const GREEN = 'rgb(16 185 129)'
const GRAY = 'rgb(148 163 184)'

const geoBase = {
  fill: 'currentColor',
  fillOpacity: 0.05,
  stroke: 'currentColor',
  strokeOpacity: 0.22,
  strokeWidth: 0.5,
  outline: 'none',
}
const GEO_STYLE = {
  default: geoBase,
  hover: { ...geoBase, fillOpacity: 0.08, strokeOpacity: 0.3 },
  pressed: geoBase,
}

const ptr = { cursor: 'pointer' }
const CURSOR = { default: ptr, hover: ptr, pressed: ptr }

function groupKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

function groupNodes(nodes: Node[]) {
  const byPos = new Map<string, Node[]>()
  for (const n of nodes) {
    if (n.meta?.lat == null || n.meta?.lng == null) continue
    const k = groupKey(n.meta.lat, n.meta.lng)
    const list = byPos.get(k)
    if (list) list.push(n)
    else byPos.set(k, [n])
  }
  return [...byPos.entries()].map(([key, ns]) => ({
    key,
    lat: ns[0].meta.lat!,
    lng: ns[0].meta.lng!,
    nodes: ns,
  }))
}

export function WorldMap({ nodes, onOpen }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const groups = useMemo(() => groupNodes(nodes), [nodes])
  const total = groups.reduce((sum, group) => sum + group.nodes.length, 0)

  return (
    <Card className="p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-xl border border-border/70 bg-secondary/55 p-1 shadow-sm">
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
              mode === '2d' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode('2d')}
          >
            2D Map
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
              mode === '3d' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode('3d')}
          >
            3D Map
          </button>
        </div>

        <div className="text-sm font-semibold text-muted-foreground">
          当前显示 <span className="font-black text-foreground">{total}</span> 个节点
        </div>
      </div>

      {mode === '2d' ? (
        <FlatWorldMap groups={groups} total={total} onOpen={onOpen} />
      ) : (
        <Globe3DMap groups={groups} total={total} onOpen={onOpen} />
      )}
    </Card>
  )
}

function FlatWorldMap({ groups, total, onOpen }: { groups: NodeGroup[]; total: number; onOpen?: (id: string) => void }) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const closeTimer = useRef<number | null>(null)

  function cancelClose() {
    if (closeTimer.current != null) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function scheduleClose() {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setHoverKey(null), 140)
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-border/60 bg-background/40 text-foreground"
      style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
      onClick={() => setHoverKey(null)}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 175 }}
        width={MAP_W}
        height={MAP_H}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="map-vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="hsl(var(--background))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.55" />
          </radialGradient>
          <filter id="dot-glow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#map-grid)" />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography key={geo.rsmKey} geography={geo} style={GEO_STYLE} />
            ))
          }
        </Geographies>

        {groups.map(g => {
          const isCluster = g.nodes.length > 1
          const onlineCount = g.nodes.filter(n => n.online).length
          const color = onlineCount > 0 ? GREEN : GRAY
          const isOpen = hoverKey === g.key

          return (
            <Marker
              key={g.key}
              coordinates={[g.lng, g.lat]}
              onMouseEnter={() => {
                cancelClose()
                setHoverKey(g.key)
              }}
              onMouseLeave={scheduleClose}
              onClick={(e: any) => {
                e.stopPropagation?.()
                if (isCluster) setHoverKey(isOpen ? null : g.key)
                else onOpen?.(nodeKey(g.nodes[0]))
              }}
              style={CURSOR}
            >
              <circle r={20} fill="transparent" />

              <circle
                r={isOpen ? 17 : 11}
                fill="none"
                stroke={color}
                strokeOpacity={isOpen ? 0.42 : 0.32}
                strokeWidth="1.15"
                style={{ transition: 'r 0.25s ease' }}
              />
              <circle
                r={isOpen ? 24 : 15}
                fill="none"
                stroke={color}
                strokeOpacity={isOpen ? 0.18 : 0.08}
                strokeWidth="0.9"
                style={{ transition: 'r 0.25s ease' }}
              />

              {onlineCount > 0 && (
                <circle r={10} fill={color} opacity={0.16}>
                  <animate attributeName="r" values="7;15;7" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.28;0.02;0.28" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}

              <circle
                r={isCluster ? 8.5 : isOpen ? 5.2 : 4.2}
                fill={color}
                stroke="white"
                strokeWidth={isCluster ? 1.3 : 1.1}
                filter="url(#dot-glow)"
              />

              {isCluster && (
                <text y={2.6} textAnchor="middle" fontSize={8.4} fontWeight={700} fill="white" style={{ pointerEvents: 'none' }}>
                  {g.nodes.length}
                </text>
              )}

              {isOpen && (
                <MapNodePopoverSvg
                  nodes={g.nodes}
                  lat={g.lat}
                  lng={g.lng}
                  onPick={id => {
                    setHoverKey(null)
                    onOpen?.(id)
                  }}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                />
              )}
            </Marker>
          )
        })}

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#map-vignette)" pointerEvents="none" />
      </ComposableMap>

      {total === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
          没有节点设置过经纬度
        </div>
      )}
    </div>
  )
}

function MapNodePopoverSvg({
  nodes,
  lat,
  lng,
  onPick,
  onMouseEnter,
  onMouseLeave,
}: {
  nodes: Node[]
  lat: number
  lng: number
  onPick: (id: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const width = 220
  const rowHeight = 80
  const visibleRows = Math.min(nodes.length, 4)
  const height = visibleRows * rowHeight + 14
  const gap = 14

  let x = -width / 2
  if (lng > 70) x = -width + gap
  else if (lng < -70) x = -gap

  const y = lat > 18 ? gap : -height - gap

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <MapNodePopoverCard nodes={nodes} onPick={onPick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
    </foreignObject>
  )
}

function MapNodePopoverHtml({
  nodes,
  x,
  y,
  onPick,
  onMouseEnter,
  onMouseLeave,
}: {
  nodes: Node[]
  x: number
  y: number
  onPick: (id: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const openLeft = x > MAP_W * 0.72
  const openTop = y > MAP_H * 0.58

  return (
    <div
      className={cn(
        'absolute z-20 w-[220px]',
        openLeft ? 'right-5' : 'left-5',
        openTop ? 'bottom-5' : 'top-5',
      )}
    >
      <MapNodePopoverCard nodes={nodes} onPick={onPick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
    </div>
  )
}

function MapNodePopoverCard({
  nodes,
  onPick,
  onMouseEnter,
  onMouseLeave,
}: {
  nodes: Node[]
  onPick: (id: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      className="rounded-sm border border-border/90 bg-card/95 text-card-foreground shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur py-1.5 px-1.5 max-h-[334px] overflow-auto animate-in fade-in-0 zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {nodes.map((n, index) => {
        const u = deriveUsage(n)
        return (
          <button
            key={nodeKey(n)}
            onClick={() => onPick(nodeKey(n))}
            className={cn(
              'w-full rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-accent/70',
              index !== nodes.length - 1 && 'border-b border-dashed border-border/80',
            )}
          >
            <div className="flex items-start gap-2">
              <span className={cn('mt-1 h-1.5 w-1.5 rounded-full shrink-0', n.online ? 'bg-emerald-500' : 'bg-slate-400')} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-bold text-foreground">{displayName(n)}</span>
                  <span className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">{n.meta?.region || '—'}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{n.source}</div>
                <div className="mt-2 grid grid-cols-[34px_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-4">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-mono text-right">{pct(u.cpu)}</span>
                  <span className="text-muted-foreground">内存</span>
                  <span className="font-mono text-right">{pct(u.mem)}</span>
                  <span className="text-muted-foreground">↑ 入</span>
                  <span className="font-mono text-right">{bytes(u.netIn)}/s</span>
                  <span className="text-muted-foreground">↓ 出</span>
                  <span className="font-mono text-right">{bytes(u.netOut)}/s</span>
                  <span className="text-muted-foreground">运行</span>
                  <span className="font-mono text-right">{uptime(u.uptime)}</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
