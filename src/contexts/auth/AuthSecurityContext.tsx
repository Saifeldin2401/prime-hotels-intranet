/**
 * AuthSecurityContext - Security features
 * 
 * This context handles:
 * - MFA state (isMFAVerified, pendingMFAUserId)
 * - Security requirements (MFA required, password rotation, etc.)
 * - Session fingerprinting and validation
 * - Brute force protection state
 * - Periodic security checks
 */

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  validateSessionBinding,
  checkSecurityRequirements,
  initializeSessionSecurity,
  clearSessionFingerprint,
  enforceSessionLimit,
  logSecurityEvent,
} from '@/lib/authSecurityService'
import { AuthIdentityContext } from './AuthIdentityContext'

// ─── Logger helper ───────────────────────────────────────────────────────────
const log = {
  warn: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(message, ...args)
    }
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SecurityRequirements {
  passwordRotationRequired: boolean
  setupComplete: boolean
}

export interface AuthSecurityContextType {
  securityRequirements: SecurityRequirements | null
  setSecurityRequirements: (requirements: SecurityRequirements | null) => void
  resetSecurityState: () => void
}

export const AuthSecurityContext = createContext<AuthSecurityContextType | undefined>(undefined)

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuthSecurity() {
  const context = useContext(AuthSecurityContext)
  if (context === undefined) {
    throw new Error('useAuthSecurity must be used within an AuthSecurityProvider')
  }
  return context
}

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  sessionSecurityCheckIntervalMs: 300000, // 5 minutes — reduced to save disk I/O
} as const

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthSecurityProvider({ children }: { children: ReactNode }) {
  const identityContext = useContext(AuthIdentityContext)
  const userId = identityContext?.user?.id
  const setUser = identityContext?.setUser

  const [securityRequirements, setSecurityRequirements] = useState<SecurityRequirements | null>(null)

  const sessionSecurityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetSecurityState = useCallback(() => {
    setSecurityRequirements(null)
    clearSessionFingerprint()
  }, [])

  // ── Check security requirements when user changes ─────────────────────────
  useEffect(() => {
    if (!userId) {
      resetSecurityState()
      return
    }

    // Check security requirements (non-blocking)
    const checkRequirements = async () => {
      try {
        const requirements = await checkSecurityRequirements(userId)
        if (requirements) setSecurityRequirements(requirements as SecurityRequirements)
      } catch (err) {
        log.warn('[AuthSecurity] Security requirements check failed (non-critical):', err)
      }
    }
    void checkRequirements()

    // Initialize session security (non-blocking)
    void initializeSessionSecurity().catch((err) => {
      log.warn('[AuthSecurity] Session security init failed (non-critical):', err)
    })
  }, [userId, resetSecurityState])

  // ── Session security checks ───────────────────────────────────────────────
  const performSessionSecurityCheck = useCallback(async () => {
    if (!userId || !setUser) return

    try {
      // Validate session binding (IP/User-Agent) with timeout
      const validation = await Promise.race([
        validateSessionBinding(),
        new Promise<{ valid: true; reason?: string }>((resolve) =>
          setTimeout(() => resolve({ valid: true }), 2000)
        )
      ])

      if (!validation.valid) {
        log.warn('[AuthSecurity] Session binding validation failed:', validation.reason)

        await logSecurityEvent('session.binding_failed', {
          reason: validation.reason,
          userId: userId,
        })

        // Clear session on binding failure
        await clearSessionFingerprint()
        setUser(null)
        return
      }

      // Enforce session limits (best effort, don't block)
      await Promise.race([
        enforceSessionLimit(userId, 5),
        new Promise<void>((resolve) => setTimeout(resolve, 2000))
      ])
    } catch (err) {
      log.warn('[AuthSecurity] Session security check failed (non-critical):', err)
    }
  }, [userId, setUser])

  const performSecurityCheckRef = useRef(performSessionSecurityCheck)
  useEffect(() => {
    performSecurityCheckRef.current = performSessionSecurityCheck
  }, [performSessionSecurityCheck])

  // ── Periodic security checks ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    sessionSecurityIntervalRef.current = setInterval(() => {
      // Skip security checks when tab is not visible to reduce disk I/O
      if (document.visibilityState !== 'visible') return
      void performSecurityCheckRef.current()
    }, CONFIG.sessionSecurityCheckIntervalMs)

    return () => {
      if (sessionSecurityIntervalRef.current) {
        clearInterval(sessionSecurityIntervalRef.current)
        sessionSecurityIntervalRef.current = null
      }
    }
  }, [userId])

  const value = useMemo(() => ({
    securityRequirements,
    setSecurityRequirements,
    resetSecurityState,
  }), [securityRequirements, resetSecurityState])

  return (
    <AuthSecurityContext.Provider value={value}>
      {children}
    </AuthSecurityContext.Provider>
  )
}
