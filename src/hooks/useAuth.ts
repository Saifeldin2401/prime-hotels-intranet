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
} as const

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        if (import.meta.hot) {
            // During HMR, components may temporarily mount outside the provider tree
            console.debug('useAuth: AuthProvider not found (HMR), using fallback')
            return hmrFallback
        }
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

