import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthFlowState,
  getAuthFlowRedirectPath,
  setAuthFlowState,
  shouldSuppressAuthenticatedAppState,
} from './authFlowState'

describe('authFlowState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    clearAuthFlowState()
    window.sessionStorage.clear()
    vi.useRealTimers()
  })

  it('stores the active auth flow redirect path', () => {
    setAuthFlowState('reset-password', '/reset-password?token_hash=abc&type=recovery')

    expect(getAuthFlowRedirectPath()).toBe('/reset-password?token_hash=abc&type=recovery')
  })

  it('suppresses authenticated app state while a clean reset route is active', () => {
    setAuthFlowState('reset-password', '/reset-password')

    expect(shouldSuppressAuthenticatedAppState('/reset-password')).toBe(true)
    expect(shouldSuppressAuthenticatedAppState('/dashboard')).toBe(false)
  })

  it('suppresses authenticated app state for fresh recovery params even before flow state is stored', () => {
    expect(
      shouldSuppressAuthenticatedAppState('/reset-password', '?token_hash=abc&type=recovery', '')
    ).toBe(true)
  })

  it('expires stale auth flow state automatically', () => {
    setAuthFlowState('complete-invite', '/complete-invite')
    vi.setSystemTime(new Date('2026-03-25T12:16:00Z'))

    expect(getAuthFlowRedirectPath()).toBeNull()
    expect(shouldSuppressAuthenticatedAppState('/complete-invite')).toBe(false)
  })
})
