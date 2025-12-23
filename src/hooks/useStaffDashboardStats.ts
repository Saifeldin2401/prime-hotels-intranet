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
    requiredReading: number
}

const defaultStats: DashboardStats = {
    todaysTasks: 0,
    tasksChange: 0,
    trainingProgress: 0,
    upcomingEvents: 0,
    nextEvent: null,
    performanceScore: 0,
    requiredReading: 0
}

export function useStaffDashboardStats() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['staff-dashboard-stats', user?.id],
        queryFn: async (): Promise<DashboardStats> => {
            if (!user?.id) {
                return defaultStats
            }

            // Date calculations
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7)

            // Run ALL queries in PARALLEL for speed
            const [
                todayTasksResult,
                yesterdayTasksResult,
                trainingResult,
                shiftsResult,
                reviewsResult,
                completedTasksResult,
                allTasksResult,
                requiredReadingResult
            ] = await Promise.allSettled([
                // Today's tasks
                supabase
                    .from('tasks')
                    .select('id')
                    .eq('assigned_to', user.id)
                    .gte('due_date', today.toISOString())
                    .lt('due_date', tomorrow.toISOString())
                    .neq('status', 'completed'),

                // Yesterday's tasks
                supabase
                    .from('tasks')
                    .select('id')
                    .eq('assigned_to', user.id)
                    .gte('due_date', yesterday.toISOString())
                    .lt('due_date', today.toISOString())
                    .neq('status', 'completed'),

                // Training assignments
                supabase
                    .from('learning_assignments')
                    .select('id, status')
                    .eq('target_type', 'user')
                    .eq('target_id', user.id),

                // Upcoming shifts
                supabase
                    .from('shifts')
                    .select('id, shift_type, start_time')
                    .eq('user_id', user.id)
                    .gte('start_time', new Date().toISOString())
                    .lte('start_time', futureDate.toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5),

                // Performance reviews
                supabase
                    .from('performance_reviews')
                    .select('rating')
                    .eq('employee_id', user.id)
                    .order('review_date', { ascending: false })
                    .limit(3),

                // Completed tasks
                supabase
                    .from('tasks')
                    .select('id', { count: 'exact', head: true })
                    .eq('assigned_to', user.id)
                    .eq('status', 'completed'),

                // All tasks
                supabase
                    .from('tasks')
                    .select('id', { count: 'exact', head: true })
                    .eq('assigned_to', user.id),

                // Required reading
                supabase
                    .from('document_acknowledgments')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .is('acknowledged_at', null)
            ])

            // Extract data safely from settled promises
            const todayTasks = todayTasksResult.status === 'fulfilled' ? todayTasksResult.value.data : null
            const yesterdayTasks = yesterdayTasksResult.status === 'fulfilled' ? yesterdayTasksResult.value.data : null
            const trainingAssignments = trainingResult.status === 'fulfilled' ? trainingResult.value.data : null
            const upcomingShifts = shiftsResult.status === 'fulfilled' ? shiftsResult.value.data : null
            const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value.data : null
            const completedCount = completedTasksResult.status === 'fulfilled' ? completedTasksResult.value.count : 0
            const allCount = allTasksResult.status === 'fulfilled' ? allTasksResult.value.count : 0
            const requiredReading = requiredReadingResult.status === 'fulfilled' ? requiredReadingResult.value.count : 0

            // Calculate training progress
            const completedTraining = trainingAssignments?.filter(t => t.status === 'completed').length || 0
            const totalTraining = trainingAssignments?.length || 0
            const trainingProgress = totalTraining > 0 ? Math.round((completedTraining / totalTraining) * 100) : 0

            // Get next event
            const nextEvent = upcomingShifts && upcomingShifts.length > 0
                ? upcomingShifts[0].shift_type || 'Shift'
                : null

            // Calculate performance score
            const avgRating = reviews && reviews.length > 0
                ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
                : 0
            const ratingScore = (avgRating / 5) * 100
            const taskCompletionRate = allCount && allCount > 0 ? (completedCount || 0) / allCount : 0
            const performanceScore = Math.round(
                (ratingScore * 0.4 + taskCompletionRate * 0.3 + (trainingProgress / 100) * 0.3) * 100
            )

            return {
                todaysTasks: todayTasks?.length || 0,
                tasksChange: (todayTasks?.length || 0) - (yesterdayTasks?.length || 0),
                trainingProgress,
                upcomingEvents: upcomingShifts?.length || 0,
                nextEvent,
                performanceScore,
                requiredReading: requiredReading || 0
            }
        },
        enabled: !!user?.id,
        staleTime: 30000, // Cache for 30 seconds
        refetchInterval: 60000, // Refetch every minute
        retry: 1, // Only retry once on failure
        retryDelay: 1000
    })
}
