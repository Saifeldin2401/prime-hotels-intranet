import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { TenantProvider, useTenant } from '@/contexts/TenantContext'
import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { safeLocalStorage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'

let mockAuthUser: any = { id: 'test-user-id', email: 'user@test.com' }
let mockPrimaryRole: string | null = 'administrator'

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
  can: (perm: string) => true,
  hasPlatformRole: (role: string) => true,
  activePlatformSession: null as any,
  tenantMemberships: [] as any[],
  primaryOrganizationId: null as string | null,
  isMultiOrg: false,
  allOrgsSuspended: false,
  recommendedDestination: '/platform',
  refresh: vi.fn(),
}

vi.mock('@/hooks/useAccountContext', () => ({
  useAccountContext: () => mockAccountState,
}))

vi.mock('@/contexts/auth/AccountContext', () => ({
  useAccountContext: () => mockAccountState,
}))

vi.mock('@/contexts/PropertyContext', () => ({
  useProperty: () => ({
    currentProperty: null,
    properties: [],
    propertyIds: [],
    setCurrentProperty: vi.fn(),
  }),
  PropertyProvider: ({ children }: any) => children,
}))

vi.mock('@/components/layout/AppLayout', () => ({
  InsideAppLayoutContext: React.createContext<boolean>(false),
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, defOrOpts?: any) => {
      if (typeof defOrOpts === 'string') return defOrOpts
      if (typeof defOrOpts === 'object' && defOrOpts?.defaultValue) return defOrOpts.defaultValue
      return k
    },
    i18n: { dir: () => 'ltr', language: 'en' },
  }),
}))

const createChainableQuery = (data: any = []) => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null })),
    then: (resolve: any) => Promise.resolve(resolve({ data, error: null })),
  }
  return q
}

