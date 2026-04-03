import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { router } from '@/routes/router'
import { isEnabled } from '@/lib/featureFlags'
import { QueryClientProvider, dehydrate, focusManager, hydrate, onlineManager, type DehydratedState, type Query } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState, type ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'

const QUERY_CACHE_KEY = 'prime_query_cache_v4'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes
const UPDATE_AVAILABLE_EVENT = 'phg:update-available'
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

const hasPendingAppUpdate = () => {
  if (typeof window === 'undefined') return false
  return Boolean((window as Window & { __PHG_UPDATE_AVAILABLE__?: boolean }).__PHG_UPDATE_AVAILABLE__)
}

const applyPendingAppUpdate = async () => {
  if (typeof window === 'undefined') return

  const registrations = await navigator.serviceWorker.getRegistrations()
  const waitingWorker = registrations.find((registration) => registration.waiting)?.waiting

  if (!waitingWorker) {
    window.location.reload()
    return
  }

  await new Promise<void>((resolve) => {
    let didResolve = false

    const finish = () => {
      if (didResolve) return
      didResolve = true
      resolve()
    }

    const handleControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      finish()
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true })
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      finish()
      window.location.reload()
    }, 3000)
  })
}

function DashboardPrefetcher() {
  const { user, roles, departments, properties, rolesLoading } = useAuth()
  const { currentProperty, propertyIds } = useProperty()

  useEffect(() => {
    if (!user?.id || rolesLoading) return

    // Prefetch dashboard JS chunk so navigation feels instant
    void import('@/pages/dashboard/Dashboard')

    // Warm the cache with base dashboard stats
    const prefetch = async () => {
      const { fetchDashboardStats } = await import('@/hooks/useDashboardStats')
      await queryClient.prefetchQuery({
        queryKey: [
          'dashboard-stats',
          user.id,
          currentProperty?.id,
          roles.map(r => r.role).sort(),
          departments.map(d => d.id).sort(),
          properties.map(p => p.id).sort(),
        ],
        queryFn: () => fetchDashboardStats({
          userId: user.id,
          currentPropertyId: currentProperty?.id,
          propertyIds,
          roles,
          departments,
          properties,
        }),
        staleTime: 2 * 60 * 1000,
      })
    }
    void prefetch()
  }, [user, rolesLoading, currentProperty?.id, propertyIds, roles, departments, properties])

  return null
}

function App() {
  const [analyticsConfig, setAnalyticsConfig] = useState<{ component: ComponentType; props: object } | null>(null)
  const [speedInsightsConfig, setSpeedInsightsConfig] = useState<{ component: ComponentType; props: object } | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(() => hasPendingAppUpdate())
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)

  useEffect(() => {
    if (!shouldEnableVercelInsights()) return

    let cancelled = false
    ;(async () => {
      const [{ Analytics }, { SpeedInsights }] = await Promise.all([
        import('@vercel/analytics/react'),
        import('@vercel/speed-insights/react'),
      ])

      if (cancelled) return
      
      // Pass configuration as single object to avoid deprecated parameter warnings
      setAnalyticsConfig({
        component: Analytics,
        props: {}
      })
      setSpeedInsightsConfig({
        component: SpeedInsights,
        props: {}
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistQueryCache()
      }
    }

    const handlePageHide = () => {
      persistQueryCache()
    }

    const handleBeforeUnload = () => {
      persistQueryCache()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdateAvailable = () => {
      setIsUpdateAvailable(true)
    }

    window.addEventListener(UPDATE_AVAILABLE_EVENT, handleUpdateAvailable)
    return () => window.removeEventListener(UPDATE_AVAILABLE_EVENT, handleUpdateAvailable)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <PropertyProvider>
              <UserSettingsProvider>
                <PresenceProvider>
                  <DashboardPrefetcher />
                  <RouterProvider router={router} />
                </PresenceProvider>
              </UserSettingsProvider>
            </PropertyProvider>
          </AuthProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
        <Toaster />
        {isUpdateAvailable && (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
            <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">A new version is ready</p>
                <p className="text-xs text-muted-foreground">Update when convenient. Your current work stays in place until you reload.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsUpdateAvailable(false)} disabled={isApplyingUpdate}>
                  Later
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    setIsApplyingUpdate(true)
                    try {
                      await applyPendingAppUpdate()
                    } finally {
                      setIsApplyingUpdate(false)
                    }
                  }}
                  disabled={isApplyingUpdate}
                >
                  {isApplyingUpdate ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {analyticsConfig && <analyticsConfig.component {...analyticsConfig.props} />}
        {speedInsightsConfig && <speedInsightsConfig.component {...speedInsightsConfig.props} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
