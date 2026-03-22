import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { cn } from '@/lib/utils'
import { m } from 'framer-motion'
import { Bell, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PrayerTimesWidget() {
    const { data: prayerData, isLoading } = usePrayerTimes()
    const { t, i18n } = useTranslation('dashboard')
    const isRTL = i18n.dir() === 'rtl'

    if (isLoading || !prayerData) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/50 animate-pulse w-32 h-8" />
        )
    }

    return (
        <m.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/40 shadow-sm transition-all hover:bg-white/60 group",
                isRTL ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <Moon className="w-3 h-3 text-amber-600 fill-amber-600/20" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {t(`prayer.${prayerData.NextPrayer.toLowerCase()}`, prayerData.NextPrayer)}
                    </span>
                </div>
                <div className="text-xs font-extrabold text-slate-800 tabular-nums">
                    {prayerData.NextPrayerTime}
                </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-200/60 mx-1" />

            <div className="flex flex-col items-center">
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                    {t('prayer.remaining', 'In')}
                </span>
                <div className="text-[10px] font-bold text-slate-600 tracking-tight whitespace-nowrap group-hover:text-amber-600 transition-colors">
                    {prayerData.Countdown}
                </div>
            </div>

            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell className="w-3 h-3 text-amber-600" />
            </div>
        </m.div>
    )
}
