import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  ClipboardCheck, 
  ArrowUpRight,
  TrendingUp,
  Activity,
  Users,
  CheckSquare,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface MetricCardProps {
  title: string
  value: string | number
  description: string
  badgeText?: string
  badgePositive?: boolean
  trendText?: string
  progressValue?: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  glowColor: string
  onClick: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  badgeText,
  badgePositive = true,
  trendText,
  progressValue,
  icon: Icon,
  iconColor,
  iconBg,
  glowColor,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/45 p-5 sm:p-6 shadow-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/45 hover:bg-card/95 hover:shadow-xl cursor-pointer active:scale-[0.99]"
    >
      {/* Ambient subtle glow */}
      <div className={`pointer-events-none absolute -top-12 -end-12 h-32 w-32 rounded-full ${glowColor} blur-2xl opacity-40 group-hover:opacity-75 transition-opacity duration-300`} />

      <div>
        <div className="flex items-center justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg} ${iconColor} shadow-inner transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {badgeText && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs ${
                  badgePositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {badgeText}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl font-serif">
              {value}
            </p>
            {trendText && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {trendText}
              </span>
            )}
          </div>
        </div>

        {typeof progressValue === 'number' && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] font-medium text-muted-foreground">
        <span className="line-clamp-1">{description}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-500" />
      </div>
    </div>
  )
}

export const DashboardMetricsDeck: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  // 1. Fetch training progress stats (completions, total, rate)
  const { data: trainingStats = { total: 0, completed: 0, rate: 0, activeLearners: 0 } } = useQuery({
    queryKey: ['dashboard_training_stats', currentProperty?.id],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('training_progress')
        .select('user_id, status, progress_percentage', { count: 'exact' })
        .eq('is_deleted', false)
      
      if (!data || data.length === 0) return { total: count || 0, completed: 0, rate: 0, activeLearners: 0 }
      const completed = data.filter(d => d.status === 'completed').length
      const rate = data.length > 0 ? Math.round((completed / data.length) * 100) : 0
      const uniqueLearners = new Set(data.map(d => d.user_id)).size
      return { total: data.length, completed, rate, activeLearners: uniqueLearners }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Fetch open tasks
  const { data: openTasksCount = 0 } = useQuery({
    queryKey: ['dashboard_open_tasks_count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['todo', 'in_progress', 'review'])
      return count || 0
    },
    staleTime: 1000 * 60 * 3,
  })

  // 3. Fetch real count of published SOPs & documents
  const { data: knowledgeCount = 0 } = useQuery({
    queryKey: ['dashboard_knowledge_count', currentProperty?.id],
    queryFn: async () => {
      const res = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
      return res.count || 0
    },
    staleTime: 1000 * 60 * 5,
  })

  // 4. Fetch review queue pending items
  const { data: pendingReviewsCount = 0 } = useQuery({
    queryKey: ['dashboard_pending_reviews_count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('content_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_review')
      return count || 0
    },
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Training Completion Rate */}
      <MetricCard
        title={isRTL ? 'إنجاز التدريب والمشاركات' : 'Training Completion Rate'}
        value={`${trainingStats.rate}%`}
        description={
          isRTL
            ? `${trainingStats.completed} مكتمل من ${trainingStats.total} مسار تدريبي`
            : `${trainingStats.completed} completed of ${trainingStats.total} active enrollments`
        }
        badgeText={trainingStats.rate > 0 ? `+${trainingStats.rate}%` : undefined}
        badgePositive={true}
        trendText={isRTL ? 'معيار قياسي' : 'Benchmark'}
        progressValue={trainingStats.rate}
        icon={GraduationCap}
        iconColor="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-500/10 border border-amber-500/20"
        glowColor="bg-amber-500/15"
        onClick={() => navigate('/learning')}
      />

      {/* 2. Active Learners & Personnel */}
      <MetricCard
        title={isRTL ? 'المتعلمون النشطون' : 'Active Learners'}
        value={trainingStats.activeLearners}
        description={
          isRTL
            ? 'موظفون يشاركون بنشاط في المسارات التدريبية'
            : 'Enrolled staff progressing through accredited modules'
        }
        badgeText={trainingStats.activeLearners > 0 ? (isRTL ? 'نشط' : 'Active') : undefined}
        badgePositive={true}
        trendText={isRTL ? 'نمو شهري' : '+14% MoM'}
        icon={Users}
        iconColor="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-500/10 border border-blue-500/20"
        glowColor="bg-blue-500/15"
        onClick={() => navigate('/analytics/learning?lens=learners')}
      />

      {/* 3. Open Operational Tasks & Action Items */}
      <MetricCard
        title={isRTL ? 'المهام والتكليفات المفتوحة' : 'Open Tasks & Actions'}
        value={openTasksCount}
        description={
          isRTL
            ? 'تكليفات تشغيلية بانتظار المتابعة والإنجاز'
            : 'Operational tasks requiring follow-up or review'
        }
        badgeText={openTasksCount > 0 ? `${openTasksCount} ${isRTL ? 'معلقة' : 'Open'}` : (isRTL ? 'منجز' : 'Clear')}
        badgePositive={openTasksCount <= 5}
        trendText={openTasksCount === 0 ? (isRTL ? 'مكتمل' : 'All done') : undefined}
        icon={CheckSquare}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-500/10 border border-emerald-500/20"
        glowColor="bg-emerald-500/15"
        onClick={() => navigate('/tasks')}
      />

      {/* 4. SOP Knowledge & Quality Reviews */}
      <MetricCard
        title={isRTL ? 'أدلة التشغيل والحوكمة' : 'Standard Operating SOPs'}
        value={knowledgeCount}
        description={
          pendingReviewsCount > 0
            ? (isRTL ? `${pendingReviewsCount} طلبات مراجعة بانتظار الاعتماد` : `${pendingReviewsCount} items pending quality signoff`)
            : (isRTL ? 'كافة الأدلة والسياسات معتمدة ومحدثة' : 'All standard operating procedures verified')
        }
        badgeText={pendingReviewsCount > 0 ? (isRTL ? `${pendingReviewsCount} معلق` : `${pendingReviewsCount} Review`) : (isRTL ? 'معتمد' : 'Verified')}
        badgePositive={pendingReviewsCount === 0}
        icon={BookOpen}
        iconColor="text-rose-600 dark:text-rose-400"
        iconBg="bg-rose-500/10 border border-rose-500/20"
        glowColor="bg-rose-500/15"
        onClick={() => navigate(pendingReviewsCount > 0 ? '/manage/reviews' : '/knowledge')}
      />
    </div>
  )
}

export default DashboardMetricsDeck


