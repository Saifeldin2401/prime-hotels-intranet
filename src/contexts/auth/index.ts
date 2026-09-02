/**
 * Auth Contexts - Barrel Export
 * 
 * This module exports 4 focused auth contexts that replace the monolithic AuthContext:
 * 
 * 1. AuthIdentityContext - Core auth state (user, loading)
 * 2. AuthSecurityContext - Security features (MFA, session binding, requirements)
 * 3. UserDataContext - User profile data (profile, roles, properties, departments)
 * 4. AuthActionsContext - Actions with stable reference (signIn, signOut, refreshSession, verifyMFA)
 * 
 * For backward compatibility, useAuth() still returns a combined object.
 * For optimal performance, use the individual hooks:
 *   - useAuthIdentity() - when you only need user/loading
 *   - useAuthSecurity() - when you only need MFA/security state
 *   - useUserData() - when you only need profile/roles/properties/departments
 *   - useAuthActions() - when you only need to call actions (NEVER causes re-render!)
 */

// Contexts & Providers
export { 
  AuthIdentityContext, 
  AuthIdentityProvider,
  useAuthIdentity 
} from './AuthIdentityContext'

export { 
  AuthSecurityContext, 
  AuthSecurityProvider,
  useAuthSecurity 
} from './AuthSecurityContext'

export { 
  UserDataContext,
  UserDataProvider,
  useUserData 
} from './UserDataContext'

export {
  AuthActionsContext,
  AuthActionsProvider,
  useAuthActions
} from './AuthActionsContext'

export {
  AccountContext,
  AccountProvider,
  useAccountContext
} from './AccountContext'
export type { AccountContextValue } from './AccountContext'

// Types
export type { AuthIdentityContextType } from './AuthIdentityContext'
export type { AuthSecurityContextType, SecurityRequirements } from './AuthSecurityContext'
export type { UserDataContextType } from './UserDataContext'
export type { AuthActionsContextType, SignInResult } from './AuthActionsContext'
