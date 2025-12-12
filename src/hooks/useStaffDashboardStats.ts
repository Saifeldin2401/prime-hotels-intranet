import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface DashboardStats {
    todaysTasks: number
    tasksChange: number
    trainingProgress: number
    upcomingEvents: number
    nextEvent: string | null
    performanceScore: number
}

export function useStaffDashboardStats() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['staff-dashboard-stats', user?.id],
        queryFn: async (): Promise<DashboardStats> => {
            if (!user?.id) {
                return {
                    todaysTasks: 0,
                    tasksChange: 0,
                    trainingProgress: 0,
                    upcomingEvents: 0,
                    nextEvent: null,
                    performanceScore: 0
                }
            }

            // Fetch today's tasks
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const { data: todayTasks } = await supabase
                .from('tasks')
                .select('id')
                .eq('assigned_to', user.id)
                .gte('due_date', today.toISOString())
                .lt('due_date', tomorrow.toISOString())
                .neq('status', 'completed')

            // Fetch yesterday's tasks for comparison
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            const { data: yesterdayTasks } = await supabase
                .from('tasks')
                .select('id')
                .eq('assigned_to', user.id)
                .gte('due_date', yesterday.toISOString())
                .lt('due_date', today.toISOString())
                .neq('status', 'completed')

            // Fetch training progress
            const { data: trainingAssignments } = await supabase
                .from('training_assignments')
                .select('id, status')
                .eq('assigned_to', user.id)

            const completedTraining = trainingAssignments?.filter(t => t.status === 'completed').length || 0
            const totalTraining = trainingAssignments?.length || 0
            const trainingProgress = totalTraining > 0 ? Math.round((completedTraining / totalTraining) * 100) : 0

            // Fetch upcoming events (shifts, meetings, training sessions)
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7) // Next 7 days

            const { data: upcomingShifts } = await supabase
                .from('shifts')
                .select('id, shift_type, start_time')
                .eq('user_id', user.id)
                .gte('start_time', new Date().toISOString())
                .lte('start_time', futureDate.toISOString())
                .order('start_time', { ascending: true })

            // Get next event
            const nextEvent = upcomingShifts && upcomingShifts.length > 0
                ? upcomingShifts[0].shift_type || 'Shift'
                : null

            // Calculate performance score (based on completed tasks and training)
            const { data: completedTasks } = await supabase
                .from('tasks')
                .select('id')
                .eq('assigned_to', user.id)
                .eq('status', 'completed')

            const { data: allTasks } = await supabase
                .from('tasks')
                .select('id')
                .eq('assigned_to', user.id)

            const taskCompletionRate = allTasks && allTasks.length > 0
                ? (completedTasks?.length || 0) / allTasks.length
                : 0

            const performanceScore = Math.round(
                (taskCompletionRate * 0.6 + (trainingProgress / 100) * 0.4) * 100
            )

            return {
                todaysTasks: todayTasks?.length || 0,
                tasksChange: (todayTasks?.length || 0) - (yesterdayTasks?.length || 0),
                trainingProgress,
                upcomingEvents: upcomingShifts?.length || 0,
                nextEvent,
                performanceScore
            }
        },
        enabled: !!user?.id,
        refetchInterval: 60000 // Refetch every minute
    })
}
