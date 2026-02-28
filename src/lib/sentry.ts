const INVALID_SENTRY_DSN_MARKERS = [
  'examplePublicKey',
  'o0.ingest.sentry.io/0',
  'your_sentry_dsn_here',
]

export function isValidSentryDsn(dsn: unknown): dsn is string {
  if (typeof dsn !== 'string') return false

  const trimmed = dsn.trim()
  if (!trimmed) return false
  if (INVALID_SENTRY_DSN_MARKERS.some((marker) => trimmed.includes(marker))) return false

  try {
    const url = new URL(trimmed)
    const projectId = url.pathname.replace(/\//g, '')
    if (!url.username) return false
    if (!projectId || projectId === '0') return false
    return true
  } catch {
    return false
  }
}
