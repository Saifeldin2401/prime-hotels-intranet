/**
 * Learn > Achievements.
 *
 * The learner's momentum in one place: level and points, streak, every badge
 * with its progress, and how they compare with colleagues and teams. All
 * numbers are derived on the server from real learning records.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Award,
  BookCheck,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Eye,
  EyeOff,
  Flame,
  Footprints,
  Info,
  Target,
  type LucideIcon,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import { ErrorState, SectionHeader, Skeleton, WorkspaceHeader } from '@/ui'

import { BadgeTile } from '../gamification/components/BadgeTile'
import { Celebration, useMilestones } from '../gamification/components/Celebration'
import { LeaderboardPanel } from '../gamification/components/LeaderboardPanel'
import { ProgressRing } from '../gamification/components/ProgressRing'
import { StreakWeek } from '../gamification/components/StreakWeek'
import type { PointKind } from '../gamification/gamificationApi'
import { useMyLearningStats, useSetLeaderboardVisibility } from '../gamification/gamificationHooks'
import { LEVEL_TITLES, levelFromPoints } from '../gamification/levels'

const KIND_ICON: Record<PointKind, LucideIcon> = {
  lesson: Footprints,
  course: BookCheck,
  on_time: CalendarCheck,
  quiz_pass: Brain,
  quiz_perfect: Target,
  certificate: Award,
  reading: BookOpenCheck,
}

export default function AchievementsPage() {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const fmt = (n: number) => n.toLocaleString(locale)
  const { user } = useAuth()
  const { currentOrganization } = useTenant()
  const statsQuery = useMyLearningStats()
  const visibility = useSetLeaderboardVisibility()
  const stats = statsQuery.data
  const milestones = useMilestones(stats, user?.id, currentOrganization?.id)

  const pointRules: { kind: PointKind; points: string; label: string }[] = [
    { kind: 'lesson', points: '10', label: t('game.rules.lesson', 'Complete a lesson (once per lesson)') },
    { kind: 'course', points: '100', label: t('game.rules.course', 'Finish a course (+25 when you score 90% or more)') },
    { kind: 'on_time', points: '20', label: t('game.rules.onTime', 'Finish assigned training by its due date') },
    { kind: 'quiz_pass', points: '40', label: t('game.rules.quizPass', 'Pass a quiz for the first time') },
    { kind: 'quiz_perfect', points: '20', label: t('game.rules.quizPerfect', 'Score 100% on a quiz') },
    { kind: 'certificate', points: '50', label: t('game.rules.certificate', 'Earn a certificate') },
    { kind: 'reading', points: '15', label: t('game.rules.reading', 'Acknowledge required reading') },
  ]

  const kindLabel: Record<PointKind, string> = {
    lesson: t('game.kind.lesson', 'Lesson completed'),
    course: t('game.kind.course', 'Course completed'),
    on_time: t('game.kind.onTime', 'Finished on time'),
    quiz_pass: t('game.kind.quizPass', 'Quiz passed'),
    quiz_perfect: t('game.kind.quizPerfect', 'Perfect score'),
    certificate: t('game.kind.certificate', 'Certificate earned'),
    reading: t('game.kind.reading', 'Reading acknowledged'),
  }

  if (statsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <WorkspaceHeader eyebrow={t('plan.eyebrow', 'Learn')} title={t('game.title', 'Achievements')} />
        <ErrorState message={t('game.loadError', 'Your achievements could not be loaded.')} onRetry={() => void statsQuery.refetch()} />
      </div>
    )
  }

  const level = stats ? levelFromPoints(stats.points_total) : null
  const earnedCount = stats?.badges.filter((b) => b.earned_at).length ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <WorkspaceHeader
        eyebrow={t('plan.eyebrow', 'Learn')}
        title={t('game.title', 'Achievements')}
        context={stats ? t('game.summary', '{{earned}} of {{total}} badges · {{points}} points', {
          earned: earnedCount, total: stats.badges.length, points: fmt(stats.points_total),
        }) : null}
      />

      {/* Hero: level, points, streak */}
      {!stats || !level ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="card" className="h-48" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-label={t('game.levelSection', 'Level')} className="flex items-center gap-5 rounded-2xl border border-ds-border bg-gradient-to-br from-ds-brass/10 via-ds-surface to-ds-surface p-5">
            <ProgressRing
              value={level.percent}
              size={112}
              stroke={9}
              tone="text-ds-brass"
              label={t('game.levelProgress', 'Level {{level}}, {{pct}}% of the way to level {{next}}', { level: level.level, pct: level.percent, next: level.level + 1 })}
            >
              <span className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-muted">{t('game.level', 'Level')}</span>
                <span className="font-editorial text-4xl font-bold text-ds-ink">{level.level}</span>
              </span>
            </ProgressRing>
            <div className="min-w-0 space-y-1.5">
              <p className="font-editorial text-2xl font-semibold text-ds-ink">{t(`game.levels.${level.titleKey}`, LEVEL_TITLES[level.titleKey])}</p>
              <p className="text-sm text-ds-ink-secondary">
                {t('game.toNextLevel', '{{count}} pts to level {{level}}', { count: level.toNext, level: level.level + 1 })}
              </p>
              <dl className="flex gap-5 pt-2">
                <div>
                  <dt className="text-[11px] text-ds-muted">{t('game.total', 'Total')}</dt>
                  <dd className="font-mono text-lg font-bold tabular-nums text-ds-ink">{fmt(stats.points_total)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ds-muted">{t('game.board.month', 'Month')}</dt>
                  <dd className="font-mono text-lg font-bold tabular-nums text-ds-ink">{fmt(stats.points_month)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ds-muted">{t('game.board.week', 'Week')}</dt>
                  <dd className="font-mono text-lg font-bold tabular-nums text-ds-ink">{fmt(stats.points_week)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section aria-label={t('game.streakSection', 'Streak')} className="space-y-4 rounded-2xl border border-ds-border bg-gradient-to-br from-ds-warning/10 via-ds-surface to-ds-surface p-5">
            <div className="flex items-center gap-3">
              <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-full', stats.streak_current > 0 ? 'bg-ds-warning-soft text-ds-warning' : 'bg-ds-surface-subtle text-ds-muted')}>
                <Flame aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <p className="font-editorial text-2xl font-semibold text-ds-ink">
                  {t('game.streak.days', '{{count}}-day streak', { count: stats.streak_current })}
                </p>
                <p className="text-sm text-ds-ink-secondary">
                  {t('game.streak.bestLong', 'Longest streak: {{count}} days', { count: stats.streak_best })}
                </p>
              </div>
            </div>
            <StreakWeek week={stats.week} />
            <p className="text-xs text-ds-muted">
              {t('game.streak.explain', 'Any lesson, quiz or required reading counts as a learning day.')}
            </p>
          </section>
        </div>
      )}

      {/* Record */}
      {stats && (
        <section aria-labelledby="record-heading" className="space-y-3">
          <SectionHeader headingId="record-heading" title={t('game.record', 'Your record')} />
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              ['lessons', t('game.counts.lessons', 'Lessons'), Footprints],
              ['courses', t('game.counts.courses', 'Courses'), BookCheck],
              ['quizzes_passed', t('game.counts.quizzes', 'Quizzes passed'), Brain],
              ['certificates', t('game.counts.certificates', 'Certificates'), Award],
              ['readings', t('game.counts.readings', 'Readings'), BookOpenCheck],
              ['on_time', t('game.counts.onTime', 'On time'), CalendarCheck],
            ] as const).map(([key, label, Icon]) => (
              <div key={key} className="rounded-lg border border-ds-border bg-ds-surface p-3">
                <dt className="flex items-center gap-1.5 text-xs text-ds-muted"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</dt>
                <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-ds-ink">{fmt(stats.counts[key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Badges */}
      <section aria-labelledby="badges-heading" className="space-y-3">
        <SectionHeader
          headingId="badges-heading"
          title={t('game.badgesTitle', 'Badges')}
          subtitle={stats ? t('game.badgesCount', '{{earned}} of {{total}} earned', { earned: earnedCount, total: stats.badges.length }) : undefined}
        />
        {!stats ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="card" className="h-24" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...stats.badges]
              .sort((a, b) => Number(!!b.earned_at) - Number(!!a.earned_at))
              .map((b) => <BadgeTile key={b.id} badge={b} />)}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Leaderboards */}
        <section aria-labelledby="board-heading" className="space-y-3 lg:col-span-7">
          <SectionHeader
            headingId="board-heading"
            title={t('game.board.title', 'Leaderboard')}
            subtitle={t('game.board.subtitle', 'Teams are ranked by points per member, so small teams can win too.')}
          />
          <LeaderboardPanel />
          {stats && (
            <button
              type="button"
              disabled={visibility.isPending}
              onClick={() => visibility.mutate(!stats.show_on_leaderboard)}
              className="inline-flex min-h-[40px] items-center gap-2 text-sm text-ds-ink-secondary hover:text-ds-ink disabled:opacity-50"
            >
              {stats.show_on_leaderboard ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              {stats.show_on_leaderboard
                ? t('game.board.hideMe', 'Hide me from leaderboards')
                : t('game.board.showMe', 'Show me on leaderboards (colleagues currently cannot see you)')}
            </button>
          )}
        </section>

        {/* How points work + recent */}
        <aside className="space-y-8 lg:col-span-5">
          <section aria-labelledby="recent-heading" className="space-y-3">
            <SectionHeader headingId="recent-heading" title={t('game.recent', 'Recent points')} />
            {!stats ? (
              <Skeleton variant="card" className="h-40" />
            ) : stats.recent.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ds-border p-4 text-sm text-ds-muted">
                {t('game.noRecent', 'No points yet.')}{' '}
                <Link to="/learn/courses" className="font-semibold text-ds-accent hover:underline">{t('game.startCourse', 'Start a course')}</Link>
              </p>
            ) : (
              <ul className="divide-y divide-ds-border overflow-hidden rounded-lg border border-ds-border bg-ds-surface">
                {stats.recent.map((r, i) => {
                  const Icon = KIND_ICON[r.kind] ?? Footprints
                  return (
                    <li key={`${r.kind}-${r.occurred_at}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ds-accent-soft text-ds-accent">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ds-ink">{kindLabel[r.kind]}</span>
                        <span className="block truncate text-xs text-ds-muted">
                          {[r.title, new Date(r.occurred_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-ds-success">+{r.points}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="rules-heading" className="space-y-3">
            <SectionHeader headingId="rules-heading" title={t('game.rules.title', 'How points work')} />
            <ul className="space-y-2 rounded-lg border border-ds-border bg-ds-surface p-3">
              {pointRules.map((rule) => {
                const Icon = KIND_ICON[rule.kind]
                return (
                  <li key={rule.kind} className="flex items-center gap-3 text-sm">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted" />
                    <span className="flex-1 text-ds-ink-secondary">{rule.label}</span>
                    <span className="font-mono font-semibold tabular-nums text-ds-ink">+{rule.points}</span>
                  </li>
                )
              })}
            </ul>
            <p className="flex items-start gap-2 text-xs text-ds-muted">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('game.rules.fair', 'Points come only from real learning records, so retaking the same lesson or quiz does not earn them twice.')}
            </p>
          </section>
        </aside>
      </div>

      <Celebration milestone={milestones.current} onClose={milestones.dismiss} />
    </div>
  )
}
