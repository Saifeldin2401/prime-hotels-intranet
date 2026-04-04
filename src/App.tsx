import { useEffect, useState, type ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/app/AppProviders'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { router } from '@/routes/router'

const UPDATE_AVAILABLE_EVENT = 'phg:update-available'

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

      setAnalyticsConfig({ component: Analytics, props: {} })
      setSpeedInsightsConfig({ component: SpeedInsights, props: {} })
    })()

    return () => {
      cancelled = true
    }
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
      <AppProviders>
        <RouterProvider router={router} />
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
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
