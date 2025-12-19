import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type TrainingAssignmentRule = Database['public']['Tables']['training_assignment_rules']['Row']
type InsertTrainingAssignmentRule = Database['public']['Tables']['training_assignment_rules']['Insert']
type UpdateTrainingAssignmentRule = Database['public']['Tables']['training_assignment_rules']['Update']

export function useTrainingModulesList() {
    return useQuery({
        queryKey: ['training_modules_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_modules')
                .select('id, title')
                .eq('status', 'published')
                .order('title')

            if (error) throw error
            return data
        }
    })
}

export function useTrainingRules() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['training_assignment_rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_assignment_rules')
                .select(`
          *,
          departments (name),
          training_modules (title),
          job_titles (title),
          profiles:created_by (full_name)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!user
    })
}

export function useCreateTrainingRule() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (rule: Omit<InsertTrainingAssignmentRule, 'created_by'>) => {
            const { data, error } = await supabase
                .from('training_assignment_rules')
                .insert({ ...rule, created_by: user?.id })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['training_assignment_rules'] })
        }
    })
}

export function useDeleteTrainingRule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('training_assignment_rules')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['training_assignment_rules'] })
        }
    })
}

export function useUpdateTrainingRule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateTrainingAssignmentRule }) => {
            const { data, error } = await supabase
                .from('training_assignment_rules')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['training_assignment_rules'] })
        }
    })
}
