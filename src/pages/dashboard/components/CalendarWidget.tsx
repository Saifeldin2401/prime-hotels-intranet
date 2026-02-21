import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Plus, Sun, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useEvents, useUpcomingEvents } from '@/hooks/useEvents'
import { useUserShifts } from '@/hooks/useUserShifts'
import { useAuth } from '@/hooks/useAuth'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns'
import { ar } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { useTranslation } from "react-i18next";
import { EventDialogs } from './EventDialogs'

const eventTypeColors: Record<string, string> = {
  meeting: 'bg-hotel-gold',
  training: 'bg-hotel-navy-light',
  review: 'bg-indigo-500',
  holiday: 'bg-rose-500',
  deadline: 'bg-red-500',
  shift: 'bg-emerald-500',
  event: 'bg-amber-500',
  default: 'bg-slate-400'
}

// Automatic KSA Holidays for 2026
const KSA_HOLIDAYS_2026 = [
  { date: '2026-02-22', name: 'Founding Day', nameAr: 'يوم التأسيس' },
  { date: '2026-03-20', name: 'Eid al-Fitr', nameAr: 'عيد الفطر' },
  { date: '2026-03-21', name: 'Eid al-Fitr Holiday', nameAr: 'إجازة عيد الفطر' },
  { date: '2026-03-22', name: 'Eid al-Fitr Holiday', nameAr: 'إجازة عيد الفطر' },
  { date: '2026-05-27', name: 'Arafat Day', nameAr: 'يوم عرفة' },
  { date: '2026-05-28', name: 'Eid al-Adha', nameAr: 'عيد الأضحى' },
  { date: '2026-05-29', name: 'Eid al-Adha Holiday', nameAr: 'إجازة عيد الأضحى' },
  { date: '2026-09-23', name: 'National Day', nameAr: 'اليوم الوطني' },
]

interface ExternalHoliday {
  date: string;
  localName: string;
  name: string;
}

