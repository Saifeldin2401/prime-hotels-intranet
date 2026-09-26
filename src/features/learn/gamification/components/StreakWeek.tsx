import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { LearningStats } from '../gamificationApi'

/** The last seven days, one dot per day: filled when the learner learned that day. */
export function StreakWeek({ week }: { week: LearningStats['week'] }) {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const lastIndex = week.length - 1

  return (
    <ol className="flex items-end justify-between gap-1.5" aria-label={t('game.streak.lastSevenDays', 'Last seven days')}>
      {week.map((d, i) => {
        const date = new Date(`${d.date}T12:00:00`)
        const day = date.toLocaleDateString(locale, { weekday: 'narrow' })
        const full = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
        const today = i === lastIndex
        return (
          <li key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              title={full}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                d.active
                  ? 'border-transparent bg-ds-warning text-white'
                  : today
                    ? 'border-dashed border-ds-warning/70 text-ds-warning'
                    : 'border-ds-border bg-ds-surface-subtle text-ds-muted',
              )}
            >
              {d.active ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
              <span className="sr-only">
                {full}: {d.active ? t('game.streak.learned', 'learned') : t('game.streak.notYet', 'no learning')}
              </span>
            </span>
            <span aria-hidden="true" className={cn('text-[11px]', today ? 'font-semibold text-ds-ink' : 'text-ds-muted')}>{day}</span>
          </li>
        )
      })}
    </ol>
  )
}