describe('Multi-Tenant Lifecycle & Security Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    safeLocalStorage.clear()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.spyOn(queryClient, 'clear')
  })

  describe('1. Platform Operator Isolation & Break-Glass Flow', () => {
    it('initializes platform operator in Platform Scope with null currentOrganization and __platform__ storage', async () => {
      mockAuthUser = { id: 'operator-1', email: 'operator@altus.internal' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        platformRoles: ['platform_admin'],
        platformPermissions: ['tenant.enter', 'tenant.read'],
        activePlatformSession: null,
        primaryOrganizationId: null,
        recommendedDestination: '/platform',
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'organization_memberships') {
          return createChainableQuery([
            { id: 'm1', organization_id: 'org-tenant-1', is_active: true },
          ])
        }
        if (table === 'organizations') {
          return createChainableQuery([
            { id: 'org-tenant-1', name: 'Tenant Hotel 1', slug: 'tenant-1' },
          ])
        }
        if (table === 'platform_access_sessions') {
          return createChainableQuery([])
        }
        return createChainableQuery([])
      })

      let capturedTenantContext: any = null
      const Consumer = () => {
        capturedTenantContext = useTenant()
        return <div>Loaded</div>
      }

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <TenantProvider>
                <Consumer />
              </TenantProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      await waitFor(() => {
        expect(capturedTenantContext).not.toBeNull()
        expect(capturedTenantContext.isLoading).toBe(false)
      })

      // Operator MUST be in platform scope
      expect(capturedTenantContext.isPlatformScope).toBe(true)
      // Operator MUST NOT default to tenant 1
      expect(capturedTenantContext.currentOrganization).toBeNull()
      // Storage must be set to __platform__
      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBe('__platform__')
    })

    it('purges cache with queryClient.clear() when operator enters and exits impersonation', async () => {
      mockAuthUser = { id: 'operator-1', email: 'operator@altus.internal' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        can: (p: string) => true,
        activePlatformSession: null,
        primaryOrganizationId: null,
      }

      vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
        if (fn === 'start_platform_session') {
          return Promise.resolve({
            data: 'sess-123',
            error: null,
          }) as any
        }
        if (fn === 'end_platform_session') {
          return Promise.resolve({ data: true, error: null }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createChainableQuery([
            { id: 'org-tenant-1', name: 'Tenant Hotel 1', slug: 'tenant-1' },
          ])
        }
        if (table === 'platform_access_sessions') {
          return createChainableQuery({
            id: 'sess-123',
            target_organization_id: 'org-tenant-1',
            is_active: true,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            target_organization: {
              id: 'org-tenant-1',
              name: 'Tenant Hotel 1',
              slug: 'tenant-1',
            },
          })
        }
        return createChainableQuery([])
      })

      let capturedContext: any = null
      const Consumer = () => {
        capturedContext = useTenant()
        return <div>Loaded</div>
      }

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <TenantProvider>
                <Consumer />
              </TenantProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      await waitFor(() => {
        expect(capturedContext.isLoading).toBe(false)
      })

      // 1. Enter tenant
      await act(async () => {
        await capturedContext.enterOrganization('org-tenant-1', 'Auditing compliance verification')
      })

      // Query cache MUST be purged to prevent stale platform data bleeding into tenant
      expect(queryClient.clear).toHaveBeenCalled()
      expect(capturedContext.currentOrganization?.id).toBe('org-tenant-1')
      expect(capturedContext.isPlatformScope).toBe(false)

      // 2. Exit impersonation back to platform
      const clearCallsBeforeExit = vi.mocked(queryClient.clear).mock.calls.length
      await act(async () => {
        await capturedContext.exitImpersonation()
      })

      // Query cache MUST be purged again so zero tenant data lingers on return to platform
      expect(vi.mocked(queryClient.clear).mock.calls.length).toBeGreaterThan(clearCallsBeforeExit)
      expect(capturedContext.currentOrganization).toBeNull()
      expect(capturedContext.isPlatformScope).toBe(true)
      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBe('__platform__')
    })
  })

  describe('2. TenantContextGuard Protection', () => {
    it('blocks tenant access and displays authoritative Platform notice when operator has no active session', async () => {
      mockAuthUser = { id: 'operator-1', email: 'operator@altus.internal' }
      mockPrimaryRole = 'super_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: true,
        activePlatformSession: null,
        primaryOrganizationId: null,
      }

      vi.mocked(supabase.from).mockReturnValue(createChainableQuery([]))

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/training/hub']}>
              <TenantProvider>
                <Routes>
                  <Route
                    path="/training/hub"
                    element={
                      <TenantContextGuard resourceName="Training Modules">
                        <div data-testid="secret-training-content">Tenant Secret Training</div>
                      </TenantContextGuard>
                    }
                  />
                  <Route path="/platform/organizations" element={<div>Platform Orgs</div>} />
                </Routes>
              </TenantProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      // The secret tenant content MUST NOT be displayed
      expect(screen.queryByTestId('secret-training-content')).toBeNull()
      // The authoritative guard notice must be rendered
      expect(screen.getByText(/Tenant Context Required/i)).toBeDefined()
      expect(screen.getByText(/Go to Organizations Hub/i)).toBeDefined()
    })

    it('passes through and renders children when valid tenant context is established', async () => {
      mockAuthUser = { id: 'manager-1', email: 'manager@acme.com' }
      mockPrimaryRole = 'hotel_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: false,
        primaryOrganizationId: 'org-tenant-1',
        isMultiOrg: false,
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createChainableQuery([
            { id: 'org-tenant-1', name: 'Acme Hotels', slug: 'acme' },
          ])
        }
        if (table === 'organization_memberships') {
          return createChainableQuery([
            { id: 'm1', organization_id: 'org-tenant-1', role: 'hotel_admin', is_active: true },
          ])
        }
        return createChainableQuery([])
      })

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/training/hub']}>
              <TenantProvider>
                <TenantContextGuard resourceName="Training Hub">
                  <div data-testid="authorized-training-content">Acme Training Dashboard</div>
                </TenantContextGuard>
              </TenantProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('authorized-training-content')).toBeDefined()
        expect(screen.getByText('Acme Training Dashboard')).toBeDefined()
      })
    })

    it('purges cache and switches context when switching between Tenant A and Tenant B', async () => {
      mockAuthUser = { id: 'multi-manager', email: 'multi@hotels.com' }
      mockPrimaryRole = 'hotel_admin'
      mockAccountState = {
        ...mockAccountState,
        isPlatformOperator: false,
        primaryOrganizationId: 'org-a',
        isMultiOrg: true,
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'organizations') {
          return createChainableQuery([
            { id: 'org-a', name: 'Hotel Alpha', slug: 'alpha' },
            { id: 'org-b', name: 'Hotel Beta', slug: 'beta' },
          ])
        }
        if (table === 'organization_memberships') {
          return createChainableQuery([
            { id: 'm1', organization_id: 'org-a', role: 'hotel_admin', is_active: true },
            { id: 'm2', organization_id: 'org-b', role: 'hotel_admin', is_active: true },
          ])
        }
        return createChainableQuery([])
      })

      let capturedContext: any = null
      const Consumer = () => {
        capturedContext = useTenant()
        return <div>Loaded</div>
      }

      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <TenantProvider>
                <Consumer />
              </TenantProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      await waitFor(() => {
        expect(capturedContext).not.toBeNull()
        expect(capturedContext.isLoading).toBe(false)
      })

      // Multi-tenant user with no stored preference has null initialOrg until explicit selection
      expect(capturedContext.currentOrganization).toBeNull()

      // User selects Tenant A
      await act(async () => {
        await capturedContext.switchOrganization('org-a')
      })

      expect(queryClient.clear).toHaveBeenCalled()
      expect(capturedContext.currentOrganization?.id).toBe('org-a')
      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBe('org-a')

      // User switches to Tenant B
      const clearCallsBeforeSwitch = vi.mocked(queryClient.clear).mock.calls.length
      await act(async () => {
        await capturedContext.switchOrganization('org-b')
      })

      expect(vi.mocked(queryClient.clear).mock.calls.length).toBeGreaterThan(clearCallsBeforeSwitch)
      expect(capturedContext.currentOrganization?.id).toBe('org-b')
      expect(safeLocalStorage.getItem('altus_active_tenant_id')).toBe('org-b')
    })
  })
})
