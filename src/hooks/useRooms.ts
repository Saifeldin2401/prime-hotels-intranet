import { supabase } from '@/lib/supabase'
import type { Room } from '@/lib/types/housekeeping'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useRooms(propertyId?: string) {
    return useQuery({
        queryKey: ['rooms', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('rooms')
                .select('*')
                .eq('is_active', true)
                .order('room_number')

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Room[]
        }
    })
}

export function useCreateRoom() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { property_id: string; room_number: string; floor?: string; room_type?: string }) => {
            const { data, error } = await supabase
                .from('rooms')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Room
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] })
        }
    })
}

export function useUpdateRoomStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Room['status'] }) => {
            const { error } = await supabase
                .from('rooms')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] })
        }
    })
}
