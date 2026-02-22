/**
 * useDashboardMetrics Hook
 * 
 * Calculates real dashboard metrics with week-over-week trends.
 * No hardcoded values. All data from database.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useProperty } from '@/contexts/PropertyContext'

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
  
  // For response time, lower is better (positive = improvement = down)
  // For other metrics, higher is better (positive = improvement = up)
  
  return {
    change: Math.abs(roundedChange),
    positive: roundedChange > 0,
    direction: roundedChange > 3 ? 'up' : roundedChange < -3 ? 'down' : 'flat'
  }
}

export function useDashboardMetrics(): DashboardMetrics {
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const propertyFilter = currentProperty?.id && currentProperty.id !== 'all' 
        ? currentProperty.id 
        : null
      
      // Date ranges for week-over-week comparison
      const now = new Date()
      const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      
      // 1. Task Completion Metrics (RPC removed - compute directly to avoid 400)
      let taskCompletion = { current: 0, previous: 0 }

      const { count: currentTotal } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', currentWeekStart.toISOString())
        .eq('is_deleted', false)
        .eq('created_by_id', user.id)

      const { count: currentDone } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', currentWeekStart.toISOString())
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .eq('created_by_id', user.id)

      const { count: prevTotal } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', previousWeekStart.toISOString())
        .lt('created_at', currentWeekStart.toISOString())
        .eq('is_deleted', false)
        .eq('created_by_id', user.id)

      const { count: prevDone } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', previousWeekStart.toISOString())
        .lt('created_at', currentWeekStart.toISOString())
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .eq('created_by_id', user.id)

      const safeCurrentTotal = currentTotal ?? 0
      const safeCurrentDone = currentDone ?? 0
      const safePrevTotal = prevTotal ?? 0
      const safePrevDone = prevDone ?? 0

      taskCompletion = {
        current: safeCurrentTotal > 0 ? Math.round((safeCurrentDone / safeCurrentTotal) * 100) : 0,
        previous: safePrevTotal > 0 ? Math.round((safePrevDone / safePrevTotal) * 100) : 0
      }
      
      // 2. Training Progress
      const { data: trainingData } = await supabase
        .from('training_progress')
        .select('status, completed_at, created_at')
        .eq('user_id', user.id)
      
      const currentTraining = trainingData?.filter(t => {
        const createdAt = new Date(t.created_at)
        return createdAt >= currentWeekStart
      }) || []
      
      const previousTraining = trainingData?.filter(t => {
        const createdAt = new Date(t.created_at)
        return createdAt >= previousWeekStart && createdAt < currentWeekStart
      }) || []
      
      const trainingProgress = {
        current: currentTraining.length > 0 
          ? Math.round((currentTraining.filter(t => t.status === 'completed').length / currentTraining.length) * 100)
          : 0,
        previous: previousTraining.length > 0
          ? Math.round((previousTraining.filter(t => t.status === 'completed').length / previousTraining.length) * 100)
          : 0
      }
      
      // 3. Response Time - Average time to complete tasks
      const { data: responseTimeData } = await supabase
        .from('tasks')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .not('completed_at', 'is', null)
        .gte('created_at', previousWeekStart.toISOString())
        .eq('created_by_id', user.id)
      
      const calculateAvgResponseTime = (tasks: any[]) => {
        if (!tasks || tasks.length === 0) return 0
        
        const times = tasks.map(t => {
          const created = new Date(t.created_at).getTime()
          const completed = new Date(t.completed_at!).getTime()
          return (completed - created) / (1000 * 60 * 60) // hours
        })
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        return Math.round(avg * 10) / 10 // 1 decimal
      }
      
      const currentResponseTasks = responseTimeData?.filter(t => 
        new Date(t.created_at) >= currentWeekStart
      ) || []
      
      const previousResponseTasks = responseTimeData?.filter(t => {
        const created = new Date(t.created_at)
        return created >= previousWeekStart && created < currentWeekStart
      }) || []
      
      const responseTime = {
        current: calculateAvgResponseTime(currentResponseTasks),
        previous: calculateAvgResponseTime(previousResponseTasks)
      }
      
      // 4. Attendance Rate
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('employee_id', user.id)
        .gte('date', previousWeekStart.toISOString().split('T')[0])
      
      const currentAttendance = attendanceData?.filter(a => {
        const date = new Date(a.date)
        return date >= currentWeekStart
      }) || []
      
      const previousAttendance = attendanceData?.filter(a => {
        const date = new Date(a.date)
        return date >= previousWeekStart && date < currentWeekStart
      }) || []
      
      const calculateAttendanceRate = (records: any[]) => {
        if (records.length === 0) return 0
        const present = records.filter(r => r.status === 'present' || r.status === 'on_time').length
        return Math.round((present / records.length) * 100)
      }
      
      const attendanceRate = {
        current: calculateAttendanceRate(currentAttendance),
        previous: calculateAttendanceRate(previousAttendance)
      }
      
      return {
        taskCompletion,
        trainingProgress,
        responseTime,
        attendanceRate
      }
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
