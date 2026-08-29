/**
 * Provider Health State Machine
 * ----------------------------------------------------------------------------
 * A tiny, dependency-free circuit-breaker for AI providers. The router consults
 * `isAvailable(provider)` before picking a provider and calls `recordSuccess` /
 * `recordFailure` after every call so a flapping or exhausted provider is
 * skipped until its cooldown window elapses.
 *
 * Design notes:
 *  - In-memory `Map` is the source of truth. State is mirrored to `localStorage`
 *    (key `altus_provider_health`) best-effort so a page reload keeps recent
 *    cooldowns. Entries older than 15 min are dropped on hydrate.
 *  - No timers/intervals. Availability is computed on read by comparing
 *    `Date.now()` to `cooldownUntil`.
 *  - Pure: only depends on `observability` for the `AIErrorType` union. No
 *    network calls, no imports from the router or agents.
 */

import type { AIErrorType } from './observability'

export type AIProvider =
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'cloudflare'
  | 'huggingface'
  | 'together'
  | 'recraft'

export type ProviderHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'auth_failed'
  | 'unavailable'
  | 'unknown'

/**
 * Error types this module knows how to react to. Superset of `AIErrorType`:
 * `network_error` / `content_policy` are accepted for forward-compat even
 * though `classifyError` does not currently emit them.
 */
export type RecordableErrorType = AIErrorType | 'network_error' | 'content_policy'

export interface ProviderHealthState {
  status: ProviderHealthStatus
  cooldownUntil: number | null
  failureStreak: number
  /** Consecutive `rate_limit` failures — drives the rate-limit backoff curve. */
  rateLimitStreak: number
  lastError?: string
  /** `Date.now()` of the last mutation — used for stale-entry pruning on hydrate. */
  updatedAt: number
}

export interface RecordFailureOptions {
  /** Raw error message, stored as `lastError` for the admin panel. */
  errorMessage?: string
}

// ---------------------------------------------------------------------------
// Cooldown configuration
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'altus_provider_health'
const HYDRATE_MAX_AGE_MS = 15 * 60 * 1000 // drop persisted entries older than this

/** `auth` — effectively disabled until a manual reset or a later success probe. */
const AUTH_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** `rate_limit` — exponential: 30s, 60s, 120s, ... capped at 10 min. */
const RATE_LIMIT_BASE_MS = 30 * 1000
const RATE_LIMIT_CAP_MS = 10 * 60 * 1000

/** `quota_exhausted` — flat 1h. */
const QUOTA_COOLDOWN_MS = 60 * 60 * 1000

/** `timeout` / `network_error` / `provider_error` — 60s * failureStreak, capped 5 min. */
const DEGRADED_BASE_MS = 60 * 1000
const DEGRADED_CAP_MS = 5 * 60 * 1000
const UNAVAILABLE_THRESHOLD = 3 // consecutive failures before `unavailable`

