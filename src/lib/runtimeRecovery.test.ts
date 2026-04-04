import { describe, expect, it } from 'vitest'

import {
  buildCanonicalUrl,
  canonicalizeAppUrl,
  hasAuthRecoveryParams,
  isAuthSensitivePathname,
  normalizePathname,
  shouldProtectAuthEntry,
} from './runtimeRecovery'

describe('runtimeRecovery', () => {
  it('normalizes trailing slashes for auth-sensitive paths', () => {
    expect(normalizePathname('/reset-password/')).toBe('/reset-password')
    expect(normalizePathname('/')).toBe('/')
    expect(isAuthSensitivePathname('/complete-invite/')).toBe(true)
    expect(isAuthSensitivePathname('/public')).toBe(false)
  })

  it('detects reset and invite tokens in the URL', () => {
    expect(hasAuthRecoveryParams('?token_hash=abc&type=recovery', '')).toBe(true)
    expect(hasAuthRecoveryParams('?code=abc', '')).toBe(true)
    expect(hasAuthRecoveryParams('', '#access_token=a&refresh_token=b')).toBe(true)
    expect(hasAuthRecoveryParams('?page=home', '')).toBe(false)
  })

  it('protects auth-sensitive entries', () => {
    expect(shouldProtectAuthEntry('/reset-password', '?token_hash=abc&type=recovery', '')).toBe(true)
    expect(shouldProtectAuthEntry('/complete-invite', '', '')).toBe(true)
    expect(shouldProtectAuthEntry('/verify', '', '')).toBe(false)
  })

  it('canonicalizes PHG hosts to the apex domain', () => {
    expect(canonicalizeAppUrl('https://www.phg-connect.com/some/path?x=1')).toBe('https://phg-connect.com')
    expect(canonicalizeAppUrl('https://phg-connect.com')).toBe('https://phg-connect.com')
    expect(canonicalizeAppUrl('http://localhost:5173')).toBe('https://phg-connect.com')
    expect(canonicalizeAppUrl(undefined)).toBe('https://phg-connect.com')
  })

  it('builds canonical URLs with the preserved route context', () => {
    expect(buildCanonicalUrl('/reset-password', '?token_hash=abc&type=recovery', '#step=1'))
      .toBe('https://phg-connect.com/reset-password?token_hash=abc&type=recovery#step=1')
  })
})
