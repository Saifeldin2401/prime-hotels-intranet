import { supabase } from '@/lib/supabase'
import type { CrmContract } from '@/lib/types/commercial'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCrmContracts(propertyId?: string) {
    return useQuery({
        queryKey: ['crm_contracts', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('crm_contracts')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as CrmContract[]
        }
    })
}

export function useCreateCrmContract() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            account_id: string
            property_id: string
            contract_name: string
            contract_value?: number
            start_date?: string
            end_date?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('crm_contracts')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as CrmContract
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_contracts'] })
        }
    })
}

export function useUpdateCrmContractStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: CrmContract['status'] }) => {
            const { error } = await supabase
                .from('crm_contracts')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_contracts'] })
        }
    })
}
