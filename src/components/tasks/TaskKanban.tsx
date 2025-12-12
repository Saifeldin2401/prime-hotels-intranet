import { useMemo } from 'react'
import type { Task, TaskStatus } from '@/lib/types'
import { TaskCard } from './TaskCard'
import { useTranslation } from 'react-i18next'

interface TaskKanbanProps {
    tasks: Task[]
}

export function TaskKanban({ tasks }: TaskKanbanProps) {
    const { t } = useTranslation('tasks')

    const columns: { id: TaskStatus; label: string }[] = [
        { id: 'todo', label: t('kanban.todo') },
        { id: 'in_progress', label: t('kanban.in_progress') },
        { id: 'review', label: t('kanban.review') },
        { id: 'completed', label: t('kanban.completed') },
    ]

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

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
            {columns.map(col => (
                <div key={col.id} className="min-w-[280px] w-[320px] bg-muted/50 rounded-lg p-2 flex flex-col">
                    <div className="flex items-center justify-between p-2 mb-2 font-semibold text-sm">
                        <span>{col.label}</span>
                        <span className="bg-background text-muted-foreground px-2 py-0.5 rounded text-xs">
                            {groupedTasks[col.id].length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex flex-col gap-2 p-1">
                            {groupedTasks[col.id].map(task => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                            {groupedTasks[col.id].length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-xs italic">
                                    {t('kanban.no_tasks')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
