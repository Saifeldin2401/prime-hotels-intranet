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
                .from('learning_assignments')
                .select('id, status, due_date')
                .eq('target_type', 'user')
                .eq('target_id', user.id)
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

            // Fetch learning assignments
            const { data: assignments } = await supabase
                .from('learning_assignments')
                .select('*')
                .eq('target_type', 'user')
                .eq('target_id', user.id)
                .in('status', ['assigned', 'in_progress'])
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
            if (assignments && assignments.length > 0) {
                // Fetch module titles
                const moduleIds = assignments
                    .filter(a => a.content_type === 'module')
                    .map(a => a.content_id)

                let modules: { id: string, title: string }[] = []
                if (moduleIds.length > 0) {
                    const { data: moduleData } = await supabase
                        .from('training_modules')
                        .select('id, title')
                        .in('id', moduleIds)
                    if (moduleData) modules = moduleData
                }

                assignments.forEach((a: any) => {
                    const moduleTitle = modules.find(m => m.id === a.content_id)?.title
                    scheduleItems.push({
                        id: a.id,
                        type: 'training',
                        title: moduleTitle || 'Training Session',
                        start_time: a.due_date,
                        end_time: a.due_date, // Assignments are due dates, not durations in schedule
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
