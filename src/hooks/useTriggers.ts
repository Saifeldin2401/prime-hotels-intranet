import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TriggerRule {
    id: string
    event_type: string
    name: string
    description?: string
    conditions: any[]
    action_type: string
    action_config: Record<string, any>
    is_active: boolean
    created_at: string
}

export function useTriggers() {
    return useQuery({
        queryKey: ['trigger-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trigger_rules')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as TriggerRule[]
        }
    })
}

export function useUpdateTrigger() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (trigger: Partial<TriggerRule> & { id: string }) => {
            const { data, error } = await supabase
                .from('trigger_rules')
                .update(trigger)
                .eq('id', trigger.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trigger-rules'] })
        }
    })
}

export function useCreateTrigger() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (trigger: Omit<TriggerRule, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('trigger_rules')
                .insert(trigger)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trigger-rules'] })
        }
    })
}

export function useDeleteTrigger() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('trigger_rules')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trigger-rules'] })
        }
    })
}
