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

export function useProperties() {
    return useQuery({
        queryKey: ['properties', 'hotels'],
        queryFn: async (): Promise<Property[]> => {
            const { data, error } = await supabase
                .from('hotels')
                .select('id, name, name_ar, is_headquarters, city, country, brand_id, organization_id')
                .eq('is_deleted', false)
                .order('name')

            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 10 // Cache for 10 minutes
    })
}

