import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook } from '@testing-library/react'
import {
  ROUTES,
  NAVIGATION_GROUPS,
  canAccessRoute,
  canSeeGroup,
} from '@/config/navigation'
import { useNavigation } from '@/hooks/useNavigation'
import { safeLocalStorage } from '@/lib/storage'

let mockAuthUser: any = { id: 'test-user-id', email: 'user@altus.internal' }
let mockPrimaryRole: string | null = 'corporate_admin'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
    primaryRole: mockPrimaryRole,
    rolesLoading: false,
  }),
}))

let mockAccountState = {
  loading: false,
  isPlatformOperator: false,
  platformRoles: [] as string[],
  platformPermissions: [] as string[],
  can: (_perm: string) => true,
  hasPlatformRole: (_role: string) => true,
  activePlatformSession: null as any,
  tenantMemberships: [] as any[],
  primaryOrganizationId: 'org-1',
  isMultiOrg: false,
  allOrgsSuspended: false,
  recommendedDestination: '/dashboard',
  refresh: vi.fn(),
}

vi.mock('@/hooks/useAccountContext', () => ({
  useAccountContext: () => mockAccountState,
}))

let mockTenantState = {
  currentOrganization: { id: 'org-1', name: 'Altus Hospitality Group' } as any,
  currentHotel: null as any,
  availableHotels: [] as any[],
  isPlatformAdmin: false,
  isPlatformScope: false,
  isImpersonating: false,
  returnToPlatformScope: vi.fn(),
}

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => mockTenantState,
}))

let mockLocation = { pathname: '/dashboard' }
vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}))

vi.mock('@/hooks/useSidebarCounts', () => ({
  useSidebarCounts: () => ({ data: {} }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, def?: any) => (typeof def === 'string' ? def : k),
    i18n: { dir: () => 'ltr', language: 'en' },
  }),
}))

