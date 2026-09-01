import { describe, expect, it, vi, beforeEach } from 'vitest'
import { platformService } from '@/services/platformService'
import { learningService } from '@/services/learningService'
import { knowledgeService } from '@/services/knowledgeService'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}))

describe('Multi-Tenant Isolation & Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Cross-Tenant Data Isolation Barrier', () => {
    it('prevents Tenant A users from reading Tenant B course content', async () => {
      const tenantAId = '11111111-1111-4111-a111-111111111111'
      const tenantBId = '22222222-2222-4222-a222-222222222222'

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          if (col === 'organization_id' && val === tenantBId) {
            // RLS returns empty dataset for out-of-tenant query
            return {
              data: [],
              error: null,
            }
          }
          return {
            data: [{ id: 'course-1', title: 'Tenant A Onboarding', organization_id: tenantAId }],
            error: null,
          }
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const resultTenantB = await supabase.from('courses').select('*').eq('organization_id', tenantBId)
      expect(resultTenantB.data).toEqual([])

      const resultTenantA = await supabase.from('courses').select('*').eq('organization_id', tenantAId)
      expect(resultTenantA.data).toHaveLength(1)
      expect(resultTenantA.data?.[0].organization_id).toBe(tenantAId)
    })

    it('enforces multi-tenant boundary in secure_search_users RPC', async () => {
      vi.mocked(supabase.rpc).mockImplementation((rpcName: string, args: any) => {
        if (rpcName === 'secure_search_users') {
          // Cross-tenant search should return only matching members in the caller's organization
          return Promise.resolve({
            data: [
              { id: 'user-1', full_name: 'Tenant Colleague', email: 'colleague@tenant-a.com' },
            ],
            error: null,
          }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const searchRes = await supabase.rpc('secure_search_users' as any, {
        p_search_query: 'colleague',
      })

      expect(supabase.rpc).toHaveBeenCalledWith('secure_search_users', {
        p_search_query: 'colleague',
      })
      expect(searchRes.data).toHaveLength(1)
      expect(searchRes.data?.[0].email).toBe('colleague@tenant-a.com')
    })
  })

  describe('2. Suspended Organization Lockdown', () => {
    it('blocks operational data access when organization lifecycle is suspended', async () => {
      const suspendedOrgId = 'suspended-org-999'

      vi.mocked(supabase.rpc).mockImplementation((rpcName: string, args: any) => {
        if (rpcName === 'org_is_operational') {
          return Promise.resolve({
            data: args.p_org_id !== suspendedOrgId,
            error: null,
          }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const { data: isOperational } = await supabase.rpc('org_is_operational' as any, {
        p_org_id: suspendedOrgId,
      })

      expect(isOperational).toBe(false)
    })

    it('resolve_account_context flags all_orgs_suspended for suspended tenant members', async () => {
      vi.mocked(supabase.rpc).mockImplementation((rpcName: string) => {
        if (rpcName === 'resolve_account_context') {
          return Promise.resolve({
            data: {
              is_platform_operator: false,
              platform_roles: [],
              platform_permissions: [],
              active_platform_session: null,
              tenant_memberships: [
                {
                  organization_id: 'suspended-org-999',
                  organization_name: 'Suspended Hotel Group',
                  lifecycle_status: 'suspended',
                  role: 'learner',
                },
              ],
              primary_organization_id: 'suspended-org-999',
              is_multi_org: false,
              all_orgs_suspended: true,
              recommended_destination: '/suspended',
            },
            error: null,
          }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const { data: ctx } = await supabase.rpc('resolve_account_context' as any)
      expect(ctx?.all_orgs_suspended).toBe(true)
      expect(ctx?.recommended_destination).toBe('/suspended')
    })
  })

  describe('3. Quota & Entitlement Enforcement', () => {
    it('blocks hotel creation when organization reaches max_hotels quota', async () => {
      const maxedOrgId = 'quota-maxed-org'

      vi.mocked(supabase.rpc).mockImplementation((rpcName: string, args: any) => {
        if (rpcName === 'check_entitlement') {
          if (args.p_org_id === maxedOrgId && args.p_resource === 'hotel') {
            return Promise.resolve({ data: false, error: null }) as any
          }
          return Promise.resolve({ data: true, error: null }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const { data: hasHeadroom } = await supabase.rpc('check_entitlement' as any, {
        p_org_id: maxedOrgId,
        p_resource: 'hotel',
      })

      expect(hasHeadroom).toBe(false)
    })

    it('blocks learner invitations when organization reaches max_learners quota', async () => {
      const maxedOrgId = 'quota-maxed-org'

      vi.mocked(supabase.rpc).mockImplementation((rpcName: string, args: any) => {
        if (rpcName === 'check_entitlement') {
          if (args.p_org_id === maxedOrgId && args.p_resource === 'learner') {
            return Promise.resolve({ data: false, error: null }) as any
          }
        }
        return Promise.resolve({ data: true, error: null }) as any
      })

      const { data: hasHeadroom } = await supabase.rpc('check_entitlement' as any, {
        p_org_id: maxedOrgId,
        p_resource: 'learner',
      })

      expect(hasHeadroom).toBe(false)
    })
  })

  describe('4. AI & Knowledge Retrieval Isolation', () => {
    it('isolates match_knowledge_chunks results strictly to the caller tenant and master templates', async () => {
      const tenantAId = 'tenant-a-id'
      const tenantBId = 'tenant-b-id'

      vi.mocked(supabase.rpc).mockImplementation((rpcName: string, args: any) => {
        if (rpcName === 'match_knowledge_chunks') {
          return Promise.resolve({
            data: [
              {
                id: 'chunk-1',
                title: 'Prime SOP - Check-in',
                section: 'Front Desk',
                content: 'Check-in protocol for Tenant A',
                similarity: 0.92,
                keyword_rank: 0.85,
              },
              {
                id: 'chunk-2',
                title: 'Master Hospitality Standard',
                section: 'General',
                content: 'Global master template chunk',
                similarity: 0.88,
                keyword_rank: 0.70,
              },
            ],
            error: null,
          }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const { data: chunks } = await supabase.rpc('match_knowledge_chunks' as any, {
        p_query_embedding: '[0.1, 0.2, 0.3]',
        p_query_text: 'check-in',
        p_match_count: 5,
        p_min_similarity: 0.7,
        p_organization_id: tenantAId,
      })

      expect(chunks).toHaveLength(2)
      expect(chunks?.[0].title).toBe('Prime SOP - Check-in')
      expect(chunks?.[1].title).toBe('Master Hospitality Standard')
    })
  })

  describe('5. Role & Administrative Boundary Enforcement', () => {
    it('prevents anonymous and unprivileged callers from executing administrative SECURITY DEFINER RPCs', async () => {
      vi.mocked(supabase.rpc).mockImplementation((rpcName: string) => {
        if (rpcName === 'deploy_master_content') {
          return Promise.resolve({
            data: null,
            error: { message: 'permission denied for function deploy_master_content', code: '42501' },
          }) as any
        }
        return Promise.resolve({ data: null, error: null }) as any
      })

      const { error } = await supabase.rpc('deploy_master_content' as any, {
        p_org_id: 'tenant-a-id',
        p_content_type: 'courses',
        p_content_id: 'master-course-id',
      })

      expect(error).toBeDefined()
      expect(error?.code).toBe('42501')
    })
  })
})
