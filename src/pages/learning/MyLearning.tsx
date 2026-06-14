import { DailyQuizWidget } from '@/components/questions/DailyQuizWidget'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import {
    useMyAssignments,
} from '@/hooks/useTraining'
import { calculateStreak } from '@/lib/training/analytics'
import { cn } from '@/lib/utils'
import type { LearningAssignment } from '@/types/learning'
import { format, formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { AlertCircle, Award, BookOpen, CheckCircle, Clock, FileQuestion, Flame, Loader2, Play, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'

export default function MyLearning() {
    const { t, i18n } = useTranslation(['training', 'common'])
    const navigate = useNavigate()
    const { user: _user } = useAuth()
    const isRTL = i18n.dir() === 'rtl'
    const dateLocale = isRTL ? ar : enUS

    // Fetch data using new MyAssignments hook which queries learning_assignments
    const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useMyAssignments()
    // We still fetch progress separately or rely on what's joined in assignments? 
    // learningService.getMyAssignments fetches joined progress.

    // Legacy stats hook might need update, but let's hide stats or use what we have for now.
    // Ideally we derive stats from assignments array.

    // Mutations (handled via navigation mostly now)

    const handleStart = (assignment: LearningAssignment) => {
        if (assignment.content_type === 'quiz') {
            navigate(`/learning/quizzes/${assignment.content_id}/take?assignment=${assignment.id}`)
        } else if (assignment.content_type === 'module') {
            navigate(`/learning/training/${assignment.content_id}?assignment=${assignment.id}`)
        }
    }

    const isLoading = assignmentsLoading

    // Filter and Process Data
    const allItems = assignments || []

    const activeItems = allItems.filter(item =>
        !item.progress || item.progress.status !== 'completed'
    ).sort((a, b) => {
        // Priority first
        if (a.priority === 'compliance' && b.priority !== 'compliance') return -1;
        if (b.priority === 'compliance' && a.priority !== 'compliance') return 1;

        // Then Due Date
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })

    const completedItems = allItems.filter(item =>
        item.progress?.status === 'completed'
    ).sort((a, b) => {
        if (!a.progress?.completed_at) return 1;
        if (!b.progress?.completed_at) return -1;
        return new Date(b.progress.completed_at).getTime() - new Date(a.progress.completed_at).getTime();
    })

    // Calculated Stats
    const stats = {
        totalAssigned: allItems.length,
        inProgress: allItems.filter(i => i.progress?.status === 'in_progress').length,
        completed: completedItems.length,
        overdue: activeItems.filter(a => a.due_date && new Date(a.due_date) < new Date()).length,
        streak: calculateStreak(completedItems.map(i => ({ completed_at: i.progress?.completed_at || null })))
    }

    const activeColumns: ColumnDef<LearningAssignment>[] = [
        {
            accessorKey: 'content_title',
            header: t('topic'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="flex flex-col gap-1 min-w-[200px]">
                        <div className="flex items-center gap-2 font-medium">
                            {item.content_type === 'quiz' ? <FileQuestion className="h-4 w-4 text-purple-500" /> : <BookOpen className="h-4 w-4 text-blue-500" />}
                            {item.content_title || t('untitledAssignment')}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.content_metadata?.description || t('noDescription')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            {item.content_metadata?.duration && <span>{item.content_metadata.duration} {t('min')}</span>}
                            {item.content_metadata?.question_count && <span>{item.content_metadata.question_count} {t('questions')}</span>}
                        </div>
                    </div>
                )
            }
        },
        {
            id: 'status',
            header: t('status'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="flex flex-col gap-2 min-w-[120px]">
                        <div className="flex flex-wrap gap-1">
                            <Badge variant={item.progress?.status === 'in_progress' ? 'default' : 'secondary'}>
                                {t((item.progress?.status || 'notStarted'))}
                            </Badge>
                            {item.priority === 'compliance' && (
                                <Badge variant="destructive">{t('mandatory')}</Badge>
                            )}
                            {item.onboarding_process_id && (
                                <Badge
                                    variant="outline"
                                    className="bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/onboarding');
                                    }}
                                >
                                    <Sparkles className="h-3 w-3 me-1" />
                                    Onboarding Required
                                </Badge>
                            )}
                        </div>
                        {item.progress?.status === 'in_progress' && (
                            <Progress value={item.progress.progress_percentage || 0} className="h-1.5 w-full" />
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: 'due_date',
            header: t('due'),
            cell: ({ row }) => {
                const item = row.original
                if (!item.due_date) return null
                const isOverdue = new Date(item.due_date) < new Date()
                return (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.due_date), { addSuffix: true, locale: dateLocale })}
                    </span>
                )
            }
        },
        {
            id: 'actions',
            header: t('action'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <Button
                        size="sm"
                        onClick={() => handleStart(item)}
                        className={cn("w-full sm:w-auto", isRTL ? 'flex-row-reverse' : '')}
                    >
                        {item.progress?.status === 'in_progress' ? (
                            <>{t('continue')}</>
                        ) : (
                            <><Play className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} /> {t('start')}</>
                        )}
                    </Button>
                )
            }
        }
    ]

    const completedColumns: ColumnDef<LearningAssignment>[] = [
        {
            accessorKey: 'content_title',
            header: t('topic'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="flex items-center gap-2 font-medium">
                        {item.content_type === 'quiz' ? <FileQuestion className="h-4 w-4 text-muted-foreground" /> : <BookOpen className="h-4 w-4 text-muted-foreground" />}
                        {item.content_title}
                    </div>
                )
            }
        },
        {
            id: 'completed_at',
            header: t('completed'),
            cell: ({ row }) => {
                const item = row.original
                return item.progress?.completed_at ? format(new Date(item.progress.completed_at), 'MMM d, yyyy', { locale: dateLocale }) : '-'
            }
        },
        {
            id: 'score',
            header: t('score'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <span className="font-mono">
                        {item.progress?.score_percentage != null ? `${item.progress.score_percentage}%` : 'N/A'}
                    </span>
                )
            }
        },
        {
            id: 'actions',
            header: t('action'),
            cell: () => {
                return (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/training/certificates`)}>
                        <Award className={`h-4 w-4 text-purple-600 ${isRTL ? 'ms-2' : 'me-2'}`} />
                        {t('certificate')}
                    </Button>
                )
            }
        }
    ]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (assignmentsError) {
        return (
            <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                    <CardTitle>{t('error', { defaultValue: 'Error' })}</CardTitle>
                    <CardDescription>
                        {t('loadAssignmentsFailed', {
                            defaultValue: 'We could not load your training assignments right now. Please refresh and try again.'
                        })}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('myLearning')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('myLearningDescription')}
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalAssigned}</div>
                        <div className="text-sm text-muted-foreground">{t('assigned')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                        <div className="text-sm text-muted-foreground">{t('inProgress')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        <div className="text-sm text-muted-foreground">{t('completed')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                        <div className="text-sm text-muted-foreground">{t('overdue')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold text-orange-500">{stats.streak}</div>
                            <Flame className={cn("h-5 w-5 text-orange-500", stats.streak > 0 && "animate-pulse")} />
                        </div>
                        <div className="text-sm text-muted-foreground">{t('streakDays')}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        {t('requiredAction')}
                    </h2>

                    {activeItems.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                <h3 className="font-medium text-lg">{t('allCaughtUp')}</h3>
                                <p>{t('noPendingTraining')}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="bg-card rounded-lg border shadow-sm">
                            <DataTable
                                columns={activeColumns}
                                data={activeItems}
                            />
                        </div>
                    )}

                    <h2 className="text-xl font-semibold flex items-center gap-2 mt-8">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        {t('completedHistory')}
                    </h2>

                    <div className="bg-card rounded-lg border shadow-sm">
                        {completedItems.length === 0 ? (
                            <div className="px-4 py-8 text-center text-muted-foreground">
                                {t('noCompletedHistory')}
                            </div>
                        ) : (
                            <DataTable
                                columns={completedColumns}
                                data={completedItems}
                            />
                        )}
                    </div>
                </div>

                <div>
                    <InlineErrorBoundary
                        fallback={(
                            <Card className="mb-6 border-amber-200 bg-amber-50/80">
                                <CardHeader>
                                    <CardTitle>{t('dailyChallenge', { defaultValue: 'Daily Challenge' })}</CardTitle>
                                    <CardDescription>
                                        {t('dailyChallengeTemporarilyUnavailable', {
                                            defaultValue: 'The daily challenge is temporarily unavailable, but your training assignments are still available below.'
                                        })}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    >
                        <DailyQuizWidget className="mb-6" />
                    </InlineErrorBoundary>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('trainingSummary')}</CardTitle>
                            <CardDescription>{t('allTimePerformance')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm text-muted-foreground">{t('totalCompleted')}</span>
                                <span className="font-bold">{stats.completed}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm text-muted-foreground">{t('onTime')}</span>
                                <span className="font-bold text-green-600">
                                    {completedItems.filter(i => !i.due_date || new Date(i.progress!.completed_at!) <= new Date(i.due_date)).length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
