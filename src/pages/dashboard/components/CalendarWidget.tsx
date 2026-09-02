import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useEvents, useUpcomingEvents, type Event } from '@/hooks/useEvents'
import { useUserShifts, type UserShift } from '@/hooks/useUserShifts'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths
} from 'date-fns'
import { ar } from 'date-fns/locale'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
import type { TFunction } from 'i18next'
import { AlertCircle, Calendar, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'
import type { CalendarEvent, CalendarEventType } from './EventDialogs'
import { EventDialogs } from './EventDialogs'

const eventTypeColors: Record<CalendarEventType | 'default', string> = {
  meeting: 'bg-blue-500 shadow-blue-500/30',
  training: 'bg-indigo-500 shadow-indigo-500/30',
  review: 'bg-purple-500 shadow-purple-500/30',
  holiday: 'bg-rose-500 shadow-rose-500/30',
  deadline: 'bg-red-500 shadow-red-500/30',
  shift: 'bg-emerald-500 shadow-emerald-500/30',
  event: 'bg-amber-500 shadow-amber-500/30',
  birthday: 'bg-pink-500 shadow-pink-500/30',
  general: 'bg-slate-500 shadow-slate-500/30',
  default: 'bg-slate-400 shadow-slate-400/30'
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

interface CalendarHolidayEvent extends CalendarEvent {
  type: 'holiday'
  location: string
}

interface SelectedDateEventsPanelProps {
  selectedDate: Date | null
  selectedDateEvents: CalendarEvent[]
  isRTL: boolean
  shouldReduceMotion: boolean
  t: TFunction
  onSelectEvent: (event: CalendarEvent) => void
}

function SelectedDateEventsPanel({
  selectedDate,
  selectedDateEvents,
  isRTL,
  shouldReduceMotion,
  t,
  onSelectEvent,
}: SelectedDateEventsPanelProps) {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 px-1">
        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
        <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">
          {selectedDate ? format(selectedDate, 'EEEE, MMMM d', { locale: isRTL ? ar : undefined }) : t('schedule.select_date', 'Select a date')}
        </h4>
      </div>
      <ScrollArea className="h-[210px] -mx-1 px-1">
        <div className="space-y-3 pe-4">
          <AnimatePresence mode="popLayout">
            {selectedDateEvents.length === 0 ? (
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                  <CalendarDays className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600">
                  {t('schedule.no_events', 'No events scheduled')}
                </p>
                {isSameDay(selectedDate || new Date(), new Date()) && (
                  <p className="text-xs font-medium text-slate-400 mt-1">
                    {t('schedule.enjoy_day', 'Enjoy your day!')}
                  </p>
                )}
              </m.div>
            ) : (
              selectedDateEvents.map((event, idx) => (
                <m.div
                  key={event.id}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                  transition={{ delay: shouldReduceMotion ? 0 : idx * 0.04, duration: shouldReduceMotion ? 0.12 : 0.2 }}
                  onClick={() => onSelectEvent(event)}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:border-slate-300 hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] transition-all cursor-pointer ease-out hover:-translate-y-0.5"
                >
                  <div className={cn(
                    "w-3 h-3 mt-1.5 rounded-full flex-shrink-0 shadow-sm",
                    eventTypeColors[event.type] || eventTypeColors.default
                  )} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate text-[15px] leading-tight flex-1">
                        {event.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-slate-200 bg-slate-50 flex-shrink-0 px-2 h-6"
                      >
                        {event.type}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                      {(event.start_time || event.start_date) && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </m.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}

export function CalendarWidget() {
  const { primaryRole } = useAuth()
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';
  const shouldReduceMotion = useReducedMotion()
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentYear = currentDate.getFullYear()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Roles that can access the full scheduling/shift management tool
  const schedulingRoles = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']
  const hasSchedulingPrivileges = schedulingRoles.includes(primaryRole || '')
  const schedulePath = hasSchedulingPrivileges ? '/hr/scheduling' : '/hr/attendance'

  const { data: fetchedHolidays = [] } = useQuery<CalendarHolidayEvent[]>({
    queryKey: ['ksa-holidays', currentYear, i18n.language],
    queryFn: async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/SA`, {
          signal: controller.signal
        })
        if (!response.ok) return []

        const data = await response.json().catch(() => []) as ExternalHoliday[]
        if (!Array.isArray(data)) return []

        return data
          .filter((holiday) => holiday && typeof holiday.date === 'string' && holiday.date.length >= 10)
          .map((holiday) => ({
            id: `holiday-ext-${holiday.date}-${holiday.name}`,
            title: isRTL ? holiday.localName : holiday.name,
            start_time: `${holiday.date}T00:00:00`,
            type: 'holiday',
            location: t('common.ksa', 'Saudi Arabia')
          }))
      } catch (_error) {
        return []
      } finally {
        clearTimeout(timeoutId)
      }
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  })

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
    const baseEvents = (events || []).map((event: Event): CalendarEvent => ({
      id: event.id,
      title: event.title,
      type: event.type,
      location: event.location,
      start_time: event.start_date,
      end_time: event.end_date,
      description: event.description
    }))

    const shiftEvents = (shifts || []).map((shift: UserShift): CalendarEvent => {
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
        start_date: shiftStart,
        end_time: shiftEnd,
        type: 'shift',
        location: shift.location || shift.property?.name || t('schedule.calendar.property', 'Property')
      }
    })

    const ksaHolidays: CalendarHolidayEvent[] = KSA_HOLIDAYS_2026
      .filter(h => {
        const hDate = parseISO(h.date)
        return isSameMonth(hDate, currentDate) && !fetchedHolidays.some(fh => fh.start_time.startsWith(h.date))
      })
      .map(h => ({
        id: `holiday-${h.date}`,
        title: isRTL ? h.nameAr : h.name,
        start_time: `${h.date}T00:00:00`,
        start_date: `${h.date}T00:00:00`,
        type: 'holiday',
        location: t('common.ksa', 'Saudi Arabia')
      }))

    // Merge database events, shifts, local holidays, and fetched holidays
    return [
      ...baseEvents,
      ...shiftEvents,
      ...ksaHolidays,
      ...fetchedHolidays.filter(h => isSameMonth(parseISO(h.start_time), currentDate))
    ]
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
    return allEvents.filter((event) => {
      if (!event.start_time) return false
      const eventDate = parseISO(event.start_time)
      return isSameDay(eventDate, date)
    })
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const upcomingDisplayEvents = useMemo(() => {
    return (upcomingEvents || []).map((event: Event): CalendarEvent => ({
      id: event.id,
      title: event.title,
      type: event.type,
      location: event.location,
      start_time: event.start_date,
      end_time: event.end_date,
      description: event.description
    }))
  }, [upcomingEvents])

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
      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }, (_, n) => `weekday-skeleton-${n + 1}`).map((skeletonKey) => (
              <Skeleton key={skeletonKey} className="h-4 w-full rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, n) => `day-skeleton-${n + 1}`).map((skeletonKey) => (
              <Skeleton key={skeletonKey} className="aspect-square rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col h-full">
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <Link to={schedulePath} className="hover:text-blue-600 transition-colors">
                  {t('widgets.schedule_title', 'Schedule')}
                </Link>
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                {t('widgets.schedule_desc', 'Your events and shifts')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgb(0,0,0,0.02)]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-white hover:shadow-sm transition-all rounded-lg text-slate-500 hover:text-slate-800"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  aria-label={t('accessibility.previous_month', 'Previous month')}
                >
                  <ChevronLeft className={cn("w-4 h-4", isRTL && "rotate-180")} />
                </Button>
                <span className="text-sm font-bold min-w-[120px] text-center text-slate-800 tracking-tight">
                  {format(currentDate, 'MMMM yyyy', { locale: isRTL ? ar : undefined })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-white hover:shadow-sm transition-all rounded-lg text-slate-500 hover:text-slate-800"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  aria-label={t('accessibility.next_month', 'Next month')}
                >
                  <ChevronRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                </Button>
              </div>
              <Button
                size="icon"
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl h-10 w-10 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center shrink-0"
                aria-label={t('accessibility.add_event', 'Add event')}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-6">
          {/* Calendar Grid */}
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-[inset_0_1px_2px_rgb(0,0,0,0.02)]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(d => (
                <div key={d} className="text-center text-[10px] font-extrabold tracking-wider text-slate-400 uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((date) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate)
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isToday = isSameDay(date, new Date())
                const dayEvents = getEventsForDate(date)
                const hasEvents = dayEvents.length > 0

                return (
                  <m.button
                    key={date.toISOString()}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : isToday
                          ? "bg-blue-50 text-blue-700 font-bold border-2 border-blue-200"
                          : isCurrentMonth
                            ? "hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent text-slate-700 font-medium"
                            : "text-slate-300"
                    )}
                  >
                    {/* Today indicator dot */}
                    {isToday && !isSelected && (
                      <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}

                    <span className={cn(
                      "text-sm",
                      isSelected && "font-bold"
                    )}>
                      {format(date, 'd')}
                    </span>

                    {/* Event dots */}
                    {hasEvents && (
                      <div className="flex gap-1 mt-1">
                      {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={`${e.id || e.start_time || e.title}-${date.toISOString()}`}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-white border-white/20" : (eventTypeColors[e.type] || eventTypeColors.default)
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </m.button>
                )
              })}
            </div>
          </div>

          {/* Today's Summary - Compact & Clean */}
          <div className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border transition-all",
            hasEventsToday
              ? "bg-amber-50 border-amber-100 shadow-sm"
              : "bg-emerald-50 border-emerald-100 shadow-sm"
          )}>
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl shrink-0 shadow-sm bg-white border",
              hasEventsToday
                ? "text-amber-500 border-amber-100"
                : "text-emerald-500 border-emerald-100"
            )}>
              {hasEventsToday ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-800 leading-tight">
                {hasEventsToday
                  ? t('schedule.today_events', { count: todayEventCount })
                  : t('schedule.no_events_today', 'No events today')
                }
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {format(new Date(), 'EEEE, MMMM d', { locale: isRTL ? ar : undefined })}
              </p>
            </div>

            {!isSameDay(selectedDate || new Date(), new Date()) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl shrink-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                onClick={goToToday}
              >
                <Sun className="w-4 h-4 me-1.5" />
                {t('schedule.go_to_today', 'Today')}
              </Button>
            )}
          </div>

          <SelectedDateEventsPanel
            selectedDate={selectedDate}
            selectedDateEvents={selectedDateEvents}
            isRTL={isRTL}
            shouldReduceMotion={shouldReduceMotion}
            t={t}
            onSelectEvent={setSelectedEvent}
          />

          {/* Upcoming Summary (Mobile/Compact) */}
          {!isRTL && upcomingDisplayEvents.length > 0 && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mt-4">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {t('schedule.upcoming', 'Next Up')}
              </h4>
              <div className="space-y-4">
                {upcomingDisplayEvents.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    to={schedulePath}
                    className="flex items-center gap-3 text-sm hover:-translate-y-0.5 transition-transform group"
                  >
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full shadow-sm shrink-0",
                      eventTypeColors[event.type] || eventTypeColors.default
                    )} />
                    <span className="truncate flex-1 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{event.title}</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                      {format(parseISO(event.start_time), 'MMM d')}
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
    </LazyMotion>
  )
}

export default CalendarWidget
