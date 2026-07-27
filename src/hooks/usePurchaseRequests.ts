import { supabase } from '@/lib/supabase'
import type { PurchaseRequest } from '@/lib/types/procurement'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function usePurchaseRequests(propertyId?: string) {
    return useQuery({
        queryKey: ['purchase_requests', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('purchase_requests')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as PurchaseRequest[]
        }
    })
}

export function useCreatePurchaseRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            department_id?: string
            item_description: string
            quantity: number
            estimated_cost?: number
            justification?: string
            requested_by: string
        }) => {
            const { data, error } = await supabase
                .from('purchase_requests')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as PurchaseRequest
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_requests'] })
        }
    })
}

export function useDecidePurchaseRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status, approved_by }: { id: string; status: 'approved' | 'rejected'; approved_by: string }) => {
            const { error } = await supabase
                .from('purchase_requests')
                .update({ status, approved_by, approved_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_requests'] })
        }
    })
}
