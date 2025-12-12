import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'



export function useProfiles(filters?: {
    search?: string
    property_id?: string
    department_id?: string
}) {
    // const { primaryRole, properties } = useAuth() // unused for now

    return useQuery({
        queryKey: ['profiles', filters],
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
                query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`)
            }

            // In a real app, strict RLS would handle this, but for now we might filter here
            // e.g. Staff sees only their property coworkers?
            // For now, let everyone see everyone for directory purposes.

            const { data, error } = await query

            if (error) throw error

            // Transform to simpler structure if needed, or return as is.
            // The types might need adjusting if we want nice nested objects.
            return data.map(profile => ({
                ...profile,
                roles: profile.user_roles?.map((ur: any) => ur.role) || [],
                properties: profile.user_properties?.map((up: any) => up.property) || [],
                departments: profile.user_departments?.map((ud: any) => ud.department) || []
            }))
        }
    })
}
