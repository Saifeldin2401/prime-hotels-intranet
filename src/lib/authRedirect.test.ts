import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  consumePostLoginRedirect,
  getRedirectFromSearch,
  getSpaRedirectFromSearch,
  peekPostLoginRedirect,
  setPostLoginRedirect,
} from './authRedirect'

describe('authRedirect', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    window.sessionStorage.clear()
    document.cookie = 'altus_auth_redirect=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  afterEach(() => {
    window.sessionStorage.clear()
    document.cookie = 'altus_auth_redirect=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('reads regular redirect params for protected destinations', () => {
    expect(getRedirectFromSearch('?redirect=%2Fdashboard')).toBe('/dashboard')
  })

  it('rejects auth routes from regular redirect params', () => {
    expect(getRedirectFromSearch('?redirect=%2Freset-password')).toBeNull()
  })

  it('allows auth routes through the SPA fallback redirect param', () => {
    const encoded = encodeURIComponent('/reset-password?token_hash=abc&type=recovery')
    expect(getSpaRedirectFromSearch(`?__redirect=${encoded}`)).toBe('/reset-password?token_hash=abc&type=recovery')
  })

  it('does not leak stored post-login redirects into generic search parsing', () => {
    setPostLoginRedirect('/dashboard')
    expect(getRedirectFromSearch('')).toBeNull()
    expect(peekPostLoginRedirect()).toBe('/dashboard')
  })

  it('peeks without consuming and then consumes the stored redirect', () => {
    setPostLoginRedirect('/dashboard?tab=team')

    expect(peekPostLoginRedirect()).toBe('/dashboard?tab=team')
    expect(peekPostLoginRedirect()).toBe('/dashboard?tab=team')
    expect(consumePostLoginRedirect()).toBe('/dashboard?tab=team')
    expect(peekPostLoginRedirect()).toBeNull()
  })
})
