import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskKanban } from '@/components/tasks/TaskKanban'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useTasks, useTaskStats } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'
import { AnalyticsEvents } from '@/types/analytics'
import {
    BarChart3,
    CheckCircle2,
    Clock,
    Eye,
    LayoutGrid,
    List as ListIcon,
    ListTodo,
    Loader2,
    Plus
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statConfig = [
  {
    key: 'total',
    field: 'total_tasks',
    icon: BarChart3,
    gradient: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50 dark:bg-slate-900/40',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700/60',
  },
  {
    key: 'todo',
    field: 'todo_tasks',
    icon: ListTodo,
    gradient: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-50 dark:bg-blue-900/40',
    iconBg: 'bg-blue-100 dark:bg-blue-800/60',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-700/60',
  },
  {
    key: 'in_progress',
    field: 'in_progress_tasks',
    icon: Clock,
    gradient: 'from-amber-500 to-amber-700',
    bgLight: 'bg-amber-50 dark:bg-amber-900/40',
    iconBg: 'bg-amber-100 dark:bg-amber-800/60',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-700/60',
  },
  {
    key: 'review',
    field: 'review_tasks',
    icon: Eye,
    gradient: 'from-purple-500 to-purple-700',
    bgLight: 'bg-purple-50 dark:bg-purple-900/40',
    iconBg: 'bg-purple-100 dark:bg-purple-800/60',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-700/60',
  },
  {
    key: 'completed',
    field: 'completed_tasks',
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-emerald-700',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800/60',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-700/60',
  },
] as const

export default function TasksDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation('tasks')
  const [view, setView] = useState<'list' | 'kanban'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'list' : 'kanban'
  )
  const [filters, setFilters] = useState({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { track } = useAnalytics()

  const { data: tasks = [], isLoading } = useTasks(filters)
  const { data: stats } = useTaskStats(user?.id)

  if (isLoading && !stats) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6 container mx-auto py-4 px-4 sm:py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t('tasks')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('page_description')}
          </p>
        </div>
        <Button onClick={() => {
          setShowCreateDialog(true)
          track(AnalyticsEvents.FEATURE_USAGE, { feature: 'tasks', action: 'create_start' })
        }} className="w-full sm:w-auto h-11">
          <Plus className="w-4 h-4 me-2" />
          {t('create_task')}
        </Button>
      </div>

      {/* Premium Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {statConfig.map((cfg) => {
            const Icon = cfg.icon
            const value = (stats as any)[cfg.field] ?? 0

            return (
              <div
                key={cfg.key}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md',
                  cfg.borderColor, cfg.bgLight
                )}
              >
                {/* Gradient top accent */}
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', cfg.gradient)} />

                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', cfg.iconBg)}>
                    <Icon className={cn('h-5 w-5', cfg.textColor)} />
                  </div>
                  <div className="min-w-0">
                    <div className={cn('text-2xl font-bold', cfg.textColor)}>{value}</div>
                    <div className="text-xs text-muted-foreground truncate">{t(`stats.${cfg.key}`)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/40">
        <div className="flex-1 w-full overflow-x-auto no-scrollbar">
          <TaskFilters filters={filters} onChange={setFilters} />
        </div>

        <Tabs value={view} onValueChange={(v) => {
          setView(v as any)
          track(AnalyticsEvents.FEATURE_USAGE, { feature: 'tasks', action: 'view_toggle', value: v })
        }} className="w-full lg:w-[200px]">
          <TabsList className="grid w-full grid-cols-2 h-11 bg-background/50">
            <TabsTrigger value="kanban" className="data-[state=active]:bg-background"><LayoutGrid className="w-4 h-4 me-2" />{t('board')}</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-background"><ListIcon className="w-4 h-4 me-2" />{t('list')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        {view === 'kanban' ? (
          <TaskKanban tasks={tasks} />
        ) : (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <ListTodo className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">{t('no_tasks_found')}</p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('create_new_task')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('page_description')}
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSuccess={() => {
              setShowCreateDialog(false)
              track(AnalyticsEvents.FEATURE_USAGE, { feature: 'tasks', action: 'create_complete' })
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
