import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyOnboarding, useUpdateOnboardingTask } from '@/hooks/useOnboarding'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Loader2, Calendar, CheckCircle2, Circle, PlayCircle, FileText, ExternalLink, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export default function OnboardingDashboard() {
    const { t } = useTranslation('onboarding')
    const navigate = useNavigate()
    const { data: onboarding, isLoading } = useMyOnboarding()
    const { mutate: updateTask } = useUpdateOnboardingTask()

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!onboarding) {
        return (
            <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-muted p-4">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.all_set')}</h2>
                    <p className="text-muted-foreground">
                        {t('dashboard.no_active')}
                    </p>
                </div>
            </div>
        )
    }

    const completedTasks = onboarding.tasks?.filter((t) => t.is_completed).length || 0
    const totalTasks = onboarding.tasks?.length || 0
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const handleTaskToggle = (taskId: string, currentStatus: boolean) => {
        updateTask({ taskId, isCompleted: !currentStatus })
    }

    const handleLinkClick = (task: any) => {
        if (task.link_type === 'training' && task.link_id) {
            navigate(`/learning/training/${task.link_id}`)
        } else if (task.link_type === 'document' && task.link_id) {
            navigate(`/documents/${task.link_id}`)
        } else if (task.link_type === 'url' && task.link_id) {
            window.open(task.link_id, '_blank')
        }
    }

    return (
        <div className="space-y-6 md:space-y-8 p-4 sm:p-6 md:p-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                    {t('dashboard.subtitle')}
                    <span className="font-semibold text-foreground"> {onboarding.template?.title}</span>.
                </p>
            </div>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">{t('dashboard.progress')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {completedTasks} {t('dashboard.of')} {totalTasks} {t('dashboard.tasks_completed')}
                            </span>
                            <span className="font-medium text-primary">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.checklist')}</h2>
                <div className="grid gap-4">
                    {onboarding.tasks?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((task) => (
                        <Card key={task.id} className={cn("transition-all duration-200", task.is_completed ? "bg-muted/50 opacity-70" : "bg-card hover:shadow-md")}>
                            <CardContent className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
                                <Checkbox
                                    checked={task.is_completed}
                                    onCheckedChange={() => handleTaskToggle(task.id, task.is_completed)}
                                    className="mt-1 h-5 w-5 shrink-0"
                                />
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className={cn("font-medium text-sm sm:text-base", task.is_completed && "line-through text-muted-foreground")}>
                                            {task.title}
                                        </span>
                                        {task.assigned_to_id !== onboarding.user_id && (
                                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-yellow-800 whitespace-nowrap">
                                                {t('dashboard.assigned_manager')}
                                            </span>
                                        )}
                                    </div>
                                    {task.description && (
                                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
                                            {task.description}
                                        </p>
                                    )}

                                    {/* Smart Links */}
                                    {task.link_type && task.link_id && !task.is_completed && (
                                        <div className="mt-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                                                onClick={() => handleLinkClick(task)}
                                            >
                                                {task.link_type === 'training' && <PlayCircle className="h-4 w-4" />}
                                                {task.link_type === 'document' && <FileText className="h-4 w-4" />}
                                                {task.link_type === 'url' && <ExternalLink className="h-4 w-4" />}

                                                {task.link_type === 'training' && t('actions.start_training')}
                                                {task.link_type === 'document' && t('actions.view_document')}
                                                {task.link_type === 'url' && t('actions.open_link')}

                                                <ArrowRight className="h-3 w-3 ml-1 opacity-50" />
                                            </Button>
                                        </div>
                                    )}

                                    {task.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                            <Calendar className="h-3 w-3" />
                                            {t('dashboard.due')} {format(new Date(task.due_date), 'MMM d, yyyy')}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
