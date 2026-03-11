import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './rtl.css'
import './i18n/i18n'

import * as Sentry from "@sentry/react";
import App from './App'
import { isValidSentryDsn } from '@/lib/sentry'

if (typeof globalThis.t_ext !== 'function') {
  globalThis.t_ext = (_key: string, fallback?: string) => fallback ?? _key
}

const STALE_MODULE_RELOAD_KEY = '__stale_module_reload_done__'

function extractErrorMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason && typeof reason === 'object') {
    const maybeMessage = (reason as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
  }
  return ''
}

function isRecoverableModuleLoadError(reason: unknown): boolean {
  const message = extractErrorMessage(reason)
  if (!message) return false

  return /Outdated Optimize Dep|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(message)
}

function recoverFromStaleModuleLoad(reason: unknown): boolean {
  if (!isRecoverableModuleLoadError(reason)) return false

  try {
    if (sessionStorage.getItem(STALE_MODULE_RELOAD_KEY) === '1') {
      return false
    }
    sessionStorage.setItem(STALE_MODULE_RELOAD_KEY, '1')
  } catch {
    // Continue even if sessionStorage is unavailable.
  }

  const url = new URL(window.location.href)
  url.searchParams.set('__reload', Date.now().toString())
  window.location.replace(url.toString())
  return true
}

window.addEventListener('error', (event) => {
  const errorLike = (event as ErrorEvent).error ?? event.message
  if (recoverFromStaleModuleLoad(errorLike)) {
    event.preventDefault()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (recoverFromStaleModuleLoad(event.reason)) {
    event.preventDefault()
  }
})

// Vite emits this event when a preloaded chunk/dependency fails to load.
window.addEventListener('vite:preloadError', (event) => {
  const detail = (event as unknown as CustomEvent<{ payload?: unknown; message?: unknown }>).detail
  const candidate = detail?.payload ?? detail?.message ?? event
  if (recoverFromStaleModuleLoad(candidate)) {
    event.preventDefault()
  }
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

createRoot(document.getElementById('root')!).render(
  <Wrapper>
    <App />
  </Wrapper>
)

// If the app stays up, allow future one-time recoveries in this tab.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem(STALE_MODULE_RELOAD_KEY)
  } catch {
    // Ignore storage errors.
  }
}, 30_000)

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const activateWaitingWorker = () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }

        // Force an update check immediately on load so users pick up new SW versions
        // without needing to manually unregister.
        registration.update().catch(() => {})

        // If an update is already waiting when the page loads, activate it now.
        activateWaitingWorker()

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 1000 * 60 * 60);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available; activate and reload automatically.
                  devLog('[PWA] New content available, activating update.');
                  activateWaitingWorker()
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
