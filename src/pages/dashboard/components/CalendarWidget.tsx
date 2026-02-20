import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays } from 'lucide-react'
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

const eventTypeColors: Record<string, string> = {
  meeting: 'bg-blue-500',
  training: 'bg-emerald-500',
  review: 'bg-purple-500',
  holiday: 'bg-amber-500',
  deadline: 'bg-red-500',
  shift: 'bg-cyan-500',
  default: 'bg-slate-500'
}

export function CalendarWidget() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

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

  // Combine events and shifts
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
    
    return [...(events || []), ...shiftEvents]
  }, [events, shifts, t])

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

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <Skeleton key={d} className="h-8" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              {t('widgets.schedule_title', 'Schedule')}
            </CardTitle>
            <CardDescription>{t('widgets.schedule_desc', 'Your events and shifts')}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: isRTL ? ar : undefined })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isToday = isSameDay(date, new Date())
              const dayEvents = getEventsForDate(date)

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative p-1",
                    isSelected && "bg-primary text-primary-foreground shadow-md",
                    !isSelected && isToday && "bg-amber-100 text-amber-700 font-semibold ring-2 ring-amber-400",
                    !isSelected && !isToday && isCurrentMonth && "hover:bg-slate-100",
                    !isSelected && !isCurrentMonth && "text-muted-foreground opacity-50"
                  )}
                >
                  <span className="text-sm">{format(date, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e: any, i: number) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-1 h-1 rounded-full",
                            isSelected ? "bg-white" : (eventTypeColors[e.type] || eventTypeColors.default)
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

        {/* Selected Date Events */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d', { locale: isRTL ? ar : undefined }) : t('schedule.select_date', 'Select a date')}
          </h4>
          <ScrollArea className="h-[180px]">
            <div className="space-y-2 pr-4">
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('schedule.no_events', 'No events scheduled for this day')}
                </p>
              ) : (
                selectedDateEvents.map((event: any, idx: number) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      eventTypeColors[event.type] || eventTypeColors.default
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {(event.start_time || event.start_date) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(event.start_time || event.start_date), 'h:mm a')}
                            {event.end_time && ` - ${format(parseISO(event.end_time), 'h:mm a')}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {event.type}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Upcoming Events Summary */}
        {(upcomingEvents || []).length > 0 && (
          <div className="border-t mt-4 pt-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t('schedule.upcoming', 'Upcoming')}
            </h4>
            <div className="space-y-2">
              {(upcomingEvents || []).slice(0, 3).map((event: any, idx: number) => (
                <Link 
                  key={event.id} 
                  to={`/calendar?event=${event.id}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    eventTypeColors[event.type] || eventTypeColors.default
                  )} />
                  <span className="truncate flex-1">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(event.start_time || event.start_date), 'MMM d', { locale: isRTL ? ar : undefined })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
