/**
 * useDashboardMetrics Hook
 * 
 * Calculates real dashboard metrics with week-over-week trends.
 * Shows ALL-TIME values as the primary metric so users with sparse weekly data
 * still see meaningful numbers (not 0%).
 * Week-over-week trend arrows are based on this week vs last week.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface TrendResult {
  value: number
  change: number | null // percentage change, null if no previous data
  positive: boolean // true if improvement
  direction: 'up' | 'down' | 'flat'
}

interface DashboardMetrics {
  taskCompletion: TrendResult
  trainingProgress: TrendResult
  responseTime: TrendResult // in hours
  attendanceRate: TrendResult
  isLoading: boolean
}

/**
 * Calculate week-over-week trend
 */
function calculateTrend(current: number, previous: number): { change: number | null; positive: boolean; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    return { change: null, positive: current > 0, direction: current > 0 ? 'up' : 'flat' }
  }

  const change = ((current - previous) / previous) * 100
  const roundedChange = Math.round(change * 10) / 10

  return {
    change: Math.abs(roundedChange),
    positive: roundedChange > 0,
    direction: roundedChange > 3 ? 'up' : roundedChange < -3 ? 'down' : 'flat'
  }
}

export function useDashboardMetrics(): DashboardMetrics {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Date ranges for week-over-week trend comparison only
      const now = new Date()
      const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // ───────────────────────────────────────────────
      // 1. Task Completion — filter by assigned_to_id (not created_by_id)
      // ───────────────────────────────────────────────
      const [
        { count: allTotal },
        { count: allDone },
        { count: weekDone },
        { count: prevTotal },
        { count: prevDone }
      ] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('is_deleted', false).eq('assigned_to_id', user.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', ['completed', 'done', 'resolved']),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', ['completed', 'done', 'resolved'])
          .gte('completed_at', currentWeekStart.toISOString()),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('is_deleted', false).eq('assigned_to_id', user.id)
          .gte('created_at', previousWeekStart.toISOString())
          .lt('created_at', currentWeekStart.toISOString()),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', ['completed', 'done', 'resolved'])
          .gte('created_at', previousWeekStart.toISOString())
          .lt('created_at', currentWeekStart.toISOString()),
      ])

      const safeAllTotal = allTotal ?? 0
      const safeAllDone = allDone ?? 0
      const safeWeekDone = weekDone ?? 0
      const safePrevTotal = prevTotal ?? 0
      const safePrevDone = prevDone ?? 0

      const taskCompletion = {
        // All-time completion rate as the displayed value
        current: safeAllTotal > 0 ? Math.round((safeAllDone / safeAllTotal) * 100) : 0,
        // Trend: this week's completions vs last week's rate
        previous: safePrevTotal > 0
          ? Math.round((safePrevDone / safePrevTotal) * 100)
          : safeWeekDone > 0 ? 50 : 0 // neutral baseline if no history
      }

      // ───────────────────────────────────────────────
      // 2. Training Progress — all-time overall rate
      // ───────────────────────────────────────────────
      const { data: trainingData } = await supabase
        .from('training_progress')
        .select('status, completed_at, created_at')
        .eq('user_id', user.id)

      const allTraining = trainingData || []
      const currentWeekTraining = allTraining.filter(t => new Date(t.created_at) >= currentWeekStart)
      const previousWeekTraining = allTraining.filter(t => {
        const d = new Date(t.created_at)
        return d >= previousWeekStart && d < currentWeekStart
      })

      const trainingProgress = {
        // All-time training completion rate
        current: allTraining.length > 0
          ? Math.round((allTraining.filter(t => t.status === 'completed').length / allTraining.length) * 100)
          : 0,
        // Trend comparison
        previous: previousWeekTraining.length > 0
          ? Math.round((previousWeekTraining.filter(t => t.status === 'completed').length / previousWeekTraining.length) * 100)
          : currentWeekTraining.length > 0
            ? Math.round((currentWeekTraining.filter(t => t.status === 'completed').length / currentWeekTraining.length) * 100)
            : 0
      }

      // ───────────────────────────────────────────────
      // 3. Response Time — all-time average (hours to complete tasks)
      // ───────────────────────────────────────────────
      const { data: responseTimeData } = await supabase
        .from('tasks')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .not('completed_at', 'is', null)
        .eq('assigned_to_id', user.id)

      const calculateAvgResponseTime = (tasks: { created_at: string; completed_at: string | null }[]) => {
        if (!tasks || tasks.length === 0) return 0
        const times = tasks.map(t => {
          const created = new Date(t.created_at).getTime()
          const completed = new Date(t.completed_at!).getTime()
          return (completed - created) / (1000 * 60 * 60) // hours
        })
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        return Math.round(avg * 10) / 10
      }

      const allCompleted = responseTimeData || []
      const prevWeekCompleted = allCompleted.filter(t => {
        const d = new Date(t.created_at)
        return d >= previousWeekStart && d < currentWeekStart
      })

      const responseTime = {
        current: calculateAvgResponseTime(allCompleted),    // All-time average
        previous: calculateAvgResponseTime(prevWeekCompleted.length > 0 ? prevWeekCompleted : allCompleted)
      }

      // ───────────────────────────────────────────────
      // 4. Attendance Rate — all-time (not just last 7 days)
      // ───────────────────────────────────────────────
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('employee_id', user.id)

      const allAttendance = attendanceData || []
      const currentWeekAttendance = allAttendance.filter(a => new Date(a.date) >= currentWeekStart)
      const previousWeekAttendance = allAttendance.filter(a => {
        const d = new Date(a.date)
        return d >= previousWeekStart && d < currentWeekStart
      })

      const calculateAttendanceRate = (records: { status: string }[]) => {
        if (records.length === 0) return 0
        const present = records.filter(r => r.status === 'present' || r.status === 'on_time').length
        return Math.round((present / records.length) * 100)
      }

      const attendanceRate = {
        current: calculateAttendanceRate(allAttendance),  // All-time rate
        previous: calculateAttendanceRate(
          previousWeekAttendance.length > 0 ? previousWeekAttendance : currentWeekAttendance
        )
      }

      return { taskCompletion, trainingProgress, responseTime, attendanceRate }
    },
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  })

  // Calculate trends
  const taskTrend = data ? calculateTrend(data.taskCompletion.current, data.taskCompletion.previous) : null
  const trainingTrend = data ? calculateTrend(data.trainingProgress.current, data.trainingProgress.previous) : null

  // For response time, lower is better so we invert the trend
  const responseTrendRaw = data ? calculateTrend(data.responseTime.current, data.responseTime.previous) : null
  const responseTrend = responseTrendRaw ? {
    ...responseTrendRaw,
    positive: !responseTrendRaw.positive // Invert - lower time is better
  } : null

  const attendanceTrend = data ? calculateTrend(data.attendanceRate.current, data.attendanceRate.previous) : null

  return {
    taskCompletion: {
      value: data?.taskCompletion.current || 0,
      change: taskTrend?.change ?? null,
      positive: taskTrend?.positive ?? true,
      direction: taskTrend?.direction || 'flat'
    },
    trainingProgress: {
      value: data?.trainingProgress.current || 0,
      change: trainingTrend?.change ?? null,
      positive: trainingTrend?.positive ?? true,
      direction: trainingTrend?.direction || 'flat'
    },
    responseTime: {
      value: data?.responseTime.current || 0,
      change: responseTrend?.change ?? null,
      positive: responseTrend?.positive ?? true,
      direction: responseTrend?.direction || 'flat'
    },
    attendanceRate: {
      value: data?.attendanceRate.current || 0,
      change: attendanceTrend?.change ?? null,
      positive: attendanceTrend?.positive ?? true,
      direction: attendanceTrend?.direction || 'flat'
    },
    isLoading
  }
}
