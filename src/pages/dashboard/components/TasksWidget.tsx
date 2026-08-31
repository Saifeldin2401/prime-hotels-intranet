import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import type { DashboardFocusMode } from '@/hooks/useDashboardFocus'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useUndoableAction } from '@/hooks/useUndoableAction'
import { cn } from '@/lib/utils'
import { differenceInDays, format, isToday, isTomorrow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { ArrowRight, Check, CheckCircle2, CheckSquare, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function TasksWidget({ focusMode = 'my_work' }: { focusMode?: DashboardFocusMode }) {
  const { user } = useAuth()
  const { data: tasks, isLoading } = useTasks({
    statuses: ['todo', 'in_progress', 'review'],
    assignedTo: focusMode === 'my_work' ? user?.id : undefined,
    createdBy: focusMode === 'my_team' ? user?.id : undefined,
    limit: 5,
    ignorePropertyFilter: true
  })
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
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
      onCancel: () => {},
    }
  )

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent': return 'bg-rose-500'
      case 'medium': return 'bg-amber-400'
      case 'low': return 'bg-blue-400'
      default: return 'bg-muted-foreground'
    }
  }

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate)
    if (isToday(date)) return t('staff.due_today', 'Due today')
    if (isTomorrow(date)) return t('staff.due_tomorrow', 'Due tomorrow')
    return format(date, 'MMM d', { locale: isRTL ? ar : undefined })
  }

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {focusMode === 'my_work' ? t('widgets.my_tasks_title', 'My Tasks') : t('widgets.team_tasks_title', 'Delegated Tasks')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {focusMode === 'my_work' ? t('widgets.my_tasks_desc', 'Your pending assignments') : t('widgets.team_tasks_desc', 'Tasks you assigned to others')}
              </p>
            </div>
          </div>

          <Button asChild variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <Link to={user?.id ? (focusMode === 'my_work' ? `/tasks?assignedToIds=${user.id}` : `/tasks?createdBy=${user.id}`) : '/tasks'}>
              <span>{isRTL ? 'لوحة المهام' : 'Task Board'}</span>
              <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </Button>
        </div>

        {/* Content list */}
        <div className="mt-4 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : !tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {isRTL ? 'لا توجد مهام معلقة لديك' : 'All tasks completed'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {isRTL ? 'عمل رائع! كافة التكليفات والمهام اليومية منجزة' : 'Great job! You have no open action items for today.'}
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const priorityClass = getPriorityColor(task.priority)
              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-3 transition-all duration-150 hover:border-blue-500/30 hover:bg-card/80 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 flex-1 pe-2">
                    <button
                      onClick={() => executeMarkComplete(task.id)}
                      disabled={isMarkingComplete}
                      aria-label="Mark task as complete"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/80 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Check className="h-3 w-3 text-transparent group-hover:text-emerald-500 transition-colors" />
                    </button>

                    <div className="space-y-0.5 min-w-0">
                      <Link
                        to={`/tasks?taskId=${task.id}`}
                        className="text-xs font-bold text-foreground hover:text-blue-500 transition-colors line-clamp-1 block"
                      >
                        {task.title}
                      </Link>
                      {task.due_date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityClass}`} />
                          <span>{formatDueDate(task.due_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
export default TasksWidget
