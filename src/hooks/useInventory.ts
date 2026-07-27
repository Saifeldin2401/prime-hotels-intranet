import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/lib/types/procurement'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useInventoryItems(propertyId?: string) {
    return useQuery({
        queryKey: ['inventory_items', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('inventory_items')
                .select('*')
                .order('item_name')

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as InventoryItem[]
        }
    })
}

export function useCreateInventoryItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            item_name: string
            category?: string
            unit?: string
            quantity_on_hand?: number
            reorder_threshold?: number
            last_updated_by: string
        }) => {
            const { data, error } = await supabase
                .from('inventory_items')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as InventoryItem
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
        }
    })
}

export function useAdjustInventoryQuantity() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, quantity_on_hand, last_updated_by }: { id: string; quantity_on_hand: number; last_updated_by: string }) => {
            const { error } = await supabase
                .from('inventory_items')
                .update({ quantity_on_hand, last_updated_by })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
        }
    })
}
