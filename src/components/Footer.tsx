const NODEGET_REPO = 'https://github.com/NodeSeekDev/NodeGet'
const THEME_REPO = 'https://github.com/3257085208/NIE-Theme-NodeGet'

export function Footer({ text }: { text?: string }) {
  const normalizedText = text?.trim()

  return (
    <footer className="border-t border-border/70 bg-background/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <a href={THEME_REPO} target="_blank" rel="noreferrer" className="shrink-0 hover:text-primary transition-colors">
          Theme by MarkNKX v{__APP_VERSION__}
        </a>
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <a href={NODEGET_REPO} target="_blank" rel="noreferrer" className="truncate hover:text-primary transition-colors">
            {normalizedText || 'Powered by NodeGet'}
          </a>
        </div>
      </div>
    </footer>
  )
}
