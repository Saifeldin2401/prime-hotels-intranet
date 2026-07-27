import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'

import App from './App'
import './i18n/i18n'
import './phg-kit/global.css'
import './index.css'
import './rtl.css'

import { getSpaRedirectFromSearch } from '@/lib/authRedirect'
import { clearPrimeHotelServiceWorkersAndCaches } from '@/lib/runtimeRecovery'
import { isValidSentryDsn } from '@/lib/sentry'

if (typeof globalThis.t_ext !== 'function') {
  globalThis.t_ext = (_key: string, fallback?: string) => fallback ?? _key
}

const LEGACY_SESSION_KEYS = [
  '__stale_module_reload_done__',
  '__stale_module_sw_reset_done__',
  '__phg_boot_import_recovery__',
  '__phg_version_reload_done__',
]
const LEGACY_LOCAL_KEYS = ['__phg_app_version__']
const LEGACY_SEARCH_PARAMS = ['__reload', '__boot_recover', '__phg_sw_cleanup']
const PWA_DISABLED_CLEANUP_KEY = '__pwa_disabled_cleanup_done__'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE
const SENTRY_RELEASE =
  import.meta.env.VITE_RELEASE ||
  import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ||
  import.meta.env.VITE_GIT_COMMIT ||
  undefined

const sentryEnabled = isValidSentryDsn(SENTRY_DSN)
const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? (import.meta.env.PROD ? 0.1 : 1.0))
const replaySessionSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? (import.meta.env.PROD ? 0.02 : 0.1))
const replayOnErrorSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? 1.0)
const sendDefaultPii = import.meta.env.VITE_SENTRY_SEND_DEFAULT_PII === 'true'

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

function clearLegacyRecoveryState() {
  if (typeof window === 'undefined') return

  try {
    for (const key of LEGACY_SESSION_KEYS) {
      window.sessionStorage.removeItem(key)
    }
    for (const key of LEGACY_LOCAL_KEYS) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors during boot.
  }
}

function restoreSpaRedirectFromSearch() {
  if (typeof window === 'undefined') return

  const redirectPath = getSpaRedirectFromSearch(window.location.search)
  if (!redirectPath) return

  if (import.meta.env.PROD && sentryEnabled) {
    Sentry.captureMessage('spa_route_404', {
      level: 'warning',
      extra: { path: redirectPath },
    })
  }

  window.history.replaceState(null, '', redirectPath)
}

function stripLegacyRecoveryParams() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  let didChange = false

  for (const param of LEGACY_SEARCH_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param)
      didChange = true
    }
  }

  if (!didChange) return

  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

async function cleanupLegacyPwaArtifacts() {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return

  try {
    const alreadyCleaned = window.sessionStorage.getItem(PWA_DISABLED_CLEANUP_KEY) === '1'
    if (alreadyCleaned) return
    window.sessionStorage.setItem(PWA_DISABLED_CLEANUP_KEY, '1')
  } catch {
    // Continue even if sessionStorage is unavailable.
  }

  try {
    await clearPrimeHotelServiceWorkersAndCaches()
  } catch (error) {
    if (sentryEnabled) {
      Sentry.captureException(error, {
        level: 'warning',
        tags: { scope: 'pwa_cleanup' },
      })
    }
  }
}

clearLegacyRecoveryState()
restoreSpaRedirectFromSearch()
stripLegacyRecoveryParams()

;(window as Window & { __PHG_FORCE_REFRESH__?: () => Promise<void> }).__PHG_FORCE_REFRESH__ = async () => {
  await clearPrimeHotelServiceWorkersAndCaches()
  window.location.reload()
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const Wrapper = import.meta.env.DEV ? StrictMode : Fragment
const root = createRoot(rootElement)

try {
  root.render(
    <Wrapper>
      <App />
    </Wrapper>
  )
} catch (bootError) {
  // If React fails to render (e.g. module init error, circular import), show a visible error
  // instead of a white screen. This runs outside React's error boundary.
  rootElement.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;padding:2rem;">
      <div style="text-align:center;max-width:28rem;">
        <h1 style="font-size:1.25rem;font-weight:600;color:#dc2626;">Something went wrong</h1>
        <p style="margin-top:.5rem;color:#6b7280;">The application failed to load. Please try refreshing the page.</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:.5rem 1.5rem;background:#2563eb;color:white;border:none;border-radius:.5rem;cursor:pointer;font-size:.875rem;">
          Reload Page
        </button>
      </div>
    </div>`
  console.error('[PHG] Boot error:', bootError)
}

void cleanupLegacyPwaArtifacts()

// Register service worker for push notifications and offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[SW] Service Worker registered:', registration.scope)
        }
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                window.dispatchEvent(new CustomEvent('phg:update-available'))
              }
            })
          }
        })
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('[SW] Service Worker registration failed:', error)
        }
      })
  })
}
