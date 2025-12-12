import { useState } from 'react'
import { useTasks, useTaskStats } from '@/hooks/useTasks'
import { useAuth } from '@/contexts/AuthContext'
import { TaskKanban } from '@/components/tasks/TaskKanban'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, LayoutGrid, List as ListIcon, Loader2 } from 'lucide-react'

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
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [filters, setFilters] = useState({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: tasks = [], isLoading } = useTasks(filters)
  const { data: stats } = useTaskStats(user?.id)

  if (isLoading && !stats) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-gray-600">
            Manage and track your tasks and projects.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.total_tasks} />
          <StatCard label="To Do" value={stats.todo_tasks} />
          <StatCard label="In Progress" value={stats.in_progress_tasks} />
          <StatCard label="Review" value={stats.review_tasks} />
          <StatCard label="Completed" value={stats.completed_tasks} />
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 w-full">
          <TaskFilters filters={filters} onChange={setFilters} />
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kanban"><LayoutGrid className="w-4 h-4 mr-2" />Board</TabsTrigger>
            <TabsTrigger value="list"><ListIcon className="w-4 h-4 mr-2" />List</TabsTrigger>
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
                <p className="text-gray-600">No tasks found matching your filters.</p>
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
            <DialogTitle>Create New Task</DialogTitle>
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
