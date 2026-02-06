import { createContext, useContext, useEffect, useRef, useState } from 'react'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const loadSeqRef = useRef(0)
  const activeUserIdRef = useRef<string | null>(null)

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) => {
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
  }

  const loadUserData = async (userId: string) => {
    try {
      const loadId = ++loadSeqRef.current
      activeUserIdRef.current = userId
      setRolesLoading(true)

      // Load profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: profileData, error: profileError } = await withTimeout(
        profilePromise as any,
        10000,
        'Profile load'
      ) as any

      if (profileError) {
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
            job_title: null,
            staff_id: null,
            reporting_to: null,
            is_active: true,
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

    } catch (error) {
      console.error('Unexpected error loading user data:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    let loadingState = true



    // Safety timeout - ensure loading never stays true forever (reduced to 2 seconds)
    const timeoutId = setTimeout(() => {
      if (mounted && loadingState) {
        console.warn('Loading timeout - forcing loading to false after 2 seconds')
        setLoading(false)
        loadingState = false
      }
    }, 2000) // 2 second timeout

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
        setUser(session.user)
        analytics.identify(session.user.id)
        setRolesLoading(true)
        // Set loading to false immediately, load data in background
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
        // Load user data asynchronously without blocking
        loadUserData(session.user.id).catch((err) => {
          console.error('Error in loadUserData (auth change):', err)
        })
      } else {
        setUser(null)
        setProfile(null)
        setRoles([])
        setProperties([])
        setDepartments([])
        setRolesLoading(false)
        activeUserIdRef.current = null
        loadSeqRef.current += 1
        loadingState = false
        setLoading(false)
        clearTimeout(timeoutId)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

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
    try {
      // Use 'local' scope to avoid 403 errors when session is already invalid
      // This only clears the local session, not all sessions across devices
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      // Even if server signout fails, clear local state
      console.warn('Server signout failed, clearing local state:', error)
    }
    // Clear local property context to prevent confusion for next user
    localStorage.removeItem('prime_current_property_id')

    // Always clear local state regardless of server response
    setUser(null)
    setProfile(null)
    setRoles([])
    setProperties([])
    setDepartments([])
    setRolesLoading(false)
    activeUserIdRef.current = null
    loadSeqRef.current += 1
  }

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session?.user) {
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
