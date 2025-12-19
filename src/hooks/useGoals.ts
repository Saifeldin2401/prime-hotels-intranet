import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type Goal = Database['public']['Tables']['goals']['Row'] & {
    training_module?: {
        title: string;
        progress?: {
            status: string;
            quiz_score: number | null;
        }
    }
}

export function useGoals(employeeId?: string) {
    const { user } = useAuth()
    const targetId = employeeId || user?.id

    return useQuery({
        queryKey: ['goals', targetId],
        queryFn: async () => {
            if (!targetId) return []
            const { data, error } = await supabase
                .from('goals')
                .select('*')
                .eq('employee_id', targetId)
                .order('target_date', { ascending: true })

            if (error) throw error

            // Fetch training progress for linked modules
            const goalsWithProgress = await Promise.all(data.map(async (goal) => {
                if (!goal.training_module_id) return goal;

                const { data: moduleData } = await supabase
                    .from('training_modules')
                    .select('title')
                    .eq('id', goal.training_module_id)
                    .single();

                const { data: progressData } = await supabase
                    .from('training_progress')
                    .select('status, quiz_score')
                    .eq('user_id', targetId)
                    .eq('training_id', goal.training_module_id)
                    .single();

                return {
                    ...goal,
                    training_module: {
                        title: moduleData?.title || 'Unknown Module',
                        progress: progressData || undefined
                    }
                };
            }));

            return goalsWithProgress;
        },
        enabled: !!targetId,
    })
}

export function useUpdateGoal() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Database['public']['Tables']['goals']['Update'] }) => {
            const { data, error } = await supabase
                .from('goals')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['goals', data.employee_id] })
        },
    })
}

export function useCreateGoal() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (goal: Database['public']['Tables']['goals']['Insert']) => {
            const { data, error } = await supabase
                .from('goals')
                .insert(goal)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['goals', data.employee_id] })
        },
    })
}
