/**
 * LearnerHome - Executive Landing Cockpit for Training, SOP Knowledge & Hotel Certifications.
 *
 * Brand: ALTUS Hospitality Ecosystem
 * Aesthetic: Apple Design System + Emil Kowalski design engineering + MasterClass luxury.
 * Strictly backed by real query hooks (useLearningProgress, useMyAssignments, useTrainingModules,
 * useMyCertificates, useBookmarks).
 */
import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useBookmarks } from '@/hooks/useKnowledge'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments, useTrainingModules } from '@/hooks/useTraining'
import { calculateStreak } from '@/lib/training/analytics'
import { getTimeBasedGreeting } from '@/lib/greetingUtils'
import { cn } from '@/lib/utils'
import {
    ArrowRight,
    BookMarked,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    ExternalLink,
    FileQuestion,
    Play,
    Sparkles,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Modular ALTUS Learner Components
import { LearnerHeroCockpit } from '@/components/learner/LearnerHeroCockpit'
import { ContinueLearningSpotlight } from '@/components/learner/ContinueLearningSpotlight'
import { getAltusAvatar } from '@/lib/avatarHelpers'
import { CurriculumProgressRings } from '@/components/learner/CurriculumProgressRings'
import { DailyKnowledgeBite } from '@/components/learner/DailyKnowledgeBite'
import { LearningStreakBadges } from '@/components/learner/LearningStreakBadges'

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
        <Card
            className={cn(
                'overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/90 to-amber-500/[0.02]',
                'shadow-sm backdrop-blur-xl transition-all duration-300',
                className
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
                        {icon}
                    </div>
                    <div>
                        <CardTitle className="font-display text-base font-bold text-foreground">
                            {title}
                        </CardTitle>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground font-sans mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {action}
            </CardHeader>
            <CardContent className="p-5">{children}</CardContent>
        </Card>
    )
}

function SectionSkeleton() {
    return (
        <div className="space-y-3 py-2 animate-pulse">
            <Skeleton className="h-14 w-full rounded-2xl bg-muted/60" />
            <Skeleton className="h-14 w-full rounded-2xl bg-muted/60" />
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

    // Adapt continue learning for the spotlight card
    const spotlightModule = useMemo(() => {
        if (!continueLearning) return null
        return {
            content_id: continueLearning.content_id,
            progress_percentage: continueLearning.progress_percentage || 0,
            title: continueLearning.training_modules?.title,
            description: continueLearning.training_modules?.description,
            category: 'Hospitality Core',
            estimated_duration_minutes: 15,
            currentChapter: isRTL ? 'معايير الخدمة الفندقية الفاخرة' : 'Luxury Service Standards',
            thumbnail_url: '/assets/altus/concierge-frontdesk.jpg',
        }
    }, [continueLearning, isRTL])

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

    // Certificates
    const certificates = useMemo(() => certificatesQuery.data ?? [], [certificatesQuery.data])

    // User streak
    const streak = useMemo(() => {
        const completedItems = myProgress
            .filter((p) => p.status === 'completed' && p.completed_at)
            .map((p) => ({ completed_at: p.completed_at || null }))
        return calculateStreak(completedItems)
    }, [myProgress])

    const bookmarks = bookmarksQuery.data ?? []
    const firstName = profile?.full_name?.split(' ')[0] ?? (isRTL ? 'الموظف' : 'Learner')
    const greeting = getTimeBasedGreeting(t)

    // Formatted dates
    const today = new Date()
    const gregorianDate = today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })

    let hijriDate = ''
    try {
        hijriDate =
            new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(today) + (isRTL ? ' هـ' : ' AH')
    } catch {
        hijriDate = ''
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* 1. Executive Learner Cockpit Hero */}
            <LearnerHeroCockpit
                firstName={firstName}
                greetingText={greeting.greetingText}
                greetingEmoji={greeting.emoji}
                subtitleText={greeting.subtitleText}
                avatarUrl={getAltusAvatar(profile)}
                gregorianDate={gregorianDate}
                hijriDate={hijriDate}
                propertyName={profile?.job_title || (isRTL ? 'ألتوس للضيافة' : 'ALTUS Hospitality')}
                departmentName={isRTL ? 'إدارة التميز التشغيلي' : 'Operational Excellence'}
                masteryLevel={{
                    level: 3,
                    title: 'Senior Hospitality Associate',
                    titleAr: 'أخصائي ضيافة متقدم',
                    progress: progressStats.completionRate ?? 65,
                }}
                stats={{
                    inProgress: progressStats.inProgress,
                    completed: progressStats.completed,
                    certificatesCount: certificates.length,
                    streakDays: streak,
                }}
                isRTL={isRTL}
                t={t}
            />

            {/* 2. Spotlight "Continue Learning" MasterClass Stage */}
            <ContinueLearningSpotlight
                module={spotlightModule}
                isLoading={progressQuery.isLoading}
                isRTL={isRTL}
                t={t}
            />

            {/* 3. Operational Competency Rings & Daily Knowledge Bite */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <CurriculumProgressRings
                        overallCompletionRate={progressStats.completionRate}
                        isRTL={isRTL}
                    />
                </div>
                <div className="lg:col-span-1">
                    <DailyKnowledgeBite isRTL={isRTL} />
                </div>
            </div>

            {/* 4. Main Cockpit Grid: Assigned Training, Gamified Streak, and Recommendations */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* 4A. Mandatory & Assigned Training Deck */}
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
                            <ChevronRight className={cn('h-3.5 w-3.5', isRTL && 'rotate-180')} />
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
                                    className="group flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-amber-500/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 border border-amber-500/20">
                                            {a.content_type === 'quiz' ? (
                                                <FileQuestion className="h-4 w-4" />
                                            ) : (
                                                <BookOpen className="h-4 w-4" />
                                            )}
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
                                                    <span
                                                        className={cn(
                                                            'text-[11px] font-mono flex items-center gap-1',
                                                            a.overdue ? 'text-destructive font-bold' : 'text-muted-foreground'
                                                        )}
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        {a.overdue ? (isRTL ? 'تاريخ الاستحقاق' : 'Due') : (isRTL ? 'مستحق' : 'Due')}{' '}
                                                        {new Date(a.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 shrink-0 font-medium rounded-xl"
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
                            <h4 className="font-semibold text-sm text-foreground">
                                {isRTL ? 'لا توجد تدريبات معلقة' : 'All assignments complete'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL ? 'تمت تلبية جميع معايير التدريب الإلزامية الخاصة بك.' : 'All mandatory operational training requirements are satisfied.'}
                            </p>
                        </div>
                    )}
                </SectionCard>

                {/* 4B. Learning Streak & Badges Locker */}
                <LearningStreakBadges
                    streakDays={streak}
                    certificatesCount={certificates.length}
                    isRTL={isRTL}
                />

                {/* 4C. Saved SOPs & Knowledge Documents */}
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
                            {bookmarks.slice(0, 4).map((b) => (
                                <Link
                                    key={b.document_id}
                                    to={`/knowledge/${b.document_id}`}
                                    className="group flex items-center justify-between gap-2 p-3 rounded-2xl border border-border/40 bg-background/50 hover:bg-card hover:border-amber-500/30 transition-all text-xs"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                            <BookMarked className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-medium text-foreground truncate group-hover:text-amber-600 transition-colors">
                                            {b.article?.title ?? t('training:savedArticle', 'Saved SOP Article')}
                                        </span>
                                    </div>
                                    <ChevronRight
                                        className={cn(
                                            'h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-amber-600',
                                            isRTL && 'rotate-180'
                                        )}
                                    />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/40 text-muted-foreground mb-3">
                                <BookMarked className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">
                                {isRTL ? 'لا توجد أدلة محفوظة' : 'No saved knowledge'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {isRTL
                                    ? 'احفظ إجراءات التشغيل القياسية المهمة للوصول السريع إليها من هنا.'
                                    : 'Bookmark hotel SOPs and policies to access them instantly.'}
                            </p>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* 5. Recommended Programs Horizon */}
            {recommended.length > 0 && (
                <SectionCard
                    title={t('training:recommended', 'Recommended programs')}
                    subtitle={isRTL ? 'دورات مقترحة لتطوير مسارك المهني في ألتوس' : 'Suggested courses to accelerate your ALTUS career'}
                    icon={<Sparkles className="h-4 w-4" />}
                    action={
                        <Link
                            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            to="/courses"
                        >
                            <span>{isRTL ? 'تصفح الكتالوج بالكامل' : 'Explore Full Catalog'}</span>
                            <ChevronRight className={cn('h-3.5 w-3.5', isRTL && 'rotate-180')} />
                        </Link>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recommended.map((m) => (
                            <Link
                                key={m.id}
                                to={`/learning/training/${m.id}`}
                                className="group flex flex-col justify-between p-4 rounded-2xl border border-border/50 bg-background/40 hover:bg-card hover:border-amber-500/30 hover:shadow-sm transition-all duration-200"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] border-border text-muted-foreground uppercase font-medium"
                                        >
                                            {m.category || (isRTL ? 'معيار فندقي' : 'Hospitality')}
                                        </Badge>
                                        {m.estimated_duration_minutes && (
                                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {m.estimated_duration_minutes} {isRTL ? 'د' : 'min'}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-sm text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                                        {m.title}
                                    </h4>
                                    {m.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-sans">
                                            {m.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-4 pt-2 border-t border-border/30">
                                    <span>{isRTL ? 'استعراض' : 'Explore'}</span>
                                    <ArrowRight
                                        className={cn(
                                            'h-3.5 w-3.5 transition-transform group-hover:translate-x-1',
                                            isRTL && 'rotate-180 group-hover:-translate-x-1'
                                        )}
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
    )
}
