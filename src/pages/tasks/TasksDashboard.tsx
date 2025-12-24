import { useState } from 'react'
import { useTasks, useTaskStats } from '@/hooks/useTasks'
import { useAuth } from '@/contexts/AuthContext'
import { TaskKanban } from '@/components/tasks/TaskKanban'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, LayoutGrid, List as ListIcon, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function StatCard({ label, value }: { label: string, value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function TasksDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation('tasks')
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [filters, setFilters] = useState({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: tasks = [], isLoading } = useTasks(filters)
  const { data: stats } = useTaskStats(user?.id)

  if (isLoading && !stats) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6 container mx-auto py-4 px-4 sm:py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('tasks')}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t('page_description')}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto h-11">
          <Plus className="w-4 h-4 mr-2" />
          {t('create_task')}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard label={t('stats.total')} value={stats.total_tasks} />
          <StatCard label={t('stats.todo')} value={stats.todo_tasks} />
          <StatCard label={t('stats.in_progress')} value={stats.in_progress_tasks} />
          <StatCard label={t('stats.review')} value={stats.review_tasks} />
          <StatCard label={t('stats.completed')} value={stats.completed_tasks} />
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-muted/30 p-3 rounded-xl">
        <div className="flex-1 w-full overflow-x-auto no-scrollbar">
          <TaskFilters filters={filters} onChange={setFilters} />
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full lg:w-[200px]">
          <TabsList className="grid w-full grid-cols-2 h-11 bg-background/50">
            <TabsTrigger value="kanban" className="data-[state=active]:bg-white"><LayoutGrid className="w-4 h-4 mr-2" />{t('board')}</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-white"><ListIcon className="w-4 h-4 mr-2" />{t('list')}</TabsTrigger>
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
                <p className="text-gray-600">{t('no_tasks_found')}</p>
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
              Form to create a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
