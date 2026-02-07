import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './rtl.css'
import './i18n/i18n'

import * as Sentry from "@sentry/react";
import App from './App'

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

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "https://5f5ee68dbba50c2d138d3e9b8772d4b6@o4508792767840256.ingest.de.sentry.io/4510844400238672"
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE
const SENTRY_RELEASE =
  import.meta.env.VITE_RELEASE ||
  import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ||
  import.meta.env.VITE_GIT_COMMIT ||
  undefined

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  release: SENTRY_RELEASE,
  environment: SENTRY_ENV,
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

if (redirectPath) {
  if (import.meta.env.PROD) {
    Sentry.captureMessage('spa_route_404', {
      level: 'warning',
      extra: { path: redirectPath }
    })
  }
  window.history.replaceState(null, '', redirectPath)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Service Worker registered successfully
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error)
      })
  })
}
