/**
 * AuthActionsContext - Authentication actions
 * 
 * This context provides:
 * - signIn, signOut methods
 * - refreshSession
 * - verifyMFA
 * 
 * IMPORTANT: This context's value reference NEVER changes (stable reference).
 * All state is accessed via refs or setters from other contexts.
 */

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { analytics } from '@/services/analyticsService'
import { auditLog } from '@/lib/auditLog'
import { classifyAuthError, getErrorMessage } from '@/lib/authErrorUtils'
import { recordAuthEvent } from '@/lib/authMonitor'
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware'
import {
  getAccountLockoutStatus,
  recordLoginAttempt,
  initializeSessionSecurity,
  checkPasswordBreach,
  checkSecurityRequirements,
  logSecurityEvent,
  getRemainingAttempts,
} from '@/lib/authSecurityService'
import { AuthIdentityContext } from './AuthIdentityContext'
import { AuthSecurityContext } from './AuthSecurityContext'
import { UserDataContext } from './UserDataContext'
import { useAuthSession } from './useAuthSession'
import { REMEMBER_ME_KEY } from '@/hooks/useInactivityTimeout'

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

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SignInResult {
  error: Error | null
  requiresCaptcha?: boolean
}

export interface AuthActionsContextType {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined)

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuthActions() {
  const context = useContext(AuthActionsContext)
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthActionsProvider')
  }
  return context
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthActionsProvider({ children }: { children: ReactNode }) {
  const identityContext = useContext(AuthIdentityContext)
  const securityContext = useContext(AuthSecurityContext)
  const userDataContext = useContext(UserDataContext)
  
  const { clearLocalSession } = useAuthSession()

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string, captchaToken?: string): Promise<SignInResult> => {
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limiting check
    const rateLimitKey = `auth:signin:${normalizedEmail}`
    if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.auth.maxRequests, rateLimitConfig.auth.windowMs)) {
      return { error: new Error('Too many sign-in attempts. Please try again later.') }
    }

    const lockoutStatus = await getAccountLockoutStatus(normalizedEmail)
    if (lockoutStatus.isLocked && lockoutStatus.lockedUntil) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((lockoutStatus.lockedUntil.getTime() - Date.now()) / 60000),
      )

      return {
        error: new Error(`Account temporarily locked. Please try again in ${remainingMinutes} minutes.`),
      }
    }

    // CAPTCHA check removed as requested


    try {
      identityContext?.setLoading(true)
      userDataContext?.setRolesLoading(true)

      // Kick off the password breach check in parallel with sign-in (with timeout), but don't
      // act on it yet -- logSecurityEvent requires an authenticated session, and this promise
      // can resolve before signInWithPassword below establishes one. We only log the result
      // once sign-in has actually succeeded (see below).
      const breachCheckPromise = Promise.race([
        checkPasswordBreach(password),
        new Promise<{ breached: false }>((resolve) => setTimeout(() => resolve({ breached: false }), 2000))
      ]).catch(() => ({ breached: false as const }))

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      })

      if (error) {
        // Record failed attempt
        await recordLoginAttempt(normalizedEmail, false)
        identityContext?.setLoading(false)
        userDataContext?.setRolesLoading(false)

        // Check for specific error types
        if (error.message?.includes('Invalid login credentials')) {
          const remaining = await getRemainingAttempts(normalizedEmail)
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
          log.warn('[AuthActions] Session security init failed (non-critical):', err)
        })

        // Check if MFA is required
        let requirements = null
        try {
          requirements = await checkSecurityRequirements(data.user.id)
          if (requirements) securityContext?.setSecurityRequirements(requirements)
        } catch (err) {
          log.warn('[AuthActions] Security requirements check failed (non-critical):', err)
          requirements = { setupComplete: true, passwordRotationRequired: false }
        }

        identityContext?.setUser(data.user)
        identityContext?.setLoading(false)
        
        // Load user data after successful sign-in
        if (userDataContext) {
          userDataContext.loadUserData(data.user.id).catch(() => {
            log.warn('[AuthActions] Error loading user data after sign in.')
          })
        }

        // Log successful login
        await auditLog.login()
        await logSecurityEvent('login.success', { email: normalizedEmail })
        await analytics.identify(data.user.id).catch((error) => {
          log.warn('[AuthActions] Failed to initialize analytics identity:', error)
        })

        // Now that a session exists, act on the breach check kicked off above
        void breachCheckPromise.then(async (breachCheck) => {
          if ('breached' in breachCheck && breachCheck.breached) {
            await logSecurityEvent('password.breached_detected', {
              email: normalizedEmail,
              breachCount: (breachCheck as { count?: number }).count,
            })
          }
        })
      } else {
        identityContext?.setLoading(false)
      }

      return { error: null }
    } catch (error) {
      identityContext?.setLoading(false)
      userDataContext?.setRolesLoading(false)
      return { error: error as Error }
    }
  }, [identityContext, securityContext, userDataContext])


  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    localStorage.removeItem('altus_current_property_id')
    localStorage.removeItem('altus_last_activity')
    localStorage.removeItem(REMEMBER_ME_KEY)

    await logSecurityEvent('logout.user_initiated', {
      userId: identityContext?.user?.id,
    })

    recordAuthEvent({
      type: 'logout',
      success: true,
      details: { reason: 'user_initiated' },
    })

    await clearLocalSession('User signed out', () => {
      identityContext?.setUser(null)
      userDataContext?.resetUserData()
      securityContext?.resetSecurityState()
    })
  }, [clearLocalSession, identityContext, userDataContext, securityContext])

  // ── Refresh Session ───────────────────────────────────────────────────────
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
          await clearLocalSession('Session refresh failed - token expired', () => {
            identityContext?.setUser(null)
            userDataContext?.resetUserData()
            securityContext?.resetSecurityState()
          })
        } else {
          log.warn('[AuthActions] Token refresh failed due to transient error, keeping session:', getErrorMessage(error))
        }
        return
      }
      recordAuthEvent({
        type: 'token_refresh',
        success: true,
        details: { userId: session.user.id },
      })
      identityContext?.setUser(session.user)
      if (userDataContext) {
        await userDataContext.loadUserData(session.user.id)
      }
    } catch (error) {
      const classification = classifyAuthError(error)
      log.error('[AuthActions] Unexpected error in refreshSession:', error)
      recordAuthEvent({
        type: 'token_refresh',
        success: false,
        error: getErrorMessage(error),
        details: { unexpected: true, errorType: classification.type },
      })
      // Don't logout on unexpected/network errors during refresh
      if (classification.shouldLogout) {
        await clearLocalSession('Session refresh failed - auth error', () => {
          identityContext?.setUser(null)
          userDataContext?.resetUserData()
          securityContext?.resetSecurityState()
        })
      }
    }
  }, [clearLocalSession, identityContext, userDataContext, securityContext])

  const value = useMemo(() => ({
    signIn,
    signOut,
    refreshSession,
  }), [signIn, signOut, refreshSession])

  return (
    <AuthActionsContext.Provider value={value}>
      {children}
    </AuthActionsContext.Provider>
  )
}
