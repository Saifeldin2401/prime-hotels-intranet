import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { useProperty } from '@/contexts/PropertyContext'

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
            let query = supabase
                .from('shifts')
                .select('*')
                .order('start_time', { ascending: true })

            if (isRealPropertyId(currentProperty?.id)) {
                query = query.eq('property_id', currentProperty.id)
            }

            if (userId) {
                query = query.eq('user_id', userId)
            }

            if (departmentId) {
                query = query.eq('department_id', departmentId)
            }

            if (dateRange) {
                query = query
                    .gte('start_time', dateRange.start.toISOString())
                    .lte('start_time', dateRange.end.toISOString())
            }

            const { data, error } = await query

            if (error) throw error
            return data as Shift[]
        },
        enabled: !!userId || !!departmentId || isRealPropertyId(currentProperty?.id)
    })
}

/**
 * Hook to create a new shift
 */
export function useCreateShift() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (input: CreateShiftInput) => {
            if (!user) throw new Error('User must be authenticated')
            // Production safeguard: shifts must always belong to a concrete property.
            if (!isRealPropertyId(input.property_id)) {
                throw new Error('A valid property_id is required to create a shift')
            }
            await validateShiftBusinessRules(input)

            const { data, error } = await supabase
                .from('shifts')
                .insert({
                    ...input,
                    property_id: input.property_id,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
        }
    })
}

/**
 * Hook to update an existing shift
 */
export function useUpdateShift() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateShiftInput> }) => {
            // Prevent accidental writes that clear property ownership or use consolidated sentinel IDs.
            if (updates.property_id !== undefined && !isRealPropertyId(updates.property_id)) {
                throw new Error('A valid property_id is required when updating shift property scope')
            }

            const { data: existingShift, error: existingShiftError } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', id)
                .single()

            if (existingShiftError) throw existingShiftError
            if (!existingShift) throw new Error('Shift not found')

            const mergedShift = {
                ...existingShift,
                ...updates,
            }

            await validateShiftBusinessRules({
                user_id: mergedShift.user_id,
                start_time: mergedShift.start_time,
                end_time: mergedShift.end_time,
                break_duration_minutes: mergedShift.break_duration_minutes,
                status: mergedShift.status as Shift['status'],
            }, id)

            const { data, error } = await supabase
                .from('shifts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
        }
    })
}

/**
 * Hook to delete a shift
 */
export function useDeleteShift() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['user-schedule'] })
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
            let query = supabase
                .from('shifts')
                .select('status, start_time, end_time')

            if (isRealPropertyId(currentProperty?.id)) {
                query = query.eq('property_id', currentProperty.id)
            }

            if (userId) {
                query = query.eq('user_id', userId)
            }

            const { data, error } = await query

            if (error) throw error

            const stats = {
                total: data?.length || 0,
                scheduled: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0,
                no_show: 0,
                totalHours: 0
            }

            data?.forEach(shift => {
                stats[shift.status as keyof typeof stats]++

                // Calculate hours
                const start = new Date(shift.start_time)
                const end = new Date(shift.end_time)
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                stats.totalHours += hours
            })

            return stats
        },
        enabled: !!userId || isRealPropertyId(currentProperty?.id)
    })
}