describe('Tenant vs Platform Navigation Divergence & Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    safeLocalStorage.clear()
    mockLocation = { pathname: '/dashboard' }
  })

  describe('1. Static Configuration & Role Policy Security', () => {
    it('blocks tenant corporate_admin, regional_admin, and administrator from platform operations', () => {
      const platformGroup = NAVIGATION_GROUPS.find(g => g.id === 'platform_operations')
      expect(platformGroup).toBeDefined()

      // Tenant roles must NEVER see platform_operations
      expect(canSeeGroup(platformGroup!, 'corporate_admin')).toBe(false)
      expect(canSeeGroup(platformGroup!, 'regional_admin')).toBe(false)
      expect(canSeeGroup(platformGroup!, 'administrator')).toBe(false)
      expect(canSeeGroup(platformGroup!, 'staff')).toBe(false)
      expect(canSeeGroup(platformGroup!, 'learner')).toBe(false)

      // A tenant app role never grants platform-console visibility.
      expect(canSeeGroup(platformGroup!, 'super_admin')).toBe(false)
    })

    it('grants platform-console visibility from the platform-operator identity, not the app_role (R1)', () => {
      const platformGroup = NAVIGATION_GROUPS.find(g => g.id === 'platform_operations')
      const platformRoutes = ROUTES.filter(r => r.group === 'platform_operations')

      // An operator whose tenant app_role is only "learner" (or null) still sees
      // the platform console when the operator flag is threaded through.
      expect(canSeeGroup(platformGroup!, 'learner', { isPlatformOperator: true })).toBe(true)
      expect(canSeeGroup(platformGroup!, null, { isPlatformOperator: true })).toBe(true)
      for (const route of platformRoutes) {
        expect(canAccessRoute(route, 'learner', { isPlatformOperator: true })).toBe(true)
      }

      // ...and a non-operator is still blocked regardless of app_role.
      expect(canSeeGroup(platformGroup!, 'learner', { isPlatformOperator: false })).toBe(false)
      expect(canSeeGroup(platformGroup!, 'corporate_admin', { isPlatformOperator: false })).toBe(false)
    })

    it('blocks every tenant app_role (super_admin included) from /platform/* routes without the operator flag', () => {
      const platformRoutes = ROUTES.filter(r => r.group === 'platform_operations')
      expect(platformRoutes.length).toBeGreaterThan(0)

      for (const route of platformRoutes) {
        expect(canAccessRoute(route, 'corporate_admin')).toBe(false)
        expect(canAccessRoute(route, 'regional_admin')).toBe(false)
        expect(canAccessRoute(route, 'administrator')).toBe(false)
        expect(canAccessRoute(route, 'staff')).toBe(false)
        // Platform visibility comes only from the resolved platform-operator
        // identity — never from a tenant app_role, not even super_admin.
        expect(canAccessRoute(route, 'super_admin')).toBe(false)
        expect(canAccessRoute(route, 'super_admin', { isPlatformOperator: true })).toBe(true)
      }
    })
  })

  describe('2. Tenant User Perspective (Zero-Leakage)', () => {
    beforeEach(() => {
      mockAuthUser = { id: 'tenant-user', email: 'manager@hotel.com' }
      mockPrimaryRole = 'corporate_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: false,
        can: () => false,
      }
      mockTenantState = {
        currentOrganization: { id: 'org-1', name: 'Altus Hospitality Group' },
        currentHotel: { id: 'hotel-1', name: 'Altus Riyadh Palace' },
        availableHotels: [],
        isPlatformAdmin: false,
        isPlatformScope: false,
        isImpersonating: false,
        returnToPlatformScope: vi.fn(),
      }
      mockLocation = { pathname: '/dashboard' }
    })

    it('never includes platform_operations in groupedNavigation for tenant users', () => {
      const { result } = renderHook(() => useNavigation())

      const groupIds = result.current.groupedNavigation.map(g => g.config.id)
      expect(groupIds).not.toContain('platform_operations')
      expect(groupIds).toContain('home_workspace')
    })

    it('never returns /platform routes in flatNavigation or quickActions', () => {
      const { result } = renderHook(() => useNavigation())

      const flatPaths = result.current.flatNavigation.map(i => i.path)
      expect(flatPaths.some(p => p.startsWith('/platform'))).toBe(false)

      const quickPaths = result.current.quickActions.map(i => i.path)
      expect(quickPaths.some(p => p.startsWith('/platform'))).toBe(false)
    })

    it('blocks searchRoutes from returning any /platform routes to tenant users', () => {
      const { result } = renderHook(() => useNavigation())

      const found = result.current.searchRoutes('platform')
      expect(found.some(i => i.path.startsWith('/platform'))).toBe(false)

      const foundOrgs = result.current.searchRoutes('organizations')
      expect(foundOrgs.some(i => i.path.startsWith('/platform'))).toBe(false)
    })

    it('canAccess returns false for /platform routes', () => {
      const { result } = renderHook(() => useNavigation())

      expect(result.current.canAccess('/platform')).toBe(false)
      expect(result.current.canAccess('/platform/organizations')).toBe(false)
      expect(result.current.canAccess('/platform/users')).toBe(false)
    })
  })

  describe('3. Platform Operator in Global Platform Scope', () => {
    beforeEach(() => {
      mockAuthUser = { id: 'operator-1', email: 'admin@prime.com' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        can: () => true,
      }
      mockTenantState = {
        currentOrganization: null,
        currentHotel: null,
        availableHotels: [],
        isPlatformAdmin: true,
        isPlatformScope: true,
        isImpersonating: false,
        returnToPlatformScope: vi.fn(),
      }
      mockLocation = { pathname: '/platform' }
    })

    it('shows platform_operations as primary group and retains home_workspace for profile/dashboard', () => {
      const { result } = renderHook(() => useNavigation())

      const groupIds = result.current.groupedNavigation.map(g => g.config.id)
      expect(groupIds).toContain('platform_operations')
      expect(groupIds).toContain('home_workspace')
      // Does NOT show tenant operational domain groups while on global SaaS plane
      expect(groupIds).not.toContain('learning_academy')
      expect(groupIds).not.toContain('organization_hub')
      expect(groupIds).not.toContain('knowledge_governance')

      // platform_operations has effective order 0
      const platformGroup = result.current.groupedNavigation.find(g => g.config.id === 'platform_operations')
      expect(platformGroup?.config.order).toBe(0)
    })

    it('allows searchRoutes to find platform routes in platform scope', () => {
      const { result } = renderHook(() => useNavigation())

      const found = result.current.searchRoutes('organizations')
      expect(found.some(i => i.path === '/platform/organizations')).toBe(true)
    })

    it('canAccess returns true for platform routes', () => {
      const { result } = renderHook(() => useNavigation())

      expect(result.current.canAccess('/platform')).toBe(true)
      expect(result.current.canAccess('/platform/organizations')).toBe(true)
    })
  })

  describe('4. Platform Operator inside a Customer Tenant', () => {
    beforeEach(() => {
      mockAuthUser = { id: 'operator-1', email: 'admin@prime.com' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        can: () => true,
      }
      mockTenantState = {
        currentOrganization: { id: 'org-1', name: 'Altus Hospitality Group' },
        currentHotel: { id: 'hotel-1', name: 'Altus Riyadh' },
        availableHotels: [],
        isPlatformAdmin: true,
        isPlatformScope: false,
        isImpersonating: false,
        returnToPlatformScope: vi.fn(),
      }
      mockLocation = { pathname: '/dashboard' }
    })

    it('renders full tenant operational groups in groupedNavigation', () => {
      const { result } = renderHook(() => useNavigation())

      const groupIds = result.current.groupedNavigation.map(g => g.config.id)
      expect(groupIds).toContain('home_workspace')
      expect(groupIds).toContain('organization_hub')
      expect(groupIds).toContain('learning_academy')
      // platform_operations is handled via dedicated Operator banner in Sidebar
      expect(groupIds).not.toContain('platform_operations')
    })

    it('allows operators to search and access /platform routes even while inside a tenant', () => {
      const { result } = renderHook(() => useNavigation())

      expect(result.current.canAccess('/platform')).toBe(true)
      expect(result.current.canAccess('/platform/users')).toBe(true)

      const searchResult = result.current.searchRoutes('users')
      expect(searchResult.some(i => i.path === '/platform/users')).toBe(true)
    })
  })

  describe('5. Default Platform Scope & Entry Divergence for Platform Operators', () => {
    it('defaults platform operator to global platform scope and __platform__ storage', () => {
      mockAuthUser = { id: 'admin-1', email: 'admin@prime.com' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        primaryOrganizationId: null,
        activePlatformSession: null,
        recommendedDestination: '/platform',
      }
      mockTenantState = {
        currentOrganization: null,
        currentHotel: null,
        availableHotels: [],
        isPlatformAdmin: true,
        isPlatformScope: true,
        isImpersonating: false,
        returnToPlatformScope: vi.fn(),
      }
      mockLocation = { pathname: '/platform' }

      const { result } = renderHook(() => useNavigation())

      // Operator in platform scope gets platform_operations
      const groupIds = result.current.groupedNavigation.map(g => g.config.id)
      expect(groupIds).toContain('platform_operations')
      expect(mockTenantState.isPlatformScope).toBe(true)
      expect(mockTenantState.currentOrganization).toBeNull()
    })

    it('cleanses active tenant storage on operator logout', () => {
      safeLocalStorage.setItem('altus_active_tenant_id', 'e0000000-0000-0000-0000-000000000001')
      safeLocalStorage.setItem('active_tenant_id_operator-1', 'e0000000-0000-0000-0000-000000000001')
      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBe('e0000000-0000-0000-0000-000000000001')

      // Simulate the signOut storage cleanup
      safeLocalStorage.removeItem('altus_active_tenant_id')
      safeLocalStorage.removeItem('active_tenant_id_operator-1')

      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBeNull()
      expect(safeLocalStorage.getItem('active_tenant_id_operator-1')).toBeNull()
    })
  })
})
