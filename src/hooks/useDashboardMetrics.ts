/**
 * useDashboardMetrics Hook
 *
 * Display values are all-time KPIs for stability.
 * Trend arrows always compare like-for-like windows:
 * this week vs previous week.
 */

import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface TrendResult {
  value: number
  change: number | null
  positive: boolean
  direction: 'up' | 'down' | 'flat'
}

interface DashboardMetrics {
  taskCompletion: TrendResult
  trainingProgress: TrendResult
  responseTime: TrendResult
  attendanceRate: TrendResult
  isLoading: boolean
}

type SettledCountPayload = { count?: number | null; error?: { message?: string } | null }
const COMPLETED_TASK_STATUSES = ['completed'] as const

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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const calculateRate = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0

const calculateAttendanceRate = (records: { status: string }[]) => {
  if (records.length === 0) return 0
  const present = records.filter((record) => record.status === 'present' || record.status === 'on_time').length
  return Math.round((present / records.length) * 100)
}

const calculateAvgResponseTime = (
  tasks: { created_at: string; completed_at: string | null }[]
): number | null => {
  if (!tasks.length) return null
  const values = tasks
    .map((task) => {
      if (!task.completed_at) return null
      const created = new Date(task.created_at).getTime()
      const completed = new Date(task.completed_at).getTime()
      if (Number.isNaN(created) || Number.isNaN(completed) || completed < created) return null
      return (completed - created) / (1000 * 60 * 60)
    })
    .filter((value): value is number => typeof value === 'number')

  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

const filterByRange = <T,>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  startInclusive: Date,
  endExclusive?: Date
) =>
  rows.filter((row) => {
    const raw = getDate(row)
    if (!raw) return false
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return false
    if (date < startInclusive) return false
    if (endExclusive && date >= endExclusive) return false
    return true
  })

