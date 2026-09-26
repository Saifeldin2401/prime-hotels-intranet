import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
import { ArrowRight, Award, CheckCircle2, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { CourseSourceDocuments } from '@/components/training/CourseSourceDocuments'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments } from '@/hooks/useTraining'
import type { TrainingContentBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/features/learn/catalogHooks'
import { Celebration, Confetti, useMilestones } from '@/features/learn/gamification/components/Celebration'
import { CountUp } from '@/features/learn/gamification/components/CountUp'
import { CourseCover } from '@/features/learn/gamification/components/CourseCover'
import { ProgressRing } from '@/features/learn/gamification/components/ProgressRing'
import { useMyCoursePoints, useMyLearningStats } from '@/features/learn/gamification/gamificationHooks'
import { LEVEL_TITLES, levelFromPoints } from '@/features/learn/gamification/levels'

export interface PersistedQuizReviewItem {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  correct: boolean
  explanation?: string
  timeSpentSeconds: number
}

export interface PersistedQuizResult {
  quizId: string
  quizTitle: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  completedAt: string
  reviewItems: PersistedQuizReviewItem[]
}

export interface PlayerCompletionViewProps {
  moduleId: string
  moduleTitle: string
  finalScore: number | null
  finalPassed: boolean
  canViewCertificate: boolean
  quizBreakdown: Array<{ block: TrainingContentBlock; result: PersistedQuizResult }>
  onViewCertificate: () => void
  onBackToMyLearning: () => void
}

/**
 * The moment a course ends: what was achieved (score, points, level, any new
 * badge), the certificate, and what to learn next. Points and badges come
 * from the server so they match My day and Achievements exactly.
 */
export function PlayerCompletionView({
  moduleId,
  moduleTitle,
  finalScore,
  finalPassed,
  canViewCertificate,
  quizBreakdown,
  onViewCertificate,
  onBackToMyLearning,
}: PlayerCompletionViewProps) {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const reduce = useReducedMotion()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentOrganization } = useTenant()

  // The course just finished: make sure points, badges and plans are fresh.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['learning-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['learning-course-points'] })
    void queryClient.invalidateQueries({ queryKey: ['learning-leaderboard'] })
  }, [queryClient])

  const statsQuery = useMyLearningStats()
  const coursePoints = useMyCoursePoints(moduleId)
  const milestones = useMilestones(statsQuery.data, user?.id, currentOrganization?.id)
  const level = statsQuery.data ? levelFromPoints(statsQuery.data.points_total) : null

  // Up next: the most urgent open assignment, else a catalog course not yet done.
  const assignments = useMyAssignments()
  const catalog = useCatalog()
  const progress = useLearningProgress({ userId: user?.id ?? null })
  const upNext = useMemo(() => {
    const open = (assignments.data ?? [])
      .filter((a) => a.content_id !== moduleId && a.progress?.status !== 'completed')
      .sort((x, y) => (x.due_date ? Date.parse(x.due_date) : Infinity) - (y.due_date ? Date.parse(y.due_date) : Infinity))
    if (open[0]) {
      const a = open[0]
      return {
        id: a.content_id,
        title: a.content_title ?? t('untitledAssignment', 'Untitled item'),
        href: a.content_type === 'quiz' ? `/learn/quizzes/${a.content_id}?assignment=${a.id}` : `/learn/player/${a.content_id}?assignment=${a.id}`,
        reason: t('finish.assignedNext', 'Assigned to you'),
      }
    }
    const done = new Set((progress.data ?? []).filter((p) => p.status === 'completed').map((p) => p.content_id))
    const course = (catalog.data ?? []).find((c) => c.id !== moduleId && !done.has(c.id))
    return course
      ? { id: course.id, title: course.title, href: `/learn/courses/${course.id}`, reason: t('finish.suggested', 'Suggested for you') }
      : null
  }, [assignments.data, catalog.data, progress.data, moduleId, t])

  const pointsEarned = coursePoints.data?.total ?? null

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="relative flex min-h-screen items-start justify-center overflow-hidden bg-ds-background p-4 py-10 sm:items-center sm:p-6"
      >
        {finalPassed && !reduce && (
          <div aria-hidden="true" className="pointer-events-none fixed inset-0">
            <Confetti />
          </div>
        )}

        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ds-border bg-ds-surface shadow-xl">
          <CourseCover course={{ id: moduleId, title: moduleTitle }} className="h-40 w-full rounded-none sm:h-48">
            <div className="absolute inset-0 bg-gradient-to-t from-ds-surface via-ds-surface/20 to-transparent" />
          </CourseCover>

          <div className="relative -mt-16 px-5 pb-6 text-center sm:px-10 sm:pb-10">
            <m.div
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
              className={cn(
                'relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-ds-surface shadow-lg',
                finalPassed ? 'bg-ds-brass text-white' : 'bg-ds-warning-soft text-ds-warning',
              )}
            >
              {finalPassed ? <Trophy aria-hidden="true" className="h-11 w-11" /> : <RotateCcw aria-hidden="true" className="h-10 w-10" />}
              {finalPassed && !reduce && (
                <m.span
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2, repeat: 2, repeatDelay: 0.6 }}
                  className="absolute inset-0 rounded-full border-2 border-ds-brass"
                />
              )}
            </m.div>

            <h1 className="font-editorial text-3xl font-semibold tracking-tight text-ds-ink sm:text-4xl">
              {finalPassed ? t('congratulations', 'Congratulations!') : t('finish.almost', 'Almost there')}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-base text-ds-ink-secondary">
              {finalPassed
                ? t('trainingCompletedMessage', { module: moduleTitle })
                : t('finish.notPassedBody', 'You reached the end of "{{module}}" but did not pass yet. Review the lessons and try the quiz again.', { module: moduleTitle })}
            </p>

            {/* What you achieved */}
            <dl className="mt-7 grid grid-cols-2 gap-3 text-start sm:grid-cols-4">
              <div className="rounded-xl border border-ds-border bg-ds-surface-subtle p-3">
                <dt className="text-[11px] uppercase tracking-wider text-ds-muted">{t('finalScore', 'Final score')}</dt>
                <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-ds-ink">
                  {finalScore !== null ? <><CountUp value={finalScore} locale={locale} />%</> : t('n_a', 'N/A')}
                </dd>
              </div>
              <div className="rounded-xl border border-ds-border bg-ds-surface-subtle p-3">
                <dt className="text-[11px] uppercase tracking-wider text-ds-muted">{t('status', 'Status')}</dt>
                <dd className={cn('mt-1 flex items-center gap-1.5 text-lg font-bold', finalPassed ? 'text-ds-success' : 'text-ds-danger')}>
                  {finalPassed ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : <XCircle aria-hidden="true" className="h-5 w-5" />}
                  {finalPassed ? t('passed', 'Passed') : t('quizNotPassed', 'Not passed')}
                </dd>
              </div>
              <div className="rounded-xl border border-ds-brass/30 bg-ds-brass/10 p-3">
                <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-ds-brass">
                  <Sparkles aria-hidden="true" className="h-3 w-3" />{t('finish.pointsEarned', 'Points earned')}
                </dt>
                <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-ds-ink">
                  {pointsEarned === null ? '–' : <>+<CountUp value={pointsEarned} locale={locale} /></>}
                </dd>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-ds-border bg-ds-surface-subtle p-3">
                {level ? (
                  <>
                    <ProgressRing
                      value={level.percent}
                      size={44}
                      stroke={5}
                      tone="text-ds-brass"
                      label={t('game.levelProgress', 'Level {{level}}, {{pct}}% of the way to level {{next}}', { level: level.level, pct: level.percent, next: level.level + 1 })}
                    >
                      <span className="font-editorial text-base font-bold text-ds-ink">{level.level}</span>
                    </ProgressRing>
                    <span className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wider text-ds-muted">{t('game.level', 'Level')}</dt>
                      <dd className="truncate text-sm font-semibold text-ds-ink">{t(`game.levels.${level.titleKey}`, LEVEL_TITLES[level.titleKey])}</dd>
                    </span>
                  </>
                ) : (
                  <span className="h-11 w-full animate-pulse rounded bg-ds-border/60" aria-hidden="true" />
                )}
              </div>
            </dl>

            {quizBreakdown.length > 1 && (
              <div className="mt-6 overflow-hidden rounded-xl border border-ds-border text-start">
                <div className="bg-ds-surface-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ds-muted">
                  {t('quizBreakdown', 'Quiz results')}
                </div>
                <div className="divide-y divide-ds-border">
                  {quizBreakdown.map(({ block, result }, idx) => (
                    <m.div
                      key={block.id}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.15 + idx * 0.04, ease: 'easeOut' }}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-success" />
                        ) : (
                          <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-danger" />
                        )}
                        <span className="truncate text-sm text-ds-ink">{result.quizTitle}</span>
                      </div>
                      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', result.passed ? 'text-ds-success' : 'text-ds-danger')}>
                        {result.score}%
                      </span>
                    </m.div>
                  ))}
                </div>
              </div>
            )}

            <CourseSourceDocuments trainingModuleId={moduleId} variant="learner" className="mt-6 text-start" />

            {/* Up next */}
            {upNext && (
              <Link
                to={upNext.href}
                className="group mt-6 flex items-center gap-4 rounded-xl border border-ds-border bg-ds-surface p-3 text-start transition-colors hover:border-ds-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
              >
                <CourseCover course={{ id: upNext.id, title: upNext.title }} className="h-16 w-24" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-accent">{t('finish.upNext', 'Up next')} · {upNext.reason}</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-ds-ink group-hover:underline">{upNext.title}</span>
                </span>
                <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ds-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {canViewCertificate ? (
                <Button
                  className="h-12 w-full gap-2 bg-ds-ink text-ds-on-ink transition-transform hover:bg-ds-ink-secondary active:scale-[0.98]"
                  onClick={onViewCertificate}
                >
                  <Award aria-hidden="true" className="h-4 w-4" />
                  {t('viewCertificate', 'View certificate')}
                </Button>
              ) : !finalPassed ? (
                <Button asChild className="h-12 w-full gap-2 bg-ds-ink text-ds-on-ink hover:bg-ds-ink-secondary">
                  <Link to={`/learn/courses/${moduleId}`}>
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    {t('finish.review', 'Review the course')}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="h-12 w-full gap-2 bg-ds-ink text-ds-on-ink hover:bg-ds-ink-secondary">
                  <Link to="/learn/achievements">
                    <Trophy aria-hidden="true" className="h-4 w-4" />
                    {t('finish.seeAchievements', 'See your achievements')}
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className={cn('h-12 w-full border-ds-border text-ds-ink transition-transform hover:bg-ds-surface-subtle active:scale-[0.98]')}
                onClick={onBackToMyLearning}
              >
                {t('backToMyLearning', 'Back to my learning')}
              </Button>
            </div>
          </div>
        </div>

        <Celebration milestone={milestones.current} onClose={milestones.dismiss} />
      </m.div>
    </LazyMotion>
  )
}
