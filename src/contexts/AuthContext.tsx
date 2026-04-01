import type { AppRole } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import { analytics } from '@/services/analyticsService'
import type { Session, User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shouldSuppressAuthenticatedAppState } from '@/lib/authFlowState'
import { useAuthSession } from './auth/useAuthSession'
import { useUserDataLoader } from './auth/useUserDataLoader'
import { classifyAuthError, getRetryDelay, getErrorMessage, getErrorCode } from '@/lib/authErrorUtils'
import { isEnabled } from '@/lib/featureFlags'
import { recordAuthEvent, reportAuthHealth } from '@/lib/authMonitor'

// ─── Context type ──────────────────────────────────────────────────────────
export interface AuthContextType {
  user: User | null
  profile: Profile | null
  roles: UserRole[]
  properties: Property[]
  departments: Department[]
  primaryRole: AppRole | null
  loading: boolean
  rolesLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Role priority order (lower = higher privilege) ────────────────────────
const ROLE_ORDER: Record<AppRole, number> = {
  corporate_admin: 1,
  regional_admin: 2,
  regional_hr: 3,
  property_manager: 4,
  property_hr: 5,
  department_head: 6,
  manager: 7,
  staff: 8,
}

// ─── Configuration ─────────────────────────────────────────────────────────
const CONFIG = {
  // Debounce time before validating session after tab becomes visible
  visibilityDebounceMs: 500,
  // Minimum time between validation attempts
  validationThrottleMs: 5000,
  // Ignore quick tab switches that are common on mobile browsers
  minHiddenDurationMs: 15000,
  // Refresh the auth session after longer background periods
  refreshAfterHiddenMs: 10 * 60 * 1000,
  // Refresh slightly before expiry to avoid resume-edge races
  sessionExpiryBufferMs: 2 * 60 * 1000,
  // Retry configuration for network errors
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  // Loading timeout
  loadingTimeoutMs: 5000,
} as const

// ─── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)

  // Refs for race condition prevention
  const sessionClearInProgressRef = useRef(false)
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hiddenAtRef = useRef<number | null>(null)

  // ── Session helpers (error detection, timeout, clear) ──────────────────
  const { isAuthError, withTimeout, clearLocalSession, authRecoveryInProgressRef, resumeValidationInFlightRef, lastResumeValidationAtRef } =
    useAuthSession()

  const resetLocalAuthState = useCallback(() => {
    setUser(null)
    setProfile(null)
    setRoles([])
    setProperties([])
    setDepartments([])
    setRolesLoading(false)
  }, [])

  // ── User data loader (profile, roles, properties, departments) ─────────
  const stateSetters = useMemo(
    () => ({ setProfile, setRoles, setProperties, setDepartments, setRolesLoading }),
    []
  )
  const sessionHelpers = useMemo(
    () => ({ isAuthError, withTimeout, clearLocalSession }),
    [isAuthError, withTimeout, clearLocalSession]
  )

  const { loadUserData, shouldRefreshUserData, syncProfileRef, syncRolesRef } =
    useUserDataLoader(stateSetters, sessionHelpers)

  // Keep refs in sync
  useEffect(() => { syncProfileRef(profile) }, [profile, syncProfileRef])
  useEffect(() => { syncRolesRef(roles) }, [roles, syncRolesRef])

  // ── Cleanup function for all timers ────────────────────────────────────
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

