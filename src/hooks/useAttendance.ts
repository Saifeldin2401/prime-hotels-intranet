import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type Attendance = Database['public']['Tables']['attendance']['Row']
type AttendanceInsert = Database['public']['Tables']['attendance']['Insert']

export function useAttendance(employeeId?: string) {
    const { user } = useAuth()
    const targetId = employeeId || user?.id

    return useQuery({
        queryKey: ['attendance', targetId],
        queryFn: async () => {
            if (!targetId) return []
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', targetId)
                .order('date', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!targetId,
    })
}

export function useCheckIn() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (data: Omit<AttendanceInsert, 'employee_id' | 'check_in' | 'status' | 'date'>) => {
            if (!user) throw new Error('User not authenticated')

            const { data: result, error } = await supabase
                .from('attendance')
                .insert({
                    employee_id: user.id,
                    date: new Date().toISOString().split('T')[0],
                    check_in: new Date().toISOString(),
                    status: 'present',
                    ...data
                })
                .select()
                .single()

            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id] })
        },
    })
}

export function useCheckOut() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            const { data, error } = await supabase
                .from('attendance')
                .update({
                    check_out: new Date().toISOString(),
                    notes
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id] })
        },
    })
}
