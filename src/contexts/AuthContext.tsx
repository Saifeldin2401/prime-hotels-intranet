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
      
      console.log('Loading user data for:', userId)
      
      // Load profile - use RPC or direct query that bypasses RLS if needed
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        
        // Try alternative: use auth.users metadata
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Set basic profile from auth user
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            phone: null,
            avatar_url: null,
            hire_date: null,
            is_active: true,
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at,
          })
        }
      } else if (profileData) {
        setProfile(profileData)
      }

      // Load roles - use RPC function or direct query
      // First try direct query (might fail due to RLS)
      let rolesData: any[] = []
      const { data: directRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)

      if (rolesError) {
        console.error('Error loading roles (direct):', rolesError)
        console.error('Roles error details:', JSON.stringify(rolesError, null, 2))
        
        // Try using RPC function if available
        try {
          const { data: rpcRoles, error: rpcError } = await supabase.rpc('get_user_roles', { user_uuid: userId })
          if (!rpcError && rpcRoles) {
            rolesData = rpcRoles
          }
        } catch (rpcErr) {
          // Fallback: query with admin context or use service role
          // For now, we'll try a workaround by checking if user can see any roles
        }
      } else {
        rolesData = directRoles || []
      }
      
      if (rolesData.length > 0) {
        setRoles(rolesData)
      }

      // Load properties - try RPC first, fallback to direct query
      const { data: rpcProps, error: rpcPropsError } = await supabase.rpc('get_user_properties', { user_uuid: userId })
      
      if (!rpcPropsError && rpcProps) {
        // Convert RPC result to property objects
        const props = rpcProps.map((p: any) => ({
          id: p.property_id,
          name: p.property_name,
          address: null,
          phone: null,
          is_active: true,
          created_at: new Date().toISOString(),
        }))
        setProperties(props)
      } else {
        // Fallback to direct query
        const { data: directProps, error: propertiesError } = await supabase
          .from('user_properties')
          .select('property_id, properties(*)')
          .eq('user_id', userId)

        if (propertiesError) {
          console.error('Error loading properties:', propertiesError)
        } else {
          const props = directProps?.map((up: any) => up.properties).filter(Boolean) || []
          setProperties(props)
          console.log('Properties loaded (direct):', props.length)
        }
      }

      // Load departments - try RPC first
      const { data: rpcDepts, error: rpcDeptsError } = await supabase.rpc('get_user_departments', { user_uuid: userId })
      
      if (!rpcDeptsError && rpcDepts) {
        // Convert RPC result to department objects
        const depts = rpcDepts.map((d: any) => ({
          id: d.department_id,
          name: d.department_name,
          property_id: null, // Would need to join if needed
          is_active: true,
          created_at: new Date().toISOString(),
        }))
        setDepartments(depts)
      } else {
        // Fallback to direct query
        const { data: directDepts, error: departmentsError } = await supabase
          .from('user_departments')
          .select('department_id, departments(*)')
          .eq('user_id', userId)

        if (departmentsError) {
          console.error('Error loading departments:', departmentsError)
        } else {
          const depts = directDepts?.map((ud: any) => ud.departments).filter(Boolean) || []
          setDepartments(depts)
        }
      }
      
    } catch (error) {
      console.error('Unexpected error loading user data:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    let loadingState = true

    // Safety timeout - ensure loading never stays true forever (reduced to 5 seconds)
    const timeoutId = setTimeout(() => {
      if (mounted && loadingState) {
        console.warn('Loading timeout - forcing loading to false')
        setLoading(false)
        loadingState = false
      }
    }, 5000) // 5 second timeout

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
      
      // Mock authentication for local development
      if (import.meta.env.VITE_MOCK_AUTH === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock user data matching the Supabase User interface
        const mockUser = {
          id: 'mock-user-id',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: email,
          phone: '',
          email_confirmed_at: new Date().toISOString(),
          phone_confirmed_at: undefined,
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { 
            provider: 'email',
            role: 'staff'
          },
          user_metadata: { 
            name: email.split('@')[0],
            department: 'Housekeeping',
            property: 'Prime Hotel Downtown'
          },
          identities: [],
          factors: undefined,
          is_anonymous: false
        }
        
        setUser(mockUser)
        setLoading(false)
        return { data: { user: mockUser }, error: null }
      }
      
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

