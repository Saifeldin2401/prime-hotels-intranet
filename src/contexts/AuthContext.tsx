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
import { 
  validateSessionBinding, 
  recordLoginAttempt, 
  isCaptchaRequired,
  getRemainingAttempts,
  checkSecurityRequirements,
  initializeSessionSecurity,
  clearSessionFingerprint,
  logSecurityEvent,
  checkPasswordBreach,
  revokeAllOtherSessions,
  enforceSessionLimit,
} from '@/lib/authSecurityService'
import { auditLog } from '@/lib/auditLog'

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
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: Error | null; requiresMFA?: boolean; mfaUserId?: string }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  verifyMFA: (code: string) => Promise<boolean>
  isMFAVerified: boolean
  securityRequirements: {
    mfaRequired: boolean
    mfaEnabled: boolean
    passwordRotationRequired: boolean
    setupComplete: boolean
  } | null
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
  // Session security check interval
  sessionSecurityCheckIntervalMs: 60000, // 1 minute
} as const

// ─── Logger helper (guarded) ───────────────────────────────────────────────
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

// ─── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [isMFAVerified, setIsMFAVerified] = useState(false)
  const [securityRequirements, setSecurityRequirements] = useState<{
    mfaRequired: boolean
    mfaEnabled: boolean
    passwordRotationRequired: boolean
    setupComplete: boolean
  } | null>(null)
  const [pendingMFAUserId, setPendingMFAUserId] = useState<string | null>(null)

  // Refs for race condition prevention
  const sessionClearInProgressRef = useRef(false)
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionSecurityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setIsMFAVerified(false)
    setSecurityRequirements(null)
    setPendingMFAUserId(null)
    clearSessionFingerprint()
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
    if (sessionSecurityIntervalRef.current) {
      clearInterval(sessionSecurityIntervalRef.current)
      sessionSecurityIntervalRef.current = null
    }
  }, [])

  // ── Session security checks ─────────────────────────────────────────────
  const performSessionSecurityCheck = useCallback(async () => {
    if (!user) return
    
    try {
      // Validate session binding (IP/User-Agent) with timeout
      const validation = await Promise.race([
        validateSessionBinding(),
        new Promise<{valid: true; reason?: string}>((resolve) => 
          setTimeout(() => resolve({valid: true}), 2000)
        )
      ])
      
      if (!validation.valid) {
        log.warn('[Auth] Session binding validation failed:', validation.reason)
        
        await logSecurityEvent('session.binding_failed', {
          reason: validation.reason,
          userId: user.id,
        })
        
        // Clear session on binding failure
        sessionClearInProgressRef.current = true
        try {
          await clearLocalSession(`Session binding failed: ${validation.reason}`, resetLocalAuthState)
        } finally {
          sessionClearInProgressRef.current = false
        }
        return
      }
      
      // Enforce session limits (best effort, don't block)
      await Promise.race([
        enforceSessionLimit(user.id, 5),
        new Promise<void>((resolve) => setTimeout(resolve, 2000))
      ])
    } catch (err) {
      // Security check failed, but don't disrupt user experience
      log.warn('[Auth] Session security check failed (non-critical):', err)
    }
  }, [user, clearLocalSession, resetLocalAuthState])

  const performSecurityCheckRef = useRef(performSessionSecurityCheck)
  useEffect(() => {
    performSecurityCheckRef.current = performSessionSecurityCheck
  }, [performSessionSecurityCheck])

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
        log.warn('[Auth] Loading is taking unusually long (>10s). Waiting for Supabase to resolve or fail.')
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
        log.warn('[Auth] Error getting session:', getErrorMessage(error))
        finishLoading()
        return
      }
      if (session?.user) {
        if (shouldDeferAuthenticatedAppState()) {
          finishLoading()
          return
        }

        authRecoveryInProgressRef.current = false
        setUser(session.user)
        setRolesLoading(true)
        
        // Initialize session security (non-blocking)
        // These are security enhancements that shouldn't block auth loading
        void initializeSessionSecurity().catch((err) => {
          log.warn('[Auth] Session security init failed (non-critical):', err)
        })
        
        // Check security requirements (non-blocking with timeout)
        const checkRequirements = async () => {
          try {
            const requirements = await Promise.race([
              checkSecurityRequirements(session.user.id),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Security check timeout')), 12000)
              )
            ])
            if (requirements) setSecurityRequirements(requirements)
          } catch (err) {
            log.warn('[Auth] Security requirements check failed (non-critical):', err)
          }
        }
        void checkRequirements()
        
        finishLoading()
        loadUserData(session.user.id).catch(() => {
          log.warn('[Auth] Error in loadUserData.')
        })
      } else {
        finishLoading()
      }
    }).catch((error) => {
      log.warn('[Auth] Unexpected error in getSession:', getErrorMessage(error))
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
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        void analytics.identify(session.user.id).catch((error) => {
          log.warn('[Auth] Failed to initialize analytics identity:', error)
        })
        if (_event !== 'TOKEN_REFRESHED' || shouldRefreshUserData(session.user.id)) {
          finishLoading()
          
          // Initialize session security on sign in (non-blocking)
          if (_event === 'SIGNED_IN') {
            void initializeSessionSecurity().catch((err) => {
              log.warn('[Auth] Session security init failed (non-critical):', err)
            })
            
            // Check security requirements (non-blocking with timeout)
            const checkRequirements = async () => {
              try {
                const requirements = await Promise.race([
                  checkSecurityRequirements(session.user.id),
                  new Promise<null>((_, reject) => 
                    setTimeout(() => reject(new Error('Security check timeout')), 12000)
                  )
                ])
                if (requirements) setSecurityRequirements(requirements)
              } catch (err) {
                log.warn('[Auth] Security requirements check failed (non-critical):', err)
              }
            }
            void checkRequirements()
          }
          
          loadUserData(session.user.id).catch(() => {
            log.warn('[Auth] Error in loadUserData (auth change).')
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
        // Check session binding first (with timeout)
        if (user) {
          const validation = await Promise.race([
            validateSessionBinding(),
            new Promise<{valid: true; reason?: string}>((resolve) => 
              setTimeout(() => resolve({valid: true}), 2000)
            )
          ])
          if (!validation.valid) {
            log.warn('[Auth] Session binding check failed during resume:', validation.reason)
            
            await logSecurityEvent('session.binding_failed_on_resume', {
              reason: validation.reason,
            })
            
            sessionClearInProgressRef.current = true
            try {
              await clearLocalSession('Session binding failed on resume', resetLocalAuthState)
            } finally {
              sessionClearInProgressRef.current = false
              resumeValidationInFlightRef.current = false
            }
            return
          }
        }

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
            log.warn('[Auth] Session validation failed, attempting token refresh before logout:', errorMsg)
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
                  loadUserData(refreshData.session.user.id, true).catch(() => {
                    log.warn('[Auth] Background refresh error in loadUserData.')
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
            log.warn('[Auth] Network error during resume check, keeping session:', errorMsg)
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
          loadUserData(verifiedUser.id, true).catch(() => {
            log.warn('[Auth] Background refresh error during focus.')
          })
        }
      } catch (unexpectedError) {
        // Unexpected errors - don't auto-logout
        log.error('[Auth] Unexpected error in resume validation:', unexpectedError)
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
    
    // Start periodic session security checks
    sessionSecurityIntervalRef.current = setInterval(() => {
      void performSecurityCheckRef.current()
    }, CONFIG.sessionSecurityCheckIntervalMs)

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
  ]) // Removed 'user' and 'performSessionSecurityCheck' to prevent recursive observer loop

  // ── Sign in / sign out / refresh ───────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const normalizedEmail = email.toLowerCase().trim()
    
    // Rate limiting check
    const rateLimitKey = `auth:signin:${normalizedEmail}`
    if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.auth.maxRequests, rateLimitConfig.auth.windowMs)) {
      return { error: new Error('Too many sign-in attempts. Please try again later.') }
    }
    
    // Check brute force protection
    const bruteForceCheck = await recordLoginAttempt(normalizedEmail, false)
    if (!bruteForceCheck.allowed) {
      return { 
        error: new Error(bruteForceCheck.message || 'Account temporarily locked due to failed attempts.')
      }
    }
    
    // Check if CAPTCHA is required
    if (bruteForceCheck.captchaRequired && !captchaToken) {
      return { 
        error: new Error('CAPTCHA_REQUIRED'),
        requiresCaptcha: true,
      }
    }
    
    try {
      setLoading(true)
      setRolesLoading(true)
      
      // Check for password breach before attempting sign in (with timeout)
      void Promise.race([
        checkPasswordBreach(password),
        new Promise<{breached: false}>((resolve) => setTimeout(() => resolve({breached: false}), 2000))
      ]).then(async (breachCheck) => {
        if (breachCheck.breached) {
          await logSecurityEvent('password.breached_detected', {
            email: normalizedEmail,
            breachCount: breachCheck.count,
          })
        }
      }).catch(() => {
        // Ignore breach check errors
      })
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: normalizedEmail, 
        password,
        options: captchaToken ? { captchaToken } : undefined,
      })
      
      if (error) {
        // Record failed attempt
        await recordLoginAttempt(normalizedEmail, false)
        
        setLoading(false)
        setRolesLoading(false)
        
        // Check for specific error types
        if (error.message?.includes('Invalid login credentials')) {
          const remaining = getRemainingAttempts(normalizedEmail)
          if (remaining <= 2) {
            return { 
              error: new Error(`Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`)
            }
          }
        }
        
        return { error }
      }
      
      if (data.user) {
        // Record successful attempt (clears counters)
        await recordLoginAttempt(normalizedEmail, true)
        
        // Initialize session security (non-blocking)
        void initializeSessionSecurity().catch((err) => {
          log.warn('[Auth] Session security init failed (non-critical):', err)
        })
        
        // Check if MFA is required (with timeout)
        let requirements = null
        try {
          requirements = await Promise.race([
            checkSecurityRequirements(data.user.id),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Security check timeout')), 3000)
            )
          ])
          if (requirements) setSecurityRequirements(requirements)
        } catch (err) {
          log.warn('[Auth] Security requirements check failed (non-critical):', err)
          // Default to no MFA requirement if check fails
          requirements = { mfaRequired: false, mfaEnabled: false, setupComplete: true, passwordRotationRequired: false }
        }
        
        if (requirements.mfaRequired && !requirements.mfaEnabled) {
          // MFA is required but not set up
          setPendingMFAUserId(data.user.id)
          setUser(data.user)
          setLoading(false)
          return { error: null, requiresMFA: true, mfaUserId: data.user.id }
        }
        
        if (requirements.mfaEnabled) {
          // MFA is enabled - need to verify
          /* 
          // Prevent infinite redirect loop while UI is under development
          if (requirements.mfaRequired && !isMFAVerified) {
            // Redirect to MFA verify
            window.location.href = '/mfa/verify'
          } else if (!requirements.setupComplete) {
            // Redirect to mandatory setup
            window.location.href = '/security/setup'
          }
          */
          setPendingMFAUserId(data.user.id)
          setUser(data.user)
          setIsMFAVerified(false)
          setLoading(false)
          return { error: null, requiresMFA: true, mfaUserId: data.user.id }
        }
        
        setUser(data.user)
        setLoading(false)
        loadUserData(data.user.id).catch(() => {
          log.warn('[Auth] Error loading user data after sign in.')
        })
        
        // Log successful login
        await auditLog.login()
        await logSecurityEvent('login.success', { email: normalizedEmail })
      } else {
        setLoading(false)
      }
      
      return { error: null }
    } catch (error) {
      setLoading(false)
      setRolesLoading(false)
      return { error: error as Error }
    }
  }, [loadUserData])

  // ── MFA Verification ────────────────────────────────────────────────────
  const verifyMFA = useCallback(async (code: string): Promise<boolean> => {
    if (!pendingMFAUserId) return false
    
    try {
      const { data, error } = await supabase.rpc('verify_mfa_code', {
        p_user_id: pendingMFAUserId,
        p_code: code,
      })
      
      if (error || !data) {
        await logSecurityEvent('mfa.verification_failed', {
          userId: pendingMFAUserId,
        })
        return false
      }
      
      setIsMFAVerified(true)
      setPendingMFAUserId(null)
      
      // Load user data after MFA verification
      loadUserData(pendingMFAUserId).catch(() => {
        log.warn('[Auth] Error loading user data after MFA verification.')
      })
      
      await auditLog.login()
      await logSecurityEvent('login.success_with_mfa', { userId: pendingMFAUserId })
      
      return true
    } catch {
      return false
    }
  }, [pendingMFAUserId, loadUserData])

  const signOut = useCallback(async () => {
    localStorage.removeItem('prime_current_property_id')
    
    await logSecurityEvent('logout.user_initiated', {
      userId: user?.id,
    })
    
    recordAuthEvent({
      type: 'logout',
      success: true,
      details: { reason: 'user_initiated' },
    })
    
    await clearLocalSession('User signed out', resetLocalAuthState)
  }, [clearLocalSession, resetLocalAuthState, user?.id])

  const refreshSession = useCallback(async () => {
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
        } else {
          log.warn('[Auth] Token refresh failed due to transient error, keeping session:', getErrorMessage(error))
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
      log.error('[Auth] Unexpected error in refreshSession:', error)
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
  }, [clearLocalSession, loadUserData, resetLocalAuthState])

  // ── Derived: primary role ──────────────────────────────────────────────
  const primaryRole = useMemo(() => {
    if (roles.length === 0) return null
    return [...roles].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])[0]?.role || null
  }, [roles])

  // ── Memoized context value ─────────────────────────────────────────────
  const contextValue = useMemo(() => ({
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
    verifyMFA,
    isMFAVerified,
    securityRequirements,
  }), [
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
    verifyMFA,
    isMFAVerified,
    securityRequirements,
  ])

  // ── Debug: expose health report to window in development ───────────────
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as Record<string, unknown>).reportAuthHealth = reportAuthHealth
    }
  }, [])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth hook is in @/hooks/useAuth to resolve circular dependencies