const ALL_PROVIDERS: readonly AIProvider[] = [
  'gemini',
  'groq',
  'openrouter',
  'cloudflare',
  'huggingface',
  'together',
  'recraft',
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const store = new Map<AIProvider, ProviderHealthState>()

function freshState(): ProviderHealthState {
  return {
    status: 'unknown',
    cooldownUntil: null,
    failureStreak: 0,
    rateLimitStreak: 0,
    updatedAt: Date.now(),
  }
}

function getOrInit(provider: AIProvider): ProviderHealthState {
  let s = store.get(provider)
  if (!s) {
    s = freshState()
    store.set(provider, s)
  }
  return s
}

function isProvider(value: string): value is AIProvider {
  return (ALL_PROVIDERS as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Persistence (best-effort, SSR-safe)
// ---------------------------------------------------------------------------

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    const snapshot: Record<string, ProviderHealthState> = {}
    for (const [provider, state] of store.entries()) {
      snapshot[provider] = state
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* SSR, disabled storage, or quota exceeded — cooldowns still live in memory. */
  }
}

/**
 * Load persisted state into the in-memory map. Called once on module load and
 * exported for tests. Stale entries (>15 min old) are discarded.
 */
export function hydrate(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, Partial<ProviderHealthState>>
    if (!parsed || typeof parsed !== 'object') return
    const now = Date.now()
    for (const [provider, value] of Object.entries(parsed)) {
      if (!isProvider(provider) || !value || typeof value !== 'object') continue
      const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : 0
      if (now - updatedAt > HYDRATE_MAX_AGE_MS) continue
      store.set(provider, {
        status: (value.status as ProviderHealthStatus) ?? 'unknown',
        cooldownUntil:
          typeof value.cooldownUntil === 'number' ? value.cooldownUntil : null,
        failureStreak:
          typeof value.failureStreak === 'number' ? value.failureStreak : 0,
        rateLimitStreak:
          typeof value.rateLimitStreak === 'number' ? value.rateLimitStreak : 0,
        lastError: typeof value.lastError === 'string' ? value.lastError : undefined,
        updatedAt,
      })
    }
  } catch {
    /* corrupt payload or no storage — start from a clean slate. */
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Provider answered successfully — clear all penalties. */
export function recordSuccess(provider: AIProvider): void {
  const s = getOrInit(provider)
  s.status = 'healthy'
  s.cooldownUntil = null
  s.failureStreak = 0
  s.rateLimitStreak = 0
  s.lastError = undefined
  s.updatedAt = Date.now()
  persist()
}

/**
 * Provider call failed. Maps `errorType` to a health status + cooldown window.
 * Model/prompt-level errors (`parse_error`, `empty_response`, `content_policy`,
 * `invalid_model`, `unknown`) leave provider health untouched.
 */
export function recordFailure(
  provider: AIProvider,
  errorType: RecordableErrorType,
  opts?: RecordFailureOptions,
): void {
  const now = Date.now()
  const s = getOrInit(provider)
  const errorLabel = opts?.errorMessage || errorType

  switch (errorType) {
    case 'auth': {
      s.failureStreak += 1
      s.rateLimitStreak = 0
      s.status = 'auth_failed'
      s.cooldownUntil = now + AUTH_COOLDOWN_MS
      s.lastError = errorLabel
      s.updatedAt = now
      persist()
      return
    }

    case 'rate_limit': {
      s.failureStreak += 1
      s.rateLimitStreak += 1
      s.status = 'rate_limited'
      const backoff = Math.min(
        RATE_LIMIT_BASE_MS * 2 ** (s.rateLimitStreak - 1),
        RATE_LIMIT_CAP_MS,
      )
      s.cooldownUntil = now + backoff
      s.lastError = errorLabel
      s.updatedAt = now
      persist()
      return
    }

    case 'quota_exhausted': {
      s.failureStreak += 1
      s.rateLimitStreak = 0
      s.status = 'quota_exhausted'
      s.cooldownUntil = now + QUOTA_COOLDOWN_MS
      s.lastError = errorLabel
      s.updatedAt = now
      persist()
      return
    }

    case 'timeout':
    case 'network_error':
    case 'provider_error': {
      s.failureStreak += 1
      s.rateLimitStreak = 0
      s.status = s.failureStreak >= UNAVAILABLE_THRESHOLD ? 'unavailable' : 'degraded'
      const cooldown = Math.min(DEGRADED_BASE_MS * s.failureStreak, DEGRADED_CAP_MS)
      s.cooldownUntil = now + cooldown
      s.lastError = errorLabel
      s.updatedAt = now
      persist()
      return
    }

    // Model / prompt problems — not a provider outage. Leave health unchanged.
    case 'parse_error':
    case 'empty_response':
    case 'content_policy':
    case 'invalid_model':
    case 'unknown':
      return

    default:
      return
  }
}

/** Manual "re-enable" — clears any cooldown and resets to `unknown`. */
export function resetProvider(provider: AIProvider): void {
  store.set(provider, freshState())
  persist()
}

/** Reset every provider. Handy for tests and a global admin "clear all". */
export function resetAll(): void {
  store.clear()
  persist()
}

// ---------------------------------------------------------------------------
// Reads (pure — never mutate)
// ---------------------------------------------------------------------------

/** True when the provider is not inside an active cooldown window. */
export function isAvailable(provider: AIProvider): boolean {
  const s = store.get(provider)
  if (!s || s.cooldownUntil == null) return true
  return Date.now() >= s.cooldownUntil
}

export function getState(provider: AIProvider): ProviderHealthState {
  const s = store.get(provider)
  return s ? { ...s } : freshState()
}

export function getAllStates(): Record<AIProvider, ProviderHealthState> {
  const out = {} as Record<AIProvider, ProviderHealthState>
  for (const provider of ALL_PROVIDERS) {
    out[provider] = getState(provider)
  }
  return out
}

// Hydrate persisted cooldowns on module load.
hydrate()
