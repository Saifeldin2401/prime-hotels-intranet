import { useEffect, useState, type ComponentType } from 'react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate, focusManager, onlineManager } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { router } from '@/routes/router'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { TooltipProvider } from '@/components/ui/tooltip'

const QUERY_CACHE_KEY = 'prime_query_cache_v1'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes

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
    hydrate(queryClient, parsed.state)
  } catch {
    // Ignore cache restore errors
  }
}

const persistQueryCache = () => {
  if (typeof window === 'undefined') return
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        if (query.state.status !== 'success') return false
        const data = query.state.data as unknown
        if (Array.isArray(data) && data.length > 200) {
          return false
        }
        return true
      }
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
    focusManager.setEventListener((handleFocus) => {
      const onFocus = () => {
        if (document.visibilityState === 'visible') {
          handleFocus()
        }
      }
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
      return () => {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    })

    onlineManager.setEventListener((handleOnline) => {
      const onOnline = () => handleOnline(true)
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
                  <TooltipProvider>
                    <RouterProvider router={router} />
                  </TooltipProvider>
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
