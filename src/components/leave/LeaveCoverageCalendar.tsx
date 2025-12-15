import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDepartmentCoverage, useLeaveEvents, useLeaveConflicts } from '@/hooks/useLeaveCoverage'
import { Calendar, ChevronLeft, ChevronRight, Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'

interface LeaveCoverageCalendarProps {
    departmentId?: string
    className?: string
}

export function LeaveCoverageCalendar({ departmentId, className }: LeaveCoverageCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    const { data: leaveEvents = [], isLoading } = useLeaveEvents(monthStart, monthEnd, departmentId)
    const { data: coverage = [] } = useDepartmentCoverage(new Date())
    const { data: conflicts = [] } = useLeaveConflicts(monthStart, monthEnd)

    const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd])

    const getEventsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return leaveEvents.filter(event => {
            const start = event.start_date
            const end = event.end_date
            return dateStr >= start && dateStr <= end
        })
    }

    const getConflictsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return conflicts.filter(c => c.date === dateStr)
    }

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    if (isLoading) {
        return (
            <Card className={cn('animate-pulse', className)}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Leave Coverage Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-hotel-gold" />
                        Leave Coverage Calendar
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <Button variant="ghost" size="sm" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-16" />
                    ))}

                    {/* Day cells */}
                    {days.map(day => {
                        const dayEvents = getEventsForDay(day)
                        const dayConflicts = getConflictsForDay(day)
                        const hasConflict = dayConflicts.some(c => c.is_critical)
                        const hasWarning = dayConflicts.length > 0 && !hasConflict

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    'h-16 p-1 rounded-lg border text-xs relative',
                                    isToday(day) && 'border-hotel-gold border-2',
                                    hasConflict && 'bg-red-50 border-red-200',
                                    hasWarning && !hasConflict && 'bg-yellow-50 border-yellow-200',
                                    !hasConflict && !hasWarning && dayEvents.length > 0 && 'bg-blue-50 border-blue-200',
                                    !dayEvents.length && 'hover:bg-gray-50'
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                        'font-medium',
                                        isToday(day) && 'text-hotel-gold'
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayEvents.length > 0 && (
                                        <div className="flex items-center gap-0.5">
                                            <Users className="h-3 w-3 text-gray-500" />
                                            <span className="text-gray-600">{dayEvents.length}</span>
                                        </div>
                                    )}
                                </div>

                                {hasConflict && (
                                    <AlertTriangle className="h-3 w-3 text-red-500 absolute bottom-1 right-1" />
                                )}

                                {dayEvents.length > 0 && (
                                    <div className="space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 2).map(event => (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    'truncate text-[10px] px-1 rounded',
                                                    event.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                )}
                                            >
                                                {event.user_name.split(' ')[0]}
                                            </div>
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[10px] text-gray-500">
                                                +{dayEvents.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Coverage summary */}
                {coverage.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Today's Coverage</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {coverage.slice(0, 4).map(dept => (
                                <div
                                    key={dept.department_id}
                                    className={cn(
                                        'p-2 rounded-lg text-xs',
                                        dept.coverage_percentage >= 80 ? 'bg-green-50' :
                                            dept.coverage_percentage >= 50 ? 'bg-yellow-50' :
                                                'bg-red-50'
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium truncate">{dept.department_name}</span>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[10px] px-1',
                                                dept.coverage_percentage >= 80 ? 'border-green-300 text-green-700' :
                                                    dept.coverage_percentage >= 50 ? 'border-yellow-300 text-yellow-700' :
                                                        'border-red-300 text-red-700'
                                            )}
                                        >
                                            {dept.coverage_percentage}%
                                        </Badge>
                                    </div>
                                    <div className="text-gray-500 mt-1">
                                        {dept.total_staff - dept.staff_on_leave}/{dept.total_staff} available
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                        <span>Approved</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" />
                        <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span>Low Coverage</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
