import { supabase } from '@/lib/supabase'
import { appRolesFromMemberships } from '@/lib/membershipRoles'
import { secureSearchUsers } from '@/lib/secureSearch'
import { sanitizeSearchInput } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

export function useProfiles(filters?: {
    search?: string
    department_id?: string
    department_ids?: string[]
    organization_id?: string
    limit?: number // Max records to fetch, defaults to 200
}) {
    const normalizedFilters = filters

    return useQuery({
        queryKey: ['profiles', normalizedFilters],
        queryFn: async () => {
            // SECURE: Use parameterized RPC for search queries
            if (filters?.search) {
                const sanitizedSearch = sanitizeSearchInput(filters.search)
                if (sanitizedSearch) {
                    const secureResults = await secureSearchUsers({
                        search: sanitizedSearch,
                        department_id: filters?.department_id,
                        is_active: true,
                        limit: filters?.limit || 200
                    })
                    return secureResults
                }
            }

            const isOrgScoped = !!filters?.organization_id
            const omJoin = isOrgScoped ? 'organization_memberships!inner' : 'organization_memberships'

            let query = supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    phone,
                    job_title,
                    staff_id,
                    avatar_url,
                    language,
                    date_of_birth,
                    is_active,
                    created_at,
                    updated_at,
                    reporting_to,
                    ${omJoin}(
                        role,
                        organization_id,
                        is_active,
                        department_id,
                        department:departments(id, name)
                    ),
                    reporting_to_profile:profiles!reporting_to(id, full_name, job_title, email)
                `)
                .eq('is_active', true)
                .order('full_name')

            if (filters?.organization_id) {
                query = query
                    .eq('organization_memberships.organization_id', filters.organization_id)
                    .eq('organization_memberships.is_active', true)
            }

            if (filters?.department_id) {
                query = query.not('organization_memberships', 'is', null).eq('organization_memberships.department_id', filters.department_id)
            }

            if (filters?.department_ids && filters.department_ids.length > 0) {
                query = query.not('organization_memberships', 'is', null).in('organization_memberships.department_id', filters.department_ids)
            }

            // Apply limit to prevent fetching too many records
            const maxRecords = filters?.limit || 200
            const { data, error } = await query.limit(maxRecords)

            if (error) throw error

            return (data || []).map((profile: any) => {
                const memberships = (profile.organization_memberships || []).filter((om: any) =>
                    filters?.organization_id ? om.organization_id === filters.organization_id : true
                )
                return {
                    ...profile,
                    roles: [...new Set(appRolesFromMemberships(memberships).map((r) => r.role))],
                    departments: memberships.map((om: any) => om.department).filter(Boolean)
                }
            })
        }
    })
}
