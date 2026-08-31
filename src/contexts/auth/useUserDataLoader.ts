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
  setRolesError: (v: string | null) => void
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
      const { setProfile, setRoles, setProperties, setDepartments, setRolesLoading, setRolesError } = state

      try {
        const loadId = ++loadSeqRef.current
        activeUserIdRef.current = userId

        // Only trigger global skeleton if not a background refresh
        if (!isBackground) {
          setRolesLoading(true)
          setRolesError(null)
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
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('id, email, full_name, phone, avatar_url, hire_date, job_title, staff_id, reporting_to, is_active, emergency_contact_name, emergency_contact_phone, nationality, blood_group, created_at, updated_at, date_of_birth, iqama_number, bio')
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
            console.warn('Error loading profile from DB, falling back to auth metadata:', profileError)
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
        } catch (profileLoadErr) {
          console.warn('Profile load timed out or failed, falling back to auth user metadata:', profileLoadErr)
          const { data: { user } } = await supabase.auth.getUser()
          if (isStale()) { setRolesLoading(false); return }
          if (user) setProfile(buildFallbackProfile(user))
        }

        // ── Load roles, organization memberships, and hotels in parallel ───────
        const rolesPromise = supabase.from('user_roles').select('*').eq('user_id', userId)
        const membershipsPromise = supabase
          .from('organization_memberships')
          .select('*, hotel:hotels(*), department:departments(*)')
          .eq('user_id', userId)
          .eq('is_active', true)
        const hotelsPromise = supabase.from('hotels').select('*').eq('is_deleted', false)

        const [rolesResult, membershipsResult, hotelsResult] = await Promise.allSettled([
          withTimeout(rolesPromise as any, 10000, 'Roles load'),
          withTimeout(membershipsPromise as any, 10000, 'Memberships load'),
          withTimeout(hotelsPromise as any, 10000, 'Hotels load'),
        ]) as [
          PromiseSettledResult<{ data?; error? }>,
          PromiseSettledResult<{ data?; error? }>,
          PromiseSettledResult<{ data?; error? }>,
        ]

        if (isStale()) { setRolesLoading(false); return }

        // Handle roles & memberships
        let userRoles = [] as UserRole[]
        if (rolesResult.status === 'fulfilled') {
          const { data: directRoles, error: rolesError } = rolesResult.value
          if (rolesError) {
            if (await handleQueryAuthError('Roles', rolesError)) { setRolesLoading(false); return }
            console.warn('Error loading roles:', rolesError)
          } else {
            userRoles = directRoles || []
          }
        }

        // Map membership roles into user roles if user_roles is sparse
        if (membershipsResult.status === 'fulfilled') {
          const { data: memberships, error: membError } = membershipsResult.value
          if (!membError && Array.isArray(memberships)) {
            memberships.forEach((m: any) => {
              const mappedRole = m.role === 'organization_owner' || m.role === 'organization_admin'
                ? 'corporate_admin'
                : m.role === 'training_manager'
                ? 'training_manager'
                : m.role === 'hotel_admin'
                ? 'property_manager'
                : m.role === 'department_manager'
                ? 'department_head'
                : 'learner'

              if (!userRoles.some((r) => r.role === mappedRole)) {
                userRoles.push({ id: m.id, user_id: userId, role: mappedRole as any })
              }
            })
          }
        }

        setRoles(userRoles)
        setRolesError(null)
        setRolesLoading(false)

        // Handle hotels (properties alias)
        if (hotelsResult.status === 'fulfilled') {
          const { data: directHotels, error: hotelsError } = hotelsResult.value
          if (!hotelsError && directHotels) {
            setProperties(directHotels as any)
          }
        }

        // Handle departments from memberships
        if (membershipsResult.status === 'fulfilled') {
          const { data: memberships } = membershipsResult.value
          const depts = memberships?.map((m: any) => m.department).filter(Boolean) || []
          setDepartments(depts)
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
        console.warn('Unexpected error loading user data:', error)
        state.setRolesError('Failed to load your account permissions. Please try again.')
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
