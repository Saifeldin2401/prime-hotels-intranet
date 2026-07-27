import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/lib/types/finance'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useInvoices(propertyId?: string) {
    return useQuery({
        queryKey: ['invoices', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false })

            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Invoice[]
        }
    })
}

export function useCreateInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            supplier_id?: string
            purchase_order_id?: string
            invoice_number: string
            amount: number
            due_date?: string
            submitted_by: string
        }) => {
            const { data, error } = await supabase
                .from('invoices')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Invoice
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }
    })
}

/** draft -> pending_approval fires the DB trigger that creates the workflow request. */
export function useSubmitInvoiceForApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'pending_approval' })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }
    })
}

export function useMarkInvoicePaid() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }
    })
}
