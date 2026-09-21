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
  AuthIdentityProvider,
  useAuthIdentity 
} from './AuthIdentityContext'

export { 
  AuthSecurityProvider,
  useAuthSecurity 
} from './AuthSecurityContext'

export { 
  UserDataProvider,
  useUserData 
} from './UserDataContext'

export {
  AuthActionsProvider,
  useAuthActions
} from './AuthActionsContext'

export {
  AccountProvider
} from './AccountContext'

// Types
