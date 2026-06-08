import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { router } from '@/routes/router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState, type ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'
import { configureQueryManagers, installQueryCachePersistence, restoreQueryCache } from '@/lib/queryPersistence'
import { UPDATE_AVAILABLE_EVENT, applyPendingAppUpdate, hasPendingAppUpdate } from '@/lib/appUpdate'

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
          authUserId: user.id,
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
  const [VercelAnalytics, setVercelAnalytics] = useState<ComponentType | null>(null)
  const [VercelSpeedInsights, setVercelSpeedInsights] = useState<ComponentType | null>(null)
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
      setVercelAnalytics(() => Analytics)
      setVercelSpeedInsights(() => SpeedInsights)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => installQueryCachePersistence(), [])

  useEffect(() => configureQueryManagers(), [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdateAvailable = () => setIsUpdateAvailable(true)
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
        {VercelAnalytics && <VercelAnalytics />}
        {VercelSpeedInsights && <VercelSpeedInsights />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
