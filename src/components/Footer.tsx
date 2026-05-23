import { useEffect, useState } from 'react'
import { FolderSync, HardDriveDownload } from 'lucide-react'
import { parseGitRepo } from '../utils/git'

const NODEGET_REPO = 'https://github.com/NodeSeekDev/NodeGet'
const DEFAULT_THEME_REPO = 'https://github.com/3257085208/NIE-Theme-NodeGet'

type FooterProps = {
  text?: string
  repo?: string
  distPage?: string
  dist_page?: string
}

export function Footer({ text, repo = DEFAULT_THEME_REPO, distPage, dist_page }: FooterProps) {
  const [latest, setLatest] = useState<string | null>(null)
  const git = parseGitRepo(repo)
  const pkgUrl = `https://raw.githubusercontent.com/${git.user}/${git.repo}/main/package.json`
  const distBase = distPage ?? dist_page

  useEffect(() => {
    fetch(pkgUrl)
      .then(r => (r.ok ? r.json() : null))
      .then(j => j?.version && setLatest(String(j.version)))
      .catch(() => {})
  }, [pkgUrl])

  const outdated = latest != null && latest !== __APP_VERSION__
  const normalizedText = text?.trim()
  const latestDist = distBase ? `${distBase.replace(/\/$/, '')}/NodeGet-StatusShow.zip?version=v${latest}` : `${repo}/releases`

  return (
    <footer className="border-t border-border/70 bg-background/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <a href={repo} target="_blank" rel="noreferrer" className="shrink-0 hover:text-primary transition-colors">
          Theme by NKX
        </a>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 text-right">
          <a href={NODEGET_REPO} target="_blank" rel="noreferrer" className="truncate hover:text-primary transition-colors">
            {normalizedText || 'Powered by NodeGet'}
          </a>
          <a href="download.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
            <HardDriveDownload className="h-3 w-3" />
            提取当前主题
          </a>
          {!normalizedText && <span className="shrink-0">v{__APP_VERSION__}</span>}
          {outdated && (
            <a href={latestDist} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors">
              <FolderSync className="h-3 w-3" />
              升级到 v{latest}
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
