/**
 * Auth monitoring and metrics collection
 * 
 * Tracks:
 * - Session validation events
 * - Logout reasons
 * - Network error patterns
 * - Tab switching behavior
 * 
 * In production, these metrics can be sent to your analytics service
 */

import { analytics } from '@/services/analyticsService'

export interface AuthEvent {
  type: 'session_validation' | 'logout' | 'network_error' | 'token_refresh' | 'tab_resume'
  timestamp: number
  success: boolean
  details?: Record<string, unknown>
  error?: string
  errorCode?: string
}

interface SessionMetrics {
  validationAttempts: number
  networkErrors: number
  authErrors: number
  successfulResumes: number
  lastValidationAt: number | null
}

// In-memory metrics store (resets on page reload)
const metrics: SessionMetrics = {
  validationAttempts: 0,
  networkErrors: 0,
  authErrors: 0,
  successfulResumes: 0,
  lastValidationAt: null,
}

// Recent events buffer (last 50 events)
const eventBuffer: AuthEvent[] = []
const MAX_BUFFER_SIZE = 50

/**
 * Record an auth event
 */
export function recordAuthEvent(event: Omit<AuthEvent, 'timestamp'>): void {
  const fullEvent: AuthEvent = {
    ...event,
    timestamp: Date.now(),
  }

  // Add to buffer
  eventBuffer.push(fullEvent)
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift()
  }

  // Update metrics
  updateMetrics(fullEvent)

  // Send to analytics in production
  if (import.meta.env.PROD && event.type !== 'session_validation') {
    // Only send important events to avoid noise
    sendToAnalytics(fullEvent)
  }

  // Debug logging in development
  if (import.meta.env.DEV) {
    logEvent(fullEvent)
  }
}

function logEvent(event: AuthEvent): void {
  const emoji = event.success ? '✓' : '✗'
  const details = event.details ? JSON.stringify(event.details) : ''
  console.log(`[Auth] ${emoji} ${event.type}${event.error ? ` - ${event.error}` : ''} ${details}`)
}

/**
 * Update internal metrics counters
 */
function updateMetrics(event: AuthEvent): void {
  switch (event.type) {
    case 'session_validation':
      metrics.validationAttempts++
      metrics.lastValidationAt = event.timestamp
      if (event.success) {
        metrics.successfulResumes++
      } else if (event.error) {
        if (event.error.includes('401') || event.error.includes('403')) {
          metrics.authErrors++
        } else if (event.error.includes('network') || event.error.includes('timeout')) {
          metrics.networkErrors++
        }
      }
      break
    case 'network_error':
      metrics.networkErrors++
      break
    case 'logout':
      if (event.details?.reason === 'auth_error') {
        metrics.authErrors++
      }
      break
  }
}

/**
 * Send event to analytics service
 */
function sendToAnalytics(event: AuthEvent): void {
  try {
    // Map auth events to analytics events
    switch (event.type) {
      case 'logout':
        if (event.details?.reason === 'session_expired') {
          analytics.track('Session Expired', {
            error_code: event.errorCode,
            context: event.details?.context,
          })
        }
        break
      case 'network_error':
        // Batch network errors to avoid spam
        if (metrics.networkErrors <= 3) {
          analytics.track('Auth Network Error', {
            error: event.error,
            error_code: event.errorCode,
          })
        }
        break
      case 'token_refresh':
        if (!event.success) {
          analytics.track('Token Refresh Failed', {
            error: event.error,
          })
        }
        break
    }
  } catch {
    // Analytics failures shouldn't break auth
  }
}

/**
 * Get current session metrics
 */
export function getSessionMetrics(): Readonly<SessionMetrics> {
  return { ...metrics }
}

/**
 * Get recent auth events
 */
export function getRecentEvents(limit = 10): AuthEvent[] {
  return eventBuffer.slice(-limit)
}

/**
 * Check if session is healthy based on recent metrics
 */
export function isSessionHealthy(): { healthy: boolean; concerns: string[] } {
  const concerns: string[] = []

  // High network error rate
  if (metrics.networkErrors > 5) {
    concerns.push('High network error rate')
  }

  // Multiple auth errors
  if (metrics.authErrors > 2) {
    concerns.push('Multiple authentication errors')
  }

  // No successful validation after many attempts
  if (metrics.validationAttempts > 3 && metrics.successfulResumes === 0) {
    concerns.push('Multiple failed validation attempts')
  }

  return {
    healthy: concerns.length === 0,
    concerns,
  }
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  metrics.validationAttempts = 0
  metrics.networkErrors = 0
  metrics.authErrors = 0
  metrics.successfulResumes = 0
  metrics.lastValidationAt = null
  eventBuffer.length = 0
}

/**
 * Report current state for debugging
 */
export function reportAuthHealth(): void {
  const health = isSessionHealthy()
  if (health.concerns.length > 0) {
    console.warn('Concerns:', health.concerns)
  }
}

// Auto-report health every 60 seconds in development
if (import.meta.env.DEV) {
  setInterval(() => {
    if (eventBuffer.length > 0) {
      reportAuthHealth()
    }
  }, 60000)
}