function calculateTrend(
  current: number | null,
  previous: number | null,
  options: { lowerIsBetter?: boolean } = {}
): { change: number | null; positive: boolean; direction: 'up' | 'down' | 'flat' } {
  const { lowerIsBetter = false } = options

  if (current === null || previous === null) {
    return { change: null, positive: true, direction: 'flat' }
  }

  if (previous === 0) {
    if (current === 0) return { change: null, positive: true, direction: 'flat' }
    const direction = lowerIsBetter ? 'down' : 'up'
    return { change: null, positive: true, direction }
  }

  const delta = ((current - previous) / previous) * 100
  const roundedDelta = Math.round(delta * 10) / 10

  const rawDirection: 'up' | 'down' | 'flat' =
    roundedDelta > 3 ? 'up' : roundedDelta < -3 ? 'down' : 'flat'

  const direction =
    lowerIsBetter && rawDirection !== 'flat'
      ? (rawDirection === 'up' ? 'down' : 'up')
      : rawDirection

  const positive = lowerIsBetter ? roundedDelta < 0 : roundedDelta > 0

  return {
    change: Math.abs(roundedDelta),
    positive,
    direction
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
      const now = new Date()
      const currentWeekStart = new Date(now.getTime() - WEEK_MS)
      const previousWeekStart = new Date(now.getTime() - (WEEK_MS * 2))

      const taskCountSettled = await Promise.allSettled([
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
            .in('status', COMPLETED_TASK_STATUSES)
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
            .gte('created_at', currentWeekStart.toISOString())
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
            .in('status', COMPLETED_TASK_STATUSES)
            .gte('created_at', currentWeekStart.toISOString())
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
            .gte('created_at', previousWeekStart.toISOString())
            .lt('created_at', currentWeekStart.toISOString())
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .eq('assigned_to_id', user.id)
            .in('status', COMPLETED_TASK_STATUSES)
            .gte('created_at', previousWeekStart.toISOString())
            .lt('created_at', currentWeekStart.toISOString())
          if (isScoped) query = query.eq('property_id', activePropertyId)
          else if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
          return query
        })(),
      ])

      const totalTasksAllTime = getSettledCount(taskCountSettled[0], 'Dashboard metrics all tasks')
      const completedTasksAllTime = getSettledCount(taskCountSettled[1], 'Dashboard metrics completed tasks')
      const totalTasksCurrentWeek = getSettledCount(taskCountSettled[2], 'Dashboard metrics tasks this week')
      const completedTasksCurrentWeek = getSettledCount(taskCountSettled[3], 'Dashboard metrics completed tasks this week')
      const totalTasksPreviousWeek = getSettledCount(taskCountSettled[4], 'Dashboard metrics tasks previous week')
      const completedTasksPreviousWeek = getSettledCount(taskCountSettled[5], 'Dashboard metrics completed tasks previous week')

      const taskCompletion = {
        current: calculateRate(completedTasksAllTime, totalTasksAllTime),
        weekRate: calculateRate(completedTasksCurrentWeek, totalTasksCurrentWeek),
        previousWeekRate: calculateRate(completedTasksPreviousWeek, totalTasksPreviousWeek)
      }

      const { data: trainingData, error: trainingError } = await supabase
        .from('training_progress')
        .select('status, created_at')
        .eq('user_id', user.id)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (trainingError) {
        console.warn('Dashboard metrics training query error:', trainingError.message)
      }

      const allTraining = trainingData || []
      const currentWeekTraining = filterByRange(allTraining, (row) => row.created_at, currentWeekStart)
      const previousWeekTraining = filterByRange(
        allTraining,
        (row) => row.created_at,
        previousWeekStart,
        currentWeekStart
      )

      const trainingProgress = {
        current: calculateRate(
          allTraining.filter((row) => row.status === 'completed').length,
          allTraining.length
        ),
        weekRate: calculateRate(
          currentWeekTraining.filter((row) => row.status === 'completed').length,
          currentWeekTraining.length
        ),
        previousWeekRate: calculateRate(
          previousWeekTraining.filter((row) => row.status === 'completed').length,
          previousWeekTraining.length
        )
      }

      let responseTimeQuery = supabase
        .from('tasks')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .not('completed_at', 'is', null)
        .eq('assigned_to_id', user.id)

      if (isScoped) responseTimeQuery = responseTimeQuery.eq('property_id', activePropertyId)
      else if (propertyIds.length > 0) responseTimeQuery = responseTimeQuery.in('property_id', propertyIds)

      const { data: responseTimeData, error: responseTimeError } = await responseTimeQuery
      if (responseTimeError) {
        console.warn('Dashboard metrics response-time query error:', responseTimeError.message)
      }

      const completedTasks = responseTimeData || []
      const responseTasksCurrentWeek = filterByRange(
        completedTasks,
        (row) => row.completed_at,
        currentWeekStart
      )
      const responseTasksPreviousWeek = filterByRange(
        completedTasks,
        (row) => row.completed_at,
        previousWeekStart,
        currentWeekStart
      )

      const allTimeResponse = calculateAvgResponseTime(completedTasks)
      const currentWeekResponse = calculateAvgResponseTime(responseTasksCurrentWeek)
      const previousWeekResponse = calculateAvgResponseTime(responseTasksPreviousWeek)

      const responseTime = {
        current: allTimeResponse ?? 0,
        weekAverage: currentWeekResponse,
        previousWeekAverage: previousWeekResponse
      }

      let attendanceQuery = supabase
        .from('attendance')
        .select('status, date')
        .eq('employee_id', user.id)

      if (isScoped) attendanceQuery = attendanceQuery.eq('property_id', activePropertyId)
      else if (propertyIds.length > 0) attendanceQuery = attendanceQuery.in('property_id', propertyIds)

      const { data: attendanceData, error: attendanceError } = await attendanceQuery
      if (attendanceError) {
        console.warn('Dashboard metrics attendance query error:', attendanceError.message)
      }

      const allAttendance = attendanceData || []
      const currentWeekAttendance = filterByRange(allAttendance, (row) => row.date, currentWeekStart)
      const previousWeekAttendance = filterByRange(
        allAttendance,
        (row) => row.date,
        previousWeekStart,
        currentWeekStart
      )

      const attendanceRate = {
        current: calculateAttendanceRate(allAttendance),
        weekRate: calculateAttendanceRate(currentWeekAttendance),
        previousWeekRate: calculateAttendanceRate(previousWeekAttendance)
      }

      return { taskCompletion, trainingProgress, responseTime, attendanceRate }
    },
    refetchInterval: 5 * 60 * 1000
  })

  const taskTrend = data
    ? calculateTrend(data.taskCompletion.weekRate, data.taskCompletion.previousWeekRate)
    : null

  const trainingTrend = data
    ? calculateTrend(data.trainingProgress.weekRate, data.trainingProgress.previousWeekRate)
    : null

  const responseTrend = data
    ? calculateTrend(data.responseTime.weekAverage, data.responseTime.previousWeekAverage, {
      lowerIsBetter: true
    })
    : null

  const attendanceTrend = data
    ? calculateTrend(data.attendanceRate.weekRate, data.attendanceRate.previousWeekRate)
    : null

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
