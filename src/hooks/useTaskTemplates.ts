import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TaskTemplate {
    id: string
    title: string
    description?: string
    priority: string
    recurrence_type: 'daily' | 'weekly' | 'monthly'
    recurrence_config: Record<string, any>
    assigned_to_id?: string
    property_id?: string
    department_id?: string
    is_active: boolean
    last_run_at?: string
    next_run_at?: string
    created_at: string
}

export function useTaskTemplates() {
    return useQuery({
        queryKey: ['task-templates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('task_templates')
                .select(`
                    *,
                    property:property_id(name),
                    department:department_id(name),
                    assignee:assigned_to_id(full_name)
                `)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        }
    })
}

export function useCreateTaskTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (template: Omit<TaskTemplate, 'id' | 'created_at' | 'is_active'>) => {
            const { data, error } = await supabase
                .from('task_templates')
                .insert(template)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-templates'] })
        }
    })
}

export function useToggleTaskTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
            const { data, error } = await supabase
                .from('task_templates')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-templates'] })
        }
    })
}

export function useDeleteTaskTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('task_templates')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-templates'] })
        }
    })
}
