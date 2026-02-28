import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { analytics } from '@/services/analyticsService'
import type { Profile, UserRole, Property, Department } from '@/lib/types'
import type { AppRole } from '@/lib/constants'

interface AuthContextType {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const loadSeqRef = useRef(0)
  const activeUserIdRef = useRef<string | null>(null)
  const lastUserDataRefreshRef = useRef<number>(0)
  const profileRef = useRef<Profile | null>(null)
  const rolesRef = useRef<UserRole[]>([])
  const authRecoveryInProgressRef = useRef(false)
  const resumeValidationInFlightRef = useRef(false)
  const lastResumeValidationAtRef = useRef(0)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  const isAuthError = useCallback((error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const candidate = error as { code?: string | number; status?: number }
    const code = String(candidate.code ?? '')
    const status = Number(candidate.status ?? 0)
    return (
      status === 401 ||
      code === '401' ||
      code === 'PGRST301' ||
      code === 'PGRST302' ||
      code.toUpperCase().includes('JWT')
    )
  }, [])

  const resetLocalAuthState = useCallback(() => {
    setUser(null)
    setProfile(null)
    setRoles([])
    setProperties([])
    setDepartments([])
    setRolesLoading(false)
    activeUserIdRef.current = null
    lastUserDataRefreshRef.current = 0
    loadSeqRef.current += 1
  }, [])

  const clearLocalSession = useCallback(async (reason: string) => {
    if (authRecoveryInProgressRef.current) return
    authRecoveryInProgressRef.current = true
    try {
      console.warn(`[Auth] ${reason}. Clearing local session.`)
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      console.warn('Failed to clear local auth session:', error)
    } finally {
      resetLocalAuthState()
      authRecoveryInProgressRef.current = false
    }
  }, [resetLocalAuthState])

