import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Megaphone, 
  AlertCircle, 
  Pin, 
  ArrowRight,
  ChevronRight 
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { Button } from '@/components/ui/button'

interface AnnouncementItem {
  id: string
  title: string
  content?: string
  priority?: string
  is_pinned?: boolean
  created_at: string
  property_id?: string
}

export const AnnouncementsFeedWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { currentProperty } = useProperty()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['dashboard_announcements_feed', currentProperty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, priority, is_pinned, created_at, property_id')
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4)

      if (error) {
        return []
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'التعاميم والإعلانات الرسمية' : 'Official Bulletins'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'توجيهات الإدارة والقرارات المؤسسية' : 'Corporate directives & announcements'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/announcements')}
            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>{isRTL ? 'الأرشيف' : 'Archive'}</span>
            <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Announcements List */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 mb-3">
                <Megaphone className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {isRTL ? 'لا توجد إعلانات نشطة' : 'No active bulletins'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {isRTL ? 'سيتم نشر الإعلانات والتوجيهات الرسمية هنا فور صدورها' : 'Official communications will appear here once published'}
              </p>
            </div>
          ) : (
            announcements.map((ann) => {
              const displayTitle = ann.title
              const displayContent = ann.content
              const isUrgent = ann.priority === 'urgent' || ann.priority === 'high'
              const dateStr = new Date(ann.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={ann.id}
                  onClick={() => navigate(`/announcements`)}
                  className="group flex cursor-pointer items-start justify-between rounded-2xl border border-border/40 bg-card/40 p-3.5 transition-all duration-150 hover:border-purple-500/30 hover:bg-card/80 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3 pe-2">
                    <div className="mt-0.5">
                      {ann.is_pinned ? (
                        <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground group-hover:text-purple-500 transition-colors line-clamp-1">
                          {displayTitle}
                        </h4>
                        {isUrgent && (
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                            {isRTL ? 'هام' : 'Urgent'}
                          </span>
                        )}
                      </div>
                      {displayContent && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {displayContent}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {dateStr}
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
