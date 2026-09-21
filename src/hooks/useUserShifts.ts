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
      return null
    },
    enabled: false // DEPRECATED: 'shifts' table was dropped. Feature pending re-architecture.
  })

  return { shift, isLoading, error }
}

export function useUserShifts(startDate?: Date, endDate?: Date) {
  const { user } = useAuth()

  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['user-shifts', user?.id, startDate, endDate],
    queryFn: async (): Promise<UserShift[]> => {
      return []
    },
    enabled: false // DEPRECATED: 'shifts' table was dropped. Feature pending re-architecture.
  })

  return { shifts, isLoading, error }
}

export function useCreateShift() {
  return useMutation({
    mutationFn: async (shift: Omit<UserShift, 'id' | 'created_at'>) => {
      throw new Error('DEPRECATED: Shifts feature is pending re-architecture.')
    }
  })
}
