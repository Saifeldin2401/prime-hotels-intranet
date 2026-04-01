import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { router } from '@/routes/router'
import { isEnabled } from '@/lib/featureFlags'
import { QueryClient, QueryClientProvider, dehydrate, focusManager, hydrate, onlineManager, type DehydratedState, type Query } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState, type ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'

const QUERY_CACHE_KEY = 'prime_query_cache_v4'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes
const LEGACY_QUERY_CACHE_KEYS = ['prime_query_cache_v1', 'prime_query_cache_v2', 'prime_query_cache_v3']
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false
        const status = Number((error as { status?: number })?.status ?? 0)
        return status === 0 || status >= 500
      },
    },
  },
})

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

const clearLegacyQueryCaches = () => {
  if (typeof window === 'undefined') return

  LEGACY_QUERY_CACHE_KEYS.forEach((cacheKey) => {
    try {
      window.sessionStorage.removeItem(cacheKey)
    } catch {
      // Ignore storage cleanup errors.
    }
  })
}

const restoreQueryCache = () => {
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

clearLegacyQueryCaches()
restoreQueryCache()

const shouldEnableVercelInsights = () => {
  if (!import.meta.env.PROD) return false
  if (typeof window === 'undefined') return false

  const host = window.location.hostname
  return (
    host.endsWith('vercel.app') ||
    host === 'phg-connect.com' ||
    host === 'www.phg-connect.com' ||
    host === 'connect.primehotels.com'
  )
}

function App() {
  const [VercelAnalytics, setVercelAnalytics] = useState<ComponentType | null>(null)
  const [VercelSpeedInsights, setVercelSpeedInsights] = useState<ComponentType | null>(null)

  useEffect(() => {
    if (!shouldEnableVercelInsights()) return

    let cancelled = false
    ;(async () => {
      const [{ Analytics }, { SpeedInsights }] = await Promise.all([
        import('@vercel/analytics/react'),
        import('@vercel/speed-insights/react'),
      ])

      if (cancelled) return
      setVercelAnalytics(() => Analytics)
      setVercelSpeedInsights(() => SpeedInsights)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handlePageHide = () => {
      persistQueryCache()
    }

    const handleBeforeUnload = () => {
      persistQueryCache()
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    
    const debouncedFocusManager = isEnabled('debouncedFocusManager')
    const debounceMs = debouncedFocusManager ? 500 : 0

    focusManager.setEventListener((handleFocus) => {
      const onFocus = () => {
        if (document.visibilityState !== 'visible') return
        
        // Clear existing timer to debounce rapid focus events
        if (debounceTimer) clearTimeout(debounceTimer)
        
        // Debounce: wait after focus stabilizes
        debounceTimer = setTimeout(() => {
          // Only refetch if we're still visible and online
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
        // Delay to let network stabilize before marking as online
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
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <PropertyProvider>
              <UserSettingsProvider>
                <PresenceProvider>
                  <RouterProvider router={router} />
                </PresenceProvider>
              </UserSettingsProvider>
            </PropertyProvider>
          </AuthProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
        <Toaster />
        {VercelAnalytics && <VercelAnalytics />}
        {VercelSpeedInsights && <VercelSpeedInsights />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
