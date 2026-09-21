import { supabase } from '@/lib/supabase'
import { secureSearchUsers } from '@/lib/secureSearch'
import { sanitizeSearchInput } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

export function useProfiles(filters?: {
    search?: string
    property_id?: string
    department_id?: string
    department_ids?: string[]
    limit?: number // Max records to fetch, defaults to 200
}) {
    // const { primaryRole, properties } = useAuth() // unused for now
    const normalizedPropertyId = filters?.property_id && filters.property_id !== 'all'
        ? filters.property_id
        : undefined
    const normalizedFilters = filters
        ? { ...filters, property_id: normalizedPropertyId }
        : undefined

    return useQuery({
        queryKey: ['profiles', normalizedFilters],
        queryFn: async () => {
            // SECURE: Use parameterized RPC for search queries
            if (filters?.search) {
                const sanitizedSearch = sanitizeSearchInput(filters.search)
                if (sanitizedSearch) {
                    const secureResults = await secureSearchUsers({
                        search: sanitizedSearch,
                        property_id: normalizedPropertyId,
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
                    user_roles(role),
                    organization_memberships(
                        hotel_id,
                        department_id,
                        hotel:hotels(id, name),
                        department:departments(id, name)
                    ),
                    reporting_to_profile:profiles!reporting_to(id, full_name, job_title, email)
                `)
                .eq('is_active', true)
                .order('full_name')

            if (normalizedPropertyId) {
                query = query.not('organization_memberships', 'is', null).eq('organization_memberships.hotel_id', normalizedPropertyId)
            }

            if (filters?.department_id) {
                query = query.not('organization_memberships', 'is', null).eq('organization_memberships.department_id', filters.department_id)
            }

            if (filters?.department_ids && filters.department_ids.length > 0) {
                query = query.not('organization_memberships', 'is', null).in('organization_memberships.department_id', filters.department_ids)
            }

            // In a real app, strict RLS would handle this, but for now we might filter here
            // e.g. Staff sees only their property coworkers?
            // For now, let everyone see everyone for directory purposes.

            // Apply limit to prevent fetching too many records
            const maxRecords = filters?.limit || 200
            const { data, error } = await query.limit(maxRecords)

            if (error) throw error

            // Transform to simpler structure if needed, or return as is.
            // The types might need adjusting if we want nice nested objects.
            return (data || []).map((profile: any) => ({
                ...profile,
                roles: profile.user_roles?.map((ur: any) => ur.role) || [],
                properties: (profile.organization_memberships || []).map((om: any) => om.hotel).filter(Boolean),
                departments: (profile.organization_memberships || []).map((om: any) => om.department).filter(Boolean)
            }))
        }
    })
}
