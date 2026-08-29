import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  recordSuccess,
  recordFailure,
  isAvailable,
  getState,
  getAllStates,
  resetProvider,
  resetAll,
  hydrate,
} from './providerHealth'
import { classifyError } from './observability'

const KEY = 'altus_provider_health'
const START = new Date('2026-01-01T00:00:00Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
  resetAll()
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('recordSuccess', () => {
  it('sets healthy and keeps the provider available', () => {
    recordSuccess('gemini')
    const s = getState('gemini')
    expect(s.status).toBe('healthy')
    expect(s.cooldownUntil).toBeNull()
    expect(isAvailable('gemini')).toBe(true)
  })

  it('resets the failure streak and cooldown after failures', () => {
    recordFailure('groq', 'timeout')
    recordFailure('groq', 'timeout')
    expect(getState('groq').failureStreak).toBe(2)

    recordSuccess('groq')
    const s = getState('groq')
    expect(s.failureStreak).toBe(0)
    expect(s.rateLimitStreak).toBe(0)
    expect(s.status).toBe('healthy')
    expect(isAvailable('groq')).toBe(true)
  })
})

describe('degraded / unavailable (timeout, network_error, provider_error)', () => {
  it('marks degraded after one failure with a 60s cooldown', () => {
    recordFailure('together', 'timeout', { errorMessage: 'socket hang up' })
    const s = getState('together')
    expect(s.status).toBe('degraded')
    expect(s.lastError).toBe('socket hang up')
    expect(isAvailable('together')).toBe(false)

    vi.setSystemTime(START + 60_000)
    expect(isAvailable('together')).toBe(true)
  })

  it('becomes unavailable after 3 consecutive failures', () => {
    recordFailure('together', 'timeout')
    recordFailure('together', 'provider_error')
    recordFailure('together', 'network_error')
    const s = getState('together')
    expect(s.status).toBe('unavailable')
    expect(s.failureStreak).toBe(3)
    // cooldown = 60s * 3 = 180s
    expect(s.cooldownUntil).toBe(START + 180_000)
    expect(isAvailable('together')).toBe(false)

    vi.setSystemTime(START + 179_999)
    expect(isAvailable('together')).toBe(false)
    vi.setSystemTime(START + 180_000)
    expect(isAvailable('together')).toBe(true)
  })

  it('caps the degraded cooldown at 5 minutes', () => {
    for (let i = 0; i < 10; i++) recordFailure('cloudflare', 'timeout')
    expect(getState('cloudflare').cooldownUntil).toBe(START + 300_000)
  })
})

describe('rate_limit backoff', () => {
  it('grows exponentially from 30s, capped at 10 min', () => {
    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').cooldownUntil).toBe(START + 30_000)

    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').cooldownUntil).toBe(START + 60_000)

    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').cooldownUntil).toBe(START + 120_000)

    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').cooldownUntil).toBe(START + 240_000)

    // streak 5 -> 480s, streak 6 -> 960s clamped to 600s
    recordFailure('openrouter', 'rate_limit')
    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').cooldownUntil).toBe(START + 600_000)
    expect(getState('openrouter').status).toBe('rate_limited')
  })

  it('returns availability once the cooldown window elapses', () => {
    recordFailure('openrouter', 'rate_limit')
    expect(isAvailable('openrouter')).toBe(false)

    vi.setSystemTime(START + 29_999)
    expect(isAvailable('openrouter')).toBe(false)

    vi.setSystemTime(START + 30_000)
    expect(isAvailable('openrouter')).toBe(true)
  })

  it('resets the rate-limit streak on a non-rate-limit failure', () => {
    recordFailure('openrouter', 'rate_limit')
    recordFailure('openrouter', 'rate_limit')
    expect(getState('openrouter').rateLimitStreak).toBe(2)

    recordFailure('openrouter', 'timeout')
    expect(getState('openrouter').rateLimitStreak).toBe(0)
  })
})

describe('quota_exhausted', () => {
  it('applies a flat 1h cooldown', () => {
    recordFailure('huggingface', 'quota_exhausted', { errorMessage: 'HTTP 402' })
    const s = getState('huggingface')
    expect(s.status).toBe('quota_exhausted')
    expect(s.cooldownUntil).toBe(START + 3_600_000)

    vi.setSystemTime(START + 3_599_000)
    expect(isAvailable('huggingface')).toBe(false)
    vi.setSystemTime(START + 3_600_000)
    expect(isAvailable('huggingface')).toBe(true)
  })

  it('classifyError recognises quota-depletion phrasing', () => {
    expect(classifyError('You have used up your daily quota')).toBe('quota_exhausted')
    expect(classifyError('Request failed with status 402')).toBe('quota_exhausted')
    expect(classifyError('credits depleted')).toBe('quota_exhausted')
    // ordinary rate limiting still classifies as rate_limit
    expect(classifyError('429 Too Many Requests')).toBe('rate_limit')
  })
})

describe('auth_failed', () => {
  it('disables the provider for 24h', () => {
    recordFailure('recraft', 'auth', { errorMessage: '401 invalid api key' })
    const s = getState('recraft')
    expect(s.status).toBe('auth_failed')
    expect(s.cooldownUntil).toBe(START + 24 * 60 * 60 * 1000)

    vi.setSystemTime(START + 6 * 60 * 60 * 1000)
    expect(isAvailable('recraft')).toBe(false)
    vi.setSystemTime(START + 24 * 60 * 60 * 1000)
    expect(isAvailable('recraft')).toBe(true)
  })
})

describe('model/prompt errors do not cool down the provider', () => {
  it.each(['parse_error', 'empty_response', 'content_policy', 'invalid_model', 'unknown'] as const)(
    '%s leaves health unchanged',
    (errorType) => {
      recordFailure('gemini', errorType, { errorMessage: 'boom' })
      const s = getState('gemini')
      expect(s.status).toBe('unknown')
      expect(s.cooldownUntil).toBeNull()
      expect(s.failureStreak).toBe(0)
      expect(isAvailable('gemini')).toBe(true)
    },
  )

  it('parse_error after a real outage does not extend the streak', () => {
    recordFailure('gemini', 'timeout')
    recordFailure('gemini', 'parse_error')
    expect(getState('gemini').failureStreak).toBe(1)
  })
})

describe('resetProvider / resetAll', () => {
  it('clears cooldown and returns to unknown', () => {
    recordFailure('groq', 'auth')
    expect(isAvailable('groq')).toBe(false)

    resetProvider('groq')
    const s = getState('groq')
    expect(s.status).toBe('unknown')
    expect(s.cooldownUntil).toBeNull()
    expect(s.failureStreak).toBe(0)
    expect(isAvailable('groq')).toBe(true)
  })

  it('getAllStates returns every tracked provider', () => {
    const all = getAllStates()
    expect(Object.keys(all).sort()).toEqual(
      ['cloudflare', 'gemini', 'groq', 'huggingface', 'openrouter', 'recraft', 'together'].sort(),
    )
  })
})

describe('localStorage persistence', () => {
  it('round-trips recent cooldowns through hydrate', () => {
    recordFailure('gemini', 'rate_limit')
    const raw = window.localStorage.getItem(KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.gemini.cooldownUntil).toBe(START + 30_000)

    // simulate a page reload: wipe memory, restore the stored blob, re-hydrate
    resetAll()
    window.localStorage.setItem(KEY, raw as string)
    hydrate()

    const s = getState('gemini')
    expect(s.status).toBe('rate_limited')
    expect(s.cooldownUntil).toBe(START + 30_000)
    expect(isAvailable('gemini')).toBe(false)
  })

  it('drops entries older than 15 minutes on hydrate', () => {
    const stale = {
      gemini: {
        status: 'rate_limited',
        cooldownUntil: START - 1000,
        failureStreak: 4,
        rateLimitStreak: 4,
        updatedAt: START - 20 * 60 * 1000,
      },
    }
    resetAll()
    window.localStorage.setItem(KEY, JSON.stringify(stale))
    hydrate()

    const s = getState('gemini')
    expect(s.status).toBe('unknown')
    expect(s.failureStreak).toBe(0)
  })

  it('tolerates a corrupt payload without throwing', () => {
    resetAll()
    window.localStorage.setItem(KEY, '{not json')
    expect(() => hydrate()).not.toThrow()
  })
})
