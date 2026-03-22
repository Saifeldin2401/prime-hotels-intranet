import { supabase } from '@/lib/supabase'
import { useCallback, useRef } from 'react'

/**
 * Internal hook: session recovery, timeout utilities, and auth-error detection.
 * Used exclusively by AuthContext — not part of the public API.
 */
export function useAuthSession() {
  const authRecoveryInProgressRef = useRef(false)
  const resumeValidationInFlightRef = useRef(false)
  const lastResumeValidationAtRef = useRef(0)

  /** Detects whether an error is an authentication/JWT error */
  const isAuthError = useCallback((error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const candidate = error as { code?: string | number; status?: number }
    const code = String(candidate.code ?? '')
    const status = Number(candidate.status ?? 0)
    return (
      status === 401 ||
      code === '401' ||
      code === 'PGRST301' ||
      code === 'PGRST302' ||
      code.toUpperCase().includes('JWT')
    )
  }, [])

  /** Wraps a promise with a timeout that rejects after `ms`. */
  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, label: string) => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      promise
        .then((value) => {
          clearTimeout(timer)
          resolve(value)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }, [])

  /**
   * Clears the local Supabase auth session with retry logic.
   * Call `onCleared` after the session is removed to reset local state.
   */
  const clearLocalSession = useCallback(
    async (reason: string, onCleared: () => void) => {
      if (authRecoveryInProgressRef.current) return
      authRecoveryInProgressRef.current = true
      try {
        console.warn(`[Auth] ${reason}. Clearing local session.`)
        const maxAttempts = 3
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            await supabase.auth.signOut({ scope: 'local' })
            break
          } catch (error) {
            if (attempt === maxAttempts - 1) {
              throw error
            }
            const delayMs = 250 * (2 ** attempt)
            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }
        }
      } catch (error) {
        console.warn('Failed to clear local auth session:', error)
      } finally {
        onCleared()
        authRecoveryInProgressRef.current = false
      }
    },
    []
  )

  return {
    isAuthError,
    withTimeout,
    clearLocalSession,
    authRecoveryInProgressRef,
    resumeValidationInFlightRef,
    lastResumeValidationAtRef,
  }
}
