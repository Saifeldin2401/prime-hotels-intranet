// DEPRECATED: All shift queries reference the dropped 'shifts' table. Feature pending re-architecture.
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface Shift {
    id: string
    user_id: string
    shift_type: string
    start_time: string
    end_time: string
    location: string | null
    department_id: string | null
    property_id: string | null
    notes: string | null
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    break_duration_minutes: number
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface CreateShiftInput {
    user_id: string
    shift_type: string
    start_time: string
    end_time: string
    location?: string
    department_id?: string
    property_id: string
    notes?: string
    break_duration_minutes?: number
    status?: Shift['status']
}

const MIN_REST_HOURS = 11
const MAX_WEEKLY_HOURS = 48
const ACTIVE_SHIFT_STATUSES: Shift['status'][] = ['scheduled', 'in_progress', 'completed', 'no_show']

function parseShiftDate(value: string, label: string): Date {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${label}`)
    }
    return date
}

function calculateShiftDurationHours(start: Date, end: Date, breakDurationMinutes: number): number {
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return Math.max(0, totalHours - breakDurationMinutes / 60)
}

function getIsoWeekRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date)
    const day = start.getUTCDay()
    const daysFromMonday = (day + 6) % 7
    start.setUTCDate(start.getUTCDate() - daysFromMonday)
    start.setUTCHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    return { start, end }
}

async function validateShiftBusinessRules(
    payload: {
        user_id: string
        start_time: string
        end_time: string
        break_duration_minutes?: number
        status?: Shift['status']
    },
    excludeShiftId?: string
) {
    if (payload.status === 'cancelled') return

    const start = parseShiftDate(payload.start_time, 'shift start time')
    const end = parseShiftDate(payload.end_time, 'shift end time')
    if (end <= start) {
        throw new Error('Shift end time must be after start time')
    }

    const breakDurationMinutes = Number(payload.break_duration_minutes ?? 0)
    if (!Number.isFinite(breakDurationMinutes) || breakDurationMinutes < 0) {
        throw new Error('Break duration must be a non-negative number')
    }

    const restWindowMs = MIN_REST_HOURS * 60 * 60 * 1000
    const nearbyStart = new Date(start.getTime() - restWindowMs).toISOString()
    const nearbyEnd = new Date(end.getTime() + restWindowMs).toISOString()

    let nearbyQuery = supabase
        .from('shifts')
        .select('id, start_time, end_time, break_duration_minutes, status')
        .eq('user_id', payload.user_id)
        .in('status', ACTIVE_SHIFT_STATUSES)
        .lt('start_time', nearbyEnd)
        .gt('end_time', nearbyStart)

    if (excludeShiftId) {
        nearbyQuery = nearbyQuery.neq('id', excludeShiftId)
    }

    const { data: nearbyShifts, error: nearbyError } = await nearbyQuery
    if (nearbyError) throw nearbyError

    for (const existing of nearbyShifts || []) {
        const existingStart = parseShiftDate(existing.start_time, 'existing shift start time')
        const existingEnd = parseShiftDate(existing.end_time, 'existing shift end time')

        const overlaps = existingStart < end && existingEnd > start
        if (overlaps) {
            throw new Error('Shift conflict detected: employee already has an overlapping shift')
        }

        const restBeforeHours = (start.getTime() - existingEnd.getTime()) / (1000 * 60 * 60)
        if (restBeforeHours > 0 && restBeforeHours < MIN_REST_HOURS) {
            throw new Error(`Minimum rest violation: at least ${MIN_REST_HOURS} hours is required between shifts`)
        }

        const restAfterHours = (existingStart.getTime() - end.getTime()) / (1000 * 60 * 60)
        if (restAfterHours > 0 && restAfterHours < MIN_REST_HOURS) {
            throw new Error(`Minimum rest violation: at least ${MIN_REST_HOURS} hours is required between shifts`)
        }
    }

    const { start: weekStart, end: weekEnd } = getIsoWeekRange(start)

    let weeklyQuery = supabase
        .from('shifts')
        .select('id, start_time, end_time, break_duration_minutes, status')
        .eq('user_id', payload.user_id)
        .in('status', ACTIVE_SHIFT_STATUSES)
        .lt('start_time', weekEnd.toISOString())
        .gt('end_time', weekStart.toISOString())

    if (excludeShiftId) {
        weeklyQuery = weeklyQuery.neq('id', excludeShiftId)
    }

    const { data: weeklyShifts, error: weeklyError } = await weeklyQuery
    if (weeklyError) throw weeklyError

    const existingWeekHours = (weeklyShifts || []).reduce((sum, shift) => {
        const shiftStart = parseShiftDate(shift.start_time, 'weekly shift start time')
        const shiftEnd = parseShiftDate(shift.end_time, 'weekly shift end time')
        const shiftBreakMinutes = Number(shift.break_duration_minutes ?? 0)
        return sum + calculateShiftDurationHours(shiftStart, shiftEnd, shiftBreakMinutes)
    }, 0)

    const proposedHours = calculateShiftDurationHours(start, end, breakDurationMinutes)
    const totalWeekHours = existingWeekHours + proposedHours
    if (totalWeekHours > MAX_WEEKLY_HOURS) {
        throw new Error(
            `Weekly hours limit exceeded: ${totalWeekHours.toFixed(1)}h scheduled (max ${MAX_WEEKLY_HOURS}h)`
        )
    }
}

/**
 * Hook to fetch shifts for a user, optionally filtered by department
 */
export function useShifts(userId?: string, dateRange?: { start: Date; end: Date }, departmentId?: string) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['shifts', userId, dateRange, departmentId, currentProperty?.id],
        queryFn: async () => {
            return [] as Shift[]
        },
        enabled: false // DEPRECATED: All shift queries reference the dropped 'shifts' table. Feature pending re-architecture.
    })
}

/**
 * Hook to create a new shift
 */
export function useCreateShift() {
    return useMutation({
        mutationFn: async (input: CreateShiftInput) => {
            throw new Error('DEPRECATED: Shifts feature is pending re-architecture.')
        }
    })
}

/**
 * Hook to update an existing shift
 */
export function useUpdateShift() {
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateShiftInput> }) => {
            throw new Error('DEPRECATED: Shifts feature is pending re-architecture.')
        }
    })
}

/**
 * Hook to delete a shift
 */
export function useDeleteShift() {
    return useMutation({
        mutationFn: async (id: string) => {
            throw new Error('DEPRECATED: Shifts feature is pending re-architecture.')
        }
    })
}

/**
 * Hook to get shift statistics
 */
export function useShiftStats(userId?: string) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['shift-stats', userId, currentProperty?.id],
        queryFn: async () => {
            return {
                total: 0,
                scheduled: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0,
                no_show: 0,
                totalHours: 0
            }
        },
        enabled: false // DEPRECATED: All shift queries reference the dropped 'shifts' table. Feature pending re-architecture.
    })
}
