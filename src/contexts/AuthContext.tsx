import type { AppRole } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import { analytics } from '@/services/analyticsService'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthSession } from './auth/useAuthSession'
import { useUserDataLoader } from './auth/useUserDataLoader'

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

// ─── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)

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

  // ── Initial session + auth state listener ──────────────────────────────
  useEffect(() => {
    let mounted = true
    let loadingState = true

    const timeoutId = setTimeout(() => {
      if (mounted && loadingState) {
        console.warn('Loading timeout - forcing loading to false after 5 seconds')
        setLoading(false)
        loadingState = false
      }
    }, 5000)

    const finishLoading = () => {
      loadingState = false
      setLoading(false)
      clearTimeout(timeoutId)
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return
      if (error) {
        console.warn('Error getting session.')
        finishLoading()
        return
      }
      if (session?.user) {
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        setRolesLoading(true)
        finishLoading()
        loadUserData(session.user.id).catch(() => {
          console.warn('Error in loadUserData.')
        })
      } else {
        finishLoading()
      }
    }).catch(() => {
      console.warn('Unexpected error in getSession.')
      if (mounted) finishLoading()
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      // PASSWORD_RECOVERY events: let the user stay on /reset-password
      if (_event === 'PASSWORD_RECOVERY') {
        if (session?.user) setUser(session.user)
        finishLoading()
        return
      }

      if (session?.user) {
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        void analytics.identify(session.user.id).catch((error) => {
          console.warn('Failed to initialize analytics identity:', error)
        })
        if (_event !== 'TOKEN_REFRESHED' || shouldRefreshUserData(session.user.id)) {
          finishLoading()
          loadUserData(session.user.id).catch(() => {
            console.warn('Error in loadUserData (auth change).')
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
    const verifySessionOnResume = async () => {
      if (!mounted || document.visibilityState === 'hidden') return
      if (resumeValidationInFlightRef.current) return
      const now = Date.now()
      if (now - lastResumeValidationAtRef.current < 2000) return

      resumeValidationInFlightRef.current = true
      lastResumeValidationAtRef.current = now
      try {
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
        if (!mounted) return
        if (error || !verifiedUser) {
          if (isAuthError(error) || !verifiedUser) {
            await clearLocalSession('Session is no longer valid after tab resume', resetLocalAuthState)
            finishLoading()
            return
          }
          finishLoading()
          return
        }
        authRecoveryInProgressRef.current = false
        setUser((current) => (current?.id === verifiedUser.id ? current : verifiedUser))
        if (shouldRefreshUserData(verifiedUser.id)) {
          loadUserData(verifiedUser.id).catch(() => {
            console.warn('Error in loadUserData (resume validation).')
          })
        }
      } finally {
        resumeValidationInFlightRef.current = false
      }
    }

    window.addEventListener('focus', () => void verifySessionOnResume())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void verifySessionOnResume()
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      window.removeEventListener('focus', () => void verifySessionOnResume())
      document.removeEventListener('visibilitychange', () => void verifySessionOnResume())
    }
  }, [
    clearLocalSession, loadUserData, resetLocalAuthState, shouldRefreshUserData,
    isAuthError, authRecoveryInProgressRef, resumeValidationInFlightRef, lastResumeValidationAtRef,
  ])

  // ── Sign in / sign out / refresh ───────────────────────────────────────
  const signIn = async (email: string, password: string) => {
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
          console.warn('Error loading user data after sign in.')
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
    await clearLocalSession('User signed out', resetLocalAuthState)
  }

  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error || !session?.user) {
      await clearLocalSession('Session refresh failed', resetLocalAuthState)
      return
    }
    authRecoveryInProgressRef.current = false
    setUser(session.user)
    setRolesLoading(true)
    await loadUserData(session.user.id)
  }

  // ── Derived: primary role ──────────────────────────────────────────────
  const primaryRole = roles.length > 0
    ? [...roles].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])[0]?.role || null
    : null

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
