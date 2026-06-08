import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export interface UserShift {
  id: string
  user_id: string
  property_id?: string
  department_id?: string
  shift_date: string
  start_time: string
  end_time: string
  shift_type: 'regular' | 'overtime' | 'on_call' | 'training' | 'meeting'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
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

      let query = supabase
        .from('user_shifts')
        .select(`
          *,
          property:properties(name),
          department:departments(name)
        `)
        .eq('user_id', user.id)
        .gte('shift_date', (startDate || new Date()).toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (endDate) {
        query = query.lte('shift_date', endDate.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching shifts:', error)
        throw error
      }

      return data || []
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
        .from('user_shifts')
        .select('id, shift_date, start_time, end_time, status')
        .eq('user_id', shift.user_id)
        .neq('status', 'cancelled')
        .gte('shift_date', prevDate.toISOString().split('T')[0])
        .lte('shift_date', nextDate.toISOString().split('T')[0])

      if (existingError) throw existingError

      const conflicts = (existingShifts || []).filter((existing) => {
        const existingWindow = normalizeShiftWindow(existing.shift_date, existing.start_time, existing.end_time)
        const overlaps = newWindow.start < existingWindow.end && newWindow.end > existingWindow.start
        if (overlaps) return true

        const gapAfter = (newWindow.start.getTime() - existingWindow.end.getTime()) / (1000 * 60 * 60)
        if (gapAfter > 0 && gapAfter < MIN_REST_HOURS) return true

        const gapBefore = (existingWindow.start.getTime() - newWindow.end.getTime()) / (1000 * 60 * 60)
        if (gapBefore > 0 && gapBefore < MIN_REST_HOURS) return true

        return false
      })

      if (conflicts.length > 0) {
        throw new Error('Shift conflicts with an existing assignment or violates the minimum rest period.')
      }

      const { data, error } = await supabase
        .from('user_shifts')
        .insert({
          ...shift,
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
