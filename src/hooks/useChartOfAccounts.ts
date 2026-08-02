import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ChartOfAccount {
    id: string
    account_code: string
    account_name: string
    account_name_ar: string | null
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    category: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export function useChartOfAccounts() {
    return useQuery({
        queryKey: ['chart_of_accounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .select('*')
                .eq('is_active', true)
                .order('account_code', { ascending: true })

            if (error) throw error
            return data as ChartOfAccount[]
        }
    })
}

export function useCreateChartOfAccount() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            account_code: string
            account_name: string
            account_name_ar?: string
            account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
            category: string
        }) => {
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as ChartOfAccount
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] })
        }
    })
}

export function useDeleteChartOfAccount() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('chart_of_accounts')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] })
        }
    })
}
