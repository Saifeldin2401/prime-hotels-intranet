import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

// Safe fallback for HMR scenarios where components re-mount outside the provider tree
const hmrFallback = {
    user: null,
    profile: null,
    roles: [] as any[],
    properties: [] as any[],
    departments: [] as any[],
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
            return hmrFallback as any
        }
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

