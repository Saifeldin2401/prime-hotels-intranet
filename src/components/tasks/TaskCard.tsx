import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Paperclip, MessageSquare, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, isPast, isToday } from 'date-fns'
import type { Task, TaskPriority } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface TaskCardProps {
    task: Task
}

const priorityConfig: Record<TaskPriority, { border: string; badge: string; label: string }> = {
    low: {
        border: 'border-s-emerald-400 dark:border-s-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        label: 'low',
    },
    medium: {
        border: 'border-s-blue-400 dark:border-s-blue-500',
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        label: 'medium',
    },
    high: {
        border: 'border-s-orange-400 dark:border-s-orange-500',
        badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        label: 'high',
    },
    urgent: {
        border: 'border-s-red-400 dark:border-s-red-500',
        badge: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800',
        label: 'urgent',
    },
}

export function TaskCard({ task }: TaskCardProps) {
    const { t } = useTranslation('tasks')
    const navigate = useNavigate()

    const isOverdue = task.due_date && task.status !== 'completed' && task.status !== 'cancelled' && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    const cfg = priorityConfig[task.priority] || priorityConfig.medium

    return (
        <div
            className={cn(
                'group relative bg-background rounded-lg border border-border/60 p-3.5 cursor-pointer',
                'transition-all duration-200 hover:shadow-md hover:border-border hover:-translate-y-0.5',
                'border-s-[3px]',
                cfg.border,
                isOverdue && 'bg-red-50/30 dark:bg-red-950/10'
            )}
            onClick={() => navigate(`/tasks/${task.id}`)}
        >
            {/* Header: title + priority badge */}
            <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-2 flex-1">
                    {task.title}
                </h3>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 whitespace-nowrap border shrink-0', cfg.badge)}>
                    {t(`priorities.${task.priority}`)}
                </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {task.description || t('description_placeholder')}
            </p>

            {/* Overdue badge */}
            {isOverdue && (
                <div className="flex items-center gap-1 mb-2">
                    <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
                        <AlertTriangle className="h-3 w-3" />
                        {t('overdue', 'Overdue')}
                    </Badge>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5">
                    {task.assigned_to && (
                        <Avatar className="w-6 h-6 ring-2 ring-background">
                            <AvatarImage src={task.assigned_to.avatar_url || ''} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{task.assigned_to.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                    )}
                    {task.due_date && (
                        <div className={cn(
                            'flex items-center gap-1',
                            isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
                        )}>
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(task.due_date), 'MMM d')}</span>
                        </div>
                    )}
                    {task.estimated_hours && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.estimated_hours}h</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5">
                    {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{task.comments.length}</span>
                        </div>
                    )}
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            <span>{task.attachments.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
