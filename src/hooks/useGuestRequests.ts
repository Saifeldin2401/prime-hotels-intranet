import { supabase } from '@/lib/supabase'
import type { GuestRequest } from '@/lib/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useGuestRequests(propertyId?: string) {
    return useQuery({
        queryKey: ['guest_requests', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('guest_requests')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as GuestRequest[]
        }
    })
}

export function useCreateGuestRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            department_id?: string | null
            room_number?: string
            guest_name?: string
            request_type: string
            description?: string
            priority?: GuestRequest['priority']
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('guest_requests')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as GuestRequest
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guest_requests'] })
        }
    })
}

export function useUpdateGuestRequestStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status, assigned_to }: { id: string; status: GuestRequest['status']; assigned_to?: string }) => {
            const payload: Record<string, unknown> = { status }
            if (assigned_to !== undefined) payload.assigned_to = assigned_to
            if (status === 'completed') payload.completed_at = new Date().toISOString()

            const { error } = await supabase
                .from('guest_requests')
                .update(payload)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guest_requests'] })
        }
    })
}
