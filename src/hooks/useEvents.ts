import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export interface Event {
  id: string
  title: string
  description?: string
  start_date: string
  end_date?: string
  all_day: boolean
  location?: string
  type: 'meeting' | 'training' | 'holiday' | 'deadline' | 'birthday' | 'general'
  property_id?: string
  department_id?: string
  created_by: string
  is_public: boolean
  attendees?: string[]
  created_at: string
}

export function useEvents(startDate?: Date, endDate?: Date) {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', startDate, endDate, currentProperty?.id],
    queryFn: async (): Promise<Event[]> => {
      if (!user?.id) return []

      const start = startDate || new Date()
      const end = endDate || new Date(start.getFullYear(), start.getMonth() + 3, 0)

      const { data, error } = await supabase
        .rpc('get_events_for_range', {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          property_filter: isRealPropertyId(currentProperty?.id) ? currentProperty.id : null
        })

      if (error) {
        console.error('Error fetching events:', error)
        throw error
      }

      return (data || []).map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        start_date: ev.start_time,
        end_date: ev.end_time,
        all_day: false,
        type: (['meeting', 'training', 'holiday', 'deadline', 'birthday', 'general'].includes(ev.type)
          ? ev.type
          : 'general') as Event['type'],
        created_by: ev.created_by,
        is_public: true,
        created_at: ev.start_time,
      }))
    },
    enabled: !!user?.id
  })

  return { events, isLoading, error }
}

export function useUpcomingEvents(limit: number = 5) {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  const { data: events, isLoading } = useQuery({
    queryKey: ['events-upcoming', limit, currentProperty?.id],
    queryFn: async (): Promise<Event[]> => {
      if (!user?.id) return []

      let query = supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .eq('is_public', true)
        .order('start_date', { ascending: true })

      if (isRealPropertyId(currentProperty?.id)) {
        query = query.or(`property_id.is.null,property_id.eq.${currentProperty.id}`)
      }

      const { data, error } = await query.limit(limit)

      if (error) {
        console.error('Error fetching upcoming events:', error)
        throw error
      }

      return (data || []).map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description ?? undefined,
        start_date: ev.start_date,
        end_date: ev.end_date ?? undefined,
        all_day: ev.all_day ?? false,
        location: ev.location ?? undefined,
        type: (['meeting', 'training', 'holiday', 'deadline', 'birthday', 'general'].includes(ev.type ?? '')
          ? ev.type
          : 'general') as Event['type'],
        property_id: ev.property_id ?? undefined,
        department_id: ev.department_id ?? undefined,
        created_by: ev.created_by,
        is_public: ev.is_public ?? false,
        attendees: ev.attendees ?? undefined,
        created_at: ev.created_at ?? ev.start_date,
      }))
    },
    enabled: !!user?.id
  })

  return { events, isLoading }
}

export function useEventsByMonth(months: Date[]) {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  const { data: eventsByMonth, isLoading } = useQuery({
    queryKey: ['events-by-month', months.map(m => m.toISOString()), currentProperty?.id],
    queryFn: async (): Promise<Map<string, Event[]>> => {
      if (!user?.id || months.length === 0) return new Map()

      const start = new Date(months[0].getFullYear(), months[0].getMonth(), 1)
      const end = new Date(months[months.length - 1].getFullYear(), months[months.length - 1].getMonth() + 1, 0)

      let query = supabase
        .from('events')
        .select('*')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .eq('is_public', true)
        .order('start_date', { ascending: true })

      if (isRealPropertyId(currentProperty?.id)) {
        query = query.or(`property_id.is.null,property_id.eq.${currentProperty.id}`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching events by month:', error)
        throw error
      }

      // Group by month
      const grouped = new Map<string, Event[]>()
      data?.forEach((ev) => {
        const date = new Date(ev.start_date)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        const event: Event = {
          id: ev.id,
          title: ev.title,
          description: ev.description ?? undefined,
          start_date: ev.start_date,
          end_date: ev.end_date ?? undefined,
          all_day: ev.all_day ?? false,
          location: ev.location ?? undefined,
          type: (['meeting', 'training', 'holiday', 'deadline', 'birthday', 'general'].includes(ev.type ?? '')
            ? ev.type
            : 'general') as Event['type'],
          property_id: ev.property_id ?? undefined,
          department_id: ev.department_id ?? undefined,
          created_by: ev.created_by,
          is_public: ev.is_public ?? false,
          attendees: ev.attendees ?? undefined,
          created_at: ev.created_at ?? ev.start_date,
        }
        grouped.get(key)!.push(event)
      })

      return grouped
    },
    enabled: !!user?.id && months.length > 0
  })

  return { eventsByMonth, isLoading }
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'created_by' | 'created_at'>) => {
      if (!user?.id) throw new Error('User must be authenticated')

      if (event.property_id !== undefined && !isRealPropertyId(event.property_id)) {
        throw new Error('A valid property_id is required to create an event')
      }

      const resolvedPropertyId = isRealPropertyId(event.property_id)
        ? event.property_id
        : (isRealPropertyId(currentProperty?.id) ? currentProperty.id : null)

      if (!resolvedPropertyId) {
        throw new Error('A valid property_id is required to create an event')
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          property_id: resolvedPropertyId,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user.id,
        entity_type: 'event',
        entity_id: data.id,
        metadata: { action: 'create', details: { title: event.title, property_id: data.property_id } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...event }: Partial<Event> & { id: string }) => {
      if (event.property_id !== undefined && !isRealPropertyId(event.property_id)) {
        throw new Error('A valid property_id is required when updating event scope')
      }

      const { data, error } = await supabase
        .from('events')
        .update(event)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user?.id,
        entity_type: 'event',
        entity_id: data.id,
        metadata: { action: 'update', details: { updates: event } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user?.id,
        entity_type: 'event',
        entity_id: id,
        metadata: { action: 'delete', details: { deleted: true } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}
