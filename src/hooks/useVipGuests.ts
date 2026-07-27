import { supabase } from '@/lib/supabase'
import type { VipGuest } from '@/lib/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useVipGuests(propertyId?: string) {
    return useQuery({
        queryKey: ['vip_guests', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('vip_guests')
                .select('*')
                .eq('is_active', true)
                .order('arrival_date', { ascending: true, nullsFirst: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as VipGuest[]
        }
    })
}

export function useCreateVipGuest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            guest_name: string
            room_number?: string
            vip_tier?: string
            notes?: string
            arrival_date?: string
            departure_date?: string
            flagged_by: string
        }) => {
            const { data, error } = await supabase
                .from('vip_guests')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as VipGuest
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vip_guests'] })
        }
    })
}

export function useDeactivateVipGuest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('vip_guests')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vip_guests'] })
        }
    })
}
