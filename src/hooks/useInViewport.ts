import { useEffect, useRef, useState } from 'react'

interface Options {
  rootMargin?: string
  once?: boolean
}

export function useInViewport<T extends HTMLElement>({
  rootMargin = '240px 0px',
  once = false,
}: Options = {}) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const isVisible = entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0)
        setVisible(isVisible)
        if (once && isVisible) observer.disconnect()
      },
      { rootMargin, threshold: 0 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, once])

  return { ref, visible }
}