  // ── Initial session + auth state listener ──────────────────────────────
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
        console.warn('[Auth] Loading timeout - forcing loading to false after 5 seconds')
        setLoading(false)
        loadingState = false
      }
    }, CONFIG.loadingTimeoutMs)

    const finishLoading = () => {
      loadingState = false
      setLoading(false)
      clearTimeout(timeoutId)
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return
      if (error) {
        console.warn('[Auth] Error getting session:', getErrorMessage(error))
        finishLoading()
        return
      }
      if (session?.user) {
        if (shouldDeferAuthenticatedAppState()) {
          resetLocalAuthState()
          finishLoading()
          return
        }

        authRecoveryInProgressRef.current = false
        setUser(session.user)
        setRolesLoading(true)
        finishLoading()
        loadUserData(session.user.id).catch(() => {
          console.warn('[Auth] Error in loadUserData.')
        })
      } else {
        finishLoading()
      }
    }).catch((error) => {
      console.warn('[Auth] Unexpected error in getSession:', getErrorMessage(error))
      if (mounted) finishLoading()
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user && shouldDeferAuthenticatedAppState()) {
        resetLocalAuthState()
        finishLoading()
        return
      }

      if (session?.user) {
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        void analytics.identify(session.user.id).catch((error) => {
          console.warn('[Auth] Failed to initialize analytics identity:', error)
        })
        if (_event !== 'TOKEN_REFRESHED' || shouldRefreshUserData(session.user.id)) {
          finishLoading()
          loadUserData(session.user.id).catch(() => {
            console.warn('[Auth] Error in loadUserData (auth change).')
          })
        } else {
          finishLoading()
        }
      } else {
        resetLocalAuthState()
        finishLoading()
      }
    })

    // ── Session verification on tab resume ──────────────────────────────
    const isSessionNearExpiry = (session: Session) => {
      const expiresAt = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0
      return expiresAt > 0 && expiresAt - Date.now() <= CONFIG.sessionExpiryBufferMs
    }

    const verifySessionOnResume = async (hiddenDurationMs: number, retryAttempt = 0): Promise<void> => {
      // Skip if offline - network errors shouldn't cause logout
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

      // Prevent multiple simultaneous session clears
      if (sessionClearInProgressRef.current) {
        resumeValidationInFlightRef.current = false
        return
      }

      try {
        recordAuthEvent({
          type: 'session_validation',
          success: true,
          details: { attempt: retryAttempt, hiddenDurationMs },
        })

        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error || !session?.user) {
          const missingSession = !error && !session?.user
          const errorMsg = missingSession
            ? 'No session found during resume validation'
            : getErrorMessage(error)
          const errorCode = missingSession ? 'missing_session' : getErrorCode(error)
          const classification = missingSession
            ? { type: 'auth_expired' as const, shouldLogout: true, retryable: false }
            : classifyAuthError(error)

          recordAuthEvent({
            type: 'session_validation',
            success: false,
            error: errorMsg,
            errorCode,
            details: { 
              errorType: classification.type,
              shouldLogout: classification.shouldLogout,
              retryable: classification.retryable,
              hiddenDurationMs,
            },
          })

          if (classification.shouldLogout) {
            // Only clear session on actual auth expiration
            if (import.meta.env.DEV) {
              console.warn('[Auth] Session expired, clearing session:', errorMsg)
            }
            sessionClearInProgressRef.current = true
            try {
              await clearLocalSession('Session expired after tab resume', resetLocalAuthState)
              recordAuthEvent({
                type: 'logout',
                success: true,
                details: { reason: 'session_expired', context: 'tab_resume' },
              })
            } finally {
              sessionClearInProgressRef.current = false
            }
          } else if (classification.retryable && retryAttempt < CONFIG.maxRetries) {
            // Schedule a retry with exponential backoff
            const delay = getRetryDelay(retryAttempt, CONFIG.baseRetryDelayMs)
            if (import.meta.env.DEV) {
              console.log(`[Auth] Retrying session validation in ${delay}ms (attempt ${retryAttempt + 1})`)
            }
            retryTimeoutRef.current = setTimeout(() => {
              if (mounted && document.visibilityState === 'visible') {
                void verifySessionOnResume(hiddenDurationMs, retryAttempt + 1)
              }
            }, delay)
          } else if (classification.type === 'network_error') {
            // Don't clear session on network errors - session may still be valid
            if (import.meta.env.DEV) {
              console.warn('[Auth] Network error during resume check, keeping session:', errorMsg)
            }
          }

          finishLoading()
          return
        }

        let nextUser = session.user

        setUser((current) => (current?.id === nextUser.id ? current : nextUser))

        const shouldRefreshAuthSession =
          hiddenDurationMs >= CONFIG.refreshAfterHiddenMs || isSessionNearExpiry(session)

        if (shouldRefreshAuthSession) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

          if (!mounted) return

          if (refreshError || !refreshData.session?.user) {
            const missingSession = !refreshError && !refreshData.session?.user
            const errorMsg = missingSession
              ? 'No session returned from refresh after tab resume'
              : getErrorMessage(refreshError)
            const errorCode = missingSession ? 'missing_refresh_session' : getErrorCode(refreshError)
            const classification = missingSession
              ? { type: 'auth_expired' as const, shouldLogout: true, retryable: false }
              : classifyAuthError(refreshError)

            recordAuthEvent({
              type: 'token_refresh',
              success: false,
              error: errorMsg,
              errorCode,
              details: {
                errorType: classification.type,
                shouldLogout: classification.shouldLogout,
                retryable: classification.retryable,
                hiddenDurationMs,
              },
            })

            if (classification.shouldLogout) {
              sessionClearInProgressRef.current = true
              try {
                await clearLocalSession('Session refresh failed after tab resume', resetLocalAuthState)
                recordAuthEvent({
                  type: 'logout',
                  success: true,
                  details: { reason: 'session_expired', context: 'tab_resume_refresh' },
                })
              } finally {
                sessionClearInProgressRef.current = false
              }
              finishLoading()
              return
            }

            if (classification.retryable && retryAttempt < CONFIG.maxRetries) {
              const delay = getRetryDelay(retryAttempt, CONFIG.baseRetryDelayMs)
              retryTimeoutRef.current = setTimeout(() => {
                if (mounted && document.visibilityState === 'visible') {
                  void verifySessionOnResume(hiddenDurationMs, retryAttempt + 1)
                }
              }, delay)
            }

            finishLoading()
            return
          }

          nextUser = refreshData.session.user
          setUser((current) => (current?.id === nextUser.id ? current : nextUser))
          recordAuthEvent({
            type: 'token_refresh',
            success: true,
            details: { userId: nextUser.id, hiddenDurationMs },
          })
        }

        // Success - session is valid
        recordAuthEvent({
          type: 'session_validation',
          success: true,
          details: { userId: nextUser.id, hiddenDurationMs },
        })

        authRecoveryInProgressRef.current = false
        if (shouldRefreshUserData(nextUser.id)) {
          loadUserData(nextUser.id).catch(() => {
            console.warn('[Auth] Error in loadUserData (resume validation).')
          })
        }
      } catch (unexpectedError) {
        // Unexpected errors - don't auto-logout
        console.error('[Auth] Unexpected error in resume validation:', unexpectedError)
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
      // Clear any pending validation
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
        visibilityTimeoutRef.current = null
      }

      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }

      // Add delay to let browser stabilize network after becoming visible
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const hiddenDurationMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
        hiddenAtRef.current = null

        if (hiddenDurationMs < CONFIG.minHiddenDurationMs) {
          return
        }

        const debounceMs = isEnabled('smartSessionValidation') 
          ? CONFIG.visibilityDebounceMs 
          : 0

        visibilityTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState === 'visible') {
            void verifySessionOnResume(hiddenDurationMs)
          }
        }, debounceMs)
      }
    }

    // Only validate on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      cleanupTimers()
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    clearLocalSession, loadUserData, resetLocalAuthState, shouldRefreshUserData,
    isAuthError, authRecoveryInProgressRef, resumeValidationInFlightRef, lastResumeValidationAtRef,
    cleanupTimers,
  ])

  // ── Sign in / sign out / refresh ───────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    console.log('[Auth Debug] signIn called')
    try {
      setLoading(true)
      setRolesLoading(true)
      console.log('[Auth Debug] Calling supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log('[Auth Debug] signInWithPassword result:', { hasUser: !!data.user, hasError: !!error })
      if (error) {
        console.log('[Auth Debug] signIn error:', error)
        setLoading(false)
        setRolesLoading(false)
        return { error }
      }
      if (data.user) {
        console.log('[Auth Debug] User signed in, setting user state...')
        setUser(data.user)
        setLoading(false)
        console.log('[Auth Debug] Calling loadUserData...')
        loadUserData(data.user.id).catch((err) => {
          console.error('[Auth Debug] loadUserData error:', err)
        })
      } else {
        console.log('[Auth Debug] No user in signIn data')
        setLoading(false)
      }
      return { error: null }
    } catch (error) {
      console.error('[Auth Debug] signIn CATCH error:', error)
      setLoading(false)
      setRolesLoading(false)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('prime_current_property_id')
    recordAuthEvent({
      type: 'logout',
      success: true,
      details: { reason: 'user_initiated' },
    })
    await clearLocalSession('User signed out', resetLocalAuthState)
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error || !session?.user) {
        const missingSession = !error && !session?.user
        const classification = missingSession
          ? { type: 'auth_expired' as const, shouldLogout: true, retryable: false }
          : classifyAuthError(error)
        recordAuthEvent({
          type: 'token_refresh',
          success: false,
          error: missingSession ? 'No session returned from refresh' : getErrorMessage(error),
        })
        if (classification.shouldLogout) {
          await clearLocalSession('Session refresh failed', resetLocalAuthState)
        }
        return
      }
      recordAuthEvent({
        type: 'token_refresh',
        success: true,
        details: { userId: session.user.id },
      })
      authRecoveryInProgressRef.current = false
      setUser(session.user)
      setRolesLoading(true)
      await loadUserData(session.user.id)
    } catch (error) {
      console.error('[Auth] Unexpected error in refreshSession:', error)
      recordAuthEvent({
        type: 'token_refresh',
        success: false,
        error: getErrorMessage(error),
        details: { unexpected: true },
      })
    }
  }

  // ── Derived: primary role ──────────────────────────────────────────────
  const primaryRole = roles.length > 0
    ? [...roles].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])[0]?.role || null
    : null

  // ── Debug: expose health report to window in development ───────────────
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as Record<string, unknown>).reportAuthHealth = reportAuthHealth
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        properties,
        departments,
        primaryRole,
        loading,
        rolesLoading,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// useAuth hook is in @/hooks/useAuth to resolve circular dependencies
