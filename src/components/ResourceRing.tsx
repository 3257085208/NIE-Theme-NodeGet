import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { pct } from '../utils/format'
import { cn } from '../utils/cn'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface ResourceRingProps {
  label: string
  value?: number | null
  sub?: string | null
  subTitle?: string
  size?: number
  strokeWidth?: number
  duration?: number
  centerClassName?: string
  labelClassName?: string
  subClassName?: string
}

export function ResourceRing({
  label,
  value,
  sub,
  subTitle,
  size = 76,
  strokeWidth = 10,
  duration = 900,
  centerClassName = 'text-[15px] font-black text-foreground',
  labelClassName = 'mt-1 text-[10px] font-extrabold tracking-wide text-muted-foreground',
  subClassName = 'mt-2 truncate text-[10px] font-bold leading-snug text-muted-foreground',
}: ResourceRingProps) {
  const target = clampMetric(value)
  const animated = useAnimatedNumber(target, duration)
  const radius = useMemo(() => 50 - strokeWidth / 2 - 1, [strokeWidth])
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (circumference * animated.value) / 100
  const color = metricColor(value)
  const glow = metricGlow(value)
  const viewBox = '0 0 100 100'
  const innerInsetPercent = Math.min(22, Math.max(14, strokeWidth + 4))
  const style = {
    width: size,
    height: size,
    '--metric-glow': glow,
  } as CSSProperties

  const activeValueColor = animated.animating ? deltaColor(animated.delta) : undefined

  return (
    <div className="min-w-0 text-center" title={subTitle || sub || undefined}>
      <div className="resource-ring relative mx-auto" style={style} aria-label={`${label} ${pct(value)}`}>
        <svg viewBox={viewBox} className="relative z-[1] h-full w-full -rotate-90 overflow-visible">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="hsl(var(--border))"
            opacity={0.95}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>

        <div
          className="absolute rounded-full bg-card"
          style={{
            inset: `${innerInsetPercent}%`,
            boxShadow: '0 0 0 1px hsl(var(--border) / 0.55)',
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 18px var(--metric-glow)' }}
        />

        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center leading-none">
          <span className={cn(centerClassName, 'transition-colors duration-150')} style={{ color: activeValueColor }}>
            {Number.isFinite(value) ? pct(animated.value) : '—'}
          </span>
          <span className={labelClassName}>{label}</span>
        </div>
      </div>
      {sub && <div className={subClassName} title={subTitle || sub}>{sub}</div>}
    </div>
  )
}

function clampMetric(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export function metricColor(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return 'hsl(var(--muted-foreground) / 0.45)'
  if (v >= 90) return '#f56565'
  if (v >= 70) return '#f6ad55'
  return '#42b983'
}

export function metricGlow(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return 'rgba(148, 163, 184, 0.08)'
  if (v >= 90) return 'rgba(245, 101, 101, 0.20)'
  if (v >= 70) return 'rgba(246, 173, 85, 0.18)'
  return 'rgba(66, 185, 131, 0.18)'
}

function deltaColor(delta: number) {
  const abs = Math.min(Math.abs(delta), 90)
  if (abs < 3) return undefined
  const strength = abs / 90
  if (delta > 0) {
    const hue = 38 - strength * 38
    const lightness = 60 - strength * 16
    return `hsl(${hue}, 86%, ${lightness}%)`
  }
  const hue = 204 + strength * 28
  const lightness = 62 - strength * 26
  return `hsl(${hue}, 84%, ${lightness}%)`
}
