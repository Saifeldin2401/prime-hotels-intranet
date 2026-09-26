import { supabase } from '@/lib/supabase'
import { appRolesFromMemberships } from '@/lib/membershipRoles'
import { secureSearchUsers } from '@/lib/secureSearch'
import { sanitizeSearchInput } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

export function useProfiles(filters?: {
    search?: string
    department_id?: string
    department_ids?: string[]
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
                    organization_memberships(
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

            if (filters?.department_id) {
                query = query.not('organization_memberships', 'is', null).eq('organization_memberships.department_id', filters.department_id)
            }

            if (filters?.department_ids && filters.department_ids.length > 0) {
                query = query.not('organization_memberships', 'is', null).in('organization_memberships.department_id', filters.department_ids)
            }

            // In a real app, strict RLS would handle this, but for now we might filter here
            // For now, let everyone see everyone for directory purposes.

            // Apply limit to prevent fetching too many records
            const maxRecords = filters?.limit || 200
            const { data, error } = await query.limit(maxRecords)

            if (error) throw error

            // Transform to simpler structure if needed, or return as is.
            // The types might need adjusting if we want nice nested objects.
            return (data || []).map((profile: any) => ({
                ...profile,
                roles: [...new Set(appRolesFromMemberships(profile.organization_memberships).map((r) => r.role))],
                departments: (profile.organization_memberships || []).map((om: any) => om.department).filter(Boolean)
            }))
        }
    })
}