  const shouldRefreshUserData = useCallback((userId: string) => {
    if (activeUserIdRef.current !== userId) return true
    if (!profileRef.current || rolesRef.current.length === 0) return true
    if (!lastUserDataRefreshRef.current) return true
    return Date.now() - lastUserDataRefreshRef.current > 5 * 60 * 1000
  }, [])

  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, label: string) => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      promise
        .then((value) => {
          clearTimeout(timer)
          resolve(value)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }, [])

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const loadId = ++loadSeqRef.current
      activeUserIdRef.current = userId
      setRolesLoading(true)

      // Load profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)

      const { data: profileRows, error: profileError } = await withTimeout(
        profilePromise as any,
        10000,
        'Profile load'
      ) as any
      const profileData = Array.isArray(profileRows) ? profileRows[0] ?? null : null

      if (profileError) {
        if (isAuthError(profileError)) {
          await clearLocalSession('Profile request returned auth/session error')
          return
        }
        console.error('Error loading profile:', profileError)

        // Try alternative: use auth.users metadata
        const { data: { user } } = await supabase.auth.getUser()
        if (activeUserIdRef.current !== userId || loadId !== loadSeqRef.current) {
          return
        }
        if (user) {
          // Set basic profile from auth user
          const fullProfile: Profile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            phone: user.user_metadata?.phone || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            hire_date: null,
            date_of_birth: null,
            job_title: null,
            staff_id: null,
            reporting_to: null,
            is_active: true,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            nationality: null,
            blood_group: null,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          }
          setProfile(fullProfile)
        }
      } else if (profileData) {
        if (activeUserIdRef.current !== userId || loadId !== loadSeqRef.current) {
          return
        }
        setProfile(profileData)
      } else {
        // No profile row yet (e.g. during first-time auth propagation).
        // Fall back to auth user metadata without logging as an error.
        const { data: { user } } = await supabase.auth.getUser()
        if (activeUserIdRef.current !== userId || loadId !== loadSeqRef.current) {
          return
        }
        if (user) {
          const fullProfile: Profile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            phone: user.user_metadata?.phone || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            hire_date: null,
            date_of_birth: null,
            job_title: null,
            staff_id: null,
            reporting_to: null,
            is_active: true,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            nationality: null,
            blood_group: null,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          }
          setProfile(fullProfile)
        }
      }

      // Load all other data in parallel with individual timeouts
      const rolesPromise = supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)

      const propertiesPromise = supabase
        .from('user_properties')
        .select('property_id, properties(*)')
        .eq('user_id', userId)

      const departmentsPromise = supabase
        .from('user_departments')
        .select('department_id, departments(*)')
        .eq('user_id', userId)

      // Load all data with individual timeouts
      const [rolesResult, propertiesResult, departmentsResult] = await Promise.allSettled([
        withTimeout(rolesPromise as any, 10000, 'Roles load'),
        withTimeout(propertiesPromise as any, 10000, 'Properties load'),
        withTimeout(departmentsPromise as any, 10000, 'Departments load')
      ]) as [PromiseSettledResult<{ data?: any; error?: any }>, PromiseSettledResult<{ data?: any; error?: any }>, PromiseSettledResult<{ data?: any; error?: any }>]

      if (activeUserIdRef.current !== userId || loadId !== loadSeqRef.current) {
        return
      }

      // Handle roles
      if (rolesResult.status === 'fulfilled') {
        const { data: directRoles, error: rolesError } = rolesResult.value
        if (rolesError) {
          if (isAuthError(rolesError)) {
            await clearLocalSession('Roles request returned auth/session error')
            return
          }
          console.error('Error loading roles:', rolesError)
          console.error('Roles error code:', rolesError.code)
          console.error('Roles error message:', rolesError.message)
          console.error('Roles error details:', rolesError.details)
          setRolesLoading(false) // Mark as done even on error
        } else {
          const rolesData = directRoles || []
          setRoles(rolesData) // Set even if empty - means user has no roles
          setRolesLoading(false)
        }
      } else {
        console.error('Roles loading failed or timed out:', rolesResult.reason)
        setRolesLoading(false) // Mark as done even on timeout
      }

      // Handle properties
      if (propertiesResult.status === 'fulfilled') {
        const { data: directProps, error: propertiesError } = propertiesResult.value
        if (propertiesError) {
          if (isAuthError(propertiesError)) {
            await clearLocalSession('Properties request returned auth/session error')
            return
          }
          console.error('Error loading properties:', propertiesError)
          console.error('Properties error code:', propertiesError.code)
          console.error('Properties error message:', propertiesError.message)
        } else {
          const props = directProps?.map((up: any) => up.properties).filter(Boolean) || []
          setProperties(props)

        }
      } else {
        console.error('Properties loading failed or timed out:', propertiesResult.reason)
      }

      // Handle departments
      if (departmentsResult.status === 'fulfilled') {
        const { data: directDepts, error: departmentsError } = departmentsResult.value
        if (departmentsError) {
          if (isAuthError(departmentsError)) {
            await clearLocalSession('Departments request returned auth/session error')
            return
          }
          console.error('Error loading departments:', departmentsError)
          console.error('Departments error code:', departmentsError.code)
          console.error('Departments error message:', departmentsError.message)
        } else {
          const depts = directDepts?.map((ud: any) => ud.departments).filter(Boolean) || []
          setDepartments(depts)

        }
      } else {
        console.error('Departments loading failed or timed out:', departmentsResult.reason)
      }

      lastUserDataRefreshRef.current = Date.now()
    } catch (error) {
      if (isAuthError(error)) {
        await clearLocalSession('User data load failed due to auth/session error')
        return
      }
      console.error('Unexpected error loading user data:', error)
    }
  }, [clearLocalSession, isAuthError, withTimeout])

  useEffect(() => {
    let mounted = true
    let loadingState = true



    // Safety timeout - ensure loading never stays true forever
    const timeoutId = setTimeout(() => {
      if (mounted && loadingState) {
        console.warn('Loading timeout - forcing loading to false after 5 seconds')
        setLoading(false)
        loadingState = false
      }
    }, 5000) // 5 second timeout for slow networks

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return

      if (error) {
        console.error('Error getting session:', error)
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
        return
      }

      if (session?.user) {
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        setRolesLoading(true)
        // Set loading to false immediately, load data in background
        loadingState = false
        setLoading(false)

        clearTimeout(timeoutId)
        // Load user data asynchronously without blocking
        loadUserData(session.user.id).catch((err) => {
          console.error('Error in loadUserData:', err)
        })
      } else {
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
      }
    }).catch((error) => {
      console.error('Unexpected error in getSession:', error)
      if (mounted) {
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        authRecoveryInProgressRef.current = false
        setUser(session.user)
        void analytics.identify(session.user.id).catch((error) => {
          console.warn('Failed to initialize analytics identity:', error)
        })
        // Only refresh user data when user changes or cache is stale
        if (_event !== 'TOKEN_REFRESHED' || shouldRefreshUserData(session.user.id)) {
          // Set loading to false immediately, load data in background
          loadingState = false
          setLoading(false)
          clearTimeout(timeoutId)
          loadUserData(session.user.id).catch((err) => {
            console.error('Error in loadUserData (auth change):', err)
          })
        } else {
          loadingState = false
          setLoading(false)
          clearTimeout(timeoutId)
        }
      } else {
        resetLocalAuthState()
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
      }
    })

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
          await clearLocalSession('Session is no longer valid after tab resume')
          loadingState = false
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }

        authRecoveryInProgressRef.current = false
        setUser((current) => (current?.id === verifiedUser.id ? current : verifiedUser))
        if (shouldRefreshUserData(verifiedUser.id)) {
          loadUserData(verifiedUser.id).catch((err) => {
            console.error('Error in loadUserData (resume validation):', err)
          })
        }
      } finally {
        resumeValidationInFlightRef.current = false
      }
    }

    const handleWindowFocus = () => {
      void verifySessionOnResume()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifySessionOnResume()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearLocalSession, loadUserData, resetLocalAuthState, shouldRefreshUserData])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setRolesLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        setRolesLoading(false) // FIX: Reset roles loading on error to prevent infinite loop
        return { error }
      }

      if (data.user) {
        setUser(data.user)
        // Set loading to false immediately after auth succeeds
        // Load user data in background (non-blocking)
        setLoading(false)
        // Load user data asynchronously without blocking
        loadUserData(data.user.id).catch((err) => {
          console.error('Error loading user data after sign in:', err)
          // Don't set loading to true again - app should continue
        })
      } else {
        setLoading(false)
      }

      return { error: null }
    } catch (error) {
      setLoading(false)
      setRolesLoading(false) // FIX: Reset roles loading on unexpected error
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    // Clear local property context to prevent confusion for next user
    localStorage.removeItem('prime_current_property_id')
    await clearLocalSession('User signed out')
  }

  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error || !session?.user) {
      await clearLocalSession('Session refresh failed')
      return
    }
    if (session?.user) {
      authRecoveryInProgressRef.current = false
      setUser(session.user)
      setRolesLoading(true)
      await loadUserData(session.user.id)
    }
  }

  const primaryRole = roles.length > 0
    ? [...roles].sort((a, b) => {
      const order: Record<AppRole, number> = {
        corporate_admin: 1,
        regional_admin: 2,
        regional_hr: 3,
        property_manager: 4,
        property_hr: 5,
        department_head: 6,
        manager: 7,
        staff: 8,
      }
      return order[a.role] - order[b.role]
    })[0]?.role || null
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

// useAuth hook moved to @/hooks/useAuth to resolve circular dependencies
