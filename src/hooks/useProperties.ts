import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface Property {
    id: string
    name: string
    is_headquarters?: boolean
}

export function useProperties() {
    return useQuery({
        queryKey: ['properties'],
        queryFn: async (): Promise<Property[]> => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, name, is_headquarters')
                .order('name')

            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 10 // Cache for 10 minutes
    })
}
