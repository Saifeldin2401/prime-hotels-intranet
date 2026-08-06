import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { startOfDay, subDays, format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

export interface PerformancePoint {
  day: string
  perf: number
  target: number
}

export interface PerformanceTimelineResult {
  points: PerformancePoint[]
  overallScore: number
  targetScore: number
  trendPercentage: number
  rating: 'Excellent' | 'Good' | 'Needs Focus'
}

export function usePerformanceTimeline() {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  return useQuery({
    queryKey: ['performance-timeline', user?.id, isRTL],
    queryFn: async (): Promise<PerformanceTimelineResult> => {
      if (!user) {
        return {
          points: [],
          overallScore: 0,
          targetScore: 85,
          trendPercentage: 0,
          rating: 'Needs Focus'
        }
      }

      // Look back 6 days + today = 7 days
      const startDate = startOfDay(subDays(new Date(), 6)).toISOString()

      // Fetch real tasks assigned to user updated in the last 7 days
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('updated_at, status')
        .eq('assigned_to_id', user.id)
        .gte('updated_at', startDate)

      if (tasksError) {
        console.error('[PerformanceTimeline] Error fetching tasks:', tasksError)
      }

      // Fetch real training progress completed by user in the last 7 days
      const { data: trainingData } = await supabase
        .from('training_progress')
        .select('updated_at, is_completed, status')
        .eq('user_id', user.id)
        .gte('updated_at', startDate)

      // Map completion activity by day
      const countsByDay: Record<string, { total: number; completed: number }> = {}
      const daysList: { dayKey: string; dayLabel: string }[] = []

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dayKey = format(date, 'yyyy-MM-dd')
        const dayLabel = format(date, 'EEE', { locale: isRTL ? ar : undefined })
        
        daysList.push({ dayKey, dayLabel })
        countsByDay[dayKey] = { total: 0, completed: 0 }
      }

      // Process real task records
      tasksData?.forEach((task) => {
        if (!task.updated_at) return
        const dayKey = format(new Date(task.updated_at), 'yyyy-MM-dd')
        if (countsByDay[dayKey]) {
          countsByDay[dayKey].total += 1
          if (task.status === 'completed' || task.status === 'resolved') {
            countsByDay[dayKey].completed += 1
          }
        }
      })

      // Process real training progress records
      trainingData?.forEach((tp) => {
        if (!tp.updated_at) return
        const dayKey = format(new Date(tp.updated_at), 'yyyy-MM-dd')
        if (countsByDay[dayKey]) {
          countsByDay[dayKey].total += 1
          if (tp.is_completed || tp.status === 'completed') {
            countsByDay[dayKey].completed += 1
          }
        }
      })

      const TARGET_SCORE = 85
      const points: PerformancePoint[] = daysList.map(({ dayKey, dayLabel }) => {
        const stats = countsByDay[dayKey]
        let perfScore = 0

        if (stats && stats.total > 0) {
          perfScore = Math.min(100, Math.round((stats.completed / stats.total) * 100))
        } else {
          // Accurate zero score for days without activity
          perfScore = 0
        }

        return {
          day: dayLabel,
          perf: perfScore,
          target: TARGET_SCORE
        }
      })

      // Calculate real overall average performance score
      const activeDays = points.filter(p => p.perf > 0)
      const sumPerf = points.reduce((acc, p) => acc + p.perf, 0)
      const overallScore = activeDays.length > 0
        ? Math.round(sumPerf / activeDays.length)
        : (points.length > 0 ? Math.round(sumPerf / points.length) : 0)

      // Calculate real trend percentage (first 3 days vs last 3 days)
      const firstHalfAvg = (points[0].perf + points[1].perf + points[2].perf) / 3
      const secondHalfAvg = (points[4].perf + points[5].perf + points[6].perf) / 3
      const trendPercentage = Math.round(secondHalfAvg - firstHalfAvg)

      let rating: 'Excellent' | 'Good' | 'Needs Focus' = 'Needs Focus'
      if (overallScore >= 85) {
        rating = 'Excellent'
      } else if (overallScore >= 60) {
        rating = 'Good'
      }

      return {
        points,
        overallScore,
        targetScore: TARGET_SCORE,
        trendPercentage,
        rating
      }
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}
