import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const KEY = 'nodeget.theme'

function initial(): Theme {
  const stored = localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-changing')
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(KEY, theme)
    const timer = window.setTimeout(() => root.classList.remove('theme-changing'), 90)
    return () => window.clearTimeout(timer)
  }, [theme])

  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) }
}
