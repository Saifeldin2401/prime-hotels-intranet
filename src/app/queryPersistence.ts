import { dehydrate, hydrate, type DehydratedState, type Query } from '@tanstack/react-query'

import { queryClient } from '@/lib/queryClient'

const QUERY_CACHE_KEY = 'altus_query_cache_v4'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 5
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

export const shouldPersistQuery = (query: Pick<Query, 'queryKey' | 'meta' | 'state'>) => {
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
    // Ignore cache restore errors.
  }
}

export const persistQueryCache = () => {
  if (typeof window === 'undefined') return

  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: shouldPersistQuery,
    })

    window.sessionStorage.setItem(
      QUERY_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), state }),
    )
  } catch {
    try {
      window.sessionStorage.removeItem(QUERY_CACHE_KEY)
    } catch {
      // Ignore storage cleanup errors.
    }
  }
}

