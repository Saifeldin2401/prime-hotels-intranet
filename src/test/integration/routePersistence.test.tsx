import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { buildLoginUrl, consumePostLoginRedirect, setPostLoginRedirect } from '@/lib/authRedirect'

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/contexts/auth', () => ({
  useUserData: vi.fn(),
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    hasPermission: vi.fn(() => true),
    userRole: 'corporate_admin',
    isLoading: false,
    permissions: [],
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { dir: () => 'ltr' },
  }),
}))

import { useAuth } from '@/hooks/useAuth'
import { useUserData } from '@/contexts/auth'

describe('Route Persistence & Role Hydration Protection', () => {
  it('does NOT redirect to dashboard while roles are resolving on initial page load / refresh', () => {
    // Simulate user authenticated but roles still loading (the exact refresh race condition)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-123', email: 'admin@prime.sa' } as any,
      primaryRole: null,
      rolesLoading: true,
      loading: false,
      profile: null,
      roles: [],
      properties: [],
      departments: [],
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      securityRequirements: null,
    })

    vi.mocked(useUserData).mockReturnValue({
      profile: null,
      roles: [],
      properties: [],
      departments: [],
      rolesLoading: true,
      rolesError: null,
      primaryRole: null,
      loadUserData: vi.fn(),
      shouldRefreshUserData: vi.fn(),
      resetUserData: vi.fn(),
      setRolesLoading: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/training/hub/123?view=builder']}>
        <Routes>
          <Route
            path="/training/hub/:id"
            element={
              <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                <div data-testid="builder-content">Training Builder Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Must show verifying access and NOT redirect to dashboard
    expect(screen.queryByTestId('dashboard-page')).toBeNull()
    expect(screen.getByText('status_options.verifying_access')).toBeDefined()
  })

  it('renders target content once role resolution finishes with authorized role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-123', email: 'admin@prime.sa' } as any,
      primaryRole: 'corporate_admin',
      rolesLoading: false,
      loading: false,
      profile: null,
      roles: [{ id: '1', role: 'corporate_admin', user_id: 'test-user-123', is_active: true } as any],
      properties: [],
      departments: [],
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      securityRequirements: null,
    })

    vi.mocked(useUserData).mockReturnValue({
      profile: null,
      roles: [{ id: '1', role: 'corporate_admin', user_id: 'test-user-123', is_active: true } as any],
      properties: [],
      departments: [],
      rolesLoading: false,
      rolesError: null,
      primaryRole: 'corporate_admin',
      loadUserData: vi.fn(),
      shouldRefreshUserData: vi.fn(),
      resetUserData: vi.fn(),
      setRolesLoading: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/training/hub/123?view=builder']}>
        <Routes>
          <Route
            path="/training/hub/:id"
            element={
              <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                <div data-testid="builder-content">Training Builder Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('builder-content')).toBeDefined()
    expect(screen.queryByTestId('dashboard-page')).toBeNull()
  })

  it('shows error retry UI when roles load definitively fails rather than redirecting to dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-123', email: 'admin@prime.sa' } as any,
      primaryRole: null,
      rolesLoading: false,
      loading: false,
      profile: null,
      roles: [],
      properties: [],
      departments: [],
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      securityRequirements: null,
    })

    vi.mocked(useUserData).mockReturnValue({
      profile: null,
      roles: [],
      properties: [],
      departments: [],
      rolesLoading: false,
      rolesError: 'Database connection failed',
      primaryRole: null,
      loadUserData: vi.fn(),
      shouldRefreshUserData: vi.fn(),
      resetUserData: vi.fn(),
      setRolesLoading: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['corporate_admin']}>
                <div data-testid="admin-users">Users Management</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('dashboard-page')).toBeNull()
    expect(screen.getByText("We couldn't verify your access")).toBeDefined()
    expect(screen.getByText('Database connection failed')).toBeDefined()
    expect(screen.getByText('Retry')).toBeDefined()
  })

  it('preserves deep-link paths with query parameters and hash during post-login flow', () => {
    const deepDestination = '/training/hub/module-456?view=builder&step=rules#section-2'
    setPostLoginRedirect('/training/hub/module-456', '?view=builder&step=rules', '#section-2')

    const loginUrl = buildLoginUrl('/training/hub/module-456', '?view=builder&step=rules', '#section-2')
    expect(loginUrl).toContain(encodeURIComponent(deepDestination))

    const restoredDestination = consumePostLoginRedirect()
    expect(restoredDestination).toBe(deepDestination)
  })
})
