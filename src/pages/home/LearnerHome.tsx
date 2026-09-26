/**
 * My day - the Learn workspace home.
 *
 * Answers one question: "What must I do now?" In order: required now
 * (overdue and mandatory work), continue where I left off, due soon, then
 * saved knowledge and certificates. Every item leads to an action and every
 * number comes from the member's own data - nothing decorative or invented.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Award, BookMarked, BookOpen, ChevronRight, FileCheck2, FileQuestion, PlayCircle } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useArticles, useBookmarks, useRequiredReading } from '@/hooks/useKnowledge'
import { useTenant } from '@/contexts/TenantContext'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments } from '@/hooks/useTraining'
import type { LearningAssignment } from '@/types/learning'
import { cn } from '@/lib/utils'
import {
    ActionQueue,
    EmptyState,
    ErrorState,
    ProgressBar,
    SectionHeader,
    Skeleton,
    type ActionQueueItem,
} from '@/ui'

const DUE_SOON_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

function assignmentHref(a: LearningAssignment): string {
    return a.content_type === 'quiz'
        ? `/learn/quizzes/${a.content_id}?assignment=${a.id}`
        : `/learn/player/${a.content_id}?assignment=${a.id}`
}

function SectionSkeleton() {
    return (
        <div className="space-y-2.5" aria-hidden="true">
            <Skeleton variant="card" className="h-16" />
            <Skeleton variant="card" className="h-16" />
        </div>
    )
}

export default function LearnerHome() {
    const { t, i18n } = useTranslation(['training', 'common'])
    const { user, profile } = useAuth()
    const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-US'
    const isRTL = i18n.dir() === 'rtl'

    // Captured once so "overdue" does not shift during a render pass.
    const [now] = useState(() => Date.now())

    const progressQuery = useLearningProgress({ userId: user?.id ?? null })
    const assignmentsQuery = useMyAssignments()
    const certificatesQuery = useMyCertificates()
    const bookmarksQuery = useBookmarks()
    const readingQuery = useRequiredReading()
    const account = useAccountContext()
    const { currentOrganization } = useTenant()
    const departmentId = account.tenantMemberships.find(
        (m) => m.organization_id === currentOrganization?.id,
    )?.department_id ?? undefined
    const roleArticlesQuery = useArticles({ departmentId, limit: 5 })

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' })

    const open = useMemo(
        () => (assignmentsQuery.data ?? []).filter((a) => a.progress?.status !== 'completed'),
        [assignmentsQuery.data],
    )

    // Required now: overdue, or mandatory for compliance.
    const requiredNow = useMemo<ActionQueueItem[]>(() => {
        return open
            .map((a) => ({ a, due: a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY }))
            .filter(({ a, due }) => due < now || a.priority === 'compliance')
            .sort((x, y) => x.due - y.due)
            .map(({ a, due }) => {
                const overdue = due < now
                const started = a.progress?.status === 'in_progress'
                return {
                    id: a.id,
                    title: a.content_title ?? t('training:untitledAssignment', 'Untitled item'),
                    description: overdue
                        ? t('training:myDay.overdueSince', 'Overdue since {{date}}', { date: formatDate(a.due_date!) })
                        : a.due_date
                            ? t('training:myDay.dueOn', 'Due {{date}}', { date: formatDate(a.due_date) })
                            : undefined,
                    meta: t('training:mandatory', 'Mandatory'),
                    tone: overdue ? 'urgent' : 'attention',
                    icon: a.content_type === 'quiz' ? FileQuestion : BookOpen,
                    href: assignmentHref(a),
                    actionLabel: started ? t('training:myDay.resume', 'Resume') : t('training:myDay.start', 'Start'),
                } satisfies ActionQueueItem
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps -- formatDate only depends on locale
    }, [open, now, t, locale])

    const readingToAcknowledge = useMemo<ActionQueueItem[]>(
        () => (readingQuery.data ?? [])
            .filter((r) => !r.is_acknowledged)
            .map((r) => ({
                id: `read-${r.document_id}`,
                title: r.title,
                description: t('training:myDay.readRequired', 'Required reading'),
                tone: 'attention',
                icon: FileCheck2,
                href: `/knowledge/${r.document_id}`,
                actionLabel: t('training:myDay.readAndAcknowledge', 'Read and acknowledge'),
            } satisfies ActionQueueItem)),
        [readingQuery.data, t],
    )
    const attention = useMemo(() => [...requiredNow, ...readingToAcknowledge], [requiredNow, readingToAcknowledge])

    // Due soon: everything else with a due date inside the window.
    const dueSoon = useMemo<ActionQueueItem[]>(() => {
        const requiredIds = new Set(requiredNow.map((i) => i.id))
        return open
            .filter((a) => !requiredIds.has(a.id) && a.due_date && Date.parse(a.due_date) - now < DUE_SOON_DAYS * DAY_MS)
            .sort((x, y) => Date.parse(x.due_date!) - Date.parse(y.due_date!))
            .map((a) => ({
                id: a.id,
                title: a.content_title ?? t('training:untitledAssignment', 'Untitled item'),
                description: t('training:myDay.dueOn', 'Due {{date}}', { date: formatDate(a.due_date!) }),
                tone: 'standard',
                icon: a.content_type === 'quiz' ? FileQuestion : BookOpen,
                href: assignmentHref(a),
                actionLabel: a.progress?.status === 'in_progress' ? t('training:myDay.resume', 'Resume') : t('training:myDay.start', 'Start'),
            } satisfies ActionQueueItem))
        // eslint-disable-next-line react-hooks/exhaustive-deps -- formatDate only depends on locale
    }, [open, requiredNow, now, t, locale])

    // Continue: the course touched most recently and not yet finished.
    const continueLearning = useMemo(() => {
        return [...(progressQuery.data ?? [])]
            .filter((p) => p.status === 'in_progress' && p.content_type === 'module')
            .sort((a, b) => Date.parse(b.last_accessed_at ?? '0') - Date.parse(a.last_accessed_at ?? '0'))[0]
    }, [progressQuery.data])

    const completedCount = useMemo(
        () => (progressQuery.data ?? []).filter((p) => p.status === 'completed').length,
        [progressQuery.data],
    )

    const firstName = profile?.full_name?.split(' ')[0]
    const hour = new Date(now).getHours()
    const greeting = hour < 12
        ? t('training:myDay.goodMorning', 'Good morning')
        : hour < 18
            ? t('training:myDay.goodAfternoon', 'Good afternoon')
            : t('training:myDay.goodEvening', 'Good evening')
    const today = new Date(now).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })

    const bookmarks = bookmarksQuery.data ?? []
    const certificates = certificatesQuery.data ?? []

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
            <header className="space-y-2 border-b border-ds-border pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{today}</p>
                <h1 className="font-editorial text-[34px] font-semibold leading-tight text-ds-ink sm:text-[42px]">
                    {firstName ? `${greeting}, ${firstName}` : greeting}
                </h1>
                <p className="text-base text-ds-ink-secondary" aria-live="polite">
                    {assignmentsQuery.isLoading
                        ? '\u00a0'
                        : attention.length > 0
                            ? t('training:myDay.attentionCount', '{{count}} actions need your attention', { count: attention.length })
                            : t('training:myDay.attentionNone', 'Nothing needs your attention right now.')}
                </p>
            </header>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* 1. Required now */}
                    <section aria-labelledby="my-day-required" className="space-y-3">
                        <SectionHeader
                            headingId="my-day-required"
                            title={t('training:myDay.requiredNow', 'Required now')}
                            subtitle={t('training:myDay.requiredNowHint', 'Overdue and mandatory training, most urgent first')}
                        />
                        {assignmentsQuery.isLoading ? (
                            <SectionSkeleton />
                        ) : assignmentsQuery.isError ? (
                            <ErrorState
                                message={t('training:myDay.loadError', 'Your assignments could not be loaded.')}
                                onRetry={() => void assignmentsQuery.refetch()}
                            />
                        ) : (
                            <ActionQueue
                                items={attention}
                                emptyTitle={t('training:myDay.nothingRequired', 'Nothing required right now')}
                                emptyDescription={t('training:myDay.nothingRequiredHint', 'You have no overdue or mandatory training.')}
                            />
                        )}
                    </section>

                    {/* 2. Continue */}
                    {continueLearning && (
                        <section aria-labelledby="my-day-continue" className="space-y-3">
                            <SectionHeader
                            headingId="my-day-continue" title={t('training:myDay.continue', 'Continue where you left off')} />
                            <div className="flex flex-col gap-4 rounded-xl border border-ds-border bg-ds-surface p-4 sm:flex-row sm:items-center">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ds-accent-soft text-ds-accent">
                                    <PlayCircle className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <p className="truncate text-sm font-semibold text-ds-ink">
                                        {continueLearning.courses?.title ?? t('training:untitledAssignment', 'Untitled item')}
                                    </p>
                                    <ProgressBar
                                        value={continueLearning.progress_percentage ?? 0}
                                        label={t('training:myDay.progress', 'Progress')}
                                        showPercentage
                                        size="sm"
                                    />
                                </div>
                                <Link
                                    to={`/learn/player/${continueLearning.content_id}`}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
                                >
                                    {t('training:myDay.resume', 'Resume')}
                                    <ChevronRight className={cn('h-4 w-4', isRTL && 'rotate-180')} aria-hidden="true" />
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* 3. Due soon */}
                    <section aria-labelledby="my-day-due" className="space-y-3">
                        <SectionHeader
                            headingId="my-day-due"
                            title={t('training:dueSoon', 'Due soon')}
                            subtitle={t('training:myDay.dueSoonHint', 'Due in the next two weeks')}
                            action={
                                <Link to="/learn/my" className="text-xs font-semibold text-ds-accent hover:underline">
                                    {t('training:myDay.allMyLearning', 'All my learning')}
                                </Link>
                            }
                        />
                        {assignmentsQuery.isLoading ? (
                            <SectionSkeleton />
                        ) : (
                            <ActionQueue
                                items={dueSoon}
                                emptyTitle={t('training:myDay.nothingDueSoon', 'Nothing else due soon')}
                                emptyDescription={t('training:myDay.nothingDueSoonHint', 'Browse the course catalog to keep learning.')}
                            />
                        )}
                    </section>
                </div>

                <aside className="lg:col-span-4 space-y-8">
                    <section aria-labelledby="my-day-role-knowledge" className="space-y-3">
                        <SectionHeader
                            headingId="my-day-role-knowledge"
                            title={departmentId
                                ? t('training:myDay.roleKnowledge', 'Knowledge for your role')
                                : t('training:myDay.latestKnowledge', 'Latest knowledge')}
                            action={
                                <Link to="/knowledge" className="text-xs font-semibold text-ds-accent hover:underline">
                                    {t('common:browse', 'Browse')}
                                </Link>
                            }
                        />
                        {roleArticlesQuery.isLoading ? (
                            <SectionSkeleton />
                        ) : (roleArticlesQuery.data ?? []).length > 0 ? (
                            <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                                {(roleArticlesQuery.data ?? []).slice(0, 5).map((a) => (
                                    <li key={a.id}>
                                        <Link
                                            to={`/knowledge/${a.id}`}
                                            className="flex min-h-[52px] flex-col justify-center px-3 py-2 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
                                        >
                                            <span className="truncate text-sm font-medium text-ds-ink">{(isRTL && a.title_ar) || a.title}</span>
                                            <span className="truncate text-xs text-ds-muted">
                                                {[a.sop_code || a.code, t(`knowledge:types.${a.content_type}`, a.content_type)].filter(Boolean).join(' · ')}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
                                title={t('training:myDay.noRoleKnowledge', 'No articles for your department yet')}
                                description={t('training:myDay.noRoleKnowledgeHint', 'Your knowledge manager publishes SOPs here. Search the knowledge base in the meantime.')}
                            />
                        )}
                    </section>

                    {/* 4. Saved knowledge */}
                    <section aria-labelledby="my-day-knowledge" className="space-y-3">
                        <SectionHeader
                            headingId="my-day-knowledge"
                            title={t('training:savedKnowledge', 'Saved knowledge')}
                            action={
                                <Link to="/knowledge" className="text-xs font-semibold text-ds-accent hover:underline">
                                    {t('common:browse', 'Browse')}
                                </Link>
                            }
                        />
                        {bookmarksQuery.isLoading ? (
                            <SectionSkeleton />
                        ) : bookmarks.length > 0 ? (
                            <ul className="space-y-2">
                                {bookmarks.slice(0, 5).map((b) => (
                                    <li key={b.document_id}>
                                        <Link
                                            to={`/knowledge/${b.document_id}`}
                                            className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-ds-border bg-ds-surface px-3 text-sm text-ds-ink hover:border-ds-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                                        >
                                            <BookMarked className="h-4 w-4 shrink-0 text-ds-accent" aria-hidden="true" />
                                            <span className="truncate">{b.article?.title ?? t('training:savedArticle', 'Saved article')}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<BookMarked className="h-5 w-5" aria-hidden="true" />}
                                title={t('training:myDay.noSaved', 'No saved articles')}
                                description={t('training:myDay.noSavedHint', 'Save the SOPs you use most to find them here.')}
                            />
                        )}
                    </section>

                    {/* 5. Completed and certified */}
                    <section aria-labelledby="my-day-record" className="space-y-3">
                        <SectionHeader
                            headingId="my-day-record" title={t('training:myDay.record', 'Your record')} />
                        <dl className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-ds-border bg-ds-surface p-3">
                                <dt className="text-xs text-ds-muted">{t('training:completed', 'Completed')}</dt>
                                <dd className="mt-1 font-mono text-2xl font-bold text-ds-ink">
                                    {progressQuery.isLoading ? '–' : completedCount}
                                </dd>
                            </div>
                            <div className="rounded-lg border border-ds-border bg-ds-surface p-3">
                                <dt className="text-xs text-ds-muted">{t('training:certificates', 'Certificates')}</dt>
                                <dd className="mt-1 font-mono text-2xl font-bold text-ds-ink">
                                    {certificatesQuery.isLoading ? '–' : certificates.length}
                                </dd>
                            </div>
                        </dl>
                        <Link
                            to="/learn/certificates"
                            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ds-accent hover:underline"
                        >
                            <Award className="h-4 w-4" aria-hidden="true" />
                            {t('training:myDay.viewCertificates', 'View certificates')}
                        </Link>
                    </section>
                </aside>
            </div>
        </div>
    )
}