export function CalendarWidget() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [fetchedHolidays, setFetchedHolidays] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Fetch KSA Holidays automatically
  useEffect(() => {
    const year = currentDate.getFullYear()
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SA`)
      .then(async res => {
        if (!res.ok) return [];
        const text = await res.text();
        return text ? JSON.parse(text) : [];
      })
      .then((data: ExternalHoliday[]) => {
        if (!Array.isArray(data)) return;
        const formatted = data.map(h => ({
          id: `holiday-ext-${h.date}-${h.name}`,
          title: isRTL ? h.localName : h.name,
          start_time: `${h.date}T00:00:00`,
          type: 'holiday',
          location: t('common.ksa', 'Saudi Arabia')
        }))
        setFetchedHolidays(formatted)
      })
      .catch(err => console.debug('Handled holiday fetch error:', err))
  }, [currentDate.getFullYear(), isRTL, t])

  // Get events for current month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const { events, isLoading: isLoadingEvents } = useEvents(monthStart, monthEnd)
  const { events: upcomingEvents, isLoading: isLoadingUpcoming } = useUpcomingEvents(5)

  // Get user shifts
  const { shifts, isLoading: isLoadingShifts } = useUserShifts(
    monthStart,
    monthEnd
  )

  const isLoading = isLoadingEvents || isLoadingUpcoming || isLoadingShifts

  // Combine events, shifts, and holidays
  const allEvents = useMemo(() => {
    const shiftEvents = (shifts || []).map((shift: any) => {
      const shiftStart = shift.start_time?.includes('T')
        ? shift.start_time
        : `${shift.shift_date}T${shift.start_time}`
      const shiftEnd = shift.end_time?.includes('T')
        ? shift.end_time
        : `${shift.shift_date}T${shift.end_time}`

      return {
        id: `shift-${shift.id}`,
        title: `${t('schedule.calendar.shift', 'Shift')}: ${shift.shift_type || t('schedule.calendar.work', 'Work')}`,
        start_time: shiftStart,
        end_time: shiftEnd,
        type: 'shift',
        location: shift.location || t('schedule.calendar.property', 'Property')
      }
    })

    const ksaHolidays = KSA_HOLIDAYS_2026
      .filter(h => {
        const hDate = parseISO(h.date)
        return isSameMonth(hDate, currentDate) && !fetchedHolidays.some(fh => fh.start_time.startsWith(h.date))
      })
      .map(h => ({
        id: `holiday-${h.date}`,
        title: isRTL ? h.nameAr : h.name,
        start_time: `${h.date}T00:00:00`,
        type: 'holiday',
        location: t('common.ksa', 'Saudi Arabia')
      }))

    // Merge database events, shifts, local holidays, and fetched holidays
    return [...(events || []), ...shiftEvents, ...ksaHolidays, ...fetchedHolidays.filter(h => isSameMonth(parseISO(h.start_time), currentDate))]
  }, [events, shifts, t, currentDate, isRTL, fetchedHolidays])

  // Calendar grid days
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    const daysArray: Date[] = []
    let day = start
    while (day <= end) {
      daysArray.push(day)
      day = addDays(day, 1)
    }
    return daysArray
  }, [currentDate])

  const weekDays = isRTL
    ? [t('schedule.calendar.sat'), t('schedule.calendar.fri'), t('schedule.calendar.thu'), t('schedule.calendar.wed'), t('schedule.calendar.tue'), t('schedule.calendar.mon'), t('schedule.calendar.sun')]
    : [t('schedule.calendar.sun'), t('schedule.calendar.mon'), t('schedule.calendar.tue'), t('schedule.calendar.wed'), t('schedule.calendar.thu'), t('schedule.calendar.fri'), t('schedule.calendar.sat')]

  const getEventsForDate = (date: Date) => {
    return allEvents.filter((event: any) => {
      const eventDateRaw = event.start_time || event.start_date || event.date
      if (!eventDateRaw) return false
      const eventDate = parseISO(eventDateRaw)
      return isSameDay(eventDate, date)
    })
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []
  
  // Today's events summary
  const todayEvents = getEventsForDate(new Date())
  const todayEventCount = todayEvents.length
  const hasEventsToday = todayEventCount > 0

  // Quick navigate to today
  const goToToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-hotel-navy/10" />
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-100 shadow-xl overflow-hidden bg-white/70 backdrop-blur-sm border">
      <div className="h-1.5 bg-gradient-to-r from-hotel-navy to-hotel-gold/60" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-hotel-navy">
              <Link to="/calendar" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Calendar className="w-5 h-5 text-hotel-gold" />
                {t('widgets.schedule_title', 'Schedule')}
              </Link>
            </CardTitle>
            <CardDescription className="text-slate-500">{t('widgets.schedule_desc', 'Your events and shifts')}</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white hover:shadow-xs transition-all"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Button>
            <span className="text-sm font-semibold min-w-[110px] text-center text-hotel-navy">
              {format(currentDate, 'MMMM yyyy', { locale: isRTL ? ar : undefined })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white hover:shadow-xs transition-all"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl h-9 px-4 bg-hotel-gold text-white hover:bg-hotel-gold/90 border-0 shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('schedule.add_event', 'Add Event')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar Grid */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-2">
                {d}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isToday = isSameDay(date, new Date())
              const dayEvents = getEventsForDate(date)
              const hasEvents = dayEvents.length > 0

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-all duration-150",
                    isSelected
                      ? "bg-hotel-navy text-white shadow-md"
                      : isToday
                        ? "bg-hotel-gold/15 text-hotel-navy font-bold ring-2 ring-hotel-gold/40"
                        : isCurrentMonth
                          ? "hover:bg-slate-50 text-slate-700"
                          : "text-slate-300"
                  )}
                >
                  {/* Today indicator dot */}
                  {isToday && !isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-hotel-gold rounded-full" />
                  )}
                  
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected && "font-bold"
                  )}>
                    {format(date, 'd')}
                  </span>
                  
                  {/* Event dots */}
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e: any, i: number) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 rounded-full",
                            isSelected ? "bg-white/80" : (eventTypeColors[e.type] || eventTypeColors.default)
                          )}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Today's Summary - Compact & Clean */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all",
          hasEventsToday 
            ? "bg-gradient-to-r from-amber-50/80 to-orange-50/60 border-amber-200/60 shadow-sm" 
            : "bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border-emerald-200/60 shadow-sm"
        )}>
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            hasEventsToday 
              ? "bg-amber-100 text-amber-600" 
              : "bg-emerald-100 text-emerald-600"
          )}>
            {hasEventsToday ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight">
              {hasEventsToday 
                ? t('schedule.today_events', { count: todayEventCount })
                : t('schedule.no_events_today', 'No events today')
              }
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {format(new Date(), 'EEEE, MMMM d', { locale: isRTL ? ar : undefined })}
            </p>
          </div>
          
          {!isSameDay(selectedDate || new Date(), new Date()) && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg shrink-0",
                "bg-white/60 hover:bg-white border border-slate-200/60",
                "text-slate-600 hover:text-hotel-navy transition-all"
              )}
              onClick={goToToday}
            >
              <Sun className="w-3.5 h-3.5 mr-1.5" />
              {t('schedule.go_to_today', 'Today')}
            </Button>
          )}
        </div>

        {/* Selected Date Events */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-5 bg-hotel-gold rounded-full" />
            <h4 className="text-sm font-bold text-slate-800">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d', { locale: isRTL ? ar : undefined }) : t('schedule.select_date', 'Select a date')}
            </h4>
          </div>
          <ScrollArea className="h-[200px] -mx-1 px-1">
            <div className="space-y-3 pr-4">
              <AnimatePresence mode="popLayout">
                {selectedDateEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                      <CalendarDays className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      {t('schedule.no_events', 'No events scheduled')}
                    </p>
                    {isSameDay(selectedDate || new Date(), new Date()) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {t('schedule.enjoy_day', 'Enjoy your day!')}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  selectedDateEvents.map((event: any, idx: number) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      onClick={() => setSelectedEvent(event)}
                      className="group flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-100 hover:border-hotel-gold/40 hover:shadow-md transition-all cursor-pointer"
                    >
                      {/* Event Type Indicator */}
                      <div className={cn(
                        "w-2 h-2 mt-2 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm",
                        eventTypeColors[event.type] || eventTypeColors.default
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        {/* Title Row */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800 group-hover:text-hotel-navy transition-colors truncate text-sm leading-tight">
                            {event.title}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] bg-slate-100 text-slate-600 border-0 font-medium flex-shrink-0 px-2 py-0.5"
                          >
                            {event.type}
                          </Badge>
                        </div>
                        
                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {(event.start_time || event.start_date) && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3 text-hotel-gold" />
                              {format(parseISO(event.start_time || event.start_date), 'h:mm a')}
                              {event.end_time && (
                                <>
                                  <span className="text-slate-300 mx-0.5">-</span>
                                  {format(parseISO(event.end_time), 'h:mm a')}
                                </>
                              )}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[120px]">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Upcoming Summary (Mobile/Compact) */}
        {!isRTL && (upcomingEvents || []).length > 0 && (
          <div className="bg-hotel-navy/5 p-4 rounded-2xl border border-hotel-navy/10 mt-auto">
            <h4 className="text-[10px] font-bold text-hotel-navy/60 uppercase tracking-widest mb-3">
              {t('schedule.upcoming', 'Next Up')}
            </h4>
            <div className="space-y-3">
              {(upcomingEvents || []).slice(0, 2).map((event: any) => (
                <Link
                  key={event.id}
                  to={`/calendar?event=${event.id}`}
                  className="flex items-center gap-3 text-sm hover:translate-x-1 transition-transform group"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full ring-4 ring-white shadow-sm",
                    eventTypeColors[event.type] || eventTypeColors.default
                  )} />
                  <span className="truncate flex-1 font-semibold text-hotel-navy group-hover:text-hotel-gold transition-colors">{event.title}</span>
                  <span className="text-[10px] font-bold text-hotel-navy/40">
                    {format(parseISO(event.start_time || event.start_date), 'MMM d')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <EventDialogs
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        selectedDate={selectedDate}
      />
    </Card>
  )
}

export default CalendarWidget
