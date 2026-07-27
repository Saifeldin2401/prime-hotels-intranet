import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveWeather } from '@/components/dashboard/LiveWeather'
import { PrayerTimesWidget } from './PrayerTimesWidget'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Clock, Calendar, CloudSun, Moon } from 'lucide-react'
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

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-[20px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 px-6">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2 font-sans">
              <Clock className="w-4 h-4 text-[#C39A45]" />
              {t('widgets.time_and_weather', 'Time & Operations')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Clock & Dates Display Container */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#07132c] via-[#0b1c3e] to-[#0e2754] p-5 text-center shadow-inner border border-[#1b3464]/40">
              {/* Subtle background decorative shapes */}
              <div className="absolute top-[-50%] start-[-20%] w-[50%] h-[150%] bg-[#C39A45]/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="relative z-10 space-y-2">
                <div className="text-4xl font-extrabold text-white tracking-widest font-mono drop-shadow-[0_2px_10px_rgba(255,255,255,0.05)]">
                  {format(time, 'HH:mm:ss')}
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-[#a5b4fc] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C39A45]" />
                    {format(time, 'EEEE, MMMM d, yyyy', { locale: isRTL ? ar : undefined })}
                  </span>
                  
                  <span className="text-[10px] font-extrabold text-slate-950 dark:text-slate-950 bg-[#C39A45] px-3 py-1 rounded-full shadow-sm">
                    {hijriDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Weather Widget Section */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300 flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100 dark:border-amber-900/30 group-hover:scale-105 transition-transform">
                  <CloudSun className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t('widgets.weather', 'Local Weather')}
                </span>
              </div>
              <LiveWeather />
            </div>

            {/* Prayer Times Widget Section */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300 flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 group-hover:scale-105 transition-transform">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
