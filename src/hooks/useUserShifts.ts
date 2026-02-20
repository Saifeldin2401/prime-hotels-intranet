import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
  property?: {
    name: string
  }
  department?: {
    name: string
  }
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
