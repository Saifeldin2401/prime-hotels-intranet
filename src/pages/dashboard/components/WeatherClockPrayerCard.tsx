import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveWeather } from '@/components/dashboard/LiveWeather'
import { PrayerTimesWidget } from './PrayerTimesWidget'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Clock, CloudSun, Moon, ChevronRight } from 'lucide-react'
import { m, LazyMotion, domAnimation } from 'framer-motion'

export function WeatherClockPrayerCard() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Umm al-Qura Hijri date
  const hijriDate = new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(time) + (isRTL ? ' هـ' : ' AH')

  const hours = format(time, 'HH')
  const minutes = format(time, 'mm')
  const seconds = format(time, 'ss')

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-full"
      >
        <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-[24px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 px-6">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2 font-sans">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t('widgets.todays_overview', "Today's Overview")}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            {/* Clock & Dates Container */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#081533] via-[#0d204a] to-[#142d63] p-5 text-center shadow-inner border border-blue-900/40 text-white">
              <div className="absolute -top-10 -start-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 space-y-3">
                {/* Digits Grid */}
                <div className="flex items-center justify-center gap-2 font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-4xl font-black tracking-wider text-white drop-shadow">
                      {hours}
                    </span>
                    <span className="text-[9px] font-extrabold tracking-widest uppercase text-blue-300">
                      {t('time.hrs', 'HRS')}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-amber-400 -mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-4xl font-black tracking-wider text-white drop-shadow">
                      {minutes}
                    </span>
                    <span className="text-[9px] font-extrabold tracking-widest uppercase text-blue-300">
                      {t('time.mins', 'MINS')}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-amber-400 -mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-4xl font-black tracking-wider text-white drop-shadow">
                      {seconds}
                    </span>
                    <span className="text-[9px] font-extrabold tracking-widest uppercase text-blue-300">
                      {t('time.secs', 'SECS')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-200">
                    {format(time, 'EEEE, MMMM d, yyyy', { locale: isRTL ? ar : undefined })}
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-900 bg-amber-400 px-3 py-0.5 rounded-full shadow-sm">
                    {hijriDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Local Weather Section */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300 flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100 dark:border-amber-900/30 group-hover:scale-105 transition-transform">
                  <CloudSun className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('widgets.weather', 'Local Weather')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                <LiveWeather />
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Prayer Times Section */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300 space-y-2 group">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 group-hover:scale-105 transition-transform">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('widgets.prayer_times', 'Prayer Times')}
                </span>
              </div>
              <PrayerTimesWidget />
            </div>
            
          </CardContent>
        </Card>
      </m.div>
    </LazyMotion>
  )
}
export default WeatherClockPrayerCard
