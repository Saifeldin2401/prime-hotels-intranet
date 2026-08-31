import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ClipboardCheck, 
  Clock, 
  ArrowRight,
  CheckCircle,
  FileEdit 
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface ContentReviewItem {
  id: string
  content_type: 'course' | 'article' | 'assessment'
  content_id: string
  status: string
  submitted_at: string
  submitted_by?: string
  review_notes?: string
}

export const ReviewQueueWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const { data: reviewItems = [], isLoading } = useQuery<ContentReviewItem[]>({
    queryKey: ['dashboard_content_reviews_widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reviews')
        .select('*')
        .eq('status', 'in_review')
        .order('submitted_at', { ascending: false })
        .limit(4)

      if (error) {
        return []
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'course':
        return { label: isRTL ? 'دورة تدريبية' : 'Course', color: 'bg-amber-500/10 text-amber-500' }
      case 'article':
        return { label: isRTL ? 'دليل تشغيلي' : 'SOP Article', color: 'bg-blue-500/10 text-blue-500' }
      case 'assessment':
        return { label: isRTL ? 'تقييم كفاءة' : 'Assessment', color: 'bg-purple-500/10 text-purple-500' }
      default:
        return { label: type, color: 'bg-muted text-muted-foreground' }
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'طابور الحوكمة والاعتماد' : 'Governance & Reviews'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'المحتوى والبرامج بانتظار مراجعة الجودة' : 'Items pending quality signoff & publishing'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/manage/reviews')}
            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>{isRTL ? 'إدارة الطابور' : 'Manage'}</span>
            <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : reviewItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {isRTL ? 'كافة العناصر معتمدة ولا توجد طلبات معلقة' : 'Review queue is all clear'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {isRTL ? 'كافة الدورات والأدلة المنشورة موافقة لمعايير الجودة' : 'All training courses and documents are up to date'}
              </p>
            </div>
          ) : (
            reviewItems.map((item) => {
              const typeInfo = getTypeBadge(item.content_type)
              const timeAgo = new Date(item.submitted_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/manage/reviews/${item.id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-3.5 transition-all duration-150 hover:border-emerald-500/30 hover:bg-card/80 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <FileEdit className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {isRTL ? 'طلب اعتماد' : 'Pending review'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-emerald-500 transition-colors line-clamp-1">
                        {item.review_notes || (isRTL ? 'مراجعة تحديث المحتوى والمعايير' : 'Content verification request')}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {timeAgo}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
