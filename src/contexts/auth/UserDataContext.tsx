/**
 * UserDataContext - User profile data
 * 
 * This context handles:
 * - Profile data
 * - User roles
 * - Properties
 * - Departments
 * - Data loading and refresh
 */

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react'
import type { Department, Profile, Property, UserRole } from '@/lib/types'
import type { AppRole } from '@/lib/constants'
import { AuthIdentityContext } from './AuthIdentityContext'
import { AuthSecurityContext } from './AuthSecurityContext'
import { useUserDataLoader } from './useUserDataLoader'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface UserDataContextType {
  profile: Profile | null
  roles: UserRole[]
  properties: Property[]
  departments: Department[]
  rolesLoading: boolean
  /**
   * Set when the roles/profile load definitively failed (query error or exhausted timeout),
   * as opposed to rolesLoading=true which means "still in flight". Route guards must treat
   * these as distinct states - an error should surface a retry action, not spin forever.
   */
  rolesError: string | null
  primaryRole: AppRole | null
  loadUserData: (userId: string, isBackground?: boolean) => Promise<void>
  shouldRefreshUserData: (userId: string) => boolean
  resetUserData: () => void
  setRolesLoading: (loading: boolean) => void
}

export const UserDataContext = createContext<UserDataContextType | undefined>(undefined)

const FALLBACK_USER_DATA: UserDataContextType = {
  profile: null,
  roles: [],
  properties: [],
  departments: [],
  rolesLoading: true,
  rolesError: null,
  primaryRole: null,
  loadUserData: async () => {},
  shouldRefreshUserData: () => false,
  resetUserData: () => {},
  setRolesLoading: () => {},
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useUserData() {
  const context = useContext(UserDataContext)
  return context ?? FALLBACK_USER_DATA
}

// ─── Role priority order (lower = higher privilege) ──────────────────────────
// Covers all 14 app_role values. The five learning-platform roles are
// interleaved so a platform-role-only user gets a coherent primaryRole
// instead of NaN (the old map only had the 9 legacy roles).
const ROLE_ORDER: Record<AppRole, number> = {
  super_admin: 0,
  corporate_admin: 1,
  administrator: 1,
  regional_admin: 2,
  training_manager: 2,
  regional_hr: 3,
  knowledge_manager: 3,
  property_manager: 4,
  property_hr: 5,
  department_head: 6,
  author: 6,
  manager: 7,
  staff: 8,
  learner: 8,
}

// ─── Types for session helpers (to avoid circular deps) ──────────────────────
interface SessionHelpers {
  isAuthError: (error: unknown) => boolean
  withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>
  clearLocalSession: (reason: string, onCleared: () => void) => Promise<void>
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function UserDataProvider({ children }: { children: ReactNode }) {
  const identityContext = useContext(AuthIdentityContext)
  const securityContext = useContext(AuthSecurityContext)
  const userId = identityContext?.user?.id ?? null
  const setUser = identityContext?.setUser ?? (() => {})

  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)

  // Refs to track user data loading
  const profileRef = useRef<Profile | null>(null)
  const rolesRef = useRef<UserRole[]>([])

  const isAuthLoading = identityContext?.loading ?? true

  const resetUserData = useCallback(() => {
    setProfile(null)
    setRoles([])
    setProperties([])
    setDepartments([])
    setRolesLoading(false)
    setRolesError(null)
    profileRef.current = null
    rolesRef.current = []
  }, [])

  const stateSetters = useMemo(
    () => ({ setProfile, setRoles, setProperties, setDepartments, setRolesLoading, setRolesError }),
    []
  )

  // Minimal session helpers for the data loader
  const sessionHelpersRef = useRef<SessionHelpers>({
    isAuthError: (error: unknown) => {
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
    },
    withTimeout: <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
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
    },
    clearLocalSession: async (_reason: string, onCleared: () => void) => {
      // This will be overridden by AuthIdentityProvider if needed
      onCleared()
    }
  })

  const resetLocalAuthState = useCallback(() => {
    setUser(null)
    resetUserData()
  }, [setUser, resetUserData])

  const { loadUserData, shouldRefreshUserData, syncProfileRef, syncRolesRef } =
    useUserDataLoader(stateSetters, sessionHelpersRef.current, resetLocalAuthState)

  // Keep refs in sync with state
  useEffect(() => {
    syncProfileRef(profile)
    profileRef.current = profile
  }, [profile, syncProfileRef])

  useEffect(() => {
    syncRolesRef(roles)
    rolesRef.current = roles
  }, [roles, syncRolesRef])

  useEffect(() => {
    if (!userId) {
      if (!isAuthLoading) {
        resetUserData()
      }
      return
    }

    if (!shouldRefreshUserData(userId)) return

    loadUserData(userId).catch(() => {
      if (import.meta.env.DEV) {
        console.warn('[UserData] Failed to auto-load user data.')
      }
    })
  }, [userId, isAuthLoading, loadUserData, resetUserData, shouldRefreshUserData])

  // ── Derived: primary role ─────────────────────────────────────────────────
  const primaryRole = useMemo(() => {
    if (roles.length === 0) return null
    return [...roles].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))[0]?.role || null
  }, [roles])

  // Effective roles loading: true if explicitly loading, or if we have an authenticated user
  // whose roles have not arrived yet and no definitive error occurred.
  const effectiveRolesLoading = useMemo(() => {
    if (isAuthLoading) return true
    if (rolesLoading) return true
    if (userId && roles.length === 0 && !rolesError) return true
    return false
  }, [isAuthLoading, rolesLoading, userId, roles.length, rolesError])

  const value = useMemo(() => ({
    profile,
    roles,
    properties,
    departments,
    rolesLoading: effectiveRolesLoading,
    rolesError,
    primaryRole,
    loadUserData,
    shouldRefreshUserData,
    resetUserData,
    setRolesLoading,
  }), [profile, roles, properties, departments, effectiveRolesLoading, rolesError, primaryRole, loadUserData, shouldRefreshUserData, resetUserData])

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}
