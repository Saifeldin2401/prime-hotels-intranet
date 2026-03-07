import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { crudToasts } from '@/lib/toastHelpers'
import type { Task, MaintenanceTicket } from '@/lib/types'
import type { Event } from '@/hooks/useEvents'
import type { Announcement } from '@/lib/types'
import { createNotification } from '@/lib/notificationService'

// Quick Task Creation
export function useQuickCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (task: {
      title: string
      description?: string
      due_date?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      assigned_to_id?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const taskData = {
        title: task.title,
        description: task.description || null,
        due_date: task.due_date || null,
        priority: task.priority || 'medium',
        assigned_to_id: task.assigned_to_id || user.id,
        created_by_id: user.id,
        property_id: currentProperty?.id || null,
        status: 'todo' as const,
      }

      let notificationPayload = null
      if (taskData.assigned_to_id && taskData.assigned_to_id !== user.id) {
        notificationPayload = {
          type: 'task_assigned' as const,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${taskData.title}"`,
          link: '/tasks',
          data: { taskTitle: taskData.title }
        }
      }

      const { data, error } = await supabase.rpc('create_task_atomic', {
        task_data: taskData,
        notification_payload: notificationPayload
      })

      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.create.success('Task')
    },
    onError: () => crudToasts.create.error('task')
  })
}

// Quick Event Creation
export function useQuickCreateEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (event: {
      title: string
      start_date: string
      end_date?: string
      location?: string
      type: 'meeting' | 'training' | 'holiday' | 'deadline' | 'birthday' | 'general'
      description?: string
      all_day?: boolean
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date || null,
          location: event.location || null,
          type: event.type,
          description: event.description || null,
          all_day: event.all_day || false,
          is_public: true,
          created_by: user.id,
          property_id: currentProperty?.id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Audit log
      supabase.from('audit_logs').insert({
        entity_type: 'event',
        entity_id: data.id,
        action: 'create',
        user_id: user.id,
        details: { title: event.title, property_id: data.property_id }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })

      return data as Event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      crudToasts.create.success('Event')
    },
    onError: () => crudToasts.create.error('event')
  })
}

// Quick Maintenance Ticket Creation
export function useQuickCreateMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user, properties } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      category: MaintenanceTicket['category']
      priority: MaintenanceTicket['priority']
      location?: string
      room_number?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const propertyId = currentProperty?.id || (properties.length > 0 ? properties[0].id : null)

      const { data: result, error } = await supabase
        .from('maintenance_tickets')
        .insert({
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          room_number: data.room_number || data.location || null,
          property_id: propertyId,
          reported_by_id: user.id,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error

      // Audit log
      supabase.from('audit_logs').insert({
        entity_type: 'maintenance_ticket',
        entity_id: result.id,
        action: 'create',
        user_id: user.id,
        details: { title: data.title, property_id: propertyId }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })

      // Trigger AI triage in background
      if (result && data.description && data.description.length > 20) {
        await supabase
          .from('maintenance_tickets')
          .update({ ai_triage_status: 'pending' })
          .eq('id', result.id)

        supabase.functions.invoke('auto-triage-ticket', {
          body: { ticket_id: result.id }
        }).catch((error) => {
          console.error('AI triage failed for maintenance ticket:', error)
        })
      }

      return result as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.create.success('Maintenance ticket')
    },
    onError: () => crudToasts.create.error('maintenance ticket')
  })
}

// Quick Announcement Creation
export function useQuickCreateAnnouncement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (announcement: {
      title: string
      content: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      target_audience?: {
        type: 'all' | 'role' | 'department' | 'property' | 'individual'
        values: string[]
      }
      pinned?: boolean
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: announcement.title,
          content: announcement.content,
          priority: announcement.priority || 'medium',
          target_audience: announcement.target_audience || { type: 'all', values: [] },
          pinned: announcement.pinned || false,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Audit log
      supabase.from('audit_logs').insert({
        entity_type: 'announcement',
        entity_id: data.id,
        action: 'create',
        user_id: user.id,
        details: { title: announcement.title, target_audience: announcement.target_audience }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError)
      })

      // Send notifications to target audience (if not 'all')
      const audience = announcement.target_audience
      if (audience && audience.type !== 'all') {
        const targetUserIds: string[] = []
        const values = audience.values || []

        switch (audience.type) {
          case 'role':
            for (const role of values) {
              const { data: roleUsers } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', role)
              if (roleUsers) {
                targetUserIds.push(...roleUsers.map(u => u.user_id))
              }
            }
            break

          case 'department':
            for (const deptId of values) {
              const { data: deptUsers } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', deptId)
              if (deptUsers) {
                targetUserIds.push(...deptUsers.map(u => u.user_id))
              }
            }
            break

          case 'property':
            for (const propId of values) {
              const { data: propUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propId)
              if (propUsers) {
                targetUserIds.push(...propUsers.map(u => u.user_id))
              }
            }
            break

          case 'individual':
            targetUserIds.push(...values)
            break
        }

        // Remove duplicates and exclude creator
        const uniqueUserIds = [...new Set(targetUserIds)].filter(id => id !== user.id)

        // Send notifications
        for (const userId of uniqueUserIds) {
          await createNotification({
            userId,
            type: 'announcement_new',
            title: announcement.title,
            message: `A new announcement has been posted: "${announcement.title}"`,
            entityType: 'announcement',
            entityId: data.id,
            link: '/announcements'
          })
        }
      }

      return data as Announcement
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      crudToasts.create.success('Announcement')
    },
    onError: () => crudToasts.create.error('announcement')
  })
}

// Combined hook for convenience
export function useQuickCreate() {
  return {
    createTask: useQuickCreateTask(),
    createEvent: useQuickCreateEvent(),
    createMaintenanceTicket: useQuickCreateMaintenanceTicket(),
    createAnnouncement: useQuickCreateAnnouncement(),
  }
}
