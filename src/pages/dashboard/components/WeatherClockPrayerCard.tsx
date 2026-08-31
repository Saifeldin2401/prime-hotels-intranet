import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LiveWeather } from '@/components/dashboard/LiveWeather'
import { PrayerTimesWidget } from './PrayerTimesWidget'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Clock, CloudSun, Moon, Compass } from 'lucide-react'

export function WeatherClockPrayerCard() {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Umm al-Qura Hijri date
  let hijriDate = ''
  try {
    hijriDate = new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(time) + (isRTL ? ' هـ' : ' AH')
  } catch {
    hijriDate = ''
  }

  const hours = format(time, 'HH')
  const minutes = format(time, 'mm')
  const seconds = format(time, 'ss')

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Compass className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isRTL ? 'توقيت العمليات الفندقية' : 'Hotel Clock & Schedule'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isRTL ? 'مباشر' : 'Live'}</span>
          </div>
        </div>

        {/* Minimalist Luxury Clock Tile */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background/90 to-background/50 p-4 text-center shadow-inner">
          <div className="flex items-baseline justify-center gap-1 font-mono">
            <span className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              {hours}
            </span>
            <span className="text-3xl font-light text-amber-500 animate-pulse">:</span>
            <span className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              {minutes}
            </span>
            <span className="ms-1 text-base font-bold text-muted-foreground font-mono">
              {seconds}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold text-foreground/90">
              {format(time, 'EEEE, d MMMM yyyy', { locale: isRTL ? ar : undefined })}
            </span>
            {hijriDate && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-semibold text-amber-500">
                  {hijriDate}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Local Weather Section */}
        <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <CloudSun className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {isRTL ? 'الطقس الحالي' : 'Local Weather'}
            </span>
          </div>
          <LiveWeather />
        </div>

        {/* Prayer Times Section */}
        <div className="space-y-2 rounded-2xl border border-border/40 bg-card/40 p-3.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Moon className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {isRTL ? 'مواقيت الصلاة في المملكة' : 'KSA Prayer Times'}
            </span>
          </div>
          <PrayerTimesWidget />
        </div>
      </div>
    </div>
  )
}
export default WeatherClockPrayerCard
