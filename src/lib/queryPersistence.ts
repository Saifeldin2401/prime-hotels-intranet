import { dehydrate, focusManager, hydrate, onlineManager, type DehydratedState, type Query } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { isEnabled } from '@/lib/featureFlags'

const QUERY_CACHE_KEY = 'prime_query_cache_v4'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes

// Volatile, user-specific progress data that must never be served stale from cache.
const NON_PERSISTED_QUERY_PREFIXES = new Set([
  'learning-progress',
  'learning-assignments',
  'learning-assignment-exemptions',
  'learning-assignments-module-links',
  'learning-quizzes',
  'my-assignments',
  'module-assignment-roster',
  'training-module-full',
  'training-progress',
  'training-assignments',
  'assignment-progress',
])

const getPrimaryQueryKey = (queryKey: readonly unknown[]) => {
  const primaryKey = queryKey[0]
  return typeof primaryKey === 'string' ? primaryKey : null
}

const shouldPersistQuery = (query: Pick<Query, 'queryKey' | 'meta' | 'state'>) => {
  if (query.meta?.persist === false) return false
  if (query.state.status !== 'success') return false

  const primaryKey = getPrimaryQueryKey(query.queryKey)
  if (primaryKey && NON_PERSISTED_QUERY_PREFIXES.has(primaryKey)) {
    return false
  }

  const data = query.state.data as unknown
  if (Array.isArray(data) && data.length > 200) {
    return false
  }

  return true
}

const filterDehydratedState = (state: DehydratedState): DehydratedState => ({
  ...state,
  queries: state.queries.filter((query) => shouldPersistQuery({
    queryKey: query.queryKey,
    meta: query.meta,
    state: query.state,
  } as Pick<Query, 'queryKey' | 'meta' | 'state'>)),
})

/**
 * Synchronously rehydrate the query cache from sessionStorage. Called at module
 * load (before first render) so cached data is available on the initial paint.
 */
export const restoreQueryCache = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(QUERY_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed?.timestamp || !parsed?.state) return
    if (Date.now() - parsed.timestamp > QUERY_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(QUERY_CACHE_KEY)
      return
    }
    hydrate(queryClient, filterDehydratedState(parsed.state))
  } catch {
    // Ignore cache restore errors
  }
}

const persistQueryCache = () => {
  if (typeof window === 'undefined') return
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: shouldPersistQuery
    })
    window.sessionStorage.setItem(
      QUERY_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), state })
    )
  } catch {
    // Clear oversized cache entries to avoid repeated quota failures.
    try {
      window.sessionStorage.removeItem(QUERY_CACHE_KEY)
    } catch {
      // Ignore storage cleanup errors.
    }
  }
}

/**
 * Persist the cache whenever the tab is backgrounded or unloaded.
 * Returns a cleanup function that removes the listeners.
 */
export const installQueryCachePersistence = () => {
  if (typeof window === 'undefined') return () => {}

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') persistQueryCache()
  }
  const handlePageHide = () => persistQueryCache()
  const handleBeforeUnload = () => persistQueryCache()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('beforeunload', handleBeforeUnload)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}

/**
 * Configure React Query's focus and online managers with debounced, visibility-
 * and network-aware refetch triggers. Call once on app start.
 */
export const configureQueryManagers = () => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const debounceMs = isEnabled('debouncedFocusManager') ? 500 : 0

  focusManager.setEventListener((handleFocus) => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          handleFocus()
        }
      }, debounceMs)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  })

  onlineManager.setEventListener((handleOnline) => {
    const onOnline = () => {
      // Delay to let the network stabilize before marking as online.
      setTimeout(() => handleOnline(true), 1000)
    }
    const onOffline = () => handleOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  })
}
