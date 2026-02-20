import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTranslation } from "react-i18next";
import { cn } from '@/lib/utils';

export function AnnouncementsWidget() {
  const { data: announcements, isLoading } = useAnnouncements({ limit: 6 })
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            {t('widgets.announcements_title', 'Announcements')}
          </CardTitle>
          <CardDescription>{t('widgets.announcements_desc', 'Latest updates from your organization')}</CardDescription>
        </div>
        <Link to="/announcements">
          <Button variant="ghost" size="sm" className="gap-1">
            {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-3 pr-4">
            {announcements?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t('widgets.no_announcements', 'No announcements yet')}</p>
              </div>
            ) : (
              announcements?.map((announcement: any, index: number) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link 
                    to={`/announcements/${announcement.id}`}
                    className="flex gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {announcement.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {announcement.created_at && format(new Date(announcement.created_at), 'MMM d, yyyy', { locale: isRTL ? ar : undefined })}
                        {announcement.priority === 'high' && (
                          <Badge variant="destructive" className="text-[10px] h-4">{t('common.priority.high', 'High')}</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
