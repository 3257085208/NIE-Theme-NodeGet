export type RepoInfo = {
  user: string
  repo: string
}

export function parseGitRepo(url?: string | null): RepoInfo {
  const fallback = { user: '3257085208', repo: 'NIE-Theme-NodeGet' }
  if (!url) return fallback
  const clean = url.trim().replace(/\.git$/, '').replace(/\/$/, '')

  const httpsMatch = clean.match(/^https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com)\/([^/]+)\/([^/]+)$/)
  if (httpsMatch) return { user: httpsMatch[1], repo: httpsMatch[2] }

  const sshMatch = clean.match(/^git@(?:github\.com|gitlab\.com):([^/]+)\/([^/]+)$/)
  if (sshMatch) return { user: sshMatch[1], repo: sshMatch[2] }

  return fallback
}
