import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface Shift {
    id: string
    user_id: string
    shift_type: string
    start_time: string
    end_time: string
    location: string | null
    department_id: string | null
    property_id: string | null
    notes: string | null
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    break_duration_minutes: number
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface CreateShiftInput {
    user_id: string
    shift_type: string
    start_time: string
    end_time: string
    location?: string
    department_id?: string
    property_id?: string
    notes?: string
    break_duration_minutes?: number
}

/**
 * Hook to fetch shifts for a user, optionally filtered by department
 */
export function useShifts(userId?: string, dateRange?: { start: Date; end: Date }, departmentId?: string) {
    return useQuery({
        queryKey: ['shifts', userId, dateRange, departmentId],
        queryFn: async () => {
            let query = supabase
                .from('shifts')
                .select('*')
                .order('start_time', { ascending: true })

            if (userId) {
                query = query.eq('user_id', userId)
            }

            if (departmentId) {
                query = query.eq('department_id', departmentId)
            }

            if (dateRange) {
                query = query
                    .gte('start_time', dateRange.start.toISOString())
                    .lte('start_time', dateRange.end.toISOString())
            }

            const { data, error } = await query

            if (error) throw error
            return data as Shift[]
        },
        enabled: !!userId || !!departmentId
    })
}

/**
 * Hook to create a new shift
 */
export function useCreateShift() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (input: CreateShiftInput) => {
            if (!user) throw new Error('User must be authenticated')

            const { data, error } = await supabase
                .from('shifts')
                .insert({
                    ...input,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
        }
    })
}

/**
 * Hook to update an existing shift
 */
export function useUpdateShift() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateShiftInput> }) => {
            const { data, error } = await supabase
                .from('shifts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
        }
    })
}

/**
 * Hook to delete a shift
 */
export function useDeleteShift() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
        }
    })
}

/**
 * Hook to get shift statistics
 */
export function useShiftStats(userId?: string) {
    return useQuery({
        queryKey: ['shift-stats', userId],
        queryFn: async () => {
            let query = supabase
                .from('shifts')
                .select('status, start_time, end_time')

            if (userId) {
                query = query.eq('user_id', userId)
            }

            const { data, error } = await query

            if (error) throw error

            const stats = {
                total: data?.length || 0,
                scheduled: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0,
                no_show: 0,
                totalHours: 0
            }

            data?.forEach(shift => {
                stats[shift.status as keyof typeof stats]++

                // Calculate hours
                const start = new Date(shift.start_time)
                const end = new Date(shift.end_time)
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                stats.totalHours += hours
            })

            return stats
        },
        enabled: !!userId
    })
}
