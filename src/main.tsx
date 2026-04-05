import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.css'
import './rtl.css'

import { clearPrimeHotelServiceWorkersAndCaches } from '@/lib/runtimeRecovery'
import { isValidSentryDsn } from '@/lib/sentry'
import * as Sentry from "@sentry/react"
import App from './App'

if (typeof globalThis.t_ext !== 'function') {
  globalThis.t_ext = (_key: string, fallback?: string) => fallback ?? _key
}

const STALE_MODULE_RELOAD_KEY = '__stale_module_reload_done__'
const STALE_MODULE_SW_RESET_KEY = '__stale_module_sw_reset_done__'
const PWA_DISABLED_CLEANUP_KEY = '__pwa_disabled_cleanup_done__'
const UPDATE_AVAILABLE_EVENT = 'phg:update-available'

export function extractErrorMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason && typeof reason === 'object') {
    const maybeMessage = (reason as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
  }
  return ''
}

export function isRecoverableModuleLoadError(reason: unknown): boolean {
  const message = extractErrorMessage(reason)
  if (!message) return false

  return /Outdated Optimize Dep|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(message)
}

function reportStaleModuleRecovery(stage: 'reload' | 'service_worker_reset' | 'exhausted', message: string) {
  if (!sentryEnabled) return

  Sentry.captureMessage('stale_module_recovery', {
    level: 'warning',
    tags: {
      scope: 'boot_recovery',
      stage,
    },
    extra: {
      route: window.location.pathname + window.location.search + window.location.hash,
      buildVersion: SERVICE_WORKER_BUILD_VERSION,
      message,
      serviceWorkerReset: stage === 'service_worker_reset',
    },
  })
}

async function clearServiceWorkerState() {
  await clearPrimeHotelServiceWorkersAndCaches()
}

function navigateForRecovery() {
  const url = new URL(window.location.href)
  url.searchParams.set('__reload', Date.now().toString())
  window.location.replace(url.toString())
}

export async function recoverFromStaleModuleLoad(reason: unknown): Promise<boolean> {
  if (!isRecoverableModuleLoadError(reason)) return false

  const message = extractErrorMessage(reason) || 'Unknown stale module load error'
  try {
    if (sessionStorage.getItem(STALE_MODULE_RELOAD_KEY) === '1') {
      if (sessionStorage.getItem(STALE_MODULE_SW_RESET_KEY) === '1') {
        reportStaleModuleRecovery('exhausted', message)
        return false
      }

      sessionStorage.setItem(STALE_MODULE_SW_RESET_KEY, '1')
      reportStaleModuleRecovery('service_worker_reset', message)
      await clearServiceWorkerState()
      navigateForRecovery()
      return true
    }

    sessionStorage.setItem(STALE_MODULE_RELOAD_KEY, '1')
    reportStaleModuleRecovery('reload', message)
  } catch {
    // Continue even if sessionStorage is unavailable.
  }

  navigateForRecovery()
  return true
}

window.addEventListener('error', (event) => {
  const errorLike = (event as ErrorEvent).error ?? event.message
  if (!isRecoverableModuleLoadError(errorLike)) return

  event.preventDefault()
  void recoverFromStaleModuleLoad(errorLike)
})

window.addEventListener('unhandledrejection', (event) => {
  if (!isRecoverableModuleLoadError(event.reason)) return

  event.preventDefault()
  void recoverFromStaleModuleLoad(event.reason)
})

// Vite emits this event when a preloaded chunk/dependency fails to load.
window.addEventListener('vite:preloadError', (event) => {
  const detail = (event as unknown as CustomEvent<{ payload?: unknown; message?: unknown }>).detail
  const candidate = detail?.payload ?? detail?.message ?? event
  if (!isRecoverableModuleLoadError(candidate)) return

  if ('preventDefault' in event) {
    event.preventDefault()
  }
  void recoverFromStaleModuleLoad(candidate)
})

