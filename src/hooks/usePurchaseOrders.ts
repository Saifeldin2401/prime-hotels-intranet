import { supabase } from '@/lib/supabase'
import type { PurchaseOrder } from '@/lib/types/procurement'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function usePurchaseOrders(propertyId?: string) {
    return useQuery({
        queryKey: ['purchase_orders', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as PurchaseOrder[]
        }
    })
}

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            supplier_id: string
            po_number: string
            total_amount: number
            purchase_request_id?: string
            order_date?: string
            expected_delivery_date?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as PurchaseOrder
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })
        }
    })
}

/** Records a goods-received entry and advances the PO status. */
export function useReceivePurchaseOrder() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({
            purchaseOrderId,
            quantityReceived,
            receivedBy,
            conditionNotes,
            fullyReceived
        }: {
            purchaseOrderId: string
            quantityReceived: number
            receivedBy: string
            conditionNotes?: string
            fullyReceived: boolean
        }) => {
            const { error: receiptError } = await supabase
                .from('po_receipts')
                .insert([{
                    purchase_order_id: purchaseOrderId,
                    received_by: receivedBy,
                    quantity_received: quantityReceived,
                    condition_notes: conditionNotes
                }])

            if (receiptError) throw receiptError

            const { error: poError } = await supabase
                .from('purchase_orders')
                .update({ status: fullyReceived ? 'received' : 'partially_received' })
                .eq('id', purchaseOrderId)

            if (poError) throw poError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })
        }
    })
}

export function useUpdatePurchaseOrderStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder['status'] }) => {
            const { error } = await supabase
                .from('purchase_orders')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })
        }
    })
}
