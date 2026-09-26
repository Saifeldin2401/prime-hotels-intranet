import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Flame, Trophy, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/ui'

import { nextBadge } from '../badges'
import type { LearningStats } from '../gamificationApi'
import { LEVEL_TITLES, levelFromPoints } from '../levels'
import { BadgeMedal, useBadgeCopy } from './BadgeTile'
import { ProgressRing } from './ProgressRing'
import { StreakWeek } from './StreakWeek'

const card = 'flex flex-col rounded-xl border border-ds-border bg-ds-surface p-4'

export function MomentumPanel({ stats, isLoading }: { stats: LearningStats | undefined; isLoading: boolean }) {
  const { t, i18n } = useTranslation('training')
  const reduce = useReducedMotion()
  const badgeCopy = useBadgeCopy()
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const fmt = (n: number) => n.toLocaleString(locale)

  if (isLoading || !stats) {
    return (
      <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">
        <Skeleton variant="card" className="h-40" />
        <Skeleton variant="card" className="h-40" />
        <Skeleton variant="card" className="h-40" />
      </div>
    )
  }

  const level = levelFromPoints(stats.points_total)
  const levelTitle = t(`game.levels.${level.titleKey}`, LEVEL_TITLES[level.titleKey])
  const next = nextBadge(stats.badges)
  const streak = stats.streak_current

  const enter = (i: number) => reduce
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <section aria-labelledby="momentum-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="momentum-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">
          {t('game.momentum', 'Your momentum')}
        </h2>
        <Link to="/learn/achievements" className="inline-flex items-center gap-1 text-xs font-semibold text-ds-accent hover:underline">
          {t('game.viewAchievements', 'Achievements')}
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {/* Level */}
        <motion.div {...enter(0)} className={cn(card, 'flex-row items-center gap-4')}>
          <ProgressRing
            value={level.percent}
            size={76}
            stroke={7}
            tone="text-ds-brass"
            label={t('game.levelProgress', 'Level {{level}}, {{pct}}% of the way to level {{next}}', { level: level.level, pct: level.percent, next: level.level + 1 })}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-ds-muted">{t('game.lvl', 'Lvl')}</span>
              <span className="font-editorial text-2xl font-bold text-ds-ink">{level.level}</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-ds-ink">{levelTitle}</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-ds-ink">
              {fmt(stats.points_total)} <span className="text-xs font-normal text-ds-muted">{t('game.pts', 'pts')}</span>
            </p>
            <p className="text-xs text-ds-muted">
              {t('game.toNextLevel', '{{count}} pts to level {{level}}', { count: level.toNext, level: level.level + 1 })}
            </p>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div {...enter(1)} className={cn(card, 'gap-3')}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                streak > 0 ? 'bg-ds-warning-soft text-ds-warning' : 'bg-ds-surface-subtle text-ds-muted',
              )}
            >
              <motion.span
                animate={streak > 0 && stats.active_today && !reduce ? { scale: [1, 1.12, 1], rotate: [0, -4, 3, 0] } : undefined}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <Flame aria-hidden="true" className="h-6 w-6" />
              </motion.span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ds-ink">
                {t('game.streak.days', '{{count}}-day streak', { count: streak })}
              </p>
              <p className="text-xs text-ds-muted">
                {stats.active_today
                  ? t('game.streak.keptToday', 'You learned today. Come back tomorrow to keep it going.')
                  : streak > 0
                    ? t('game.streak.keepAlive', 'Learn something today to keep your streak.')
                    : t('game.streak.start', 'Complete a lesson today to start a streak.')}
              </p>
            </div>
          </div>
          <StreakWeek week={stats.week} />
          {stats.streak_best > 1 && (
            <p className="text-[11px] text-ds-muted">{t('game.streak.best', 'Best: {{count}} days', { count: stats.streak_best })}</p>
          )}
        </motion.div>

        {/* Next goal */}
        <motion.div {...enter(2)} className={cn(card, 'gap-3')}>
          {next ? (
            <div className="flex items-start gap-3">
              <BadgeMedal id={next.id} earned={false} size="sm" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-muted">{t('game.nextBadge', 'Next badge')}</p>
                <p className="text-sm font-semibold text-ds-ink">{badgeCopy(next.id).title}</p>
                <p className="text-xs text-ds-muted">{badgeCopy(next.id).description}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ds-border" aria-hidden="true">
                  <motion.div
                    className="h-full rounded-full bg-ds-accent"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${Math.round((Math.min(next.progress, next.target) / next.target) * 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="font-mono text-[11px] tabular-nums text-ds-muted">
                  {fmt(Math.min(next.progress, next.target))} / {fmt(next.target)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Trophy aria-hidden="true" className="h-8 w-8 text-ds-brass" />
              <p className="text-sm font-semibold text-ds-ink">{t('game.allBadges', 'Every badge earned. Remarkable.')}</p>
            </div>
          )}
          <p className="mt-auto inline-flex items-center gap-1.5 border-t border-ds-border pt-3 text-xs text-ds-ink-secondary">
            <Zap aria-hidden="true" className="h-3.5 w-3.5 text-ds-accent" />
            {t('game.thisWeek', '+{{count}} pts this week', { count: stats.points_week })}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
