/**
 * AuthIdentityContext - Core authentication state only
 * 
 * This context handles:
 * - User identity (Supabase User object)
 * - Initial loading state
 * - Auth state change listening
 * - Session recovery on tab visibility changes
 */

import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { shouldSuppressAuthenticatedAppState } from '@/lib/authFlowState'
import { classifyAuthError, getErrorMessage, getErrorCode, getRetryDelay } from '@/lib/authErrorUtils'
import { recordAuthEvent } from '@/lib/authMonitor'
import { useAuthSession } from './useAuthSession'
import { REMEMBER_ME_KEY } from '@/hooks/useInactivityTimeout'
import { safeLocalStorage, safeSessionStorage } from '@/lib/storage'

// ─── Configuration ─────────────────────────────────────────────────────────
const isMobileBrowser = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent)
}

const CONFIG = {
  visibilityDebounceMs: isMobileBrowser() ? 2000 : 500,
  validationThrottleMs: 5000,
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  loadingTimeoutMs: 5000,
} as const

// ─── Logger helper ───────────────────────────────────────────────────────────
const log = {
  warn: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(message, ...args)
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(message, ...args)
    }
  },
}

// ─── Context Types ───────────────────────────────────────────────────────────
export interface AuthIdentityContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const AuthIdentityContext = createContext<AuthIdentityContextType | undefined>(undefined)

