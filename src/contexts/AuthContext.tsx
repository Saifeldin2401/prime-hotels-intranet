import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = async (userId: string) => {
    try {
      // Prevent duplicate loading
      if (profile && profile.id === userId) {
        return
      }



      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User data loading timeout')), 10000) // 10 second timeout
      })

      // Load profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: profileData, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (profileError) {
        console.error('Error loading profile:', profileError)

        // Try alternative: use auth.users metadata
        const { data: { user } } = await supabase.auth.getUser()
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
        Promise.race([rolesPromise, timeoutPromise]),
        Promise.race([propertiesPromise, timeoutPromise]),
        Promise.race([departmentsPromise, timeoutPromise])
      ]) as [PromiseSettledResult<{ data?: any; error?: any }>, PromiseSettledResult<{ data?: any; error?: any }>, PromiseSettledResult<{ data?: any; error?: any }>]

      // Handle roles
      if (rolesResult.status === 'fulfilled') {
        const { data: directRoles, error: rolesError } = rolesResult.value
        if (rolesError) {
          console.error('Error loading roles:', rolesError)
          console.error('Roles error code:', rolesError.code)
          console.error('Roles error message:', rolesError.message)
          console.error('Roles error details:', rolesError.details)
        } else {
          const rolesData = directRoles || []
          if (rolesData.length > 0) {
            setRoles(rolesData)
          }

        }
      } else {
        console.error('Roles loading failed or timed out:', rolesResult.reason)
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
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
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setRoles([])
    setProperties([])
    setDepartments([])
  }

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session?.user) {
      setUser(session.user)
      await loadUserData(session.user.id)
    }
  }

  const primaryRole = roles.length > 0
    ? roles.sort((a, b) => {
      const order: Record<AppRole, number> = {
        regional_admin: 1,
        regional_hr: 2,
        property_manager: 3,
        property_hr: 4,
        department_head: 5,
        staff: 6,
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
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

