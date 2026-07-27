import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/lib/types/finance'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useBudgets(propertyId?: string) {
    return useQuery({
        queryKey: ['budgets', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('budgets')
                .select('*')
                .order('fiscal_year', { ascending: false })

            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Budget[]
        }
    })
}

export function useCreateBudget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            department_id?: string
            fiscal_year: number
            period_type?: Budget['period_type']
            period_label?: string
            category: string
            allocated_amount: number
            notes?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('budgets')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Budget
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
        }
    })
}

export function useUpdateBudget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, allocated_amount, notes }: { id: string; allocated_amount?: number; notes?: string }) => {
            const { error } = await supabase
                .from('budgets')
                .update({ allocated_amount, notes })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
        }
    })
}

export function useDeleteBudget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('budgets').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
        }
    })
}
