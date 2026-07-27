import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

// NOTE: user_shifts was merged into the consolidated `shifts` table
// (see supabase/migrations/20260721010000_merge_shifts_user_shifts.sql).
// `shifts` stores start_time/end_time as timestamptz rather than a separate
// shift_date + time-of-day pair, so `shift_date` below is now a convenience
// field derived client-side from start_time (kept so existing consumers like
// CalendarWidget.tsx, which branch on `shift.start_time.includes('T')` /
// fall back to `shift.shift_date`, keep working unchanged).
export interface UserShift {
  id: string
  user_id: string
  property_id?: string
  department_id?: string
  shift_date: string
  start_time: string
  end_time: string
  shift_type: 'regular' | 'overtime' | 'on_call' | 'training' | 'meeting' | string
  status: 'scheduled' | 'in_progress' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_by?: string
  created_at: string
  location?: string
  property?: {
    name: string
  }
  department?: {
    name: string
  }
}

const MIN_REST_HOURS = 11

const toShiftDateTime = (shiftDate: string, time: string) => {
  if (time.includes('T')) {
    return new Date(time)
  }
  return new Date(`${shiftDate}T${time}`)
}

const normalizeShiftWindow = (shiftDate: string, startTime: string, endTime: string) => {
  const start = toShiftDateTime(shiftDate, startTime)
  let end = toShiftDateTime(shiftDate, endTime)
  if (end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  }
  return { start, end }
}

export function useNextShift() {
  const { user } = useAuth()

  const { data: shift, isLoading, error } = useQuery({
    queryKey: ['next-shift', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .rpc('get_next_shift', { user_uuid: user.id })

      if (error) {
        console.error('Error fetching next shift:', error)
        throw error
      }

      if (!data || data.length === 0) return null

      return {
        id: data[0].shift_id,
        date: data[0].shift_date,
        startTime: data[0].start_time,
        endTime: data[0].end_time,
        departmentName: data[0].department_name,
        propertyName: data[0].property_name
      }
    },
    enabled: !!user?.id
  })

  return { shift, isLoading, error }
}

export function useUserShifts(startDate?: Date, endDate?: Date) {
  const { user } = useAuth()

  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['user-shifts', user?.id, startDate, endDate],
    queryFn: async (): Promise<UserShift[]> => {
      if (!user?.id) return []

      const rangeStart = startDate || new Date()
      let query = supabase
        .from('shifts')
        .select(`
          *,
          property:properties(name),
          department:departments(name)
        `)
        .eq('user_id', user.id)
        .gte('start_time', new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).toISOString())
        .order('start_time', { ascending: true })

      if (endDate) {
        const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
        query = query.lte('start_time', rangeEnd.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching shifts:', error)
        throw error
      }

      return (data || []).map((row) => ({
        ...row,
        shift_date: row.start_time ? row.start_time.split('T')[0] : row.shift_date
      })) as UserShift[]
    },
    enabled: !!user?.id
  })

  return { shifts, isLoading, error }
}

export function useCreateShift() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (shift: Omit<UserShift, 'id' | 'created_at'>) => {
      const shiftDate = shift.shift_date
      const newWindow = normalizeShiftWindow(shiftDate, shift.start_time, shift.end_time)
      const baseDate = new Date(`${shiftDate}T00:00:00`)
      const prevDate = new Date(baseDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + 1)

      const { data: existingShifts, error: existingError } = await supabase
        .from('shifts')
        .select('id, start_time, end_time, status')
        .eq('user_id', shift.user_id)
        .neq('status', 'cancelled')
        .gte('start_time', prevDate.toISOString())
        .lte('start_time', nextDate.toISOString())

      if (existingError) throw existingError

      const conflicts = (existingShifts || []).filter((existing) => {
        const existingStart = new Date(existing.start_time)
        const existingEnd = new Date(existing.end_time)
        const overlaps = newWindow.start < existingEnd && newWindow.end > existingStart
        if (overlaps) return true

        const gapAfter = (newWindow.start.getTime() - existingEnd.getTime()) / (1000 * 60 * 60)
        if (gapAfter > 0 && gapAfter < MIN_REST_HOURS) return true

        const gapBefore = (existingStart.getTime() - newWindow.end.getTime()) / (1000 * 60 * 60)
        if (gapBefore > 0 && gapBefore < MIN_REST_HOURS) return true

        return false
      })

      if (conflicts.length > 0) {
        throw new Error('Shift conflicts with an existing assignment or violates the minimum rest period.')
      }

      const { shift_date: _shiftDate, ...rest } = shift
      void _shiftDate

      const { data, error } = await supabase
        .from('shifts')
        .insert({
          ...rest,
          start_time: newWindow.start.toISOString(),
          end_time: newWindow.end.toISOString(),
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['next-shift'] })
    }
  })
}
