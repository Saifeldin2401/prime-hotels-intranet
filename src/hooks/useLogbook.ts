import { supabase } from '@/lib/supabase'
import type { LogbookEntry } from '@/lib/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useLogbookEntries(propertyId?: string) {
    return useQuery({
        queryKey: ['logbook_entries', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('logbook_entries')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as LogbookEntry[]
        }
    })
}

export function useCreateLogbookEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            department_id?: string | null
            shift?: LogbookEntry['shift']
            entry_type?: LogbookEntry['entry_type']
            content: string
            incident_id?: string | null
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('logbook_entries')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as LogbookEntry
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['logbook_entries'] })
        }
    })
}
