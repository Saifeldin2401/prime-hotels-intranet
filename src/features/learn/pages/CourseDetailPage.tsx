/**
 * Learn > Course detail.
 *
 * The decision page before learning. It answers, in order: is this required
 * of me, what is it, what will I be able to do, how long is it, what does
 * finishing give me - and offers exactly one next step (Start, Resume or
 * Review) that stays in reach on every screen size. Only facts the course
 * actually has are shown; nothing is filled in when it is missing.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Award, CheckCircle2, Circle, CircleDot, FileQuestion, PlayCircle } from 'lucide-react'

import { useMyAssignments } from '@/hooks/useTraining'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/ui'

import { useCourse, useCourseLessons, useMyCourseProgress } from '../courseHooks'
import type { CourseLesson, CourseProgress } from '../courseApi'
import { CourseCover } from '../gamification/components/CourseCover'

type LearnerState = 'not_started' | 'in_progress' | 'completed'

function stateOf(progress: CourseProgress | null | undefined): LearnerState {
  if (!progress) return 'not_started'
  if (progress.status === 'completed' || progress.completed_at) return 'completed'
  return 'in_progress'
}

/** Total minutes only when every lesson has a real duration - never guessed. */
function knownMinutes(courseMinutes: number | null, lessons: CourseLesson[]): number | null {
  if (courseMinutes) return courseMinutes
  if (lessons.length === 0 || lessons.some((l) => !l.duration_seconds)) return null
  return Math.round(lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60)
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const course = useCourse(id)
  const lessons = useCourseLessons(id)
  const progress = useMyCourseProgress(id)
  const assignments = useMyAssignments()

  const assignment = useMemo(
    () => (assignments.data ?? []).find((a) => a.content_id === id && a.content_type !== 'quiz'),
    [assignments.data, id],
  )
  const lessonList = lessons.data ?? []
  const state = stateOf(progress.data)
  const pct = Math.round(progress.data?.progress_percentage ?? 0)
  const completed = new Set(progress.data?.completed_blocks ?? [])
  const resumeIndex = progress.data?.last_block_index ?? null
  const quizCount = lessonList.filter((l) => l.block_type === 'quiz').length
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  if (course.isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
        <div className="space-y-4">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-12 w-3/4" />
          <Skeleton variant="text" className="h-16 w-full" />
          <Skeleton variant="card" className="h-72" />
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    )
  }
  if (course.isError) {
    return (
      <ErrorState
        title={t('courseDetail.errorTitle', 'This course could not be loaded')}
        message={t('courseDetail.errorHint', 'Check your connection and try again. If it keeps failing, your access to this course may have changed.')}
        onRetry={() => void course.refetch()}
      />
    )
  }
  if (!course.data) {
    return (
      <EmptyState
        illustration="courses"
        title={t('courseDetail.notFound', 'Course not available')}
        description={t('courseDetail.notFoundHint', 'It may have been retired, or it is not published for your organization.')}
        action={<Link to="/learn/courses" className="text-sm font-semibold text-ds-accent hover:underline">{t('courseDetail.backToExplore', 'Explore courses')}</Link>}
      />
    )
  }

  const c = course.data
  const minutes = knownMinutes(c.estimated_duration_minutes, lessonList)
  const playerHref = `/learn/player/${c.id}${assignment ? `?assignment=${assignment.id}` : ''}`
  const overdue = !!assignment?.due_date && Date.parse(assignment.due_date) < Date.now()

  const primary = {
    not_started: t('courseDetail.start', 'Start course'),
    in_progress: t('courseDetail.resume', 'Resume'),
    completed: t('courseDetail.review', 'Review course'),
  }[state]

  const statusLine = {
    not_started: t('courseDetail.notStarted', 'Not started'),
    in_progress: t('courseDetail.inProgress', '{{pct}}% complete', { pct }),
    completed: progress.data?.completed_at
      ? t('courseDetail.completedOn', 'Completed {{date}}', { date: date(progress.data.completed_at) })
      : t('courseDetail.completed', 'Completed'),
  }[state]

  const facts: { label: string; value: string }[] = [
    minutes ? { label: t('courseDetail.duration', 'Time'), value: t('courseDetail.minutes', '{{count}} min', { count: minutes }) } : null,
    lessonList.length ? { label: t('courseDetail.lessons', 'Lessons'), value: String(lessonList.length) } : null,
    quizCount && c.passing_score_percentage ? { label: t('courseDetail.passMark', 'Pass mark'), value: `${c.passing_score_percentage}%` } : null,
    c.difficulty_level ? { label: t('courseDetail.level', 'Level'), value: t(`explore.level.${c.difficulty_level.toLowerCase()}`, c.difficulty_level) } : null,
  ].filter((f): f is { label: string; value: string } => !!f)

  const finishing: string[] = [
    quizCount
      ? t('courseDetail.finishQuiz', 'Complete every required lesson and pass the quiz{{mark}}.', { mark: c.passing_score_percentage ? ` (${c.passing_score_percentage}%)` : '' })
      : t('courseDetail.finishLessons', 'Complete every required lesson.'),
    c.max_attempts ? t('courseDetail.attempts', 'You have {{count}} attempts at the quiz.', { count: c.max_attempts }) : '',
    c.certificate_enabled
      ? c.validity_period_days
        ? t('courseDetail.certificateValid', 'A certificate with a verification code is issued, valid for {{days}} days.', { days: c.validity_period_days })
        : t('courseDetail.certificate', 'A certificate with a verification code is issued automatically.')
      : t('courseDetail.recorded', 'Your completion is recorded on your learning record.'),
    assignment ? t('courseDetail.closesAssignment', 'Your manager sees the assignment as complete.') : '',
  ].filter(Boolean)

  const ActionPanel = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ds-ink">{statusLine}</p>
        {state === 'in_progress' && <ProgressBar value={pct} label={t('courseDetail.progress', 'Progress')} size="sm" />}
      </div>
      <Link
        to={playerHref}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
      >
        <PlayCircle aria-hidden="true" className="h-4 w-4" />
        {primary}
      </Link>
      {state === 'completed' && c.certificate_enabled && (
        <Link to="/learn/certificates" className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-ds-border text-sm font-medium text-ds-ink hover:border-ds-border-strong">
          <Award aria-hidden="true" className="h-4 w-4 text-ds-accent" />
          {t('courseDetail.viewCertificate', 'View certificate')}
        </Link>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl pb-24 lg:pb-0">
      <Link to="/learn/courses" className="mb-6 inline-flex min-h-[40px] items-center gap-1.5 text-sm text-ds-muted hover:text-ds-ink">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
        {t('courseDetail.backToExplore', 'Explore courses')}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-10">
          {/* Why am I here? */}
          {assignment && (
            <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 border-s-[3px] px-4 py-2.5 text-sm', overdue ? 'border-ds-danger bg-ds-danger-soft text-ds-danger' : 'border-ds-accent bg-ds-accent-soft text-ds-ink')}>
              <span className="font-semibold">{t('courseDetail.assigned', 'Assigned to you')}</span>
              {assignment.priority === 'compliance' && <span>{t('mandatory', 'Mandatory')}</span>}
              {assignment.due_date && (
                <span>{overdue
                  ? t('courseDetail.overdueSince', 'Overdue since {{date}}', { date: date(assignment.due_date) })
                  : t('courseDetail.dueOn', 'Due {{date}}', { date: date(assignment.due_date) })}</span>
              )}
            </div>
          )}

          {/* What is it? */}
          <header className="space-y-4">
            <CourseCover course={c} className="h-44 w-full rounded-xl sm:h-56">
              {state === 'in_progress' && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-ds-surface/50">
                  <span className="block h-full bg-ds-accent" style={{ width: `${pct}%` }} />
                </span>
              )}
              {state === 'completed' && (
                <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-md bg-ds-surface/95 px-2.5 py-1 text-xs font-semibold text-ds-success">
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                  {t('courseDetail.completedBadge', 'Completed')}
                </span>
              )}
            </CourseCover>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{t('courseDetail.eyebrow', 'Course')}</p>
            <h1 className="font-editorial text-[36px] font-semibold leading-[1.1] text-ds-ink sm:text-[46px]">{c.title}</h1>
            {c.description && <p className="max-w-prose text-[17px] leading-relaxed text-ds-ink-secondary">{c.description}</p>}
            {facts.length > 0 && (
              <dl className="flex flex-wrap divide-x divide-ds-border border-y border-ds-border py-3 rtl:divide-x-reverse">
                {facts.map((f) => (
                  <div key={f.label} className="px-4 first:ps-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{f.label}</dt>
                    <dd className="mt-0.5 font-mono text-[15px] tabular-nums text-ds-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {/* What will I be able to do? */}
          {c.objectives.length > 0 && (
            <section aria-labelledby="cd-objectives" className="space-y-3">
              <h2 id="cd-objectives" className="text-lg font-semibold text-ds-ink">{t('courseDetail.objectives', 'By the end, you will be able to')}</h2>
              <ul className="space-y-2.5">
                {c.objectives.map((o) => (
                  <li key={o} className="flex gap-3 text-[15px] leading-relaxed text-ds-ink-secondary">
                    <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ds-accent" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Who is it for? */}
          {(c.target_audience || c.prerequisites.length > 0) && (
            <section aria-labelledby="cd-audience" className="grid gap-6 sm:grid-cols-2">
              <h2 id="cd-audience" className="sr-only">{t('courseDetail.audienceTitle', 'Who this course is for')}</h2>
              {c.target_audience && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{t('courseDetail.audience', 'For')}</h3>
                  <p className="mt-1 text-[15px] capitalize text-ds-ink">{c.target_audience}</p>
                </div>
              )}
              {c.prerequisites.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{t('courseDetail.before', 'Helpful before you start')}</h3>
                  <ul className="mt-1 space-y-1 text-[15px] text-ds-ink">{c.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          {/* What does it contain? */}
          <section aria-labelledby="cd-outline" className="space-y-3">
            <h2 id="cd-outline" className="text-lg font-semibold text-ds-ink">{t('courseDetail.outline', 'Course outline')}</h2>
            {lessons.isLoading ? (
              <Skeleton variant="card" className="h-48" />
            ) : lessonList.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-ds-border px-4 py-5 text-sm text-ds-muted">{t('courseDetail.noLessons', 'The lessons for this course are still being prepared.')}</p>
            ) : (
              <ol className="relative space-y-0 border-s border-ds-border ms-3">
                {lessonList.map((lesson, index) => {
                  const done = completed.has(lesson.id)
                  const here = state === 'in_progress' && resumeIndex === index
                  const Icon = done ? CheckCircle2 : here ? CircleDot : lesson.block_type === 'quiz' ? FileQuestion : Circle
                  return (
                    <li key={lesson.id} className="relative ps-7">
                      <Icon aria-hidden="true" className={cn('absolute -start-[9px] top-3.5 h-[18px] w-[18px] bg-ds-background', done ? 'text-ds-success' : here ? 'text-ds-accent' : 'text-ds-border-strong')} />
                      <Link
                        to={`/learn/player/${c.id}?block=${index}`}
                        className={cn('flex min-h-[52px] items-center gap-3 rounded-md px-3 py-2 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent', here && 'bg-ds-accent-soft')}
                      >
                        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-ds-muted">{String(index + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-[15px]', done ? 'text-ds-ink-secondary' : 'text-ds-ink')}>{lesson.title}</span>
                          <span className="block text-xs text-ds-muted">
                            {[
                              t(`courseDetail.type.${lesson.block_type}`, lesson.block_type),
                              lesson.duration_seconds ? t('courseDetail.minutes', '{{count}} min', { count: Math.max(1, Math.round(lesson.duration_seconds / 60)) }) : null,
                              lesson.is_mandatory === false ? t('courseDetail.optional', 'Optional') : null,
                              here ? t('courseDetail.youAreHere', 'You stopped here') : null,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          {/* What happens when I finish? */}
          <section aria-labelledby="cd-finish" className="space-y-3 border-t border-ds-border pt-8">
            <h2 id="cd-finish" className="text-lg font-semibold text-ds-ink">{t('courseDetail.whenFinished', 'When you finish')}</h2>
            <ul className="space-y-2 text-[15px] text-ds-ink-secondary">
              {finishing.map((f) => <li key={f} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 h-1 w-3 shrink-0 bg-ds-accent" />{f}</li>)}
            </ul>
          </section>
        </article>

        {/* The one next step: sticky beside the content on desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-[6px] border border-ds-border bg-ds-surface p-5">{ActionPanel}</div>
        </aside>
      </div>

      {/* ...and pinned above the tab bar on phones */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ds-border bg-ds-surface px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-ds-ink">{statusLine}</p>
          <Link to={playerHref} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-md bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink">
            <PlayCircle aria-hidden="true" className="h-4 w-4" />{primary}
          </Link>
        </div>
      </div>
    </div>
  )
}
