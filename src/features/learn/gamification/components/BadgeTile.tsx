import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'

import { cn } from '@/lib/utils'

import { BADGES, TIER_CLASS } from '../badges'
import type { BadgeProgress } from '../gamificationApi'

interface BadgeTileProps {
  badge: BadgeProgress
  /** Compact: medal and title only (home shelf). */
  compact?: boolean
}

export function useBadgeCopy() {
  const { t } = useTranslation('training')
  return (id: BadgeProgress['id']) => ({
    title: t(`game.badges.${id}.title`, BADGES[id].title),
    description: t(`game.badges.${id}.description`, BADGES[id].description),
  })
}

export function BadgeMedal({ id, earned, size = 'md' }: { id: BadgeProgress['id']; earned: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const meta = BADGES[id]
  const Icon = meta.icon
  const box = size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-10 w-10' : 'h-14 w-14'
  const icon = size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-ds-surface',
        box,
        earned ? [TIER_CLASS[meta.tier].medal, TIER_CLASS[meta.tier].ring] : 'bg-ds-surface-subtle text-ds-muted ring-ds-border',
      )}
    >
      <Icon className={cn(icon, !earned && 'opacity-40')} />
      {!earned && (
        <span className="absolute -bottom-1 -end-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-ds-border bg-ds-surface">
          <Lock className="h-3 w-3 text-ds-muted" />
        </span>
      )}
    </span>
  )
}

export function BadgeTile({ badge, compact = false }: BadgeTileProps) {
  const { t, i18n } = useTranslation('training')
  const copy = useBadgeCopy()(badge.id)
  const earned = !!badge.earned_at
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const pct = Math.round((Math.min(badge.progress, badge.target) / Math.max(badge.target, 1)) * 100)

  if (compact) {
    return (
      <div className="flex w-20 flex-col items-center gap-2 text-center" title={copy.description}>
        <BadgeMedal id={badge.id} earned={earned} size="md" />
        <span className={cn('line-clamp-2 text-[11px] font-medium leading-tight', earned ? 'text-ds-ink' : 'text-ds-muted')}>{copy.title}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        earned ? 'border-ds-border bg-ds-surface' : 'border-dashed border-ds-border bg-ds-surface-subtle',
      )}
    >
      <BadgeMedal id={badge.id} earned={earned} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('text-sm font-semibold', earned ? 'text-ds-ink' : 'text-ds-ink-secondary')}>{copy.title}</p>
        <p className="text-xs text-ds-muted">{copy.description}</p>
        {earned ? (
          <p className="text-xs font-medium text-ds-success">
            {t('game.badgeEarnedOn', 'Earned {{date}}', {
              date: new Date(badge.earned_at as string).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
            })}
          </p>
        ) : (
          <div className="space-y-1 pt-0.5">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-ds-border"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={badge.target}
              aria-valuenow={Math.min(badge.progress, badge.target)}
              aria-label={copy.title}
            >
              <div className="h-full rounded-full bg-ds-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="font-mono text-[11px] tabular-nums text-ds-muted">
              {Math.min(badge.progress, badge.target).toLocaleString(locale)} / {badge.target.toLocaleString(locale)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