const redirectParam = new URLSearchParams(window.location.search).get('__redirect')
let redirectPath: string | null = null
if (redirectParam) {
  try {
    const decoded = decodeURIComponent(redirectParam)
    if (decoded.startsWith('/')) {
      redirectPath = decoded
    }
  } catch {
    // Ignore malformed redirect parameters
  }
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE
const SENTRY_RELEASE =
  import.meta.env.VITE_RELEASE ||
  import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ||
  import.meta.env.VITE_GIT_COMMIT ||
  undefined
const PWA_ENABLED = import.meta.env.VITE_ENABLE_PWA === 'true'
const SERVICE_WORKER_BUILD_VERSION =
  import.meta.env.VITE_APP_BUILD_VERSION ||
  SENTRY_RELEASE ||
  'app'

const sentryEnabled = isValidSentryDsn(SENTRY_DSN)
const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? (import.meta.env.PROD ? 0.1 : 1.0))
const replaySessionSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? (import.meta.env.PROD ? 0.02 : 0.1))
const replayOnErrorSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? 1.0)
const sendDefaultPii = import.meta.env.VITE_SENTRY_SEND_DEFAULT_PII === 'true'

// ============================================================================
// AUTOMATED VERSION MISMATCH DETECTION
// Automatically clears service worker and caches when a new version is detected
// ============================================================================
const VERSION_CHECK_KEY = '__phg_app_version__'
const VERSION_RELOADED_KEY = '__phg_version_reload_done__'

async function checkAndHandleVersionMismatch(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const currentVersion = SERVICE_WORKER_BUILD_VERSION
  
  try {
    const storedVersion = localStorage.getItem(VERSION_CHECK_KEY)
    const hasReloaded = sessionStorage.getItem(VERSION_RELOADED_KEY) === '1'
    
    // First visit - just store the version
    if (!storedVersion) {
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion)
      return false
    }
    
    // Version matches - no action needed
    if (storedVersion === currentVersion) {
      return false
    }
    
    // Version mismatch detected!
    console.log(`[Version Check] Mismatch detected: stored=${storedVersion}, current=${currentVersion}`)
    
    // Prevent infinite reload loops
    if (hasReloaded) {
      console.warn('[Version Check] Already reloaded once, not reloading again to prevent loop')
      // Still update the stored version so we don't keep checking
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion)
      sessionStorage.removeItem(VERSION_RELOADED_KEY)
      return false
    }
    
    // Clear service workers and caches
    console.log('[Version Check] Clearing service workers and caches...')
    const hadArtifacts = await clearPrimeHotelServiceWorkersAndCaches()
    
    if (hadArtifacts) {
      console.log('[Version Check] Cleared stale artifacts, reloading...')
      
      // Mark that we've reloaded to prevent loops
      sessionStorage.setItem(VERSION_RELOADED_KEY, '1')
      
      // Update stored version before reload
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion)
      
      // Report to Sentry if enabled
      if (sentryEnabled) {
        Sentry.captureMessage('auto_version_reload', {
          level: 'info',
          tags: { scope: 'pwa', auto_recovery: 'true' },
          extra: {
            storedVersion,
            currentVersion,
            pathname: window.location.pathname,
          },
        })
      }
      
      // Force reload to get fresh content
      window.location.reload()
      return true
    } else {
      // No artifacts to clear, just update the stored version
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion)
      return false
    }
  } catch (error) {
    console.error('[Version Check] Error during version check:', error)
    return false
  }
}

// Run version check immediately (before rendering)
const versionCheckPromise = checkAndHandleVersionMismatch()

if (sentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    release: SENTRY_RELEASE,
    environment: SENTRY_ENV,
    tracesSampleRate,
    replaysSessionSampleRate: replaySessionSampleRate,
    replaysOnErrorSampleRate: replayOnErrorSampleRate,
    sendDefaultPii,
  })
}

const isDev = import.meta.env.DEV
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}
const reportNonFatalError = (message: string, error: unknown) => {
  if (sentryEnabled) {
    Sentry.captureException(error, { level: 'warning', tags: { scope: 'pwa' }, extra: { message } })
  }
  if (isDev) {
    console.error(message, error)
  }
}

