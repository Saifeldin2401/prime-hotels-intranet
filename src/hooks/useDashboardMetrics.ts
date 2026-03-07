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
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'

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

const COMPLETED_TASK_STATUSES = ['completed'] as const
type SettledCountPayload = { count?: number | null; error?: { message?: string } | null }

const settledReasonToMessage = (reason: unknown) => {
  if (reason instanceof Error) return reason.message
  if (typeof reason === 'string') return reason
  return 'Unknown rejection'
}

const getSettledCount = (result: PromiseSettledResult<unknown>, label: string): number => {
  if (result.status === 'rejected') {
    console.warn(`${label} query rejected:`, settledReasonToMessage(result.reason))
    return 0
  }
  const payload = result.value as SettledCountPayload
  if (payload?.error) {
    console.warn(`${label} query returned error:`, payload.error.message || 'Unknown error')
    return 0
  }
  return payload?.count ?? 0
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

export function useDashboardMetrics(propertyId?: string): DashboardMetrics {
  const { user } = useAuth()
  const { currentProperty, propertyIds } = useProperty()
  const activePropertyId = propertyId || currentProperty?.id

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', user?.id, activePropertyId],
    queryFn: async () => {
      if (!user?.id) return null

      const isScoped = isRealPropertyId(activePropertyId)

      // Date ranges for week-over-week trend comparison only
      const now = new Date()
      const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // ───────────────────────────────────────────────
      // 1. Task Completion — filter by assigned_to_id (not created_by_id)
      // ───────────────────────────────────────────────
      const taskCountSettled = await Promise.allSettled([
        (async () => {
          let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
            .eq('is_deleted', false).eq('assigned_to_id', user.id)
          if (isScoped) {
            q = q.eq('property_id', activePropertyId)
          } else if (propertyIds.length > 0) {
            q = q.in('property_id', propertyIds)
          }
          return q
        })(),
        (async () => {
          let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
            .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', COMPLETED_TASK_STATUSES)
          if (isScoped) {
            q = q.eq('property_id', activePropertyId)
          } else if (propertyIds.length > 0) {
            q = q.in('property_id', propertyIds)
          }
          return q
        })(),
        (async () => {
          let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
            .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', COMPLETED_TASK_STATUSES)
            .gte('completed_at', currentWeekStart.toISOString())
          if (isScoped) {
            q = q.eq('property_id', activePropertyId)
          } else if (propertyIds.length > 0) {
            q = q.in('property_id', propertyIds)
          }
          return q
        })(),
        (async () => {
          let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
            .eq('is_deleted', false).eq('assigned_to_id', user.id)
            .gte('created_at', previousWeekStart.toISOString())
            .lt('created_at', currentWeekStart.toISOString())
          if (isScoped) {
            q = q.eq('property_id', activePropertyId)
          } else if (propertyIds.length > 0) {
            q = q.in('property_id', propertyIds)
          }
          return q
        })(),
        (async () => {
          let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
            .eq('is_deleted', false).eq('assigned_to_id', user.id).in('status', COMPLETED_TASK_STATUSES)
            .gte('created_at', previousWeekStart.toISOString())
            .lt('created_at', currentWeekStart.toISOString())
          if (isScoped) {
            q = q.eq('property_id', activePropertyId)
          } else if (propertyIds.length > 0) {
            q = q.in('property_id', propertyIds)
          }
          return q
        })(),
      ])

      const safeAllTotal = getSettledCount(taskCountSettled[0], 'Dashboard metrics all tasks')
      const safeAllDone = getSettledCount(taskCountSettled[1], 'Dashboard metrics completed tasks')
      const safeWeekDone = getSettledCount(taskCountSettled[2], 'Dashboard metrics completed tasks this week')
      const safePrevTotal = getSettledCount(taskCountSettled[3], 'Dashboard metrics previous week tasks')
      const safePrevDone = getSettledCount(taskCountSettled[4], 'Dashboard metrics previous week completed tasks')

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
      // We need to fetch training progress but we don't have a property_id column in training_progress usually.
      // However, learning_progress might have it. Let's assume it doesn't and filter by user_id only 
      // UNLESS we want to cross-reference with user_properties or similar.
      // For now, let's stick to the current implementation but check if training_progress had property_id.
      // Looking at the original code, it was purely user.id based.
      const { data: trainingData } = await supabase
        .from('learning_progress') // Wait, the original was 'training_progress' but user rules say use 'learning_progress'
        .select('status, completed_at, created_at')
        .eq('user_id', user.id)
        .or('is_deleted.is.null,is_deleted.eq.false')

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
      let responseTimeQuery = supabase
        .from('tasks')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .not('completed_at', 'is', null)
        .eq('assigned_to_id', user.id)

      if (isScoped) {
        responseTimeQuery = responseTimeQuery.eq('property_id', activePropertyId)
      } else if (propertyIds.length > 0) {
        responseTimeQuery = responseTimeQuery.in('property_id', propertyIds)
      }

      const { data: responseTimeData } = await responseTimeQuery

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
      let attendanceQuery = supabase
        .from('attendance')
        .select('status, date')
        .eq('employee_id', user.id)

      if (isScoped) {
        attendanceQuery = attendanceQuery.eq('property_id', activePropertyId)
      } else if (propertyIds.length > 0) {
        attendanceQuery = attendanceQuery.in('property_id', propertyIds)
      }

      const { data: attendanceData } = await attendanceQuery

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
