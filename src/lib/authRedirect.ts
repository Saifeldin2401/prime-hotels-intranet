/**
 * Safe redirect handling for post-login deep-link preservation.
 *
 * When an unauthenticated user hits a protected route, we store the
 * intended destination in the ?redirect query param on /login.
 * After successful authentication, we send them back to that URL.
 */

const REDIRECT_PARAM = 'redirect'

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password', '/complete-invite', '/change-password']

function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some((r) => path === r || path.startsWith(`${r}/`))
}

/**
 * Sanitize a redirect candidate to prevent open-redirect attacks.
 * Only allows relative paths that start with '/' and are not
 * protocol-relative URLs.
 */
export function sanitizeRedirectPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null

  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null

  try {
    // Reject anything that parses as an absolute URL to another origin
    const parsed = new URL(trimmed, window.location.href)
    if (parsed.origin !== window.location.origin) return null
    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`
    if (isAuthRoute(parsed.pathname)) return null
    return safePath
  } catch {
    return null
  }
}

/**
 * Build the login URL with the current location encoded as ?redirect.
 */
export function buildLoginUrl(pathname: string, search = '', hash = ''): string {
  const target = `${pathname}${search}${hash}`
  const encoded = encodeURIComponent(target)
  return `/login?${REDIRECT_PARAM}=${encoded}`
}

/**
 * Extract and sanitize the ?redirect query param from a search string.
 */
export function getRedirectFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const raw = params.get(REDIRECT_PARAM)
  return sanitizeRedirectPath(raw)
}
