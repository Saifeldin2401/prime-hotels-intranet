/**
 * AuthContext - Backward-compatible wrapper for the 4 focused auth contexts
 * 
 * This file is kept for backward compatibility. The actual implementation
 * has been split into 4 focused contexts:
 * 
 * 1. AuthIdentityContext - Core auth state (user, loading)
 * 2. AuthSecurityContext - Security features (MFA, session binding, requirements)
 * 3. UserDataContext - User profile data (profile, roles, properties, departments)
 * 4. AuthActionsContext - Actions with stable reference (signIn, signOut, refreshSession, verifyMFA)
 * 
 * For optimal performance, use the individual hooks from '@/contexts/auth':
 *   - useAuthIdentity() - when you only need user/loading
 *   - useAuthSecurity() - when you only need MFA/security state
 *   - useUserData() - when you only need profile/roles/properties/departments
 *   - useAuthActions() - when you only need to call actions (NEVER causes re-render!)
 */

import type { AppRole } from '@/lib/constants'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useMemo } from 'react'
import {
  AuthIdentityProvider,
  AuthSecurityProvider,
  UserDataProvider,
  AuthActionsProvider,
  useAuthIdentity,
  useAuthSecurity,
  useUserData,
  useAuthActions,
} from './auth'

// ─── Backward-compatible Context Type ────────────────────────────────────────
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
  pendingMFAUserId: string | null
  securityRequirements: {
    mfaRequired: boolean
    mfaEnabled: boolean
    passwordRotationRequired: boolean
    setupComplete: boolean
  } | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Internal Provider that composes all contexts ────────────────────────────
function AuthProviderInternal({ children }: { children: ReactNode }) {
  // Get state from individual contexts
  const { user, loading } = useAuthIdentity()
  const { isMFAVerified, pendingMFAUserId, securityRequirements } = useAuthSecurity()
  const { profile, roles, properties, departments, rolesLoading, primaryRole } = useUserData()
  const { signIn, signOut, refreshSession, verifyMFA } = useAuthActions()

  // ── Memoized context value (backward compatible) ───────────────────────────
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
    pendingMFAUserId,
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
    pendingMFAUserId,
    securityRequirements,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Public Provider that composes all 4 contexts ────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthIdentityProvider>
      <AuthSecurityProvider>
        <UserDataProvider>
          <AuthActionsProvider>
            <AuthProviderInternal>
              {children}
            </AuthProviderInternal>
          </AuthActionsProvider>
        </UserDataProvider>
      </AuthSecurityProvider>
    </AuthIdentityProvider>
  )
}

// Re-export individual hooks for direct access
export { useAuthIdentity, useAuthSecurity, useUserData, useAuthActions }

// Re-export context types
export type { AuthIdentityContextType } from './auth/AuthIdentityContext'
export type { AuthSecurityContextType, SecurityRequirements } from './auth/AuthSecurityContext'
export type { UserDataContextType } from './auth/UserDataContext'
export type { AuthActionsContextType, SignInResult } from './auth/AuthActionsContext'
