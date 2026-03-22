import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ShiftHandoverLog {
    id: string
    created_at: string
    created_by_id: string
    property_id: string
    department_id: string
    message: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    is_acknowledged: boolean
    acknowledged_by_id: string | null
    acknowledged_at: string | null
    created_by?: { full_name: string; job_title: string }
}

export function useShiftHandover() {
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()

    const { data: logs, isLoading } = useQuery({
        queryKey: ['shift-handover', currentProperty?.id],
        queryFn: async () => {
            if (!currentProperty?.id) return []
            const { data, error } = await supabase
                .from('shift_handover_logs')
                .select('*, created_by:profiles(full_name, job_title)')
                .eq('property_id', currentProperty.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            return data as ShiftHandoverLog[]
        },
        enabled: !!currentProperty?.id
    })

    const createLog = useMutation({
        mutationFn: async (newLog: Partial<ShiftHandoverLog>) => {
            if (!user || !currentProperty?.id) throw new Error('Auth/Property required')

            const { data, error } = await supabase
                .from('shift_handover_logs')
                .insert([{
                    ...newLog,
                    created_by_id: user.id,
                    property_id: currentProperty.id,
                    department_id: (user as any).department_id || '00000000-0000-0000-0000-000000000000' // Fallback
                }])
                .select()

            if (error) throw error
            return data[0]
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-handover'] })
        }
    })

    const acknowledgeLog = useMutation({
        mutationFn: async (logId: string) => {
            if (!user) throw new Error('Auth required')
            const { error } = await supabase
                .from('shift_handover_logs')
                .update({
                    is_acknowledged: true,
                    acknowledged_by_id: user.id,
                    acknowledged_at: new Date().toISOString()
                })
                .eq('id', logId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-handover'] })
        }
    })

    return { logs, isLoading, createLog, acknowledgeLog }
}
