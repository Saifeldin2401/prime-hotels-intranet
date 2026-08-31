import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'


export function useGoals(employeeId?: string) {
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const targetId = employeeId || user?.id

    return useQuery({
        queryKey: ['goals', targetId, currentProperty?.id],
        queryFn: async () => {
            if (!targetId) return []

            if (isRealPropertyId(currentProperty?.id)) {
                const { data: membership, error: membershipError } = await supabase
                    .from('user_properties')
                    .select('id')
                    .eq('user_id', targetId)
                    .eq('property_id', currentProperty.id)
                    .limit(1)
                    .maybeSingle()

                if (membershipError) throw membershipError
                if (!membership) return []
            }

            const { data, error } = await supabase
                .from('goals')
                .select('*')
                .eq('employee_id', targetId)
                .order('target_date', { ascending: true })

            if (error) throw error

            // Fetch unique training module IDs
            const moduleIds = Array.from(new Set(data
                .map(goal => goal.training_module_id)
                .filter((id): id is string => id !== null)));

            if (moduleIds.length === 0) return data;

            // Fetch training modules and progress in batch
            const [modulesResponse, progressResponse] = await Promise.all([
                supabase
                    .from('training_modules')
                    .select('id, title')
                    .in('id', moduleIds),
                supabase
                    .from('training_progress')
                    .select('training_id, status, quiz_score')
                    .eq('user_id', targetId)
                    .in('training_id', moduleIds)
            ]);

            const modulesMap = new Map(modulesResponse.data?.map(m => [m.id, m.title]));
            const progressMap = new Map(progressResponse.data?.map(p => [p.training_id, p]));

            // Combine data
            return data.map((goal) => {
                if (!goal.training_module_id) return goal;

                const progressData = progressMap.get(goal.training_module_id);

                return {
                    ...goal,
                    training_module: {
                        title: modulesMap.get(goal.training_module_id) || 'Unknown Module',
                        progress: progressData ? {
                            status: progressData.status,
                            quiz_score: progressData.quiz_score
                        } : undefined
                    }
                };
            });
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
