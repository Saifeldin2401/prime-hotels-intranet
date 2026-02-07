import { useEffect } from 'react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate, focusManager, onlineManager } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { router } from '@/routes/router'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'

const QUERY_CACHE_KEY = 'prime_query_cache_v1'
const QUERY_CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
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
      shouldDehydrateQuery: (query) => query.state.status === 'success'
    })
    window.sessionStorage.setItem(
      QUERY_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), state })
    )
  } catch {
    // Ignore cache persistence errors
  }
}

restoreQueryCache()

function App() {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persistQueryCache()
      }
    }

    const handlePageHide = () => {
      persistQueryCache()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
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
                  <NotificationProvider>
                    <RouterProvider router={router} />
                  </NotificationProvider>
                </PresenceProvider>
              </UserSettingsProvider>
            </PropertyProvider>
          </AuthProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
