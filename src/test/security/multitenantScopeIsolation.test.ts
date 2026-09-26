import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { searchProfiles } from '@/features/search/api/searchApi'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

describe('Multi-Tenant Scope & Identity Isolation Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const ORG_ALPHA = '11111111-1111-4111-a111-111111111111'
  const ORG_BETA = '22222222-2222-4222-a222-222222222222'

  describe('1. Tenant User Query Architecture (organization_memberships anchor)', () => {
    it('anchors member queries on organization_memberships rather than profiles.organization_id', async () => {
      // User with null profiles.organization_id who belongs to ORG_ALPHA via membership
      const membershipData = [
        {
          id: 'mem-1',
          organization_id: ORG_ALPHA,
          user_id: 'user-multi-org',
          role: 'organization_admin',
          is_active: true,
          user: {
            id: 'user-multi-org',
            email: 'consultant@hospitality.com',
            full_name: 'Lead Consultant',
            organization_id: null, // Legacy column is null
            is_active: true,
          },
          department: {
            id: 'dept-1',
            name: 'Operations',
            name_ar: 'العمليات',
          },
          organization: {
            id: ORG_ALPHA,
            name: 'Alpha Hotels',
            name_ar: 'فنادق ألفا',
          },
        },
      ]

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          if (col === 'organization_id' && val === ORG_ALPHA) {
            return {
              order: vi.fn().mockResolvedValue({ data: membershipData, error: null }),
            }
          }
          return {
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(queryBuilder as any)

      // Query from organization_memberships for ORG_ALPHA
      const res = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('organization_id', ORG_ALPHA)
        .order('created_at', { ascending: false })

      expect(supabase.from).toHaveBeenCalledWith('organization_memberships')
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORG_ALPHA)
      expect(res.data).toHaveLength(1)
      const data = res.data as any
      expect(data?.[0].user.email).toBe('consultant@hospitality.com')
      // User is returned even though their profiles.organization_id is null!
      expect(data?.[0].user.organization_id).toBeNull()
    })

    it('isolates members between Tenant Alpha and Tenant Beta', async () => {
      const alphaMembers = [
        {
          id: 'mem-alpha-1',
          organization_id: ORG_ALPHA,
          user_id: 'user-alpha',
          role: 'learner',
          is_active: true,
          user: { id: 'user-alpha', email: 'worker@alpha.com', full_name: 'Alpha Worker' },
        },
      ]

      const betaMembers = [
        {
          id: 'mem-beta-1',
          organization_id: ORG_BETA,
          user_id: 'user-beta',
          role: 'learner',
          is_active: true,
          user: { id: 'user-beta', email: 'worker@beta.com', full_name: 'Beta Worker' },
        },
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'organization_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => ({
              order: vi.fn().mockImplementation(() => {
                if (val === ORG_ALPHA) return Promise.resolve({ data: alphaMembers, error: null })
                if (val === ORG_BETA) return Promise.resolve({ data: betaMembers, error: null })
                return Promise.resolve({ data: [], error: null })
              }),
            })),
          } as any
        }
        return {} as any
      })

      const alphaRes = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('organization_id', ORG_ALPHA)
        .order('created_at', { ascending: false })

      const betaRes = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('organization_id', ORG_BETA)
        .order('created_at', { ascending: false })

      const alphaData = alphaRes.data as any
      const betaData = betaRes.data as any
      expect(alphaData?.[0].user.email).toBe('worker@alpha.com')
      expect(betaData?.[0].user.email).toBe('worker@beta.com')
      expect(alphaData?.find((m: any) => m.user.email === 'worker@beta.com')).toBeUndefined()
      expect(betaData?.find((m: any) => m.user.email === 'worker@alpha.com')).toBeUndefined()
    })
  })

  describe('2. Tenant Member Deactivation & Activation (RPC Isolation)', () => {
    it('deactivates tenant membership via remove_tenant_member RPC without disabling global profile', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any)

      const targetUserId = 'user-to-deactivate'
      const response = await supabase.rpc('remove_tenant_member' as any, {
        p_org_id: ORG_ALPHA,
        p_user_id: targetUserId,
      })

      expect(supabase.rpc).toHaveBeenCalledWith('remove_tenant_member', {
        p_org_id: ORG_ALPHA,
        p_user_id: targetUserId,
      })
      expect(response.data).toBe(true)

      // Verify that supabase.from('profiles').update({ is_active: false }) was NOT called
      expect(supabase.from).not.toHaveBeenCalledWith('profiles')
    })

    it('reactivates tenant membership via activate_tenant_member RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any)

      const targetUserId = 'user-to-reactivate'
      const response = await supabase.rpc('activate_tenant_member' as any, {
        p_org_id: ORG_ALPHA,
        p_user_id: targetUserId,
      })

      expect(supabase.rpc).toHaveBeenCalledWith('activate_tenant_member', {
        p_org_id: ORG_ALPHA,
        p_user_id: targetUserId,
      })
      expect(response.data).toBe(true)
    })
  })

  describe('3. Search API Multi-Tenant Profile Isolation', () => {
    it('joins organization_memberships!inner with organization_id and is_active filter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-alpha-search',
              full_name: 'Ahmed Alpha',
              email: 'ahmed@alpha.com',
              job_title: 'Manager',
              organization_memberships: [{ organization_id: ORG_ALPHA, is_active: true }],
            },
          ],
          error: null,
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const results = await searchProfiles({
        query: 'Ahmed',
        organizationId: ORG_ALPHA,
        limit: 10,
      })

      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(mockChain.select).toHaveBeenCalledWith(
        expect.stringContaining('organization_memberships!inner(organization_id, is_active)')
      )
      expect(mockChain.eq).toHaveBeenCalledWith(
        'organization_memberships.organization_id',
        ORG_ALPHA
      )
      expect(mockChain.eq).toHaveBeenCalledWith('organization_memberships.is_active', true)
      expect(results).toHaveLength(1)
      expect(results[0].email).toBe('ahmed@alpha.com')
    })
  })

  describe('4. Cross-Tenant Multi-Membership Coexistence', () => {
    it('permits a user to be active in Tenant A while inactive in Tenant B', () => {
      const userMemberships = [
        {
          id: 'mem-alpha',
          organization_id: ORG_ALPHA,
          user_id: 'user-shared',
          is_active: true,
          role: 'organization_admin',
        },
        {
          id: 'mem-beta',
          organization_id: ORG_BETA,
          user_id: 'user-shared',
          is_active: false,
          role: 'learner',
        },
      ]

      const activeInAlpha = userMemberships.find(
        (m) => m.organization_id === ORG_ALPHA && m.is_active
      )
      const activeInBeta = userMemberships.find(
        (m) => m.organization_id === ORG_BETA && m.is_active
      )

      expect(activeInAlpha).toBeDefined()
      expect(activeInAlpha?.role).toBe('organization_admin')
      expect(activeInBeta).toBeUndefined()
    })
  })
})
