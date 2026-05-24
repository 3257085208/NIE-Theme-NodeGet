export const OFFLINE_AFTER_MS = 180_000

export function normalizeMs(timestamp?: number | null) {
  if (!timestamp) return null
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

export function isOnline(timestamp?: number | null, now = Date.now()) {
  const ts = normalizeMs(timestamp)
  return !!ts && now - ts < OFFLINE_AFTER_MS
}
