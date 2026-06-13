import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveWeather } from '@/components/dashboard/LiveWeather'
import { PrayerTimesWidget } from './PrayerTimesWidget'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Clock } from 'lucide-react'

export function WeatherClockPrayerCard() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Umm al-Qura Hijri date
  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(time) + ' هـ'

  return (
    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          {t('widgets.time_and_weather', 'Time & Operations')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        {/* Clock & Dates */}
        <div className="space-y-2 text-center">
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight font-mono">
            {format(time, 'HH:mm:ss')}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-slate-500">
              {format(time, 'EEEE, MMMM d, yyyy', { locale: isRTL ? ar : undefined })}
            </span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              {hijriDate}
            </span>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Weather and Prayer widgets */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('widgets.weather', 'Local Weather')}</span>
            <LiveWeather />
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('widgets.prayer_times', 'Prayer Times')}</span>
            <PrayerTimesWidget />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