const FALLBACK_AUTH_IDENTITY: AuthIdentityContextType = {
  user: null,
  loading: true,
  setUser: () => {},
  setLoading: () => {},
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuthIdentity() {
  const context = useContext(AuthIdentityContext)
  return context ?? FALLBACK_AUTH_IDENTITY
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthIdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { isAuthError, clearLocalSession, authRecoveryInProgressRef, resumeValidationInFlightRef, lastResumeValidationAtRef } =
    useAuthSession()

  const cleanupTimers = useCallback(() => {
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current)
      visibilityTimeoutRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  // ── Initial session + auth state listener ─────────────────────────────────
  useEffect(() => {
    let mounted = true
    let loadingState = true

    const shouldDeferAuthenticatedAppState = () => {
      if (typeof window === 'undefined') return false
      return shouldSuppressAuthenticatedAppState(
        window.location.pathname,
        window.location.search,
        window.location.hash,
      )
    }

    const timeoutId = setTimeout(() => {
      if (mounted && loadingState) {
        log.warn('[AuthIdentity] Loading is taking unusually long (>10s).')
      }
    }, 10000)

    const finishLoading = () => {
      loadingState = false
      setLoading(false)
      clearTimeout(timeoutId)
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return
      if (error) {
        log.warn('[AuthIdentity] Error getting session:', getErrorMessage(error))
        finishLoading()
        return
      }
      if (session?.user) {
        if (shouldDeferAuthenticatedAppState()) {
          finishLoading()
          return
        }

        // Check if user chose "Remember Me".
        // If Remember Me was not set, and this is a new browser session (sessionStorage is empty):
        const isRememberMe = safeLocalStorage.getItem(REMEMBER_ME_KEY) === 'true'
        const isSessionActive = safeSessionStorage.getItem('altus_session_active') === 'true'

        if (!isRememberMe && !isSessionActive) {
          log.warn('[AuthIdentity] Session ended because Remember Me was disabled and browser was closed.')
          await clearLocalSession('Session ended (Remember Me disabled)', () => {
            setUser(null)
          })
          finishLoading()
          return
        }

        // Mark session active in current browser session
        safeSessionStorage.setItem('altus_session_active', 'true')
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        finishLoading()
      } else {
        finishLoading()
      }
    }).catch((error) => {
      log.warn('[AuthIdentity] Unexpected error in getSession:', getErrorMessage(error))
      if (mounted) finishLoading()
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user && shouldDeferAuthenticatedAppState()) {
        finishLoading()
        return
      }

      if (session?.user) {
        safeSessionStorage.setItem('altus_session_active', 'true')
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        finishLoading()
      } else {
        safeSessionStorage.removeItem('altus_session_active')
        setUser(null)
        finishLoading()
      }
    })

    // ── Session verification on tab resume ─────────────────────────────────
    const verifySessionOnResume = async (retryAttempt = 0): Promise<void> => {
      if (!navigator.onLine) {
        recordAuthEvent({
          type: 'tab_resume',
          success: false,
          details: { reason: 'offline' },
        })
        return
      }

      if (!mounted || document.visibilityState === 'hidden') return
      if (resumeValidationInFlightRef.current) return

      const now = Date.now()
      if (now - lastResumeValidationAtRef.current < CONFIG.validationThrottleMs) return

      resumeValidationInFlightRef.current = true
      lastResumeValidationAtRef.current = now

      try {
        recordAuthEvent({
          type: 'session_validation',
          success: true,
          details: { attempt: retryAttempt },
        })

        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()

        if (!mounted) return

        if (error || !verifiedUser) {
          const errorMsg = getErrorMessage(error)
          const errorCode = getErrorCode(error)
          const classification = classifyAuthError(error)

          recordAuthEvent({
            type: 'session_validation',
            success: false,
            error: errorMsg,
            errorCode,
            details: {
              errorType: classification.type,
              shouldLogout: classification.shouldLogout,
              retryable: classification.retryable,
            },
          })

          if (classification.shouldLogout) {
            log.warn('[AuthIdentity] Session validation failed, attempting token refresh:', errorMsg)
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              if (refreshData?.session?.user && !refreshError) {
                recordAuthEvent({
                  type: 'token_refresh',
                  success: true,
                  details: { context: 'tab_resume_recovery', userId: refreshData.session.user.id },
                })
                authRecoveryInProgressRef.current = false
                setUser((current) => (current?.id === refreshData.session!.user.id ? current : refreshData.session!.user))
                finishLoading()
                return
              }
            } catch {
              // Refresh failed
            }

            await clearLocalSession('Session expired after tab resume', () => setUser(null))
            recordAuthEvent({
              type: 'logout',
              success: true,
              details: { reason: 'session_expired', context: 'tab_resume' },
            })
          } else if (classification.retryable && retryAttempt < CONFIG.maxRetries) {
            const delay = getRetryDelay(retryAttempt, CONFIG.baseRetryDelayMs)
            retryTimeoutRef.current = setTimeout(() => {
              if (mounted && document.visibilityState === 'visible') {
                void verifySessionOnResume(retryAttempt + 1)
              }
            }, delay)
          } else if (classification.type === 'network_error') {
            log.warn('[AuthIdentity] Network error during resume check, keeping session:', errorMsg)
          }

          finishLoading()
          return
        }

        recordAuthEvent({
          type: 'session_validation',
          success: true,
          details: { userId: verifiedUser.id },
        })

        authRecoveryInProgressRef.current = false
        setUser((current) => (current?.id === verifiedUser.id ? current : verifiedUser))
      } catch (unexpectedError) {
        log.error('[AuthIdentity] Unexpected error in resume validation:', unexpectedError)
        recordAuthEvent({
          type: 'session_validation',
          success: false,
          error: getErrorMessage(unexpectedError),
          details: { unexpected: true },
        })
      } finally {
        resumeValidationInFlightRef.current = false
      }
    }

    const handleVisibilityChange = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
        visibilityTimeoutRef.current = null
      }

      if (document.visibilityState === 'visible') {
        if (!navigator.onLine) {
          recordAuthEvent({
            type: 'tab_resume',
            success: false,
            details: { reason: 'offline_on_resume' },
          })
          return
        }

        const debounceMs = CONFIG.visibilityDebounceMs

        visibilityTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            void verifySessionOnResume()
          }
        }, debounceMs)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      cleanupTimers()
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearLocalSession, cleanupTimers, isAuthError])

  const value = useMemo(() => ({
    user,
    loading,
    setUser,
    setLoading,
  }), [user, loading])

  return (
    <AuthIdentityContext.Provider value={value}>
      {children}
    </AuthIdentityContext.Provider>
  )
}
