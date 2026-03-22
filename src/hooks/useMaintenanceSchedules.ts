import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
type MaintenanceSchedule = {
    id: string
    created_at?: string
    created_by?: string | null
    assigned_to_id?: string | null
    property_id?: string | null
    [key: string]: any
}

type InsertMaintenanceSchedule = Omit<MaintenanceSchedule, 'id' | 'created_at'>
type UpdateMaintenanceSchedule = Partial<InsertMaintenanceSchedule>

export function useMaintenanceSchedules() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['maintenance_schedules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .select(`
          *,
          assigned_to:assigned_to_id(full_name),
          property:property_id(name),
          created_by_profile:created_by(full_name)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!user
    })
}

export function useCreateMaintenanceSchedule() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (schedule: Omit<InsertMaintenanceSchedule, 'created_by'>) => {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .insert({ ...schedule, created_by: user?.id })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_schedules'] })
        }
    })
}

export function useUpdateMaintenanceSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateMaintenanceSchedule }) => {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_schedules'] })
        }
    })
}

export function useDeleteMaintenanceSchedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('maintenance_schedules')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_schedules'] })
        }
    })
}
