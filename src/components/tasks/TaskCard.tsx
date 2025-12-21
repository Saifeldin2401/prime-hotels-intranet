import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Paperclip, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import type { Task, TaskPriority } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface TaskCardProps {
    task: Task
}

const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
}

export function TaskCard({ task }: TaskCardProps) {
    const { t } = useTranslation('tasks')
    const navigate = useNavigate()

    return (
        <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/tasks/${task.id}`)}
        >
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-medium leading-none line-clamp-2">
                        {task.title}
                    </CardTitle>
                    <Badge variant="outline" className={`${priorityColors[task.priority]} border-none whitespace-nowrap`}>
                        {t(`priorities.${task.priority}`)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {task.description || t('description_placeholder')}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-3">
                        {task.assigned_to && (
                            <Avatar className="w-6 h-6">
                                <AvatarImage src={task.assigned_to.avatar_url || ''} />
                                <AvatarFallback>{task.assigned_to.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        )}
                        {task.due_date && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(task.due_date), 'MMM d')}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
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
            </CardContent>
        </Card>
    )
}
