import type { AuthContextType } from '@/contexts/AuthContext'
import { AuthContext } from '@/contexts/AuthContext'
import { useContext } from 'react'

// Safe fallback for HMR scenarios where components re-mount outside the provider tree
const hmrFallback: AuthContextType = {
    user: null,
    profile: null,
    roles: [],
    properties: [],
    departments: [],
    primaryRole: null,
    loading: true,
    rolesLoading: true,
    signIn: async () => ({ error: new Error('AuthProvider not mounted') }),
    signOut: async () => {},
    refreshSession: async () => {},
    securityRequirements: null,
} as const

/**
 * useAuth - Backward-compatible hook that returns combined auth state
 * 
 * This hook provides the same interface as before the refactor.
 * For optimal performance, consider using the individual hooks:
 *   - useAuthIdentity() - user, loading state only
 *   - useAuthSecurity() - MFA, security requirements only  
 *   - useUserData() - profile, roles, properties, departments only
 *   - useAuthActions() - actions only (stable reference, never causes re-render!)
 * 
 * @example
 * // Before (still works but causes re-renders on any auth change)
 * const { user, profile, signIn } = useAuth()
 * 
 * // After (optimal - only re-renders when user changes)
 * const { user } = useAuthIdentity()
 * const { signIn } = useAuthActions() // Never causes re-render!
 */
export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        if (import.meta.hot) {
            // During HMR, components may temporarily mount outside the provider tree
            return hmrFallback
        }
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
