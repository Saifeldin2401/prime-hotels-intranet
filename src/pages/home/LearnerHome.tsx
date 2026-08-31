/**
 * LearnerHome - the learner's landing page for the Training + Knowledge Base + Quiz platform.
 *
 * Design rule: every section is backed by a real query via existing hooks/services, or it
 * renders an explicit empty state. No section ever shows a fabricated number.
 *
 * Sections:
 *  1. Continue learning    - resume last in-progress lesson (useLearningProgress, self-filtered)
 *  2. Assigned training    - mandatory items + due dates, overdue first (useMyAssignments)
 *  3. Recommended          - published courses not yet started/assigned (useTrainingModules);
 *                            honest empty state when there is no signal
 *  4. My progress          - courses in progress + completion rate (useLearningProgress)
 *  5. Certificates & skills - earned + expiring within 30 days (useMyCertificates)
 *  6. Saved knowledge      - bookmarked articles/docs (useBookmarks)
 */
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useBookmarks } from '@/hooks/useKnowledge'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments } from '@/hooks/useTraining'
import { useTrainingModules } from '@/hooks/useTraining'
import {
    Award,
    BookMarked,
    BookOpen,
    ClipboardList,
    GraduationCap,
    Sparkles,
    TrendingUp,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const EXPIRY_WINDOW_DAYS = 30

function SectionCard({
    title,
    icon,
    children,
    action,
}: {
    title: string
    icon: ReactNode
    children: ReactNode
    action?: ReactNode
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-muted-foreground">{icon}</span>
                    {title}
                </CardTitle>
                {action}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function RowSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    )
}

export default function LearnerHome() {
    const { user, profile } = useAuth()
    const userId = user?.id

    // Stable "now" captured at mount so the render stays pure (react-hooks/purity).
    const [now] = useState(() => Date.now())

    const progressQuery = useLearningProgress()
    const assignmentsQuery = useMyAssignments()
    const modulesQuery = useTrainingModules()
    const certificatesQuery = useMyCertificates()
    const bookmarksQuery = useBookmarks()

    // useLearningProgress() returns org-wide rows; always narrow to the current user.
    const myProgress = useMemo(
        () => (progressQuery.data ?? []).filter((p) => p.user_id === userId),
        [progressQuery.data, userId],
    )

    const continueLearning = useMemo(() => {
        return [...myProgress]
            .filter((p) => p.status === 'in_progress')
            .sort((a, b) => {
                const at = a.last_accessed_at ? Date.parse(a.last_accessed_at) : 0
                const bt = b.last_accessed_at ? Date.parse(b.last_accessed_at) : 0
                return bt - at
            })[0]
    }, [myProgress])

    const assignments = useMemo(() => {
        return [...(assignmentsQuery.data ?? [])]
            .filter((a) => a.progress?.status !== 'completed')
            .sort((a, b) => {
                const ad = a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY
                const bd = b.due_date ? Date.parse(b.due_date) : Number.POSITIVE_INFINITY
                return ad - bd
            })
            .map((a) => ({
                ...a,
                overdue: !!a.due_date && Date.parse(a.due_date) < now,
            }))
    }, [assignmentsQuery.data, now])

    const recommended = useMemo(() => {
        const seen = new Set<string>()
        myProgress.forEach((p) => seen.add(p.content_id))
        ;(assignmentsQuery.data ?? []).forEach((a) => seen.add(a.content_id))
        return (modulesQuery.data ?? [])
            .filter((m) => m.status === 'published' && !seen.has(m.id))
            .slice(0, 5)
    }, [modulesQuery.data, myProgress, assignmentsQuery.data])

    const progressStats = useMemo(() => {
        const total = myProgress.length
        const completed = myProgress.filter((p) => p.status === 'completed').length
        const inProgress = myProgress.filter((p) => p.status === 'in_progress').length
        return {
            total,
            completed,
            inProgress,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : null,
        }
    }, [myProgress])

    const certificates = useMemo(() => certificatesQuery.data ?? [], [certificatesQuery.data])
    const expiringCertificates = useMemo(() => {
        const cutoff = now + EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000
        return certificates.filter(
            (c) =>
                c.status === 'active' &&
                c.expiryDate instanceof Date &&
                c.expiryDate.getTime() <= cutoff,
        )
    }, [certificates, now])

    const bookmarks = bookmarksQuery.data ?? []

    const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
            <header>
                <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
                <p className="text-muted-foreground">
                    Your learning at a glance. Pick up where you left off or start something new.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Continue learning */}
                <SectionCard title="Continue learning" icon={<BookOpen className="h-4 w-4" />}>
                    {progressQuery.isLoading ? (
                        <RowSkeleton />
                    ) : continueLearning ? (
                        <div className="space-y-3">
                            <div className="font-medium">
                                {continueLearning.training_modules?.title ??
                                    `Lesson ${continueLearning.content_id.slice(0, 8)}`}
                            </div>
                            <Progress value={continueLearning.progress_percentage} />
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{continueLearning.progress_percentage}% complete</span>
                                <Link
                                    className="font-medium text-primary hover:underline"
                                    to={`/learning/training/${continueLearning.content_id}`}
                                >
                                    Resume
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<BookOpen className="h-8 w-8" />}
                            title="Nothing in progress"
                            description="Start an assigned or recommended course and it will show up here."
                        />
                    )}
                </SectionCard>

                {/* 2. Assigned training */}
                <SectionCard
                    title="Assigned training"
                    icon={<ClipboardList className="h-4 w-4" />}
                    action={
                        <Link className="text-sm text-primary hover:underline" to="/learning/my">
                            View all
                        </Link>
                    }
                >
                    {assignmentsQuery.isLoading ? (
                        <RowSkeleton />
                    ) : assignments.length > 0 ? (
                        <ul className="space-y-3">
                            {assignments.slice(0, 5).map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-center justify-between gap-2 text-sm"
                                >
                                    <span className="truncate">
                                        {a.content_title ?? 'Untitled item'}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                        {a.priority === 'compliance' && (
                                            <Badge variant="secondary">Mandatory</Badge>
                                        )}
                                        {a.due_date && (
                                            <Badge variant={a.overdue ? 'destructive' : 'outline'}>
                                                {a.overdue ? 'Overdue' : 'Due'}{' '}
                                                {new Date(a.due_date).toLocaleDateString()}
                                            </Badge>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<ClipboardList className="h-8 w-8" />}
                            title="No assigned training"
                            description="You're all caught up. Nothing is currently assigned to you."
                        />
                    )}
                </SectionCard>

                {/* 3. Recommended */}
                <SectionCard title="Recommended" icon={<Sparkles className="h-4 w-4" />}>
                    {modulesQuery.isLoading ? (
                        <RowSkeleton />
                    ) : recommended.length > 0 ? (
                        <ul className="space-y-3">
                            {recommended.map((m) => (
                                <li key={m.id} className="text-sm">
                                    <Link
                                        className="font-medium hover:underline"
                                        to={`/learning/training/${m.id}`}
                                    >
                                        {m.title}
                                    </Link>
                                    {m.description && (
                                        <p className="truncate text-muted-foreground">
                                            {m.description}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<Sparkles className="h-8 w-8" />}
                            title="Nothing recommended yet"
                            description="Recommendations appear once there are published courses you haven't started."
                        />
                    )}
                </SectionCard>

                {/* 4. My progress */}
                <SectionCard title="My progress" icon={<TrendingUp className="h-4 w-4" />}>
                    {progressQuery.isLoading ? (
                        <RowSkeleton />
                    ) : progressStats.total > 0 ? (
                        <div className="space-y-3">
                            <div className="flex gap-6">
                                <div>
                                    <div className="text-2xl font-semibold">
                                        {progressStats.inProgress}
                                    </div>
                                    <div className="text-sm text-muted-foreground">In progress</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-semibold">
                                        {progressStats.completed}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Completed</div>
                                </div>
                            </div>
                            {progressStats.completionRate !== null && (
                                <div className="space-y-1">
                                    <Progress value={progressStats.completionRate} />
                                    <div className="text-sm text-muted-foreground">
                                        {progressStats.completionRate}% completion rate
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<TrendingUp className="h-8 w-8" />}
                            title="No progress tracked yet"
                            description="Your course activity will be summarised here once you begin."
                        />
                    )}
                </SectionCard>

                {/* 5. Certificates & skills */}
                <SectionCard
                    title="Certificates & skills"
                    icon={<Award className="h-4 w-4" />}
                    action={
                        <Link className="text-sm text-primary hover:underline" to="/training/certificates">
                            View all
                        </Link>
                    }
                >
                    {certificatesQuery.isLoading ? (
                        <RowSkeleton />
                    ) : certificates.length > 0 ? (
                        <div className="space-y-3">
                            <div className="text-sm">
                                <GraduationCap className="mr-1 inline h-4 w-4" />
                                {certificates.length} earned
                                {expiringCertificates.length > 0 && (
                                    <Badge variant="destructive" className="ml-2">
                                        {expiringCertificates.length} expiring soon
                                    </Badge>
                                )}
                            </div>
                            <ul className="space-y-2">
                                {certificates.slice(0, 4).map((c) => (
                                    <li
                                        key={c.id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="truncate">{c.title}</span>
                                        {c.expiryDate instanceof Date && (
                                            <span className="shrink-0 text-muted-foreground">
                                                exp. {c.expiryDate.toLocaleDateString()}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<Award className="h-8 w-8" />}
                            title="No certificates yet"
                            description="Complete a certifying course to earn your first certificate."
                        />
                    )}
                </SectionCard>

                {/* 6. Saved knowledge */}
                <SectionCard
                    title="Saved knowledge"
                    icon={<BookMarked className="h-4 w-4" />}
                    action={
                        <Link className="text-sm text-primary hover:underline" to="/knowledge">
                            Browse
                        </Link>
                    }
                >
                    {bookmarksQuery.isLoading ? (
                        <RowSkeleton />
                    ) : bookmarks.length > 0 ? (
                        <ul className="space-y-2">
                            {bookmarks.slice(0, 6).map((b) => (
                                <li key={b.document_id} className="truncate text-sm">
                                    <Link
                                        className="hover:underline"
                                        to={`/knowledge/${b.document_id}`}
                                    >
                                        {b.article?.title ?? 'Saved article'}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            size="sm"
                            icon={<BookMarked className="h-8 w-8" />}
                            title="No saved knowledge"
                            description="Bookmark articles and SOPs to keep them handy here."
                        />
                    )}
                </SectionCard>
            </div>
        </div>
    )
}
