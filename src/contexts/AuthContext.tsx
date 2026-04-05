import type { AppRole } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import { analytics } from '@/services/analyticsService'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shouldSuppressAuthenticatedAppState } from '@/lib/authFlowState'
import { useAuthSession } from './auth/useAuthSession'
import { useUserDataLoader } from './auth/useUserDataLoader'
import { classifyAuthError, getRetryDelay, getErrorMessage, getErrorCode } from '@/lib/authErrorUtils'
import { isEnabled } from '@/lib/featureFlags'
import { recordAuthEvent, reportAuthHealth } from '@/lib/authMonitor'
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware'

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
// Detect mobile browsers for adjusted timing
const isMobileBrowser = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent)
}

const CONFIG = {
  // Debounce time before validating session after tab becomes visible
  // Mobile needs longer — network takes 1-3s to stabilize after backgrounding
  visibilityDebounceMs: isMobileBrowser() ? 2000 : 500,
  // Minimum time between validation attempts
  validationThrottleMs: 5000,
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
    useUserDataLoader(stateSetters, sessionHelpers, resetLocalAuthState)

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
    const verifySessionOnResume = async (retryAttempt = 0): Promise<void> => {
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
            // Access token expired — try refreshing before giving up
            if (import.meta.env.DEV) {
              console.warn('[Auth] Session validation failed, attempting token refresh before logout:', errorMsg)
            }
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              if (refreshData?.session?.user && !refreshError) {
                // Refresh succeeded — session is still valid
                recordAuthEvent({
                  type: 'token_refresh',
                  success: true,
                  details: { context: 'tab_resume_recovery', userId: refreshData.session.user.id },
                })
                authRecoveryInProgressRef.current = false
                setUser((current) => (current?.id === refreshData.session!.user.id ? current : refreshData.session!.user))
                if (shouldRefreshUserData(refreshData.session.user.id)) {
                  loadUserData(refreshData.session.user.id).catch(() => {
                    console.warn('[Auth] Error in loadUserData (resume recovery).')
                  })
                }
                finishLoading()
                return
              }
            } catch {
              // Refresh also failed — proceed with logout
            }

            // Refresh failed — actually clear session
            sessionClearInProgressRef.current = true
            try {
              await clearLocalSession('Session expired after tab resume (refresh also failed)', resetLocalAuthState)
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
            retryTimeoutRef.current = setTimeout(() => {
              if (mounted && document.visibilityState === 'visible') {
                void verifySessionOnResume(retryAttempt + 1)
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

        // Success - session is valid
        recordAuthEvent({
          type: 'session_validation',
          success: true,
          details: { userId: verifiedUser.id },
        })

        authRecoveryInProgressRef.current = false
        setUser((current) => (current?.id === verifiedUser.id ? current : verifiedUser))
        if (shouldRefreshUserData(verifiedUser.id)) {
          loadUserData(verifiedUser.id).catch(() => {
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

      // Add delay to let browser stabilize network after becoming visible
      if (document.visibilityState === 'visible') {
        // Don't validate if offline — no point, and it avoids false auth failures
        if (!navigator.onLine) {
          recordAuthEvent({
            type: 'tab_resume',
            success: false,
            details: { reason: 'offline_on_resume' },
          })
          return
        }

        const debounceMs = isEnabled('smartSessionValidation')
          ? CONFIG.visibilityDebounceMs
          : 0

        visibilityTimeoutRef.current = setTimeout(() => {
          // Re-check conditions after debounce — user might have switched away again
          if (document.visibilityState === 'visible' && navigator.onLine) {
            void verifySessionOnResume()
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
    isAuthError, cleanupTimers,
  ])

  // ── Sign in / sign out / refresh ───────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    const rateLimitKey = `auth:signin:${email.toLowerCase()}`
    if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.auth.maxRequests, rateLimitConfig.auth.windowMs)) {
      return { error: new Error('Too many sign-in attempts. Please try again later.') }
    }
    
    try {
      setLoading(true)
      setRolesLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setLoading(false)
        setRolesLoading(false)
        return { error }
      }
      if (data.user) {
        setUser(data.user)
        setLoading(false)
        loadUserData(data.user.id).catch(() => {
          console.warn('[Auth] Error loading user data after sign in.')
        })
      } else {
        setLoading(false)
      }
      return { error: null }
    } catch (error) {
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
        const classification = classifyAuthError(error)
        recordAuthEvent({
          type: 'token_refresh',
          success: false,
          error: getErrorMessage(error),
          details: { errorType: classification.type, shouldLogout: classification.shouldLogout },
        })
        // Only logout on actual auth expiration, not network/server errors
        if (classification.shouldLogout) {
          await clearLocalSession('Session refresh failed - token expired', resetLocalAuthState)
        } else if (import.meta.env.DEV) {
          console.warn('[Auth] Token refresh failed due to transient error, keeping session:', getErrorMessage(error))
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
      const classification = classifyAuthError(error)
      console.error('[Auth] Unexpected error in refreshSession:', error)
      recordAuthEvent({
        type: 'token_refresh',
        success: false,
        error: getErrorMessage(error),
        details: { unexpected: true, errorType: classification.type },
      })
      // Don't logout on unexpected/network errors during refresh
      if (classification.shouldLogout) {
        await clearLocalSession('Session refresh failed - auth error', resetLocalAuthState)
      }
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
