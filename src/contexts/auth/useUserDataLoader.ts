import { supabase } from '@/lib/supabase'
import { classifyAuthError } from '@/lib/authErrorUtils'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import { useCallback, useRef } from 'react'

interface UserDataState {
  setProfile: (p: Profile | null) => void
  setRoles: (r: UserRole[]) => void
  setProperties: (p: Property[]) => void
  setDepartments: (d: Department[]) => void
  setRolesLoading: (v: boolean) => void
}

interface SessionHelpers {
  isAuthError: (error: unknown) => boolean
  withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>
  clearLocalSession: (reason: string, onCleared: () => void) => Promise<void>
}

/**
 * Internal hook: loads profile, roles, properties, and departments for a user.
 * Used exclusively by AuthContext — not part of the public API.
 */
export function useUserDataLoader(
  state: UserDataState,
  session: SessionHelpers,
  resetLocalAuthState: () => void
) {
  const loadSeqRef = useRef(0)
  const activeUserIdRef = useRef<string | null>(null)
  const lastUserDataRefreshRef = useRef<number>(0)
  const profileRef = useRef<Profile | null>(null)
  const rolesRef = useRef<UserRole[]>([])

  /** Updates profile/roles refs when React state changes (call from effects). */
  const syncProfileRef = useCallback((p: Profile | null) => {
    profileRef.current = p
  }, [])

  const syncRolesRef = useCallback((r: UserRole[]) => {
    rolesRef.current = r
  }, [])

  /** Returns true when user data should be refreshed (user changed, stale, or empty). */
  const shouldRefreshUserData = useCallback((userId: string) => {
    if (activeUserIdRef.current !== userId) return true
    if (!profileRef.current || rolesRef.current.length === 0) return true
    if (!lastUserDataRefreshRef.current) return true
    return Date.now() - lastUserDataRefreshRef.current > 5 * 60 * 1000
  }, [])

  /** Build a fallback profile from the Supabase auth.user metadata. */
  const buildFallbackProfile = (user: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string }): Profile => ({
    id: user.id,
    email: user.email || '',
    full_name: (user.user_metadata?.full_name as string) || null,
    phone: (user.user_metadata?.phone as string) || null,
    avatar_url: (user.user_metadata?.avatar_url as string) || null,
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
    updated_at: new Date().toISOString(),
  })

  /**
   * Attempt to recover from an auth error by refreshing the token.
   * Returns true if recovery succeeded, false if session should be cleared.
   */
  const attemptAuthRecovery = useCallback(async (context: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (data?.session?.user && !error) {
        return true
      }
    } catch {
      // Refresh failed
    }
    return false
  }, [])

  /** Loads all user data (profile, roles, properties, departments). */
  const loadUserData = useCallback(
    async (userId: string, isBackground = false) => {
      const { isAuthError, withTimeout, clearLocalSession } = session
      const { setProfile, setRoles, setProperties, setDepartments, setRolesLoading } = state

      try {
        const loadId = ++loadSeqRef.current
        activeUserIdRef.current = userId
        
        // Only trigger global skeleton if not a background refresh
        if (!isBackground) {
          setRolesLoading(true)
        }
        
        const isStale = () => activeUserIdRef.current !== userId || loadId !== loadSeqRef.current

        /**
         * Handle an auth error from a data query: try token refresh first,
         * only clear session if refresh also fails with an auth error.
         */
        const handleQueryAuthError = async (queryName: string, error: unknown): Promise<boolean> => {
          if (!isAuthError(error)) return false

          // Check if this is actually a network/transient error misclassified
          const classification = classifyAuthError(error)
          if (!classification.shouldLogout) {
            if (import.meta.env.DEV) {
              console.warn(`[Auth] ${queryName} error classified as non-fatal, keeping session`)
            }
            return false
          }

          // Try refreshing the token before giving up
          const recovered = await attemptAuthRecovery(queryName)
          if (recovered) return false // Don't treat as fatal — caller should continue

          await clearLocalSession(`${queryName} auth error (refresh failed)`, resetLocalAuthState)
          return true // Fatal — caller should stop
        }

        // ── Load profile ──────────────────────────────────────────
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
        if (isStale()) { setRolesLoading(false); return }
        const profileData = Array.isArray(profileRows) ? profileRows[0] ?? null : null

        if (profileError) {
          if (await handleQueryAuthError('Profile', profileError)) { setRolesLoading(false); return }
          console.warn('Error loading profile.')
          // Try fallback from auth metadata
          const { data: { user } } = await supabase.auth.getUser()
          if (isStale()) { setRolesLoading(false); return }
          if (user) setProfile(buildFallbackProfile(user))
        } else if (profileData) {
          if (isStale()) { setRolesLoading(false); return }
          setProfile(profileData)
        } else {
          // No profile row yet — use auth metadata
          const { data: { user } } = await supabase.auth.getUser()
          if (isStale()) { setRolesLoading(false); return }
          if (user) setProfile(buildFallbackProfile(user))
        }

        // ── Load roles, properties, departments in parallel ───────
        const rolesPromise = supabase.from('user_roles').select('*').eq('user_id', userId)
        const propertiesPromise = supabase.from('user_properties').select('property_id, properties(*)').eq('user_id', userId)
        const departmentsPromise = supabase.from('user_departments').select('department_id, departments(*)').eq('user_id', userId)

        const [rolesResult, propertiesResult, departmentsResult] = await Promise.allSettled([
          withTimeout(rolesPromise as any, 10000, 'Roles load'),
          withTimeout(propertiesPromise as any, 10000, 'Properties load'),
          withTimeout(departmentsPromise as any, 10000, 'Departments load'),
        ]) as [
          PromiseSettledResult<{ data?; error? }>,
          PromiseSettledResult<{ data?; error? }>,
          PromiseSettledResult<{ data?; error? }>,
        ]

        if (isStale()) { setRolesLoading(false); return }

        // Handle roles
        if (rolesResult.status === 'fulfilled') {
          const { data: directRoles, error: rolesError } = rolesResult.value
          if (rolesError) {
            if (await handleQueryAuthError('Roles', rolesError)) { setRolesLoading(false); return }
            console.warn('Error loading roles.')
            setRolesLoading(false)
          } else {
            setRoles(directRoles || [])
            setRolesLoading(false)
          }
        } else {
          console.warn('Roles loading failed or timed out.')
          setRolesLoading(false)
        }

        // Handle properties
        if (propertiesResult.status === 'fulfilled') {
          const { data: directProps, error: propertiesError } = propertiesResult.value
          if (propertiesError) {
            if (await handleQueryAuthError('Properties', propertiesError)) return
            console.warn('Error loading properties.')
          } else {
            const props = directProps?.map((up) => up.properties).filter(Boolean) || []
            setProperties(props)
          }
        } else {
          console.warn('Properties loading failed or timed out.')
        }

        // Handle departments
        if (departmentsResult.status === 'fulfilled') {
          const { data: directDepts, error: departmentsError } = departmentsResult.value
          if (departmentsError) {
            if (await handleQueryAuthError('Departments', departmentsError)) return
            console.warn('Error loading departments.')
          } else {
            const depts = directDepts?.map((ud) => ud.departments).filter(Boolean) || []
            setDepartments(depts)
          }
        } else {
          console.warn('Departments loading failed or timed out.')
        }

        lastUserDataRefreshRef.current = Date.now()
      } catch (error) {
        // Always clear rolesLoading on error to prevent infinite skeleton
        state.setRolesLoading(false)
        // For unexpected top-level errors, classify before deciding
        const classification = classifyAuthError(error)
        if (classification.shouldLogout) {
          const recovered = await attemptAuthRecovery('loadUserData')
          if (!recovered) {
            await session.clearLocalSession('User data load failed due to auth error (refresh failed)', resetLocalAuthState)
          }
          return
        }
        console.warn('Unexpected error loading user data.')
      }
    },
    [session, state, resetLocalAuthState, attemptAuthRecovery]
  )

  return {
    loadUserData,
    shouldRefreshUserData,
    syncProfileRef,
    syncRolesRef,
    activeUserIdRef,
  }
}
