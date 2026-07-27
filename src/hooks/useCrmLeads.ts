import { supabase } from '@/lib/supabase'
import type { CrmLead } from '@/lib/types/commercial'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCrmLeads(propertyId?: string) {
    return useQuery({
        queryKey: ['crm_leads', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('crm_leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as CrmLead[]
        }
    })
}

export function useCreateCrmLead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            property_id: string
            account_id?: string
            lead_name: string
            source?: string
            estimated_value?: number
            expected_close_date?: string
            notes?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('crm_leads')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as CrmLead
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] })
        }
    })
}

export function useUpdateCrmLeadStage() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, stage }: { id: string; stage: CrmLead['stage'] }) => {
            const { error } = await supabase
                .from('crm_leads')
                .update({ stage })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] })
        }
    })
}
