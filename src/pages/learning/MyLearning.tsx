import { DailyQuizWidget } from '@/components/questions/DailyQuizWidget'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useMyAssignments } from '@/hooks/useTraining'
import { calculateStreak } from '@/lib/training/analytics'
import { cn } from '@/lib/utils'
import type { LearningAssignment } from '@/types/learning'
import { format, formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    AlertCircle,
    Award,
    BookOpen,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    FileQuestion,
    Filter,
    Flame,
    GraduationCap,
    Grid,
    LayoutGrid,
    List,
    Loader2,
    Play,
    Search,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'

export default function MyLearning() {
    const { t, i18n } = useTranslation(['training', 'common', 'dashboard'])
    const navigate = useNavigate()
    const { user: _user } = useAuth()
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const dateLocale = isRTL ? ar : enUS

    // View mode and search/filter states
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState<'all' | 'in_progress' | 'mandatory' | 'quizzes' | 'completed'>('all')

    // Fetch data using MyAssignments hook which queries learning_assignments
    const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useMyAssignments()

    const handleStart = (assignment: LearningAssignment) => {
        if (assignment.content_type === 'quiz') {
            navigate(`/assessments/${assignment.content_id}/take?assignment=${assignment.id}`)
        } else if (assignment.content_type === 'module') {
            navigate(`/learning/training/${assignment.content_id}?assignment=${assignment.id}`)
        }
    }

    const isLoading = assignmentsLoading
    const allItems = assignments || []

    const activeItems = useMemo(() => {
        return allItems.filter(item =>
            !item.progress || item.progress.status !== 'completed'
        ).sort((a, b) => {
            // Priority first
            if (a.priority === 'compliance' && b.priority !== 'compliance') return -1
            if (b.priority === 'compliance' && a.priority !== 'compliance') return 1

            // Then Due Date
            if (!a.due_date) return 1
            if (!b.due_date) return -1
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })
    }, [allItems])

    const completedItems = useMemo(() => {
        return allItems.filter(item =>
            item.progress?.status === 'completed'
        ).sort((a, b) => {
            if (!a.progress?.completed_at) return 1
            if (!b.progress?.completed_at) return -1
            return new Date(b.progress.completed_at).getTime() - new Date(a.progress.completed_at).getTime()
        })
    }, [allItems])

    // Filtered items based on search and tab
    const filteredActiveItems = useMemo(() => {
        return activeItems.filter(item => {
            const matchesSearch = searchQuery.trim() === '' ||
                (item.content_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content_metadata?.description || '').toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return false

            if (selectedTab === 'in_progress') {
                return item.progress?.status === 'in_progress'
            }
            if (selectedTab === 'mandatory') {
                return item.priority === 'compliance'
            }
            if (selectedTab === 'quizzes') {
                return item.content_type === 'quiz'
            }
            return true
        })
    }, [activeItems, searchQuery, selectedTab])

    const filteredCompletedItems = useMemo(() => {
        return completedItems.filter(item => {
            if (searchQuery.trim() === '') return true
            return (item.content_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content_metadata?.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        })
    }, [completedItems, searchQuery])

    // Calculated Stats
    const stats = useMemo(() => ({
        totalAssigned: allItems.length,
        inProgress: allItems.filter(i => i.progress?.status === 'in_progress').length,
        completed: completedItems.length,
        overdue: activeItems.filter(a => a.due_date && new Date(a.due_date) < new Date()).length,
        streak: calculateStreak(completedItems.map(i => ({ completed_at: i.progress?.completed_at || null })))
    }), [allItems, completedItems, activeItems])

    const activeColumns: ColumnDef<LearningAssignment>[] = [
        {
            accessorKey: 'content_title',
            header: t('topic', 'Course / Assessment'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="flex flex-col gap-1 min-w-[220px] py-1">
                        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                            {item.content_type === 'quiz' ? (
                                <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                    <FileQuestion className="h-4 w-4" />
                                </div>
                            ) : (
                                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4" />
                                </div>
                            )}
                            <span className="truncate">{item.content_title || t('untitledAssignment', 'Untitled Course')}</span>
                        </div>
                        {item.content_metadata?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 ps-9">
                                {item.content_metadata.description}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 ps-9 text-[11px] text-muted-foreground font-mono">
                            {item.content_metadata?.duration && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.content_metadata.duration} {t('min', 'min')}
                                </span>
                            )}
                            {item.content_metadata?.question_count && (
                                <span>• {item.content_metadata.question_count} {t('questions', 'questions')}</span>
                            )}
                        </div>
                    </div>
                )
            }
        },
        {
            id: 'status',
            header: t('status', 'Status'),
            cell: ({ row }) => {
                const item = row.original
                const isInProgress = item.progress?.status === 'in_progress'
                const progressPct = item.progress?.progress_percentage || 0

                return (
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                                variant={isInProgress ? 'default' : 'secondary'}
                                className={cn(
                                    "text-[11px] px-2 py-0 font-semibold",
                                    isInProgress ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : ""
                                )}
                            >
                                {isInProgress ? `${progressPct}% ${t('inProgress', 'In Progress')}` : t('notStarted', 'Not Started')}
                            </Badge>
                            {item.priority === 'compliance' && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {t('mandatory', 'Mandatory')}
                                </Badge>
                            )}
                            {item.onboarding_process_id && (
                                <Badge
                                    variant="outline"
                                    className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-[10px] cursor-pointer hover:bg-indigo-500/20"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        navigate('/onboarding')
                                    }}
                                >
                                    <Sparkles className="h-3 w-3 me-1" />
                                    {isRTL ? 'تهيئة' : 'Onboarding'}
                                </Badge>
                            )}
                        </div>
                        {isInProgress && (
                            <Progress value={progressPct} className="h-1.5 w-full bg-muted" />
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: 'due_date',
            header: t('due', 'Due Date'),
            cell: ({ row }) => {
                const item = row.original
                if (!item.due_date) {
                    return <span className="text-xs text-muted-foreground font-mono">{isRTL ? 'مفتوح' : 'Self-paced'}</span>
                }
                const isOverdue = new Date(item.due_date) < new Date()
                return (
                    <div className="flex flex-col text-xs font-mono">
                        <span className={cn(
                            "flex items-center gap-1 whitespace-nowrap font-semibold",
                            isOverdue ? "text-destructive" : "text-foreground"
                        )}>
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(item.due_date), { addSuffix: true, locale: dateLocale })}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(item.due_date), 'MMM d, yyyy', { locale: dateLocale })}
                        </span>
                    </div>
                )
            }
        },
        {
            id: 'actions',
            header: t('action', 'Action'),
            cell: ({ row }) => {
                const item = row.original
                const isInProgress = item.progress?.status === 'in_progress'

                return (
                    <Button
                        size="sm"
                        onClick={() => handleStart(item)}
                        className={cn(
                            "font-bold transition-all duration-200 active:scale-95 text-xs shadow-sm",
                            isInProgress
                                ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                                : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                        )}
                    >
                        <Play className="h-3 w-3 me-1.5 fill-current" />
                        {isInProgress ? t('continue', 'Resume') : t('start', 'Start Course')}
                    </Button>
                )
            }
        }
    ]

    const completedColumns: ColumnDef<LearningAssignment>[] = [
        {
            accessorKey: 'content_title',
            header: t('topic', 'Course Title'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <div className="flex items-center gap-2.5 font-semibold text-sm text-foreground py-1">
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            {item.content_type === 'quiz' ? <FileQuestion className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                        </div>
                        <span className="truncate">{item.content_title}</span>
                    </div>
                )
            }
        },
        {
            id: 'completed_at',
            header: t('completed', 'Completion Date'),
            cell: ({ row }) => {
                const item = row.original
                return (
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-emerald-500" />
                        {item.progress?.completed_at
                            ? format(new Date(item.progress.completed_at), 'MMM d, yyyy', { locale: dateLocale })
                            : '-'}
                    </span>
                )
            }
        },
        {
            id: 'score',
            header: t('score', 'Score Achieved'),
            cell: ({ row }) => {
                const item = row.original
                const score = item.progress?.score_percentage
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-foreground">
                            {score != null ? `${score}%` : '100%'}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                )
            }
        },
        {
            id: 'actions',
            header: t('action', 'Action'),
            cell: () => {
                return (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/training/certificates')}
                        className="text-xs font-semibold gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                    >
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        {t('certificate', 'View Certificate')}
                    </Button>
                )
            }
        }
    ]

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-sm font-medium text-muted-foreground font-sans">
                    {isRTL ? 'جاري تحميل المناهج والبرامج التدريبية...' : 'Loading your executive learning cockpit...'}
                </p>
            </div>
        )
    }

    if (assignmentsError) {
        return (
            <Card className="border-destructive/30 bg-destructive/5 rounded-2xl p-6">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="flex items-center gap-2 text-destructive font-bold">
                        <AlertCircle className="h-5 w-5" />
                        {t('error', { defaultValue: 'Connection Error' })}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground font-sans mt-1">
                        {t('loadAssignmentsFailed', {
                            defaultValue: 'We could not load your training assignments right now. Please refresh and try again.'
                        })}
                    </CardDescription>
                </CardHeader>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    {isRTL ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                        {t('myLearning', 'My Learning & Curriculum')}
                    </h1>
                    <p className="text-muted-foreground text-sm font-sans mt-1">
                        {t('myLearningDescription', 'Access your assigned modules, track certifications, and elevate your hospitality expertise.')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={cn("h-9 px-3 gap-1.5", viewMode === 'grid' && "bg-amber-500 text-slate-950 font-bold hover:bg-amber-600")}
                        title={isRTL ? 'عرض البطاقات' : 'Grid View'}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">{isRTL ? 'بطاقات' : 'Cards'}</span>
                    </Button>
                    <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={cn("h-9 px-3 gap-1.5", viewMode === 'table' && "bg-amber-500 text-slate-950 font-bold hover:bg-amber-600")}
                        title={isRTL ? 'عرض الجدول' : 'Table View'}
                    >
                        <List className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">{isRTL ? 'جدول' : 'Table'}</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cockpit Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.totalAssigned}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('assigned', 'Total Assigned')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.inProgress}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('inProgress', 'In Progress')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.completed}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('completed', 'Completed')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-destructive">
                            {stats.overdue}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('overdue', 'Overdue')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm col-span-2 sm:col-span-1">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-2xl sm:text-3xl font-bold text-orange-500">
                                {stats.streak}
                            </span>
                            <Flame className={cn("h-6 w-6 text-orange-500", stats.streak > 0 && "animate-pulse")} />
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('streakDays', 'Day Streak')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isRTL ? 'بحث في الدورات والتقييمات...' : 'Search courses, quizzes, and SOPs...'}
                        className="ps-9 pe-9 h-10 rounded-xl bg-background/80 border-border/70"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)} className="w-full sm:w-auto">
                    <TabsList className="grid grid-cols-4 sm:flex h-10 p-1 bg-muted/60 rounded-xl">
                        <TabsTrigger value="all" className="text-xs rounded-lg">{t('common:all', 'All')}</TabsTrigger>
                        <TabsTrigger value="in_progress" className="text-xs rounded-lg">{t('inProgress', 'In Progress')}</TabsTrigger>
                        <TabsTrigger value="mandatory" className="text-xs rounded-lg">{t('mandatory', 'Mandatory')}</TabsTrigger>
                        <TabsTrigger value="quizzes" className="text-xs rounded-lg">{t('quizzes.title', { defaultValue: isRTL ? 'التقييمات' : 'Quizzes' })}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Active / Required Training Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                {t('requiredAction', 'Active & Assigned Curriculum')}
                            </h2>
                            <span className="text-xs font-mono text-muted-foreground">
                                {filteredActiveItems.length} {isRTL ? 'دورة نشطة' : 'active items'}
                            </span>
                        </div>

                        {filteredActiveItems.length === 0 ? (
                            <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
                                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <h3 className="font-display font-bold text-lg text-foreground">{t('allCaughtUp', "You're All Caught Up!")}</h3>
                                    <p className="text-xs max-w-sm mx-auto">{t('noPendingTraining', 'No active assignments match your current filter.')}</p>
                                </CardContent>
                            </Card>
                        ) : viewMode === 'grid' ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {filteredActiveItems.map((item) => {
                                    const isInProgress = item.progress?.status === 'in_progress'
                                    const progressPct = item.progress?.progress_percentage || 0
                                    const isOverdue = item.due_date ? new Date(item.due_date) < new Date() : false

                                    return (
                                        <Card
                                            key={item.id}
                                            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-gradient-to-b from-card via-card/90 to-card/50 hover:border-amber-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                        >
                                            <CardHeader className="p-5 pb-3">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                                                            item.content_type === 'quiz'
                                                                ? "bg-purple-500/10 text-purple-600"
                                                                : "bg-amber-500/10 text-amber-600"
                                                        )}>
                                                            {item.content_type === 'quiz' ? <FileQuestion className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                                                            {item.content_type === 'quiz' ? (isRTL ? 'تقييم' : 'Assessment') : (isRTL ? 'وحدة تدريبية' : 'Module')}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {item.priority === 'compliance' && (
                                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                                                                {t('mandatory', 'Mandatory')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <CardTitle className="font-display text-base font-bold text-foreground group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                                                    {item.content_title || t('untitledAssignment', 'Untitled Course')}
                                                </CardTitle>

                                                {item.content_metadata?.description && (
                                                    <CardDescription className="text-xs line-clamp-2 mt-1.5 font-sans">
                                                        {item.content_metadata.description}
                                                    </CardDescription>
                                                )}
                                            </CardHeader>

                                            <CardContent className="p-5 pt-0 space-y-4">
                                                {/* Meta chips */}
                                                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground pt-2 border-t border-border/40">
                                                    {item.content_metadata?.duration && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                                                            {item.content_metadata.duration} {t('min', 'min')}
                                                        </span>
                                                    )}
                                                    {item.due_date && (
                                                        <span className={cn(
                                                            "flex items-center gap-1 font-semibold",
                                                            isOverdue ? "text-destructive" : "text-muted-foreground"
                                                        )}>
                                                            <CalendarIcon className="h-3.5 w-3.5" />
                                                            {isOverdue ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'استحقاق' : 'Due')}{' '}
                                                            {format(new Date(item.due_date), 'MMM d', { locale: dateLocale })}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Progress indicator */}
                                                {isInProgress && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-xs font-mono">
                                                            <span className="text-muted-foreground">{isRTL ? 'التقدم' : 'Progress'}</span>
                                                            <span className="font-bold text-amber-600 dark:text-amber-400">{progressPct}%</span>
                                                        </div>
                                                        <Progress value={progressPct} className="h-1.5 bg-muted" />
                                                    </div>
                                                )}

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStart(item)}
                                                    className={cn(
                                                        "w-full font-bold h-10 rounded-xl transition-all duration-200 active:scale-95 shadow-sm",
                                                        isInProgress
                                                            ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                                                            : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                                                    )}
                                                >
                                                    <Play className="h-4 w-4 me-1.5 fill-current" />
                                                    {isInProgress ? t('continue', 'Resume Lesson') : t('start', 'Start Course')}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                                <DataTable columns={activeColumns} data={filteredActiveItems} />
                            </div>
                        )}
                    </div>

                    {/* Completed Curriculum History */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                {t('completedHistory', 'Completed Credentials & History')}
                            </h2>
                            <span className="text-xs font-mono text-muted-foreground">
                                {filteredCompletedItems.length} {isRTL ? 'برامج منجزة' : 'completed'}
                            </span>
                        </div>

                        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                            {filteredCompletedItems.length === 0 ? (
                                <div className="px-4 py-12 text-center text-muted-foreground">
                                    <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                                    <p className="text-sm">{t('noCompletedHistory', 'No completed courses or certificates yet.')}</p>
                                </div>
                            ) : (
                                <DataTable columns={completedColumns} data={filteredCompletedItems} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Widget Column */}
                <div className="space-y-6">
                    <InlineErrorBoundary
                        fallback={(
                            <Card className="border-amber-200 bg-amber-50/80 rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">{t('dailyChallenge', { defaultValue: 'Daily Hospitality Challenge' })}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('dailyChallengeTemporarilyUnavailable', {
                                            defaultValue: 'The daily challenge is temporarily unavailable, but your training assignments are still available below.'
                                        })}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    >
                        <DailyQuizWidget className="rounded-2xl border border-border/60 shadow-sm" />
                    </InlineErrorBoundary>

                    {/* Performance Summary Card */}
                    <Card className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <CardTitle className="font-display text-base font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-amber-500" />
                                {t('trainingSummary', 'Curriculum Performance')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('allTimePerformance', 'All-time completion metrics')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3.5 font-sans">
                            <div className="flex justify-between items-center pb-2.5 border-b border-border/40">
                                <span className="text-xs text-muted-foreground">{t('totalCompleted', 'Total Completed')}</span>
                                <span className="font-mono text-sm font-bold text-foreground">{stats.completed}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2.5 border-b border-border/40">
                                <span className="text-xs text-muted-foreground">{t('onTime', 'Completed On-Time')}</span>
                                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {completedItems.filter(i => !i.due_date || new Date(i.progress!.completed_at!) <= new Date(i.due_date)).length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-2.5 border-b border-border/40">
                                <span className="text-xs text-muted-foreground">{isRTL ? 'سلسلة التعلم النشطة' : 'Active Streak'}</span>
                                <span className="font-mono text-sm font-bold text-orange-500 flex items-center gap-1">
                                    {stats.streak} {isRTL ? 'أيام' : 'days'}
                                    <Flame className="h-4 w-4" />
                                </span>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full text-xs font-semibold mt-2 gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                                onClick={() => navigate('/training/certificates')}
                            >
                                <Award className="h-4 w-4 text-amber-500" />
                                {t('viewAllCertificates', 'View Accreditations')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
