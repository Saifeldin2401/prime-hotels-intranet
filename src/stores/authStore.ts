import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppRole } from '@/lib/constants'
import type { Profile, Property, Department, UserRole } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  // User data
  user: User | null
  profile: Profile | null
  roles: UserRole[]
  properties: Property[]
  departments: Department[]
  primaryRole: AppRole | null

  // Loading states
  isLoading: boolean
  isRolesLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setRoles: (roles: UserRole[]) => void
  setProperties: (properties: Property[]) => void
  setDepartments: (departments: Department[]) => void
  setLoading: (loading: boolean) => void
  setRolesLoading: (loading: boolean) => void

  // Computed
  getPrimaryRole: () => AppRole | null
  getDefaultProperty: () => Property | null
  getUserDepartmentIds: () => string[]
  hasRole: (role: AppRole) => boolean
  hasAnyRole: (roles: AppRole[]) => boolean

  // Reset
  reset: () => void
}

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

const initialState = {
  user: null,
  profile: null,
  roles: [],
  properties: [],
  departments: [],
  primaryRole: null,
  isLoading: true,
  isRolesLoading: true,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setRoles: (roles) => {
        set({ roles })
        // Update primary role when roles change
        const primaryRole = get().getPrimaryRole()
        set({ primaryRole })
      },
      setProperties: (properties) => set({ properties }),
      setDepartments: (departments) => set({ departments }),
      setLoading: (isLoading) => set({ isLoading }),
      setRolesLoading: (isRolesLoading) => set({ isRolesLoading }),

      getPrimaryRole: () => {
        const { roles } = get()
        if (roles.length === 0) return null

        // Sort by ROLE_ORDER priority and return the highest privilege role
        const sortedRoles = [...roles].sort(
          (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
        )
        return sortedRoles[0]?.role ?? null
      },

      getDefaultProperty: () => {
        const { properties } = get()
        return properties.length > 0 ? properties[0] : null
      },

      getUserDepartmentIds: () => {
        const { departments } = get()
        return departments.map((d) => d.id)
      },

      hasRole: (role) => {
        const { roles } = get()
        return roles.some((r) => r.role === role)
      },

      hasAnyRole: (roleList) => {
        const { roles } = get()
        return roles.some((r) => roleList.includes(r.role))
      },

      reset: () => set(initialState),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        // Only persist non-sensitive data
        primaryRole: state.primaryRole,
        properties: state.properties,
      }),
    }
  )
)
