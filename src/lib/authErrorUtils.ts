/**
 * Authentication error classification utilities
 * 
 * These utilities help distinguish between different types of errors
 * to make intelligent decisions about session management.
 */

export interface AuthError {
  status?: number
  code?: string | number
  message?: string
  name?: string
}

export type ErrorType = 
  | 'auth_expired'      // 401/403 - Session actually expired
  | 'network_error'     // 0/timeout/fetch errors - Temporary network issues
  | 'server_error'      // 5xx - Server issues, session may still be valid
  | 'client_error'      // 4xx (not 401) - Client issues
  | 'unknown'           // Unknown error type

/**
 * Classifies an error into specific categories for handling
 */
export function classifyAuthError(error: unknown): { type: ErrorType; shouldLogout: boolean; retryable: boolean } {
  if (!error || typeof error !== 'object') {
    return { type: 'unknown', shouldLogout: false, retryable: true }
  }

  const err = error as AuthError
  const status = Number(err.status ?? 0)
  const code = String(err.code ?? '')
  const message = String(err.message ?? '').toLowerCase()

  // Auth expired - definitely logout
  if (status === 401 || status === 403 || code === '401' || code === '403') {
    return { type: 'auth_expired', shouldLogout: true, retryable: false }
  }

  // JWT specific errors
  if (code.toUpperCase().includes('JWT') || 
      code === 'PGRST301' || 
      code === 'PGRST302') {
    return { type: 'auth_expired', shouldLogout: true, retryable: false }
  }

  // Network errors - don't logout, retryable
  if (status === 0 || 
      message.includes('timeout') || 
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('abort') ||
      message.includes('failed to fetch') ||
      message.includes('connection') ||
      !navigator.onLine) {
    return { type: 'network_error', shouldLogout: false, retryable: true }
  }

  // Server errors - don't logout, may be temporary
  if (status >= 500) {
    return { type: 'server_error', shouldLogout: false, retryable: true }
  }

  // Client errors (4xx but not 401) - don't logout
  if (status >= 400) {
    return { type: 'client_error', shouldLogout: false, retryable: false }
  }

  return { type: 'unknown', shouldLogout: false, retryable: true }
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function getRetryDelay(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, exponentialDelay + jitter)
}

/**
 * Check if we should attempt a retry based on error type and attempt count
 */
export function shouldRetry(error: unknown, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) return false
  const classification = classifyAuthError(error)
  return classification.retryable
}

/**
 * Safe error message extraction for logging
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error'
}

/**
 * Safe error code extraction
 */
export function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown'
  const err = error as { code?: string | number; status?: number }
  return String(err.code ?? err.status ?? 'unknown')
}
