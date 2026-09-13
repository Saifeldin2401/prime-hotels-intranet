import { DailyQuizWidget } from '@/components/questions/DailyQuizWidget'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useMyAssignments } from '@/hooks/useTraining'
import { calculateStreak } from '@/lib/training/analytics'
import { cn } from '@/lib/utils'
import type { LearningAssignment } from '@/types/learning'
import {
    AlertCircle,
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    Compass,
    FileQuestion,
    Flame,
    LayoutGrid,
    List,
    Loader2,
    Search,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { CurriculumCard, type CurriculumItem } from '@/components/learner/CurriculumCard'
import { CurriculumTable } from '@/components/learner/CurriculumTable'

export default function MyLearning() {
    const { t, i18n } = useTranslation(['training', 'common', 'dashboard'])
    const navigate = useNavigate()
    const { user: _user } = useAuth()
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

    // View mode and search/filter states
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState<'all' | 'in_progress' | 'mandatory' | 'quizzes' | 'completed'>('all')

    // Fetch data using MyAssignments hook
    const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useMyAssignments()

    const isLoading = assignmentsLoading
    const allItems = assignments || []

    const activeItems = useMemo(() => {
        return allItems
            .filter((item) => !item.progress || item.progress.status !== 'completed')
            .sort((a, b) => {
                if (a.priority === 'compliance' && b.priority !== 'compliance') return -1
                if (b.priority === 'compliance' && a.priority !== 'compliance') return 1

                if (!a.due_date) return 1
                if (!b.due_date) return -1
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            })
    }, [allItems])

    const completedItems = useMemo(() => {
        return allItems
            .filter((item) => item.progress?.status === 'completed')
            .sort((a, b) => {
                if (!a.progress?.completed_at) return 1
                if (!b.progress?.completed_at) return -1
                return new Date(b.progress.completed_at).getTime() - new Date(a.progress.completed_at).getTime()
            })
    }, [allItems])

    // Filtered items based on search and tab
    const filteredActiveItems = useMemo(() => {
        return activeItems.filter((item) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
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
        return completedItems.filter((item) => {
            if (searchQuery.trim() === '') return true
            return (
                (item.content_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content_metadata?.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
        })
    }, [completedItems, searchQuery])

    // Map to normalized CurriculumItem models
    const mappedActiveCurriculumItems: CurriculumItem[] = useMemo(() => {
        return filteredActiveItems.map((item) => ({
            id: item.id,
            title: item.content_title || t('training:untitledAssignment', 'Untitled Course'),
            description: item.content_metadata?.description,
            category: (item.content_metadata as Record<string, unknown>)?.category as string || (isRTL ? 'معيار فندقي' : 'Hospitality Core'),
            contentType: item.content_type === 'quiz' ? 'quiz' : 'module',
            estimatedDurationMinutes: ((item.content_metadata as Record<string, unknown>)?.estimated_duration_minutes as number) || 20,
            progressPercentage: item.progress?.progress_percentage || 0,
            isMandatory: item.priority === 'compliance' || item.is_mandatory,
            isOverdue: !!item.due_date && new Date(item.due_date) < new Date(),
            dueDate: item.due_date,
            actionUrl:
                item.content_type === 'quiz'
                    ? `/assessments/${item.content_id}/take?assignment=${item.id}`
                    : `/learning/training/${item.content_id}?assignment=${item.id}`,
        }))
    }, [filteredActiveItems, isRTL, t])

    const mappedCompletedCurriculumItems: CurriculumItem[] = useMemo(() => {
        return filteredCompletedItems.map((item) => ({
            id: item.id,
            title: item.content_title || t('training:untitledAssignment', 'Untitled Course'),
            description: item.content_metadata?.description,
            category: (item.content_metadata as Record<string, unknown>)?.category as string || (isRTL ? 'معتمد' : 'Accredited'),
            contentType: item.content_type === 'quiz' ? 'quiz' : 'module',
            estimatedDurationMinutes: ((item.content_metadata as Record<string, unknown>)?.estimated_duration_minutes as number) || 20,
            progressPercentage: 100,
            isMandatory: item.priority === 'compliance',
            isOverdue: false,
            dueDate: item.due_date,
            actionUrl:
                item.content_type === 'quiz'
                    ? `/assessments/${item.content_id}/take?assignment=${item.id}`
                    : `/learning/training/${item.content_id}?assignment=${item.id}`,
        }))
    }, [filteredCompletedItems, isRTL, t])

    const displayItems = selectedTab === 'completed' ? mappedCompletedCurriculumItems : mappedActiveCurriculumItems

    // Calculated Stats
    const stats = useMemo(
        () => ({
            totalAssigned: allItems.length,
            inProgress: allItems.filter((i) => i.progress?.status === 'in_progress').length,
            completed: completedItems.length,
            overdue: activeItems.filter((a) => a.due_date && new Date(a.due_date) < new Date()).length,
            streak: calculateStreak(
                completedItems.map((i) => ({ completed_at: i.progress?.completed_at || null }))
            ),
        }),
        [allItems, completedItems, activeItems]
    )

    if (isLoading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-sm font-mono text-muted-foreground">
                    {isRTL ? 'جارٍ تحميل المناهج والمسارات التدريبية...' : 'Loading ALTUS Curriculum & Courses...'}
                </p>
            </div>
        )
    }

    if (assignmentsError) {
        return (
            <Card className="max-w-xl mx-auto mt-12 p-8 border-destructive/40 text-center rounded-3xl">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-foreground">
                    {isRTL ? 'تعذر تحميل بيانات التعلم' : 'Failed to load learning curriculum'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-5">
                    {assignmentsError instanceof Error ? assignmentsError.message : 'Please check your connection and try again.'}
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    {isRTL ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* 1. Header with Executive ALTUS Context */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold">
                            <Sparkles className="h-3 w-3 me-1" />
                            {isRTL ? 'أكاديمية ألتوس للضيافة' : 'ALTUS Hospitality Academy'}
                        </Badge>
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                        {t('myLearning', 'My Learning & Curriculum')}
                    </h1>
                    <p className="text-muted-foreground text-sm font-sans mt-1">
                        {t('myLearningDescription', 'Access your assigned modules, track certifications, and elevate your hospitality expertise.')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                    <Button
                        asChild
                        variant="outline"
                        className="h-10 px-3.5 gap-2 rounded-2xl font-bold border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm transition-all"
                    >
                        <Link to="/courses">
                            <Compass className="h-4 w-4" />
                            <span className="text-xs">{isRTL ? 'كتالوج الدورات' : 'Course Catalog'}</span>
                        </Link>
                    </Button>

                    {/* View Mode Switcher (Grid vs Table) */}
                    <div className="flex items-center gap-2 bg-card/60 p-1 rounded-2xl border border-border/60 backdrop-blur-md">
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'h-8 px-3 gap-1.5 rounded-xl font-bold transition-all',
                                viewMode === 'grid' && 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-sm'
                            )}
                            title={isRTL ? 'عرض البطاقات' : 'Cards View'}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="text-xs">{isRTL ? 'بطاقات' : 'Cards'}</span>
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                'h-8 px-3 gap-1.5 rounded-xl font-bold transition-all',
                                viewMode === 'table' && 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-sm'
                            )}
                            title={isRTL ? 'عرض الجدول' : 'Table View'}
                        >
                            <List className="h-4 w-4" />
                            <span className="text-xs">{isRTL ? 'جدول' : 'Table'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Stats Cockpit Deck */}
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
                            <Flame className={cn('h-6 w-6 text-orange-500', stats.streak > 0 && 'animate-pulse')} />
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {t('streakDays', 'Day Streak')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Category Filter Tabs & Instant Search Bar */}
            <div className="flex flex-col gap-4">
                {/* Horizontal Scrolling Segmented Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setSelectedTab('all')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                            selectedTab === 'all'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                    >
                        {isRTL ? 'جميع المناهج' : 'All Curriculum'} ({activeItems.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('in_progress')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                            selectedTab === 'in_progress'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                    >
                        {isRTL ? 'قيد المتابعة' : 'In Progress'} ({stats.inProgress})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('mandatory')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                            selectedTab === 'mandatory'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                    >
                        {isRTL ? 'إلزامي ومعتمد' : 'Mandatory SOPs'} ({activeItems.filter((i) => i.priority === 'compliance').length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('quizzes')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                            selectedTab === 'quizzes'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                    >
                        {isRTL ? 'التقييمات والاختبارات' : 'Assessments & Quizzes'} ({activeItems.filter((i) => i.content_type === 'quiz').length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('completed')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                            selectedTab === 'completed'
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 inline me-1" />
                        {isRTL ? 'الشهادات المكتسبة' : 'Completed & Certified'} ({stats.completed})
                    </button>
                </div>

                {/* Instant Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? 'بحث في الدورات ومعايير التشغيل...' : 'Search courses, quizzes, and SOPs...'}
                            className="ps-9 pe-9 h-10 rounded-xl bg-background/80 border-border/70 text-xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="text-xs font-mono text-muted-foreground ps-2">
                        {isRTL
                            ? `عرض ${displayItems.length} برنامج تدريبي`
                            : `Displaying ${displayItems.length} learning items`}
                    </div>
                </div>
            </div>

            {/* 4. Curriculum Content Rendering: Cards or Table */}
            {viewMode === 'grid' ? (
                displayItems.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {displayItems.map((item) => (
                            <CurriculumCard
                                key={item.id}
                                item={item}
                                isRTL={isRTL}
                                t={t}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 p-6">
                        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <h4 className="font-display text-base font-bold text-foreground">
                            {isRTL ? 'لا توجد برامج تدريبية مطابقة' : 'No courses found'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            {isRTL
                                ? 'استكشف كتالوج الأكاديمية وسجل في برامج تدريبية جديدة.'
                                : 'Explore the ALTUS catalog to enroll in new masterclasses and SOP courses.'}
                        </p>
                        <Button
                            asChild
                            className="mt-4 rounded-xl bg-hotel-gold text-slate-950 hover:bg-hotel-gold-dark font-bold shadow-md"
                        >
                            <Link to="/courses">
                                <Compass className="h-4 w-4 me-2" />
                                {isRTL ? 'تصفح كتالوج الدورات' : 'Explore Course Catalog'}
                            </Link>
                        </Button>
                    </div>
                )
            ) : (
                <CurriculumTable items={displayItems} isRTL={isRTL} t={t} />
            )}

            {/* 5. Daily Quiz / Microlearning Widget Integration */}
            <div className="mt-8 border-t border-border/40 pt-8">
                <InlineErrorBoundary section="Daily Quiz">
                    <DailyQuizWidget />
                </InlineErrorBoundary>
            </div>
        </div>
    )
}
