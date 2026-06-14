import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import type { DashboardFocusMode } from '@/hooks/useDashboardFocus'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useUndoableAction } from '@/hooks/useUndoableAction'
import { cn } from '@/lib/utils'
import { differenceInDays, format, isToday, isTomorrow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowRight, Check, CheckCircle, CheckSquare, Clock } from 'lucide-react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

export function TasksWidget({ focusMode = 'my_work' }: { focusMode?: DashboardFocusMode }) {
  const { user } = useAuth()
  const { data: tasks, isLoading } = useTasks({
    statuses: ['open', 'todo', 'in_progress', 'pending'],
    assignedTo: focusMode === 'my_work' ? user?.id : undefined,
    createdBy: focusMode === 'my_team' ? user?.id : undefined,
    limit: 6,
    ignorePropertyFilter: true
  })
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';
  const updateTask = useUpdateTask()

  // Undoable action for marking tasks complete
  const { execute: executeMarkComplete, isPending: isMarkingComplete } = useUndoableAction(
    async (taskId: string) => {
      await updateTask.mutateAsync({ id: taskId, status: 'completed' })
    },
    {
      delay: 5000,
      message: t('undo.task_marked_complete', 'Task will be marked complete'),
      successMessage: t('undo.task_completed', 'Task completed successfully'),
      onCancel: () => {
        // Task completion was cancelled - no action needed
        // The actual update only happens after the delay
      },
    }
  )

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent': return 'bg-rose-500 shadow-rose-500/30'
      case 'medium': return 'bg-amber-400 shadow-amber-400/30'
      case 'low': return 'bg-blue-400 shadow-blue-400/30'
      default: return 'bg-slate-300 shadow-slate-300/30'
    }
  }

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return t('staff.due_today', 'Due today');
    if (isTomorrow(date)) return t('staff.due_tomorrow', 'Due tomorrow');
    return format(date, 'MMM d', { locale: isRTL ? ar : undefined });
  }

  if (isLoading) {
    const skeletonRows = ['r1', 'r2', 'r3']

    return (
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {skeletonRows.map((id) => <Skeleton key={id} className="h-16 w-full rounded-xl" />)}
        </div>
      </Card>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 relative z-10 bg-white">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <CheckSquare className="w-5 h-5" />
              </div>
              {focusMode === 'my_work' ? t('widgets.my_tasks_title', 'My Tasks') : t('widgets.team_tasks_title', 'Delegated Tasks')}
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
              {focusMode === 'my_work' ? t('widgets.my_tasks_desc', 'Your pending assignments') : t('widgets.team_tasks_desc', 'Tasks you assigned to others')}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors">
            <Link to="/tasks">
              {t('actions.view_all', 'View All')} <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1 relative bg-slate-50/30">
          <ScrollArea className="h-[340px] px-6 pb-6 pt-2">
            <div className="space-y-3">
              {tasks?.length === 0 ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 flex flex-col items-center justify-center h-full"
                >
                  <div className="w-16 h-16 bg-blue-50/80 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-100/50 shadow-sm">
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-slate-800 font-bold text-lg">{t('widgets.pending_widget.all_caught_up', 'All caught up!')}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1 pe-4 ps-4">{t('staff.no_tasks', "You don't have any pending tasks right now. Great job!")}</p>
                </m.div>
              ) : (
                tasks?.map((task, index: number) => {
                  const isOverdue = new Date(task.due_date) < new Date() && !isToday(new Date(task.due_date))
                  const startsSoon = differenceInDays(new Date(task.due_date), new Date()) < 2

                  return (
                    <m.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ease: "easeOut" }}
                    >
                      <div
                        className="group flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:border-slate-300 hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] transition-all ease-out hover:-translate-y-0.5"
                      >
                        {/* Priority Indicator Dot */}
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm",
                          getPriorityColor(task.priority)
                        )} />

                        <div className="flex-1 min-w-0">
                          <Link to={`/tasks/${task.id}`}>
                            <p className="font-bold text-[15px] text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                              {task.title}
                            </p>
                          </Link>

                          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs font-semibold">
                            {task.due_date ? (
                              <span className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                                isOverdue ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                  startsSoon ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                    "bg-slate-50 text-slate-500 border border-slate-100"
                              )}>
                                <Clock className="w-3.5 h-3.5" />
                                {formatDueDate(task.due_date)}
                                {isOverdue && <span className="ms-0.5">(Overdue)</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-100">
                                <Clock className="w-3.5 h-3.5" />
                                No Date
                              </span>
                            )}

                            <Badge variant="outline" className="text-[10px] h-6 px-2 uppercase tracking-wider font-bold text-slate-500 border-slate-200 group-hover:border-slate-300 bg-white">
                              {task.priority || 'Normal'}
                            </Badge>

                            {/* Mark Complete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 ms-auto opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                executeMarkComplete(task.id)
                              }}
                              disabled={isMarkingComplete}
                            >
                              <Check className="w-3.5 h-3.5" />
                              {t('actions.mark_complete', 'Complete')}
                            </Button>
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
