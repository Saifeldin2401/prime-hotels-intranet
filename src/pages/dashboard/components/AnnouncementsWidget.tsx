import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { useAcknowledgeAnnouncement } from '@/hooks/useQuickActions'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { AlertCircle, ArrowRight, Bell, Calendar, Check, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

const announcementSkeletonKeys = ['ann-skeleton-1', 'ann-skeleton-2', 'ann-skeleton-3']

interface AnnouncementRead {
  announcement_id: string
  user_id: string
  read_at: string
}

export function AnnouncementsWidget() {
  const { data: announcements, isLoading } = useAnnouncements({ limit: 6 })
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()
  const acknowledge = useAcknowledgeAnnouncement()
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<string>>(new Set())
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set())

  // Fetch announcement reads for current user
  useEffect(() => {
    if (!user?.id) return

    const fetchReads = async () => {
      const { data } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
      
      if (data) {
        setReadAnnouncements(new Set(data.map((r: AnnouncementRead) => r.announcement_id)))
      }
    }

    fetchReads()
  }, [user?.id])

  const handleAcknowledge = async (announcementId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setAcknowledgingIds(prev => new Set(prev).add(announcementId))
    
    try {
      await acknowledge.mutateAsync({ announcementId })
      setReadAnnouncements(prev => new Set(prev).add(announcementId))
    } finally {
      setAcknowledgingIds(prev => {
        const next = new Set(prev)
        next.delete(announcementId)
        return next
      })
    }
  }

  const isAcknowledging = (id: string) => acknowledgingIds.has(id)
  const isRead = (id: string) => readAnnouncements.has(id)

  if (isLoading) {
    return (
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {announcementSkeletonKeys.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-20 w-full rounded-xl" />)}
        </div>
      </Card>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 relative z-10 bg-white border-b border-slate-100/50">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <Link to="/announcements" className="hover:text-amber-600 transition-colors">
                {t('widgets.announcements_title') || 'Announcements'}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
              {t('widgets.announcements_desc', 'Latest updates from your organization')}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors">
            <Link to="/announcements">
              {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1 relative bg-slate-50/30">
          <ScrollArea className="h-[340px] px-6 pb-6 pt-4">
            <div className="space-y-4">
              {announcements?.length === 0 ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 flex flex-col items-center justify-center h-full"
                >
                  <div className="w-16 h-16 bg-amber-50/80 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-amber-100/50 shadow-sm">
                    <Bell className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-slate-800 font-bold text-lg">{t('widgets.no_announcements', 'No announcements yet')}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1 pe-4 ps-4">We'll notify you when an update arrives.</p>
                </m.div>
              ) : (
                announcements?.map((announcement, index: number) => {
                  const isHighPriority = announcement.priority === 'important' || announcement.priority === 'critical';
                  const isNew = new Date().getTime() - new Date(announcement.created_at).getTime() < 1000 * 60 * 60 * 24 * 2; // 48 hours
                  const requiresAck = announcement.requires_acknowledgment || isHighPriority;
                  const hasRead = isRead(announcement.id);
                  const isProcessing = isAcknowledging(announcement.id);

                  return (
                    <m.div
                      key={announcement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ease: "easeOut" }}
                    >
                      <div
                        className={cn(
                          "group block p-4 rounded-2xl border bg-white shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] transition-all ease-out hover:-translate-y-0.5",
                          isHighPriority ? "border-rose-100 hover:border-rose-300" : "border-slate-100 hover:border-slate-300",
                          hasRead && "opacity-75"
                        )}
                      >
                        <div className="flex gap-4">
                          <Link 
                            to={`/announcements/${announcement.id}`}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                              isHighPriority ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-slate-50 border-slate-100 text-slate-400"
                            )}
                          >
                            {hasRead ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : (isHighPriority ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />)}
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link to={`/announcements/${announcement.id}`}>
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <p className={cn(
                                  "font-bold text-[15px] line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors",
                                  hasRead ? "text-slate-600" : "text-slate-800"
                                )}>
                                  {announcement.title}
                                </p>
                              </div>

                              <p className="text-sm font-medium text-slate-500 line-clamp-1 mb-3">
                                {(() => {
                              // Use recursive sanitization to prevent bypass attempts with nested tags
                              let previous: string;
                              let sanitized = announcement.content || '';
                              do {
                                previous = sanitized;
                                sanitized = previous.replace(/<[^>]*>?/gm, '');
                              } while (sanitized !== previous);
                              return sanitized || "Click to view full details...";
                            })()}
                              </p>
                            </Link>

                            <div className={cn(
                              "flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400",
                              isRTL && "flex-row-reverse"
                            )}>
                              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {announcement.created_at && format(new Date(announcement.created_at), 'MMM d, yyyy', { locale: isRTL ? ar : undefined })}
                              </span>

                              {isHighPriority && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-rose-200 bg-rose-50 text-rose-600 px-2 h-6">
                                  {t('common.priority.high', 'Priority')}
                                </Badge>
                              )}
                              {isNew && !isHighPriority && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-blue-200 bg-blue-50 text-blue-600 px-2 h-6">
                                  New
                                </Badge>
                              )}
                              {hasRead && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-emerald-200 bg-emerald-50 text-emerald-600 px-2 h-6">
                                  <Check className="w-3 h-3 me-1" />
                                  {t('common.acknowledged', 'Acknowledged')}
                                </Badge>
                              )}

                              {/* Acknowledge Button */}
                              {requiresAck && !hasRead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleAcknowledge(announcement.id, e)}
                                  disabled={isProcessing}
                                  className={cn(
                                    "h-6 text-xs px-2 ms-auto",
                                    isRTL && "me-auto ms-0",
                                    "border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                  )}
                                >
                                  {isProcessing ? (
                                    <m.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full"
                                    />
                                  ) : (
                                    <>
                                      <CheckCircle className={cn("w-3 h-3", isRTL ? "ms-1" : "me-1")} />
                                      {t('actions.acknowledge', 'Acknowledge')}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </m.div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </LazyMotion>
  )
}
