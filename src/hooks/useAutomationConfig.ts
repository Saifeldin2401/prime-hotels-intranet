import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AutomationConfig {
    id: 'smart_leave' | 'auto_training' | 'recurring_tasks'
    is_enabled: boolean
    config: Record<string, any>
    updated_at: string
}

export function useAutomationConfigs() {
    return useQuery({
        queryKey: ['automation-configs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_automations_config')
                .select('*')
                .order('id')
            if (error) throw error
            return data as AutomationConfig[]
        }
    })
}

export function useUpdateAutomationConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<AutomationConfig> & { id: string }) => {
            const { data, error } = await supabase
                .from('system_automations_config')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-configs'] })
        }
    })
}
