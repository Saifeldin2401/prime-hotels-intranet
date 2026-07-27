import { supabase } from '@/lib/supabase'
import type { LostFoundItem } from '@/lib/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useLostFoundItems(propertyId?: string) {
    return useQuery({
        queryKey: ['lost_found_items', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('lost_found_items')
                .select('*')
                .order('found_date', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as LostFoundItem[]
        }
    })
}

export function useCreateLostFoundItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            item_description: string
            found_location?: string
            found_date?: string
            stored_location?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('lost_found_items')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as LostFoundItem
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lost_found_items'] })
        }
    })
}

export function useUpdateLostFoundStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status, claimed_by_guest_name }: { id: string; status: LostFoundItem['status']; claimed_by_guest_name?: string }) => {
            const payload: Record<string, unknown> = { status }
            if (status === 'claimed') {
                payload.claimed_at = new Date().toISOString()
                if (claimed_by_guest_name) payload.claimed_by_guest_name = claimed_by_guest_name
            }

            const { error } = await supabase
                .from('lost_found_items')
                .update(payload)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lost_found_items'] })
        }
    })
}
