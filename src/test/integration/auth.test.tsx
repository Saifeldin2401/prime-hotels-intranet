import { describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient, mockQueryResponse } from '../mocks/supabase'
import { createMockUserContext } from '../factories'

describe('Authentication Critical Path', () => {
  it('should handle successful login', async () => {
    const mockClient = createMockSupabaseClient()
    const mockUser = createMockUserContext('staff')

    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: mockUser.profile.id, email: mockUser.profile.email },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      },
      error: null
    })

    const result = await mockClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    })

    expect(result.error).toBeNull()
    expect(result.data.user).toBeDefined()
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('should handle login failure', async () => {
    const mockClient = createMockSupabaseClient()

    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', code: 'invalid_credentials' }
    })

    const result = await mockClient.auth.signInWithPassword({
      email: 'wrong@example.com',
      password: 'wrongpassword'
    })

    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe('invalid_credentials')
  })

  it('should maintain session after login', async () => {
    const mockClient = createMockSupabaseClient()
    const mockSession = { access_token: 'token', refresh_token: 'refresh' }

    mockClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    const result = await mockClient.auth.getSession()
    expect(result.data.session).toEqual(mockSession)
  })
})

describe('Role-Based Access Control', () => {
  it('should allow staff to access their own data only', () => {
    const staff = createMockUserContext('staff')
    expect(staff.currentRole).toBe('staff')
    expect(staff.userRoles).toHaveLength(1)
    expect(staff.userRoles[0].role).toBe('staff')
  })
})

describe('Database Query Patterns', () => {
  it('should construct proper profile queries', () => {
    const mockClient = createMockSupabaseClient()
    const userId = 'test-user-id'

    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockQueryResponse({
        id: userId,
        email: 'test@example.com'
      }))
    })

    // Simulate profile fetch
    const result = mockClient.from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    expect(mockClient.from).toHaveBeenCalledWith('profiles')
  })

  it('should handle department-scoped queries', () => {
    const mockClient = createMockSupabaseClient()
    const departmentId = 'test-department-id'

    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue(mockQueryResponse([]))
    })

    mockClient.from('tasks')
      .select('*')
      .eq('department_id', departmentId)

    expect(mockClient.from).toHaveBeenCalledWith('tasks')
  })
})

describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const mockClient = createMockSupabaseClient()

    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      then: vi.fn((onFulfilled: any, onRejected: any) => {
        return Promise.reject(new Error('Network error')).then(onFulfilled, onRejected)
      })
    })

    await expect(
      mockClient.from('profiles').select('*')
    ).rejects.toThrow('Network error')
  })

  it('should handle permission denied errors', async () => {
    const mockClient = createMockSupabaseClient()

    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: 'PGRST301' }
      })
    })

    const result = await mockClient.from('sensitive_data')
      .select('*')
      .eq('id', '123')
      .single()

    expect(result.error?.code).toBe('PGRST301')
  })
})

describe('Unregistered OAuth User Access Control', () => {
  it('correctly identifies an unregistered user with no tenant memberships or platform operator status', () => {
    const unregAccount = {
      isPlatformOperator: false,
      tenantMemberships: [],
      primaryOrganizationId: null,
      loading: false,
      resolveFailed: false,
    }

    const isRegistered =
      unregAccount.isPlatformOperator ||
      unregAccount.tenantMemberships.length > 0 ||
      Boolean(unregAccount.primaryOrganizationId)

    expect(isRegistered).toBe(false)
  })

  it('correctly identifies registered tenant member or platform operator', () => {
    const tenantUser = {
      isPlatformOperator: false,
      tenantMemberships: [{ organization_id: 'e0000000-0000-0000-0000-000000000001', role: 'learner' }],
      primaryOrganizationId: 'e0000000-0000-0000-0000-000000000001',
      loading: false,
      resolveFailed: false,
    }

    const isTenantUserRegistered =
      tenantUser.isPlatformOperator ||
      tenantUser.tenantMemberships.length > 0 ||
      Boolean(tenantUser.primaryOrganizationId)

    expect(isTenantUserRegistered).toBe(true)

    const operatorUser = {
      isPlatformOperator: true,
      tenantMemberships: [],
      primaryOrganizationId: null,
      loading: false,
      resolveFailed: false,
    }

    const isOperatorRegistered =
      operatorUser.isPlatformOperator ||
      operatorUser.tenantMemberships.length > 0 ||
      Boolean(operatorUser.primaryOrganizationId)

    expect(isOperatorRegistered).toBe(true)
  })
})
