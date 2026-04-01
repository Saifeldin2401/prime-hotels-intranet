import { describe, expect, it, vi } from 'vitest'

import { classifyAuthError, getRetryDelay } from './authErrorUtils'

describe('authErrorUtils', () => {
  it('classifies definitive auth expiry as logout-worthy', () => {
    expect(classifyAuthError({ status: 401 })).toEqual({
      type: 'auth_expired',
      shouldLogout: true,
      retryable: false,
    })

    expect(classifyAuthError({ code: 'PGRST301' })).toEqual({
      type: 'auth_expired',
      shouldLogout: true,
      retryable: false,
    })
  })

  it('classifies transient failures as retryable without logout', () => {
    const onlineSpy = vi.spyOn(window.navigator, 'onLine', 'get')
    onlineSpy.mockReturnValue(true)

    expect(classifyAuthError({ status: 0, message: 'Failed to fetch' })).toEqual({
      type: 'network_error',
      shouldLogout: false,
      retryable: true,
    })

    expect(classifyAuthError({ status: 503, message: 'upstream timeout' })).toEqual({
      type: 'network_error',
      shouldLogout: false,
      retryable: true,
    })

    onlineSpy.mockReturnValue(false)
    expect(classifyAuthError({ message: 'Unknown failure' })).toEqual({
      type: 'network_error',
      shouldLogout: false,
      retryable: true,
    })

    onlineSpy.mockRestore()
  })

  it('keeps retry delay within bounds', () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const delay = getRetryDelay(attempt, 1000, 30000)
      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThanOrEqual(37500)
    }
  })
})
