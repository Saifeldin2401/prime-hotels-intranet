import { supabase } from '@/lib/supabase'
import type { HousekeepingTask } from '@/lib/types/housekeeping'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useHousekeepingTasks(propertyId?: string) {
    return useQuery({
        queryKey: ['housekeeping_tasks', propertyId],
        queryFn: async () => {
            let query = supabase
                .from('housekeeping_tasks')
                .select('*')
                .order('created_at', { ascending: false })

            if (propertyId) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as HousekeepingTask[]
        }
    })
}

export function useCreateHousekeepingTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            room_id: string
            property_id: string
            task_type: HousekeepingTask['task_type']
            priority?: HousekeepingTask['priority']
            assigned_to?: string
            notes?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('housekeeping_tasks')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as HousekeepingTask
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['housekeeping_tasks'] })
        }
    })
}

export function useUpdateHousekeepingTaskStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: HousekeepingTask['status'] }) => {
            const payload: Record<string, unknown> = { status }
            if (status === 'in_progress') payload.started_at = new Date().toISOString()
            if (status === 'completed') payload.completed_at = new Date().toISOString()

            const { error } = await supabase
                .from('housekeeping_tasks')
                .update(payload)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['housekeeping_tasks'] })
        }
    })
}
