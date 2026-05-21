import { useEffect, useState } from 'react'

const NODEGET_REPO = 'https://github.com/NodeSeekDev/NodeGet'
const STATUSSHOW_REPO = 'https://github.com/NodeSeekDev/NodeGet-StatusShow'
const THEME_REPO = 'https://github.com/3257085208/NodeGet-StatusShow'
const PKG_URL = 'https://raw.githubusercontent.com/NodeSeekDev/NodeGet-StatusShow/main/package.json'

export function Footer({ text }: { text?: string }) {
  const [latest, setLatest] = useState<string | null>(null)

  useEffect(() => {
    fetch(PKG_URL)
      .then(r => (r.ok ? r.json() : null))
      .then(j => j?.version && setLatest(String(j.version)))
      .catch(() => {})
  }, [])

  const outdated = latest != null && latest !== __APP_VERSION__
  const normalizedText = text?.trim()

  return (
    <footer className="border-t border-border/70 bg-background/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <a href={THEME_REPO} target="_blank" rel="noreferrer" className="shrink-0 hover:text-primary transition-colors">
          Theme by NKX
        </a>
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <a href={NODEGET_REPO} target="_blank" rel="noreferrer" className="truncate hover:text-primary transition-colors">
            {normalizedText || 'Powered by NodeGet'}
          </a>
          {!normalizedText && (
            <span className="shrink-0">
              v{__APP_VERSION__}
              {outdated && (
                <a href={`${STATUSSHOW_REPO}/releases`} target="_blank" rel="noreferrer" className="ml-1 text-destructive">
                  (Need Update)
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
