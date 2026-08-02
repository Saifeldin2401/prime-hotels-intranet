import { supabase } from '@/lib/supabase'
import type { GoodsReceivedNote } from '@/lib/types/procurement'
import { useQuery } from '@tanstack/react-query'

export function useGoodsReceivedNotes(propertyId?: string) {
    return useQuery({
        queryKey: ['goods_received_notes', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('goods_received_notes')
                .select('*, purchase_order:purchase_orders(po_number, total_amount), supplier:suppliers(supplier_name)')
                .order('received_date', { ascending: false })
                .limit(20)

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as GoodsReceivedNote[]
        },
        enabled: Boolean(propertyId)
    })
}
