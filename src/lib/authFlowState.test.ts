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
  })

  afterEach(() => {
    clearAuthFlowState()
    window.sessionStorage.clear()
    vi.useRealTimers()
  })

  it('stores the active auth flow redirect path', () => {
    const mockLocation = {
      pathname: '/reset-password',
      search: '?token_hash=abc&type=recovery',
      hash: '',
    }
    
    setAuthFlowState('reset-password', '/reset-password?token_hash=abc&type=recovery', mockLocation)

    expect(getAuthFlowRedirectPath()).toBe('/reset-password?token_hash=abc&type=recovery')
  })

  it('suppresses authenticated app state while a clean reset route is active', () => {
    const mockLocation = {
      pathname: '/reset-password',
      search: '',
      hash: '',
    }
    
    setAuthFlowState('reset-password', '/reset-password', mockLocation)

    // Get the stored path to pass to shouldSuppressAuthenticatedAppState
    const storedPath = getAuthFlowRedirectPath()
    expect(shouldSuppressAuthenticatedAppState('/reset-password', '', '', storedPath ?? undefined)).toBe(true)
    expect(shouldSuppressAuthenticatedAppState('/dashboard', '', '', storedPath ?? undefined)).toBe(false)
  })

  it('suppresses authenticated app state for fresh recovery params even before flow state is stored', () => {
    expect(
      shouldSuppressAuthenticatedAppState('/reset-password', '?token_hash=abc&type=recovery', '')
    ).toBe(true)
  })

  it('expires stale auth flow state automatically', () => {
    const mockLocation = {
      pathname: '/complete-invite',
      search: '',
      hash: '',
    }
    
    setAuthFlowState('complete-invite', '/complete-invite', mockLocation)
    vi.setSystemTime(new Date('2026-03-25T12:16:00Z'))

    expect(getAuthFlowRedirectPath()).toBeNull()
    expect(shouldSuppressAuthenticatedAppState('/complete-invite')).toBe(false)
  })
})
