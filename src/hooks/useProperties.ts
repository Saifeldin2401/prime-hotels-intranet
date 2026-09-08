import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface Property {
    id: string
    name: string
    name_ar?: string | null
    is_headquarters?: boolean
    city?: string | null
    country?: string | null
    brand_id?: string | null
    organization_id?: string
}

export function useProperties(organizationId?: string) {
    const { currentOrganization, isPlatformScope } = useTenant()
    const targetOrgId = organizationId || currentOrganization?.id

    return useQuery({
        queryKey: ['properties', 'hotels', targetOrgId, isPlatformScope],
        queryFn: async (): Promise<Property[]> => {
            let query = supabase
                .from('hotels')
                .select('id, name, name_ar, is_headquarters, city, country, brand_id, organization_id')
                .eq('is_deleted', false)
                .order('name')

            if (targetOrgId) {
                query = query.eq('organization_id', targetOrgId)
            } else if (!isPlatformScope) {
                // In non-platform scope, if no tenant is established, return empty array to prevent cross-tenant leaks
                return []
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
        enabled: isPlatformScope || !!targetOrgId,
        staleTime: 1000 * 60 * 10 // Cache for 10 minutes
    })
}

