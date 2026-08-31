import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { 
  GraduationCap, 
  PlayCircle, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  BookOpen,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface LearningProgressItem {
  id: string
  training_id: string
  progress_percentage: number
  status: string
  last_activity_at: string
  module?: {
    id: string
    title: string
    category?: string
    estimated_duration_minutes?: number
  }
}

export const ActiveLearningsWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { user } = useAuth()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const { data: ongoingCourses = [], isLoading } = useQuery<LearningProgressItem[]>({
    queryKey: ['dashboard_ongoing_courses', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: progressList, error } = await supabase
        .from('training_progress')
        .select('id, training_id, progress_percentage, status, last_activity_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('last_activity_at', { ascending: false })
        .limit(4)

      if (error || !progressList || progressList.length === 0) {
        return []
      }

      const trainingIds = progressList.map(p => p.training_id).filter(Boolean)
      const { data: modules } = await supabase
        .from('training_modules')
        .select('id, title, category, estimated_duration_minutes')
        .in('id', trainingIds)

      const moduleMap = new Map((modules || []).map(m => [m.id, m]))

      return progressList.map((row) => ({
        id: row.id,
        training_id: row.training_id,
        progress_percentage: row.progress_percentage || 0,
        status: row.status,
        last_activity_at: row.last_activity_at,
        module: moduleMap.get(row.training_id),
      }))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 3,
  })

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'مساراتي التدريبية النشطة' : 'My Active Training'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'استكمال البرامج والوحدات المخصصة لك' : 'Continue your assigned modules & learning'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/learning/my-learning')}
            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>{isRTL ? 'عرض الكل' : 'View all'}</span>
            <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Content list */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : ongoingCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {isRTL ? 'لا توجد دورات قيد التنفيذ حالياً' : 'No courses currently in progress'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {isRTL ? 'استكشف المسارات التدريبية المتاحة وطور مهاراتك الفندقية' : 'Explore available academy tracks and enroll today'}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/learning')}
                className="mt-4 h-8 rounded-full bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                {isRTL ? 'استعراض الأكاديمية' : 'Browse Courses'}
              </Button>
            </div>
          ) : (
            ongoingCourses.map((item) => {
              const moduleTitle = item.module?.title || (isRTL ? 'وحدة تدريبية عامة' : 'Hospitality Training Module')
              const isCompleted = item.progress_percentage >= 100 || item.status === 'completed'

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/learning/${item.training_id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-3.5 transition-all duration-150 hover:border-amber-500/30 hover:bg-card/80 hover:shadow-sm"
                >
                  <div className="flex-1 space-y-2 pe-4">
                    <div className="flex items-center gap-2">
                      {item.module?.category && (
                        <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {item.module.category}
                        </span>
                      )}
                      {item.module?.estimated_duration_minutes && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{item.module.estimated_duration_minutes} {isRTL ? 'دقيقة' : 'mins'}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                      {moduleTitle}
                    </h4>

                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                          style={{ width: `${item.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {item.progress_percentage}%
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isCompleted ? 'secondary' : 'default'}
                    className={`h-8 w-8 rounded-full p-0 shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
