import { DailyQuizWidget } from '@/components/questions/DailyQuizWidget'
import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useMyAssignments } from '@/hooks/useTraining'
import { resolveAssetForTrack } from '@/lib/altusAssetRegistry'
import { cn } from '@/lib/utils'
import {
    AlertCircle,
    CheckCircle2,
    Compass,
    Filter,
    LayoutGrid,
    List,
    Loader2,
    Play,
    Search,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { CurriculumCard, type CurriculumItem } from '@/components/learner/CurriculumCard'
import { CurriculumTable } from '@/components/learner/CurriculumTable'
import { toSimpleT } from '@/lib/simpleT'

export default function MyLearning() {
    const { t, i18n } = useTranslation(['training', 'common', 'dashboard'])
    const navigate = useNavigate()
    const { user: _user } = useAuth()
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

    // View mode and search/filter states
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState<'all' | 'in_progress' | 'mandatory' | 'quizzes' | 'completed'>('all')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

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

    // Filtered items based on search, tab, and category
    const filteredActiveItems = useMemo(() => {
        return activeItems.filter((item) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
                (item.content_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content_metadata?.description || '').toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return false

            const cat = ((item.content_metadata as Record<string, unknown>)?.category as string || '').toLowerCase()
            const matchesCategory =
                selectedCategory === 'all' ||
                cat.includes(selectedCategory.toLowerCase()) ||
                (item.content_title || '').toLowerCase().includes(selectedCategory.toLowerCase())

            if (!matchesCategory) return false

            if (selectedTab === 'in_progress') {
                return item.progress?.status === 'in_progress'
            }
            if (selectedTab === 'mandatory') {
                return item.priority === 'compliance' || item.is_mandatory
            }
            if (selectedTab === 'quizzes') {
                return item.content_type === 'quiz'
            }
            return true
        })
    }, [activeItems, searchQuery, selectedTab, selectedCategory])

    const filteredCompletedItems = useMemo(() => {
        return completedItems.filter((item) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
                (item.content_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content_metadata?.description || '').toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return false

            const cat = ((item.content_metadata as Record<string, unknown>)?.category as string || '').toLowerCase()
            const matchesCategory =
                selectedCategory === 'all' ||
                cat.includes(selectedCategory.toLowerCase()) ||
                (item.content_title || '').toLowerCase().includes(selectedCategory.toLowerCase())

            return matchesCategory
        })
    }, [completedItems, searchQuery, selectedCategory])

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
                    ? `/learn/quizzes/${item.content_id}?assignment=${item.id}`
                    : `/learn/player/${item.content_id}?assignment=${item.id}`,
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
                    ? `/learn/quizzes/${item.content_id}?assignment=${item.id}`
                    : `/learn/player/${item.content_id}?assignment=${item.id}`,
        }))
    }, [filteredCompletedItems, isRTL, t])

    const displayItems = selectedTab === 'completed' ? mappedCompletedCurriculumItems : mappedActiveCurriculumItems

    // Find first active item for "Active Focus" banner
    const activeFocusItem = useMemo(() => {
        return activeItems.find((i) => i.progress?.status === 'in_progress') || null
    }, [activeItems])

    // Calculated Stats
    const stats = useMemo(() => {
        const total = allItems.length
        const completed = completedItems.length
        const inProgress = allItems.filter((i) => i.progress?.status === 'in_progress').length
        const overdue = activeItems.filter((a) => a.due_date && new Date(a.due_date) < new Date()).length
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

        return {
            totalAssigned: total,
            inProgress,
            completed,
            overdue,
            completionRate,
        }
    }, [allItems, completedItems, activeItems])

    if (isLoading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-sm font-mono text-muted-foreground">
                    {isRTL ? 'جارٍ تحميل المناهج والمسارات التدريبية من ألتوس...' : 'Loading ALTUS Curriculum & Courses...'}
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
        <div className="space-y-7 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* 1. Header with Executive ALTUS Context */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 text-xs font-semibold shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 me-1 text-amber-500" />
                            <span>{isRTL ? 'أكاديمية ألتوس للضيافة الفاخرة' : 'ALTUS Luxury Hospitality Academy'}</span>
                        </Badge>
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        {t('myLearning', 'My Learning & Curriculum')}
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-sans mt-1 max-w-2xl">
                        {t('myLearningDescription', 'Access your assigned modules, track certifications, and elevate your Forbes 5-star hospitality expertise.')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                    <Button
                        asChild
                        variant="outline"
                        className="h-9 px-3.5 gap-2 rounded-2xl font-bold border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm transition-all duration-150 active:scale-[0.97]"
                    >
                        <Link to="/learn/courses">
                            <Compass className="h-4 w-4" />
                            <span className="text-xs">{isRTL ? 'كتالوج الدورات' : 'Course Catalog'}</span>
                        </Link>
                    </Button>

                    {/* View Mode Switcher (Grid vs Table) */}
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/50 backdrop-blur-md">
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'h-7 px-2.5 gap-1.5 rounded-xl font-bold text-xs transition-all duration-150',
                                viewMode === 'grid' && 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                            )}
                            title={isRTL ? 'عرض البطاقات' : 'Cards View'}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>{isRTL ? 'بطاقات' : 'Cards'}</span>
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                'h-7 px-2.5 gap-1.5 rounded-xl font-bold text-xs transition-all duration-150',
                                viewMode === 'table' && 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                            )}
                            title={isRTL ? 'عرض الجدول' : 'Table View'}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span>{isRTL ? 'جدول' : 'Table'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Unified Apple-Style Learning Pulse Bar */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 border-t-amber-400/35 bg-gradient-to-br from-card/95 via-card/85 to-amber-950/[0.04] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Overall Completion Gauge */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center shrink-0">
                            <svg width="72" height="72" className="rotate-[-90deg]">
                                <circle
                                    cx="36"
                                    cy="36"
                                    r="28"
                                    stroke="#332704"
                                    strokeWidth="5"
                                    fill="transparent"
                                    className="opacity-60"
                                />
                                <circle
                                    cx="36"
                                    cy="36"
                                    r="28"
                                    stroke="#EAB308"
                                    strokeWidth="5"
                                    strokeDasharray={2 * Math.PI * 28}
                                    strokeDashoffset={(2 * Math.PI * 28) - (stats.completionRate / 100) * (2 * Math.PI * 28)}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    style={{
                                        filter: 'drop-shadow(0 0 5px rgba(234, 179, 8, 0.4))',
                                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-mono text-sm font-bold text-amber-500">
                                    {stats.completionRate}%
                                </span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>{isRTL ? 'معدل الإنجاز التراكمي' : 'Curriculum Completion'}</span>
                            </div>
                            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mt-0.5">
                                {stats.completed} {isRTL ? 'من' : 'of'} {stats.totalAssigned} {isRTL ? 'برامج مكتملة' : 'modules completed'}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-sans">
                                {isRTL ? 'استمر في التقدم لاجتياز متطلبات الاعتماد الفندقي' : 'Keep progressing to unlock luxury master credentials'}
                            </p>
                        </div>
                    </div>

                    {/* Integrated Metric Capsules */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                        <div className="rounded-2xl border border-blue-500/20 bg-background/50 p-3 text-center backdrop-blur-md">
                            <div className="font-mono text-xl sm:text-2xl font-bold text-blue-500">
                                {stats.totalAssigned}
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('assigned', 'Assigned')}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 bg-background/50 p-3 text-center backdrop-blur-md">
                            <div className="font-mono text-xl sm:text-2xl font-bold text-amber-500">
                                {stats.inProgress}
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('inProgress', 'In Progress')}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/20 bg-background/50 p-3 text-center backdrop-blur-md">
                            <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-500">
                                {stats.completed}
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('completed', 'Completed')}
                            </div>
                        </div>

                        <div className={cn(
                            "rounded-2xl border p-3 text-center backdrop-blur-md transition-colors",
                            stats.overdue > 0 ? "border-destructive/40 bg-destructive/[0.06]" : "border-border/50 bg-background/50"
                        )}>
                            <div className={cn("font-mono text-xl sm:text-2xl font-bold", stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")}>
                                {stats.overdue}
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('overdue', 'Overdue')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Segmented Filter Tabs & Instant Search Bar */}
            <div className="space-y-3.5">
                {/* Emil Kowalski Style Sliding Segmented Tab Pill Bar */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/50 border border-border/50 backdrop-blur-md overflow-x-auto scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setSelectedTab('all')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap active:scale-[0.97]',
                            selectedTab === 'all'
                                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium'
                        )}
                    >
                        {isRTL ? 'جميع المناهج' : 'All Curriculum'} ({activeItems.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('in_progress')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap active:scale-[0.97]',
                            selectedTab === 'in_progress'
                                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium'
                        )}
                    >
                        {isRTL ? 'قيد المتابعة' : 'In Progress'} ({stats.inProgress})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('mandatory')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap active:scale-[0.97]',
                            selectedTab === 'mandatory'
                                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium'
                        )}
                    >
                        {isRTL ? 'إلزامي ومعتمد' : 'Mandatory SOPs'} ({activeItems.filter((i) => i.priority === 'compliance').length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('quizzes')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap active:scale-[0.97]',
                            selectedTab === 'quizzes'
                                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium'
                        )}
                    >
                        {isRTL ? 'التقييمات والاختبارات' : 'Assessments & Quizzes'} ({activeItems.filter((i) => i.content_type === 'quiz').length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTab('completed')}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap active:scale-[0.97]',
                            selectedTab === 'completed'
                                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium'
                        )}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 inline me-1" />
                        {isRTL ? 'الشهادات المكتسبة' : 'Completed & Certified'} ({stats.completed})
                    </button>
                </div>

                {/* Instant Search Bar with Category Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? 'بحث في الدورات ومعايير التشغيل...' : 'Search courses, quizzes, and SOPs...'}
                            className="ps-9 pe-9 h-9 rounded-xl bg-background/80 border-border/70 text-xs"
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

                    {/* Department / Category Filter Pill */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-9 px-3 rounded-xl bg-background/80 border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                            <option value="all">{isRTL ? 'جميع الأقسام' : 'All Departments'}</option>
                            <option value="Front Office">{isRTL ? 'المكاتب الأمامية' : 'Front Office & Guest Services'}</option>
                            <option value="Culinary">{isRTL ? 'المطبخ وسلامة الغذاء' : 'Culinary & Food Safety'}</option>
                            <option value="Housekeeping">{isRTL ? 'الإشراف الداخلي' : 'Housekeeping & Rooms'}</option>
                            <option value="Safety">{isRTL ? 'الأمن والسلامة' : 'Safety & Security'}</option>
                            <option value="Butler">{isRTL ? 'البتلر وكبار الشخصيات' : 'Butler & VIP Services'}</option>
                        </select>

                        <div className="text-[11px] font-mono text-muted-foreground ps-2 shrink-0">
                            {isRTL
                                ? `${displayItems.length} برنامج`
                                : `${displayItems.length} items`}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Active Focus Shelf (When on All or In Progress and user has active course) */}
            {(selectedTab === 'all' || selectedTab === 'in_progress') && activeFocusItem && !searchQuery && selectedCategory === 'all' && (
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 border-t-amber-400/40 bg-[#0B0F17] p-5 sm:p-6 shadow-md">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-25"
                        style={{
                            backgroundImage: `url(${resolveAssetForTrack({
                                title: activeFocusItem.content_title || '',
                                id: activeFocusItem.content_id,
                            })})`,
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#070A0F] via-[#0B0F17]/90 to-transparent" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-[10px]">
                                    <Play className="h-2.5 w-2.5 fill-current me-1" />
                                    {isRTL ? 'المقرر قيد الإنجاز حالياً' : 'Active Learning Focus'}
                                </Badge>
                                <span className="text-xs font-mono text-amber-400 font-bold">
                                    {activeFocusItem.progress?.progress_percentage || 0}%
                                </span>
                            </div>
                            <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                                {activeFocusItem.content_title}
                            </h3>
                            <div className="h-1.5 w-48 sm:w-64 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                                    style={{ width: `${activeFocusItem.progress?.progress_percentage || 0}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            asChild
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl px-5 h-9 text-xs shadow-md transition-all duration-150 active:scale-[0.97]"
                        >
                            <Link
                                to={activeFocusItem.content_type === 'quiz'
                                    ? `/learn/quizzes/${activeFocusItem.content_id}?assignment=${activeFocusItem.id}`
                                    : `/learn/player/${activeFocusItem.content_id}?assignment=${activeFocusItem.id}`}
                            >
                                <Play className="h-3.5 w-3.5 fill-current me-1.5" />
                                <span>{isRTL ? 'متابعة البرنامج' : 'Resume Module'}</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}

            {/* 5. Curriculum Content Rendering: Cards or Table */}
            {viewMode === 'grid' ? (
                displayItems.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {displayItems.map((item) => (
                            <CurriculumCard
                                key={item.id}
                                item={item}
                                isRTL={isRTL}
                                t={toSimpleT(t)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center rounded-3xl border border-dashed border-amber-500/25 bg-card/40 p-8 backdrop-blur-md">
                        <div className="h-16 w-16 mx-auto rounded-2xl overflow-hidden mb-3 border border-amber-500/30 shadow-md">
                            <img
                                src="/assets/altus/master-seal.jpg"
                                alt="ALTUS Seal"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <h4 className="font-display text-base font-bold text-foreground">
                            {isRTL ? 'لا توجد برامج تدريبية مطابقة' : 'No matching courses found'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                            {isRTL
                                ? 'جرّب تعديل مصطلحات البحث أو استكشف كتالوج الأكاديمية للتسجيل في برامج جديدة.'
                                : 'Try changing your search keywords or explore the full ALTUS catalog to enroll in accredited courses.'}
                        </p>
                        <Button
                            asChild
                            className="mt-5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-md transition-all duration-150 active:scale-[0.97]"
                        >
                            <Link to="/learn/courses">
                                <Compass className="h-4 w-4 me-2" />
                                {isRTL ? 'تصفح كتالوج الدورات' : 'Explore Course Catalog'}
                            </Link>
                        </Button>
                    </div>
                )
            ) : (
                <CurriculumTable items={displayItems} isRTL={isRTL} t={toSimpleT(t)} />
            )}

            {/* 6. Daily Quiz / Microlearning Section */}
            <div className="mt-8 border-t border-border/40 pt-6">
                <InlineErrorBoundary>
                    <DailyQuizWidget />
                </InlineErrorBoundary>
            </div>
        </div>
    )
}
