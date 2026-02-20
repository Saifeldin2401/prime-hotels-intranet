import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTasks } from '@/hooks/useTasks'
import { isToday, isTomorrow, format, differenceInDays } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTranslation } from "react-i18next";
import { useAuth } from '@/hooks/useAuth'

export function TasksWidget() {
  const { user } = useAuth()
  const { data: tasks, isLoading } = useTasks({
    statuses: ['todo', 'pending', 'in_progress'],
    assignedTo: user?.id,
    limit: 6,
    ignorePropertyFilter: true
  })
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-slate-500'
    }
  }

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return t('staff.due_today', 'Due today');
    if (isTomorrow(date)) return t('staff.due_tomorrow', 'Due tomorrow');
    return format(date, 'MMM d', { locale: isRTL ? ar : undefined });
  }

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
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            {t('widgets.my_tasks_title', 'My Tasks')}
          </CardTitle>
          <CardDescription>{t('widgets.my_tasks_desc', 'Your pending assignments')}</CardDescription>
        </div>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="gap-1">
            {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-4">
            {tasks?.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-muted-foreground font-medium">{t('widgets.pending_widget.all_caught_up', 'All caught up!')}</p>
                <p className="text-sm text-muted-foreground">{t('staff.no_tasks', 'No pending tasks')}</p>
              </div>
            ) : (
              tasks?.map((task: any, index: number) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link 
                    to={`/tasks/${task.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group bg-white"
                  >
                    <div className={cn(
                      "w-1 self-stretch rounded-full",
                      getPriorityColor(task.priority)
                    )} />
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {task.due_date && (
                          <span className={cn(
                            "flex items-center gap-1",
                            differenceInDays(new Date(task.due_date), new Date()) < 2 && "text-red-500 font-medium"
                          )}>
                            <Clock className="w-3 h-3" />
                            {formatDueDate(task.due_date)}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] h-5">
                          {task.priority}
                        </Badge>
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
