/**
 * Safe redirect handling for post-login deep-link preservation.
 *
 * When an unauthenticated user hits a protected route, we store the
 * intended destination in the ?redirect query param on /login.
 * After successful authentication, we send them back to that URL.
 */

const REDIRECT_PARAM = 'redirect'
const REDIRECT_PARAM_ALT = '_redirect'
const SPA_REDIRECT_PARAM = '__redirect'
const POST_LOGIN_STORAGE_KEY = '__phg_post_login_redirect__'
const COOKIE_NAME = 'phg_auth_redirect'

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password', '/complete-invite', '/change-password']

interface SanitizeRedirectOptions {
  allowAuthRoutes?: boolean
}

function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))
}

const cookies = {
  set(name: string, value: string, days = 1) {
    if (typeof document === 'undefined') return

    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    const expires = `; expires=${date.toUTCString()}`

    const host = window.location.hostname
    let domainAttr = ''
    if (host.includes('phg-connect.com')) {
      domainAttr = '; domain=.phg-connect.com'
    }

    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax; Secure${domainAttr}`
  },
  get(name: string): string | null {
    if (typeof document === 'undefined') return null

    const namePrefix = `${name}=`
    const cookieParts = document.cookie.split(';')
    for (const part of cookieParts) {
      const trimmed = part.trim()
      if (trimmed.startsWith(namePrefix)) {
        return decodeURIComponent(trimmed.slice(namePrefix.length))
      }
    }

    return null
  },
  remove(name: string) {
    this.set(name, '', -1)
  },
}

function originsMatch(parsedOrigin: string, windowOrigin: string): boolean {
  if (parsedOrigin === windowOrigin) return true

  try {
    const parsedUrl = new URL(parsedOrigin)
    const windowUrl = new URL(windowOrigin)

    let parsedHost = parsedUrl.hostname.toLowerCase()
    let windowHost = windowUrl.hostname.toLowerCase()

    if (parsedHost.startsWith('www.')) parsedHost = parsedHost.slice(4)
    if (windowHost.startsWith('www.')) windowHost = windowHost.slice(4)

    if (parsedHost !== windowHost) return false

    const parsedPort = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80')
    const windowPort = windowUrl.port || (windowUrl.protocol === 'https:' ? '443' : '80')

    return parsedPort === windowPort && parsedUrl.protocol === windowUrl.protocol
  } catch {
    return false
  }
}

/**
 * Sanitize a redirect candidate to prevent open-redirect attacks.
 * Only allows same-origin relative paths that start with `/`.
 */
export function sanitizeRedirectPath(
  candidate: string | null | undefined,
  options: SanitizeRedirectOptions = {},
): string | null {
  if (!candidate) return null

  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null

  try {
    const parsed = new URL(trimmed, window.location.href)
    if (!originsMatch(parsed.origin, window.location.origin)) {
      return null
    }

    if (!options.allowAuthRoutes && isAuthRoute(parsed.pathname)) {
      return null
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

function readStoredPostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null

  const sessionRedirect = window.sessionStorage.getItem(POST_LOGIN_STORAGE_KEY)
  const cookieRedirect = cookies.get(COOKIE_NAME)

  return sanitizeRedirectPath(sessionRedirect ?? cookieRedirect)
}

export function setPostLoginRedirect(pathname: string, search = '', hash = '') {
  if (typeof window === 'undefined') return

  const sanitized = sanitizeRedirectPath(`${pathname}${search}${hash}`)
  if (!sanitized) return

  window.sessionStorage.setItem(POST_LOGIN_STORAGE_KEY, sanitized)
  cookies.set(COOKIE_NAME, sanitized)
}

export function peekPostLoginRedirect(): string | null {
  return readStoredPostLoginRedirect()
}

export function consumePostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null

  const redirect = readStoredPostLoginRedirect()
  window.sessionStorage.removeItem(POST_LOGIN_STORAGE_KEY)
  cookies.remove(COOKIE_NAME)

  return redirect
}

export function buildLoginUrl(pathname: string, search = '', hash = ''): string {
  setPostLoginRedirect(pathname, search, hash)
  const encoded = encodeURIComponent(`${pathname}${search}${hash}`)
  return `/login?${REDIRECT_PARAM}=${encoded}`
}

/**
 * Read regular post-login redirect params only.
 * `__redirect` is reserved for SPA/404 recovery and may legitimately target auth routes.
 */
export function getRedirectFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const rawRedirect = params.get(REDIRECT_PARAM) || params.get(REDIRECT_PARAM_ALT)
  return sanitizeRedirectPath(rawRedirect)
}

/**
 * Read the SPA fallback redirect param used when the host rewrites unknown paths to `/`.
 * This is allowed to target auth routes like `/reset-password`.
 */
export function getSpaRedirectFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  return sanitizeRedirectPath(params.get(SPA_REDIRECT_PARAM), { allowAuthRoutes: true })
}

/**
 * Global deep link handler for React Native / mobile app integration.
 * This can be called from the native side to trigger a navigation in the web app.
 */
export function registerGlobalDeeplinkHandler(navigate: (path: string) => void) {
  if (typeof window === 'undefined') return

  const handler = (pathOrUrl: string) => {
    const sanitized = sanitizeRedirectPath(pathOrUrl)
    if (!sanitized) return

    setPostLoginRedirect(sanitized)
    navigate(sanitized)
  }

  ;(window as Window & { __PHG_HANDLE_DEEPLINK__?: (pathOrUrl: string) => void }).__PHG_HANDLE_DEEPLINK__ = handler

  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      if (data?.type === 'NAVIGATE' && data?.payload) {
        handler(data.payload)
      }
    } catch {
      // Ignore non-JSON messages.
    }
  })
}
