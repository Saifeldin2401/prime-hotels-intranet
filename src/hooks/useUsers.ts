import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'



export { useProfiles as useUsers }

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
            let query = supabase
                .from('profiles')
                .select(`
                    *,
                    user_roles(role),
                    user_properties(property:properties(id, name)),
                    user_departments(department:departments(id, name)),
                    reporting_to_profile:profiles!reporting_to(id, full_name, job_title, email)
                `)
                .eq('is_active', true)
                .order('full_name')

      if (filters?.search) {
        const normalizedSearch = filters.search
          .replace(/[^a-zA-Z0-9@._\s-]/g, '')
          .trim()
          .slice(0, 100)
        if (normalizedSearch) {
          const escaped = escapeSearchQuery(normalizedSearch)
          query = query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,job_title.ilike.%${escaped}%`)
        }
      }

            if (normalizedPropertyId) {
                // Filter by users who have a user_properties entry for this property
                // This requires a join filter or a subquery. Supabase postgrest supports filtering on joined tables.
                // However, user_properties is M:N. Simplest is !inner join if we want users belonging to property.
                // Let's use the relation filtering syntax:
                query = query.not('user_properties', 'is', null).eq('user_properties.property_id', normalizedPropertyId)
            }

            if (filters?.department_id) {
                query = query.not('user_departments', 'is', null).eq('user_departments.department_id', filters.department_id)
            }

            if (filters?.department_ids && filters.department_ids.length > 0) {
                query = query.not('user_departments', 'is', null).in('user_departments.department_id', filters.department_ids)
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
            return data.map(profile => ({
                ...profile,
                roles: profile.user_roles?.map((ur) => ur.role) || [],
                properties: profile.user_properties?.map((up) => up.property) || [],
                departments: profile.user_departments?.map((ud) => ud.department) || []
            }))
        }
    })
}
