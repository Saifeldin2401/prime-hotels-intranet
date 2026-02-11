import { useMemo, useState, useCallback } from 'react'
import type { Task, TaskStatus } from '@/lib/types'
import { TaskCard } from './TaskCard'
import { useTranslation } from 'react-i18next'
import { useUpdateTask } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'
import { ListTodo, Clock, Eye, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const columnConfig: { id: TaskStatus; icon: typeof ListTodo; color: string; headerBg: string; dropBg: string }[] = [
    {
        id: 'todo',
        icon: ListTodo,
        color: 'text-blue-600 dark:text-blue-400',
        headerBg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/60',
        dropBg: 'bg-blue-50/60 dark:bg-blue-900/20',
    },
    {
        id: 'in_progress',
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        headerBg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/60',
        dropBg: 'bg-amber-50/60 dark:bg-amber-900/20',
    },
    {
        id: 'review',
        icon: Eye,
        color: 'text-purple-600 dark:text-purple-400',
        headerBg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/60',
        dropBg: 'bg-purple-50/60 dark:bg-purple-900/20',
    },
    {
        id: 'completed',
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        headerBg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/60',
        dropBg: 'bg-emerald-50/60 dark:bg-emerald-900/20',
    },
]

interface TaskKanbanProps {
    tasks: Task[]
}

export function TaskKanban({ tasks }: TaskKanbanProps) {
    const { t } = useTranslation('tasks')
    const updateTask = useUpdateTask()
    const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

    const groupedTasks = useMemo(() => {
        const groups: Record<TaskStatus, Task[]> = {
            todo: [],
            in_progress: [],
            review: [],
            completed: [],
            cancelled: [],
        }

        tasks.forEach(task => {
            if (groups[task.status]) {
                groups[task.status].push(task)
            }
        })

        return groups
    }, [tasks])

    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId)
        e.dataTransfer.effectAllowed = 'move'
            // Add a slight delay for visual feedback
            ; (e.target as HTMLElement).style.opacity = '0.5'
    }, [])

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        ; (e.target as HTMLElement).style.opacity = '1'
        setDragOverColumn(null)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverColumn(columnId)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOverColumn(null)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault()
        setDragOverColumn(null)

        const taskId = e.dataTransfer.getData('text/plain')
        if (!taskId) return

        const task = tasks.find(t => t.id === taskId)
        if (!task || task.status === newStatus) return

        updateTask.mutate(
            { id: taskId, status: newStatus } as any,
            {
                onSuccess: () => {
                    toast.success(t('messages.task_updated'))
                },
            }
        )
    }, [tasks, updateTask, t])

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
            {columnConfig.map(col => {
                const Icon = col.icon
                const isDropTarget = dragOverColumn === col.id

                return (
                    <div
                        key={col.id}
                        className={cn(
                            'min-w-[280px] w-[320px] rounded-xl flex flex-col transition-colors duration-200 border',
                            isDropTarget
                                ? cn(col.dropBg, 'ring-2 ring-primary/30 border-primary/40')
                                : 'bg-muted/30 border-border/40'
                        )}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Colored column header */}
                        <div className={cn('flex items-center justify-between p-3 rounded-t-xl border-b', col.headerBg)}>
                            <div className="flex items-center gap-2">
                                <Icon className={cn('h-4 w-4', col.color)} />
                                <span className="font-semibold text-sm text-foreground">{t(`kanban.${col.id}`)}</span>
                            </div>
                            <span className="bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                                {groupedTasks[col.id].length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="flex flex-col gap-2">
                                {groupedTasks[col.id].map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        className="cursor-grab active:cursor-grabbing"
                                    >
                                        <TaskCard task={task} />
                                    </div>
                                ))}
                                {groupedTasks[col.id].length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                                            <Icon className="h-4 w-4 text-muted-foreground/40" />
                                        </div>
                                        {t('kanban.no_tasks')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
