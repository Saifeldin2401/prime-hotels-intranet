import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Property {
    id: string
    name: string
}

export function useProperties() {
    return useQuery({
        queryKey: ['properties'],
        queryFn: async (): Promise<Property[]> => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, name')
                .order('name')

            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 10 // Cache for 10 minutes
    })
}
