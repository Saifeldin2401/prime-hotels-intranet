/**
 * Safe redirect handling for post-login deep-link preservation.
 *
 * When an unauthenticated user hits a protected route, we store the
 * intended destination in the ?redirect query param on /login.
 * After successful authentication, we send them back to that URL.
 */

const REDIRECT_PARAM = 'redirect'
const REDIRECT_PARAM_ALT = '_redirect' // Support Supabase/production underscore variation
const POST_LOGIN_STORAGE_KEY = '__phg_post_login_redirect__'
const COOKIE_NAME = 'phg_auth_redirect'

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password', '/complete-invite', '/change-password']

function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some((r) => path === r || path.startsWith(`${r}/`))
}

/**
 * Cookie utilities for cross-subdomain redirect persistence.
 */
const cookies = {
  set(name: string, value: string, days = 1) {
    if (typeof document === 'undefined') return
    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    const expires = "; expires=" + date.toUTCString()
    
    // Determine domain for cross-subdomain support
    const host = window.location.hostname
    let domainAttr = ''
    if (host.includes('phg-connect.com')) {
      domainAttr = "; domain=.phg-connect.com"
    }
    
    const cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax; Secure${domainAttr}`
    document.cookie = cookie
    console.log(`[authRedirect] Set cookie: ${name}`, { domainAttr })
  },
  get(name: string): string | null {
    if (typeof document === 'undefined') return null
    const nameEQ = name + "="
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
    return null
  },
  remove(name: string) {
    this.set(name, "", -1)
  }
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
 * Store the redirect path in sessionStorage and Cookie for post-auth recovery.
 * Cookies allow survival across subdomain transitions (www vs root).
 */
export function setPostLoginRedirect(pathname: string, search = '', hash = '') {
  if (typeof window === 'undefined') return
  const target = `${pathname}${search}${hash}`
  const sanitized = sanitizeRedirectPath(target)
  
  if (sanitized) {
    console.log('[authRedirect] Saving redirect destination:', sanitized)
    // 1. Session storage (tab-specific, same-origin)
    window.sessionStorage.setItem(POST_LOGIN_STORAGE_KEY, sanitized)
    // 2. Cookie (cross-subdomain support)
    cookies.set(COOKIE_NAME, sanitized)
  }
}

/**
 * Read and consume (remove) the stored post-login redirect path.
 */
export function consumePostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null
  
  const sessionRedirect = window.sessionStorage.getItem(POST_LOGIN_STORAGE_KEY)
  const cookieRedirect = cookies.get(COOKIE_NAME)
  
  const redirect = sessionRedirect ?? cookieRedirect
  
  if (redirect) {
    console.log('[authRedirect] Consuming saved redirect:', redirect, {
      source: sessionRedirect ? 'session' : 'cookie'
    })
    window.sessionStorage.removeItem(POST_LOGIN_STORAGE_KEY)
    cookies.remove(COOKIE_NAME)
    return sanitizeRedirectPath(redirect)
  }
  
  return null
}

/**
 * Build the login URL with the current location encoded as ?redirect.
 * Also stores it in sessionStorage and cookie for safe-keeping.
 */
export function buildLoginUrl(pathname: string, search = '', hash = ''): string {
  setPostLoginRedirect(pathname, search, hash)
  const target = `${pathname}${search}${hash}`
  const encoded = encodeURIComponent(target)
  return `/login?${REDIRECT_PARAM}=${encoded}`
}

/**
 * Extract and sanitize the ?redirect query param from a search string.
 * It will prefer checking sessionStorage/cookies if the URL doesn't have it,
 * meaning standard redirects survive router redirects.
 */
export function getRedirectFromSearch(search: string): string | null {
  // 1. URL parameters (highest priority)
  const params = new URLSearchParams(search)
  // Check for various common redirect parameter names
  const raw = params.get(REDIRECT_PARAM) || params.get(REDIRECT_PARAM_ALT) || params.get('__redirect')
  const urlRedirect = sanitizeRedirectPath(raw)
  
  if (urlRedirect) {
    console.log('[authRedirect] Found direct URL redirect:', urlRedirect)
    return urlRedirect
  }

  // 2. Persistence check (peek only)
  if (typeof window !== 'undefined') {
    const session = window.sessionStorage.getItem(POST_LOGIN_STORAGE_KEY)
    const cookie = cookies.get(COOKIE_NAME)
    const stored = sanitizeRedirectPath(session ?? cookie)
    if (stored) {
      console.log('[authRedirect] Found stored redirect (peek):', stored)
      return stored
    }
  }
  
  return null
}

/**
 * Global deep link handler for React Native / mobile app integration.
 * This can be called from the native side to trigger a navigation in the web app.
 * 
 * Usage from Native (WebView):
 * window.__PHG_HANDLE_DEEPLINK__('/knowledge/123')
 */
export function registerGlobalDeeplinkHandler(navigate: (path: string) => void) {
  if (typeof window === 'undefined') return
  
  const handler = (pathOrUrl: string) => {
    const sanitized = sanitizeRedirectPath(pathOrUrl)
    if (sanitized) {
      console.log('[authRedirect] Global deep link triggered:', sanitized)
      // Save it first to ensure persistence if the route is protected
      setPostLoginRedirect(sanitized)
      // Attempt immediate navigation
      navigate(sanitized)
    }
  }
  
  // Expose to window for Native bridge
  ;(window as any).__PHG_HANDLE_DEEPLINK__ = handler
  
  // Monitor post-message events from React Native
  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      if (data?.type === 'NAVIGATE' && data?.payload) {
        handler(data.payload)
      }
    } catch {
      // Ignore non-JSON messages
    }
  })

  console.log('[authRedirect] Global deep link handler registered')
}

