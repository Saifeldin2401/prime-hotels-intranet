/**
 * LearnerHome - Executive Landing Cockpit for Training, SOP Knowledge & Hotel Certifications.
 *
 * Design: Altus Hospitality Excellence & Executive Consulting aesthetic.
 * Strictly backed by real query hooks (useLearningProgress, useMyAssignments, useTrainingModules,
 * useMyCertificates, useBookmarks). Renders elegant empty states when no data is present.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useBookmarks } from '@/hooks/useKnowledge'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments, useTrainingModules } from '@/hooks/useTraining'
import { calculateStreak } from '@/lib/training/analytics'
import { getTimeBasedGreeting } from '@/lib/greetingUtils'
import { cn } from '@/lib/utils'
import {
    AlertCircle,
    ArrowRight,
    Award,
    BookMarked,
    BookOpen,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    Compass,
    ExternalLink,
    FileQuestion,
    Flame,
    GraduationCap,
    Play,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Trophy,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

const EXPIRY_WINDOW_DAYS = 30

function SectionCard({
    title,
    subtitle,
    icon,
    children,
    action,
    className,
}: {
    title: string
    subtitle?: string
    icon: ReactNode
    children: ReactNode
    action?: ReactNode
    className?: string
}) {
    return (
        <Card className={cn(
            "relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 via-card/70 to-card/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-border p-6",
            className
        )}>
            <div className="flex flex-row items-center justify-between gap-2 border-b border-border/40 pb-4">
                <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        {icon}
                    </span>
                    <span>
                        <h3 className="font-display text-base font-bold text-foreground tracking-tight">
                            {title}
                        </h3>
                        {subtitle && (
                            <span className="text-xs text-muted-foreground font-sans mt-0.5 block">{subtitle}</span>
                        )}
                    </span>
                </span>
                {action}
            </div>
            <div className="pt-5">{children}</div>
        </Card>
    )
}

function SectionSkeleton() {
    return (
        <div className="space-y-4 py-2">
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
    )
}

export default function LearnerHome() {
    const { t, i18n } = useTranslation(['training', 'dashboard', 'common'])
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const userId = user?.id
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

    // Stable "now" captured at mount
    const [now] = useState(() => Date.now())

    const progressQuery = useLearningProgress()
    const assignmentsQuery = useMyAssignments()
    const modulesQuery = useTrainingModules()
    const certificatesQuery = useMyCertificates()
    const bookmarksQuery = useBookmarks()

    // Filter org progress to current user
    const myProgress = useMemo(
        () => (progressQuery.data ?? []).filter((p) => p.user_id === userId),
        [progressQuery.data, userId]
    )

    // Most recent in-progress module to continue
    const continueLearning = useMemo(() => {
        return [...myProgress]
            .filter((p) => p.status === 'in_progress')
            .sort((a, b) => {
                const at = a.last_accessed_at ? Date.parse(a.last_accessed_at) : 0
                const bt = b.last_accessed_at ? Date.parse(b.last_accessed_at) : 0
                return bt - at
            })[0]
    }, [myProgress])

    // Active assignments sorted by priority & due date
    const assignments = useMemo(() => {
        return [...(assignmentsQuery.data ?? [])]
            .filter((a) => a.progress?.status !== 'completed')
            .sort((a, b) => {
                if (a.priority === 'compliance' && b.priority !== 'compliance') return -1
                if (b.priority === 'compliance' && a.priority !== 'compliance') return 1
                const ad = a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY
                const bd = b.due_date ? Date.parse(b.due_date) : Number.POSITIVE_INFINITY
                return ad - bd
            })
            .map((a) => ({
                ...a,
                overdue: !!a.due_date && Date.parse(a.due_date) < now,
            }))
    }, [assignmentsQuery.data, now])

    // Recommended published modules not yet started
    const recommended = useMemo(() => {
        const seen = new Set<string>()
        myProgress.forEach((p) => seen.add(p.content_id))
        ;(assignmentsQuery.data ?? []).forEach((a) => seen.add(a.content_id))
        return (modulesQuery.data ?? [])
            .filter((m) => m.status === 'published' && !seen.has(m.id))
            .slice(0, 4)
    }, [modulesQuery.data, myProgress, assignmentsQuery.data])

    // Overall progress stats
    const progressStats = useMemo(() => {
        const total = myProgress.length
        const completed = myProgress.filter((p) => p.status === 'completed').length
        const inProgress = myProgress.filter((p) => p.status === 'in_progress').length
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
        return {
            total,
            completed,
            inProgress,
            completionRate: total > 0 ? completionRate : null,
        }
    }, [myProgress])

    // Certificates & expiring count
    const certificates = useMemo(() => certificatesQuery.data ?? [], [certificatesQuery.data])
    const expiringCertificates = useMemo(() => {
        const cutoff = now + EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000
        return certificates.filter(
            (c) =>
                c.status === 'active' &&
                c.expiryDate instanceof Date &&
                c.expiryDate.getTime() <= cutoff
        )
    }, [certificates, now])

    // User streak
    const streak = useMemo(() => {
        const completedItems = myProgress
            .filter((p) => p.status === 'completed' && p.completed_at)
            .map((p) => ({ completed_at: p.completed_at || null }))
        return calculateStreak(completedItems)
    }, [myProgress])

    const bookmarks = bookmarksQuery.data ?? []
    const firstName = profile?.full_name?.split(' ')[0] ?? (isRTL ? 'عزيزي الموظف' : 'Learner')
    const greeting = getTimeBasedGreeting(t)

    // Formatted dates
    const today = new Date()
    const gregorianDate = today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    let hijriDate = ''
    try {
        hijriDate = new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(today) + (isRTL ? ' هـ' : ' AH')
    } catch {
        hijriDate = ''
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* Executive Hero Greeting Cockpit */}
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/60 to-amber-500/[0.04] p-6 sm:p-8 backdrop-blur-2xl shadow-sm">
                <div className="absolute top-0 end-0 -mt-8 -me-8 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-semibold text-xs gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                {isRTL ? 'منصة التميز الفندقي والتطوير' : 'Hospitality Excellence Cockpit'}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
                                <span>{gregorianDate}</span>
                                {hijriDate && (
                                    <>
                                        <span className="text-border">•</span>
                                        <span>{hijriDate}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                                {greeting.greetingText}, <span className="text-amber-600 dark:text-amber-400">{firstName}</span> {greeting.emoji}
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground font-sans mt-1 max-w-2xl">
                                {greeting.subtitleText || (isRTL 
                                    ? 'لوحة القيادة التعليمية: تابع مسارك التدريبي واكتسب معايير الضيافة الفاخرة.'
                                    : 'Your executive learning command center. Advance your curriculum and master hospitality standards.')}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stat Pill Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-border/50 bg-background/60 p-3.5 text-center backdrop-blur-md">
                            <div className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400">
                                {progressStats.inProgress}
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('training:inProgress', 'In Progress')}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-background/60 p-3.5 text-center backdrop-blur-md">
                            <div className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {progressStats.completed}
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('training:completed', 'Completed')}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-background/60 p-3.5 text-center backdrop-blur-md">
                            <div className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400">
                                {certificates.length}
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('training:certificates', 'Certificates')}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-background/60 p-3.5 text-center backdrop-blur-md">
                            <div className="flex items-center justify-center gap-1">
                                <span className="font-mono text-xl font-bold text-orange-500">{streak}</span>
                                <Flame className={cn("h-4 w-4 text-orange-500", streak > 0 && "animate-pulse")} />
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                {t('training:streakDays', 'Day Streak')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Continue Learning Hero Section */}
            <SectionCard
                title={t('training:continueLearning', 'Continue learning')}
                subtitle={isRTL ? 'استئناف الدروس قيد التنفيذ' : 'Resume your in-progress curriculum'}
                icon={<Play className="h-4 w-4" />}
                className="col-span-full border-amber-500/30 bg-gradient-to-r from-card via-card/90 to-amber-500/[0.04]"
            >
                {progressQuery.isLoading ? (
                    <SectionSkeleton />
                ) : continueLearning ? (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                        <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-amber-500 text-slate-950 font-bold px-3 py-0.5 text-xs">
                                    <Play className="h-3 w-3 me-1 fill-current" />
                                    {isRTL ? 'متابعة التعلم الفوري' : 'Resume Learning'}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {continueLearning.progress_percentage}% {isRTL ? 'مكتمل' : 'complete'}
                                </span>
                            </div>

                            <div>
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground line-clamp-1">
                                    {continueLearning.training_modules?.title ?? `${t('training:module', 'Module')} ${continueLearning.content_id.slice(0, 8)}`}
                                </h2>
                                {continueLearning.training_modules?.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                        {continueLearning.training_modules.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5 max-w-md pt-1">
                                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                    <span>{isRTL ? 'التقدم في المنهج' : 'Curriculum Pace'}</span>
                                    <span className="font-bold text-foreground">{continueLearning.progress_percentage}%</span>
                                </div>
                                <Progress value={continueLearning.progress_percentage} className="h-2.5 bg-muted" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Link
                                to={`/learning/training/${continueLearning.content_id}`}
                                className="inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 gap-2"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span>{isRTL ? 'استئناف' : 'Resume'}</span>
                                <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-2">
                            <Play className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا يوجد تدريب قيد المتابعة حالياً' : 'Nothing to resume'}</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                            {isRTL ? 'اختر دورة من القائمة أدناه لبدء التعلم.' : 'Pick an assigned or recommended module to start.'}
                        </p>
                    </div>
                )}
            </SectionCard>

            {/* Main Cockpit Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* 2. Assigned Training Deck */}
                <SectionCard
                    title={t('training:assignedTraining', 'Assigned training')}
                    subtitle={isRTL ? 'البرامج المعينة ومواعيد الاستحقاق' : 'Mandatory courses & due dates'}
                    icon={<ClipboardList className="h-4 w-4" />}
                    action={
                        <Link
                            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            to="/learning/my"
                        >
                            <span>{t('common:viewAll', 'View all')}</span>
                            <ChevronRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
                        </Link>
                    }
                >
                    {assignmentsQuery.isLoading ? (
                        <SectionSkeleton />
                    ) : assignments.length > 0 ? (
                        <ul className="space-y-3" role="list">
                            {assignments.slice(0, 4).map((a) => (
                                <li
                                    key={a.id}
                                    role="listitem"
                                    className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-amber-500/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600">
                                            {a.content_type === 'quiz' ? <FileQuestion className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                                                {a.content_title ?? t('training:untitledAssignment', 'Untitled item')}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {a.priority === 'compliance' && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                                                        {t('training:mandatory', 'Mandatory')}
                                                    </Badge>
                                                )}
                                                {a.overdue && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold animate-pulse">
                                                        {isRTL ? 'متأخر' : 'Overdue'}
                                                    </Badge>
                                                )}
                                                {a.due_date && (
                                                    <span className={cn(
                                                        "text-[11px] font-mono flex items-center gap-1",
                                                        a.overdue ? "text-destructive font-bold" : "text-muted-foreground"
                                                    )}>
                                                        <Clock className="h-3 w-3" />
                                                        {a.overdue ? (isRTL ? 'تاريخ الاستحقاق' : 'Due') : (isRTL ? 'مستحق' : 'Due')}{' '}
                                                        {new Date(a.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 shrink-0 font-medium"
                                        onClick={() => {
                                            if (a.content_type === 'quiz') {
                                                navigate(`/assessments/${a.content_id}/take?assignment=${a.id}`)
                                            } else {
                                                navigate(`/learning/training/${a.content_id}?assignment=${a.id}`)
                                            }
                                        }}
                                    >
                                        <Play className="h-3 w-3 me-1 fill-current" />
                                        {isRTL ? 'بدء' : 'Start'}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا يوجد تدريب معين' : 'No assigned training'}</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'لا توجد برامج إلزامية معلقة حالياً لحسابك.' : 'No pending mandatory training assignments at this moment.'}
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* 3. Visual Progress Gauges & Analytics */}
                <SectionCard
                    title={t('training:myProgress', 'My progress')}
                    subtitle={isRTL ? 'مؤشرات الإنجاز والمسار التعليمي' : 'Completion velocity & tracked courses'}
                    icon={<TrendingUp className="h-4 w-4" />}
                >
                    {progressQuery.isLoading ? (
                        <SectionSkeleton />
                    ) : progressStats.total > 0 ? (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl border border-border/50 bg-background/50 text-center">
                                    <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {progressStats.inProgress}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mt-1">
                                        {t('training:inProgress', 'In Progress')}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-border/50 bg-background/50 text-center">
                                    <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {progressStats.completed}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mt-1">
                                        {t('training:completed', 'Completed')}
                                    </div>
                                </div>
                            </div>

                            {progressStats.completionRate !== null && (
                                <div className="space-y-2 p-4 rounded-xl border border-border/50 bg-gradient-to-br from-card to-amber-500/[0.03]">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">
                                            {isRTL ? 'معدل إتمام المناهج' : 'Overall Completion Rate'}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                                            {progressStats.completionRate}%
                                        </span>
                                    </div>
                                    <Progress value={progressStats.completionRate} className="h-2 bg-muted" />
                                    <p className="text-[11px] text-muted-foreground font-sans pt-1">
                                        {progressStats.completed} {isRTL ? 'من إجمالي' : 'of'} {progressStats.total} {isRTL ? 'برامج تدريبية مسجلة' : 'tracked modules completed'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-muted-foreground mb-3">
                                <Compass className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا يوجد نشاط مسجل بعد' : 'No activity tracked yet'}</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'ابدأ أحد البرامج التدريبية المتاحة لتظهر مؤشرات إنجازك هنا.' : 'Begin any published course to track your progression metrics.'}
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* 4. Certificates & Skills */}
                <SectionCard
                    title={t('training:certificatesAndSkills', 'Certificates & skills')}
                    subtitle={isRTL ? 'شهادات الجودة والاعتمادات المكتسبة' : 'Official hospitality credentials earned'}
                    icon={<Award className="h-4 w-4" />}
                    action={
                        <Link
                            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            to="/training/certificates"
                        >
                            <span>{t('common:viewAll', 'View all')}</span>
                            <ChevronRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
                        </Link>
                    }
                >
                    {certificatesQuery.isLoading ? (
                        <SectionSkeleton />
                    ) : certificates.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05]">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-amber-500" />
                                    <span className="text-sm font-bold text-foreground">
                                        {certificates.length} {isRTL ? 'شهادة مكتسبة' : 'Earned Credentials'}
                                    </span>
                                </div>
                                {expiringCertificates.length > 0 && (
                                    <Badge variant="destructive" className="text-[10px] animate-pulse">
                                        <AlertCircle className="h-3 w-3 me-1" />
                                        {expiringCertificates.length} {isRTL ? 'تنتهي قريباً' : 'expiring soon'}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-2">
                                {certificates.slice(0, 3).map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/40 hover:bg-card transition-colors text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span className="font-medium text-foreground truncate">{c.title}</span>
                                        </div>
                                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                            {c.completionDate ? new Date(c.completionDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' }) : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا توجد شهادات بعد' : 'No certificates yet'}</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'أتمم الدورات والتقييمات المعتمدة للحصول على شهاداتك الرسمية.' : 'Complete certified training modules to earn verified accreditations.'}
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* 5. Recommended Course Library */}
                <SectionCard
                    title={t('training:recommended', 'Recommended')}
                    subtitle={isRTL ? 'دورات مقترحة لتطوير مهاراتك' : 'Suggested courses to elevate your skills'}
                    icon={<Sparkles className="h-4 w-4" />}
                    className="md:col-span-2 lg:col-span-2"
                >
                    {modulesQuery.isLoading ? (
                        <SectionSkeleton />
                    ) : recommended.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {recommended.map((m) => (
                                <Link
                                    key={m.id}
                                    to={`/learning/training/${m.id}`}
                                    className="group flex flex-col justify-between p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-amber-500/30 hover:shadow-sm transition-all duration-200"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground uppercase font-medium">
                                                {m.category || (isRTL ? 'ضيافة' : 'Hospitality')}
                                            </Badge>
                                            {m.estimated_duration_minutes && (
                                                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {m.estimated_duration_minutes} {isRTL ? 'د' : 'min'}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-sm text-foreground group-hover:text-amber-600 transition-colors line-clamp-1">
                                            {m.title}
                                        </h4>
                                        {m.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-sans">
                                                {m.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-3 pt-2 border-t border-border/30">
                                        <span>{isRTL ? 'استعراض البرنامج' : 'Explore Course'}</span>
                                        <ArrowRight className={cn("h-3.5 w-3.5 transition-transform group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا توجد مقترحات جديدة حالياً' : 'Nothing recommended yet'}</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'ستظهر الدورات الإضافية هنا فور نشر محتوى تدريبي جديد.' : 'New courses will automatically appear here as they are published.'}
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* 6. Saved Knowledge & SOPs */}
                <SectionCard
                    title={t('training:savedKnowledge', 'Saved knowledge')}
                    subtitle={isRTL ? 'الأدلة والمعايير المحفوظة للرجوع السريع' : 'Bookmarked policies & standards'}
                    icon={<BookMarked className="h-4 w-4" />}
                    action={
                        <Link
                            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            to="/knowledge"
                        >
                            <span>{t('common:browse', 'Browse')}</span>
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    }
                >
                    {bookmarksQuery.isLoading ? (
                        <SectionSkeleton />
                    ) : bookmarks.length > 0 ? (
                        <div className="space-y-2.5">
                            {bookmarks.slice(0, 5).map((b) => (
                                <Link
                                    key={b.document_id}
                                    to={`/knowledge/${b.document_id}`}
                                    className="group flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/40 hover:bg-card hover:border-amber-500/30 transition-all text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <BookMarked className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="font-medium text-foreground truncate group-hover:text-amber-600 transition-colors">
                                            {b.article?.title ?? t('training:savedArticle', 'Saved SOP Article')}
                                        </span>
                                    </div>
                                    <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-amber-600", isRTL && "rotate-180")} />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-muted-foreground mb-3">
                                <BookMarked className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{isRTL ? 'لا توجد أدلة محفوظة' : 'No saved knowledge'}</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'احفظ إجراءات التشغيل القياسية المهمة للوصول السريع إليها من هنا.' : 'Bookmark hotel SOPs and policies to access them instantly.'}
                            </p>
                        </div>
                    )}
                </SectionCard>
            </div>
        </div>
    )
}
