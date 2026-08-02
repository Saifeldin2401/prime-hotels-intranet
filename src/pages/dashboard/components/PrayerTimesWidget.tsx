import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { cn } from '@/lib/utils'
import { m } from 'framer-motion'
import { Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PrayerTimesWidget() {
  const { data: prayerData, isLoading } = usePrayerTimes()
  const { t } = useTranslation('dashboard')

  if (isLoading || !prayerData) {
    return (
      <div className="grid grid-cols-4 gap-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        ))}
      </div>
    )
  }

  // Display core prayer schedule: Dhuhr, Asr, Maghrib, Isha
  const mainPrayers = [
    { key: 'dhuhr', name: t('prayer.dhuhr', 'Dhuhr'), time: prayerData.Dhuhr || '12:00' },
    { key: 'asr', name: t('prayer.asr', 'Asr'), time: prayerData.Asr || '16:10' },
    { key: 'maghrib', name: t('prayer.maghrib', 'Maghrib'), time: prayerData.Maghrib || '18:58' },
    { key: 'isha', name: t('prayer.isha', 'Isha'), time: prayerData.Isha || '20:30' }
  ]

  const isNext = (key: string) => prayerData.NextPrayer?.toLowerCase() === key

  return (
    <m.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="grid grid-cols-4 gap-2">
        {mainPrayers.map((p) => {
          const active = isNext(p.key)
          return (
            <div
              key={p.key}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                active
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-300 font-bold shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {p.name}
              </span>
              <span className="text-xs font-bold tabular-nums">
                {p.time}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <span className="flex items-center gap-1 font-semibold">
          <Moon className="w-3 h-3 text-amber-500" />
          {t('prayer.next', 'Next')}: <strong className="text-slate-800 dark:text-slate-200">{t(`prayer.${prayerData.NextPrayer.toLowerCase()}`, prayerData.NextPrayer)}</strong> ({prayerData.NextPrayerTime})
        </span>
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
          {prayerData.Countdown}
        </span>
      </div>
    </m.div>
  )
}
