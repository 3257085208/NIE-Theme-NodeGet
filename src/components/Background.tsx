import { useEffect, useMemo, useState } from 'react'
import type { BackgroundSettings } from '../types'

interface Props {
  settings: BackgroundSettings
}

const PALETTE_LINKS = [
  { light: ['#f5f8fb', '#b7c4d6'], dark: ['#111827', '#94a3b8'] },
  { light: ['#f2fbf6', '#34d399'], dark: ['#102019', '#4ade80'] },
  { light: ['#f2f7ff', '#60a5fa'], dark: ['#0f172a', '#38bdf8'] },
  { light: ['#f7f3ff', '#a78bfa'], dark: ['#1f1832', '#a78bfa'] },
  { light: ['#fff7ed', '#fb923c'], dark: ['#2a1b12', '#fb923c'] },
  { light: ['#fff1f2', '#fb7185'], dark: ['#2b161d', '#fb7185'] },
  { light: ['#fffbea', '#facc15'], dark: ['#272113', '#facc15'] },
] as const

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(148,163,184,${alpha})`
  const n = Number.parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function linkedColors(base: string, accent: string, dark: boolean) {
  for (const pair of PALETTE_LINKS) {
    const [lb, la] = pair.light
    const [db, da] = pair.dark
    if (base === lb && accent === la) {
      return { base: dark ? db : lb, accent: dark ? da : la }
    }
    if (base === db && accent === da) {
      return { base: dark ? db : lb, accent: dark ? da : la }
    }
  }
  return { base, accent }
}

export function Background({ settings }: Props) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const target = document.documentElement
    const observer = new MutationObserver(() => {
      setDark(target.classList.contains('dark'))
    })
    observer.observe(target, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const style = useMemo(() => {
    const density = clamp(settings.density || 24, 12, 48)
    const opacity = clamp(settings.opacity || 0.08, 0.02, 0.24)
    const resolved = linkedColors(settings.baseColor || '#f5f8fb', settings.accentColor || '#94a3b8', dark)
    const patternColor = hexToRgba(
      resolved.accent,
      settings.pattern === 'dots'
        ? dark
          ? Math.min(opacity * 1.55, 0.22)
          : opacity
        : dark
          ? Math.min(opacity * 1.45, 0.22)
          : opacity,
    )

    let backgroundImage = 'none'
    let backgroundSize = 'auto'
    let backgroundPosition = '0 0'

    if (settings.pattern === 'grid') {
      backgroundImage = `linear-gradient(to right, ${patternColor} 1px, transparent 1px), linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`
      backgroundSize = `${density}px ${density}px`
      backgroundPosition = '-1px -1px'
    } else if (settings.pattern === 'dots') {
      const dot = Math.max(1, Math.round(density / 20))
      backgroundImage = `radial-gradient(circle, ${patternColor} ${dot}px, transparent ${dot + 0.6}px)`
      backgroundSize = `${density}px ${density}px`
    }

    return {
      backgroundColor: resolved.base,
      backgroundImage,
      backgroundSize,
      backgroundPosition,
    }
  }, [dark, settings])

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none transition-colors duration-150"
      style={style}
      aria-hidden
    />
  )
}
