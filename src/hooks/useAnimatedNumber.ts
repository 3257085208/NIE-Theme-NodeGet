import { useEffect, useRef, useState } from 'react'

export type AnimatedTrend = 'up' | 'down' | 'steady'

export interface AnimatedNumberState {
  value: number
  target: number
  trend: AnimatedTrend
  animating: boolean
  delta: number
}

function easeInOutAccelerated(progress: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  if (progress < 0.25) {
    const p = progress / 0.25
    return 0.2 * p * p
  }
  if (progress < 0.75) {
    const p = (progress - 0.25) / 0.5
    return 0.2 + 0.6 * (1 - Math.pow(1 - p, 3))
  }
  const p = (progress - 0.75) / 0.25
  return 0.8 + 0.2 * (1 - Math.pow(1 - p, 2))
}

export function useAnimatedNumber(targetInput: number, duration = 900): AnimatedNumberState {
  const safeTarget = Number.isFinite(targetInput) ? targetInput : 0
  const [value, setValue] = useState(safeTarget)
  const [trend, setTrend] = useState<AnimatedTrend>('steady')
  const [animating, setAnimating] = useState(false)
  const [deltaState, setDeltaState] = useState(0)
  const currentRef = useRef(safeTarget)

  useEffect(() => {
    const from = currentRef.current
    const to = safeTarget
    const delta = to - from

    if (Math.abs(delta) < 0.01) {
      currentRef.current = to
      setValue(to)
      setTrend('steady')
      setDeltaState(0)
      setAnimating(false)
      return
    }

    setTrend(delta > 0 ? 'up' : 'down')
    setDeltaState(delta)
    setAnimating(true)

    let frame = 0
    let cancelled = false
    const start = performance.now()

    const tick = (now: number) => {
      if (cancelled) return
      const progress = Math.min((now - start) / duration, 1)
      const eased = easeInOutAccelerated(progress)
      const next = from + delta * eased
      currentRef.current = next
      setValue(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        currentRef.current = to
        setValue(to)
        setTrend('steady')
        setDeltaState(0)
        setAnimating(false)
      }
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [duration, safeTarget])

  return { value, target: safeTarget, trend, animating, delta: deltaState }
}
