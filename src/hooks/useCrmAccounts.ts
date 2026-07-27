import { supabase } from '@/lib/supabase'
import type { CrmAccount } from '@/lib/types/commercial'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCrmAccounts() {
    return useQuery({
        queryKey: ['crm_accounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_accounts')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as CrmAccount[]
        }
    })
}

export function useCreateCrmAccount() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id?: string
            account_name: string
            industry?: string
            contact_name?: string
            contact_email?: string
            contact_phone?: string
            account_type?: CrmAccount['account_type']
            status?: CrmAccount['status']
            notes?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('crm_accounts')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as CrmAccount
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_accounts'] })
        }
    })
}

export function useUpdateCrmAccountStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: CrmAccount['status'] }) => {
            const { error } = await supabase
                .from('crm_accounts')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_accounts'] })
        }
    })
}