const notifyAppUpdateAvailable = () => {
  if (typeof window === 'undefined') return

  const updateState = window as Window & {
    __PHG_UPDATE_AVAILABLE__?: boolean
  }

  if (updateState.__PHG_UPDATE_AVAILABLE__) return

  updateState.__PHG_UPDATE_AVAILABLE__ = true
  window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT))

  if (sentryEnabled) {
    Sentry.captureMessage('pwa_update_available', {
      level: 'info',
      tags: { scope: 'pwa' },
      extra: {
        route: window.location.pathname + window.location.search + window.location.hash,
        buildVersion: SERVICE_WORKER_BUILD_VERSION,
      },
    })
  }
}

if (redirectPath) {
  if (import.meta.env.PROD && sentryEnabled) {
    Sentry.captureMessage('spa_route_404', {
      level: 'warning',
      extra: { path: redirectPath }
    })
  }
  window.history.replaceState(null, '', redirectPath)
}

const Wrapper = import.meta.env.DEV ? StrictMode : Fragment

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// ============================================================================
// MANUAL RECOVERY FUNCTION - Exposed to window for user-triggered recovery
// Usage: In browser console, run: window.__PHG_FORCE_REFRESH__()
// ============================================================================
;(window as Window & { __PHG_FORCE_REFRESH__?: () => Promise<void> }).__PHG_FORCE_REFRESH__ = async () => {
  console.log('[Manual Recovery] Clearing all caches and reloading...')
  await clearPrimeHotelServiceWorkersAndCaches()
  // Clear all version check keys to force fresh start
  localStorage.removeItem(VERSION_CHECK_KEY)
  sessionStorage.removeItem(VERSION_RELOADED_KEY)
  window.location.reload()
}

// In DEV, React Refresh may re-execute this module. createRoot will warn but still work.
// We rely on React's own error handling rather than trying to prevent the warning.
// Wait for version check to complete before rendering to avoid conflicts
versionCheckPromise.then((didReload) => {
  if (didReload) {
    // If we triggered a reload, don't render - the page will reload
    return
  }
  
  const root = createRoot(rootElement)
  root.render(
    <Wrapper>
      <App />
    </Wrapper>
  )
})

// If the app stays up, allow future one-time recoveries in this tab.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem(STALE_MODULE_RELOAD_KEY)
    sessionStorage.removeItem(STALE_MODULE_SW_RESET_KEY)
  } catch {
    // Ignore storage errors.
  }
}, 30_000)

// Register Service Worker for PWA with aggressive update checking
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    if (!PWA_ENABLED) {
      try {
        const hasAlreadyCleanedUp = sessionStorage.getItem(PWA_DISABLED_CLEANUP_KEY) === '1'
        if (hasAlreadyCleanedUp) return
        sessionStorage.setItem(PWA_DISABLED_CLEANUP_KEY, '1')
      } catch {
        // Continue even if sessionStorage is unavailable.
      }

      void clearServiceWorkerState().catch((error) => {
        reportNonFatalError('[PWA] Failed to clear disabled service worker state', error)
      })
      return
    }

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(SERVICE_WORKER_BUILD_VERSION)}`, {
        updateViaCache: 'none' // Always check server for updates
      })
      .then((registration) => {
        // Immediate update check on load
        registration.update().catch(() => {})

        // If there's a waiting worker, activate it immediately
        // This prevents stale chunk errors after deployments
        if (registration.waiting) {
          devLog('[PWA] Update waiting - activating immediately')
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        // Check for updates every 5 minutes (not 1 hour) for faster recovery
        setInterval(() => {
          registration.update().catch(() => {})
        }, 1000 * 60 * 5);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  devLog('[PWA] New content available - activating immediately');
                  // Force activation instead of waiting
                  installingWorker.postMessage({ type: 'SKIP_WAITING' })
                  notifyAppUpdateAvailable()
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        reportNonFatalError('[PWA] Service Worker registration failed', error)
      })
  })
}
