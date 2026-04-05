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
 * Check if two origins match, handling edge cases like:
 * - www vs non-www
 * - trailing ports
 * - HTTP vs HTTPS (in production should always be HTTPS)
 */
function originsMatch(parsedOrigin: string, windowOrigin: string): boolean {
  // Direct match
  if (parsedOrigin === windowOrigin) return true
  
  try {
    const parsedUrl = new URL(parsedOrigin)
    const windowUrl = new URL(windowOrigin)
    
    // Compare hostname (handle www vs non-www)
    let parsedHost = parsedUrl.hostname.toLowerCase()
    let windowHost = windowUrl.hostname.toLowerCase()
    
    // Strip www prefix for comparison
    if (parsedHost.startsWith('www.')) parsedHost = parsedHost.slice(4)
    if (windowHost.startsWith('www.')) windowHost = windowHost.slice(4)
    
    if (parsedHost !== windowHost) return false
    
    // Compare port (default ports for http/https should match)
    const parsedPort = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80')
    const windowPort = windowUrl.port || (windowUrl.protocol === 'https:' ? '443' : '80')
    
    if (parsedPort !== windowPort) return false
    
    // Protocol must match in production
    if (parsedUrl.protocol !== windowUrl.protocol) return false
    
    return true
  } catch {
    return false
  }
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
    
    // Use robust origin comparison
    if (!originsMatch(parsed.origin, window.location.origin)) {
      console.warn('[authRedirect] Origin mismatch, rejecting redirect:', {
        parsed: parsed.origin,
        window: window.location.origin,
        candidate: trimmed
      })
      return null
    }
    
    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`
    if (isAuthRoute(parsed.pathname)) {
      console.warn('[authRedirect] Auth route rejected:', parsed.pathname)
      return null
    }
    
    return safePath
  } catch (e) {
    console.warn('[authRedirect] Failed to parse redirect:', trimmed, e)
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
