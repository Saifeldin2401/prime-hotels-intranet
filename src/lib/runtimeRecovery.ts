const DEFAULT_CANONICAL_APP_URL = 'https://phg-connect.com'

const AUTH_SENSITIVE_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/complete-invite',
] as const

export const AUTH_ROUTE_RECOVERY_MESSAGE =
  'PHG Connect is recovering your secure link. This should take a moment.'

function isLocalDevelopmentHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
}

export function canonicalizeAppUrl(candidate: string | null | undefined): string {
  const fallback = new URL(DEFAULT_CANONICAL_APP_URL)

  if (!candidate) {
    return fallback.toString().replace(/\/$/, '')
  }

  try {
    const parsed = new URL(candidate)
    if (isLocalDevelopmentHost(parsed.hostname)) {
      return fallback.toString().replace(/\/$/, '')
    }
    if (parsed.hostname === 'www.phg-connect.com') {
      parsed.hostname = 'phg-connect.com'
    }
    parsed.pathname = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return fallback.toString().replace(/\/$/, '')
  }
}

export const CANONICAL_APP_URL = canonicalizeAppUrl(import.meta.env.VITE_APP_URL)
export const CANONICAL_APP_HOST = new URL(CANONICAL_APP_URL).hostname
const WWW_HOST_REDIRECT_ATTEMPTED_KEY = '__phg_www_host_redirect_attempted__'

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.replace(/\/+$/, '')
    : pathname

  return normalized || '/'
}

export function isAuthSensitivePathname(pathname: string): boolean {
  const normalized = normalizePathname(pathname)
  return AUTH_SENSITIVE_PREFIXES.some((prefix) =>
    normalized === prefix || normalized.startsWith(`${prefix}/`)
  )
}

export function hasAuthRecoveryParams(search: string, hash: string): boolean {
  const query = search || ''
  const fragment = hash || ''
  return /(?:^|[?&])(token_hash|code|access_token|refresh_token)=/i.test(query)
    || /(?:^|[?&])type=(?:recovery|invite|signup|magiclink|email|email_change)\b/i.test(query)
    || /(?:^|[#&])(access_token|refresh_token)=/i.test(fragment)
}

export function shouldProtectAuthEntry(pathname: string, search: string, hash: string): boolean {
  const normalized = normalizePathname(pathname)
  const hasRecoveryParams = hasAuthRecoveryParams(search, hash)

  // Always protect sensitive auth action pages (token exchange pages)
  const alwaysProtected = ['/reset-password', '/complete-invite']
  if (alwaysProtected.some(p => normalized === p || normalized.startsWith(`${p}/`))) {
    return true
  }

  // For login and forgot-password, only protect if there are auth params to process
  // This prevents showing recovery screen on normal direct visits to /login
  const conditionallyProtected = ['/login', '/forgot-password']
  if (conditionallyProtected.some(p => normalized === p || normalized.startsWith(`${p}/`))) {
    return hasRecoveryParams
  }

  // Fallback: protect if there are recovery params on any path
  return hasRecoveryParams
}

export function buildCanonicalUrl(
  pathname: string,
  search: string,
  hash: string,
): string {
  if (typeof window !== 'undefined') {
    const runtimeHost = window.location.hostname.toLowerCase()
    if (runtimeHost === CANONICAL_APP_HOST) {
      return `${window.location.origin}${pathname}${search}${hash}`
    }

    if (runtimeHost === `www.${CANONICAL_APP_HOST}`) {
      let shouldForceCanonicalHost = true
      try {
        if (sessionStorage.getItem(WWW_HOST_REDIRECT_ATTEMPTED_KEY) === '1') {
          shouldForceCanonicalHost = false
        } else {
          sessionStorage.setItem(WWW_HOST_REDIRECT_ATTEMPTED_KEY, '1')
        }
      } catch {
        // If storage is unavailable, default to forcing canonical host.
      }

      if (shouldForceCanonicalHost) {
        return `${CANONICAL_APP_URL}${pathname}${search}${hash}`
      }

      return `${window.location.origin}${pathname}${search}${hash}`
    }
  }

  return `${CANONICAL_APP_URL}${pathname}${search}${hash}`
}

export async function clearPrimeHotelServiceWorkersAndCaches(): Promise<boolean> {
  let hadArtifacts = false

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (registrations.length > 0) {
      hadArtifacts = true
    }
    await Promise.allSettled(registrations.map((registration) => registration.unregister()))
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    const staleCacheKeys = cacheKeys.filter(
      (key) => key.startsWith('prime-hotels-') || key.startsWith('phg-intranet-')
    )
    if (staleCacheKeys.length > 0) {
      hadArtifacts = true
    }
    await Promise.allSettled(staleCacheKeys.map((key) => caches.delete(key)))
  }

  return hadArtifacts
}
