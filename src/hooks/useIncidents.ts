import { supabase } from '@/lib/supabase'
import type { Incident } from '@/lib/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useIncidents(propertyId?: string) {
    return useQuery({
        queryKey: ['incidents', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('incidents')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Incident[]
        }
    })
}

export function useCreateIncident() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            department_id?: string | null
            incident_type: string
            severity?: Incident['severity']
            description: string
            location?: string
            reported_by: string
        }) => {
            const { data, error } = await supabase
                .from('incidents')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Incident
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] })
        }
    })
}

export function useUpdateIncidentStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Incident['status'] }) => {
            const payload: Record<string, unknown> = { status }
            if (status === 'resolved' || status === 'closed') payload.resolved_at = new Date().toISOString()

            const { error } = await supabase
                .from('incidents')
                .update(payload)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] })
        }
    })
}
