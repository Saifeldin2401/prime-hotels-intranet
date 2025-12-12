import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface UserTask {
    id: string
    title: string
    description: string | null
    due_date: string
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    created_at: string
}

export interface UserScheduleItem {
    id: string
    type: 'shift' | 'meeting' | 'training'
    title: string
    start_time: string
    end_time: string
    location: string | null
    description: string | null
}

export function useUserTasks() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['user-tasks', user?.id],
        queryFn: async (): Promise<UserTask[]> => {
            if (!user?.id) return []

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', user.id)
                .neq('status', 'completed')
                .order('due_date', { ascending: true })
                .limit(10)

            if (error) throw error
            return data || []
        },
        enabled: !!user?.id
    })
}

export function useUserSchedule() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['user-schedule', user?.id],
        queryFn: async (): Promise<UserScheduleItem[]> => {
            if (!user?.id) return []

            const now = new Date()
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7)

            // Fetch shifts
            const { data: shifts } = await supabase
                .from('shifts')
                .select('*')
                .eq('user_id', user.id)
                .gte('start_time', now.toISOString())
                .lte('start_time', futureDate.toISOString())
                .order('start_time', { ascending: true })

            // Fetch training assignments
            const { data: training } = await supabase
                .from('training_assignments')
                .select(`
          *,
          training_module:training_modules(title)
        `)
                .eq('assigned_to_user_id', user.id)
                .eq('status', 'assigned')
                .gte('due_date', now.toISOString())
                .lte('due_date', futureDate.toISOString())
                .order('due_date', { ascending: true })

            const scheduleItems: UserScheduleItem[] = []

            // Add shifts
            if (shifts) {
                shifts.forEach(shift => {
                    scheduleItems.push({
                        id: shift.id,
                        type: 'shift',
                        title: shift.shift_type || 'Shift',
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        location: shift.location || null,
                        description: shift.notes || null
                    })
                })
            }

            // Add training
            if (training) {
                training.forEach((t: any) => {
                    scheduleItems.push({
                        id: t.id,
                        type: 'training',
                        title: t.training_module?.title || 'Training Session',
                        start_time: t.due_date,
                        end_time: t.due_date,
                        location: null,
                        description: null
                    })
                })
            }

            // Sort by start time
            scheduleItems.sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            )

            return scheduleItems
        },
        enabled: !!user?.id
    })
}
