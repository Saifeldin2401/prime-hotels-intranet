import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { crudToasts } from '@/lib/toastHelpers'
import type { Task, TaskStatus } from '@/lib/types'

// ─── Types ───────────────────────────────────────────

interface MarkTaskCompleteVariables {
  taskId: string
  status?: TaskStatus
}

interface AcknowledgeAnnouncementVariables {
  announcementId: string
}

interface ApproveRequestVariables {
  requestId: string
  action: 'approve' | 'reject'
  comment?: string
}

interface NotificationActionVariables {
  notificationId: string
  action: 'mark_read' | 'mark_unread' | 'delete'
}

// ─── Mark Task Complete ──────────────────────────────

export function useMarkTaskComplete() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, status = 'completed' }: MarkTaskCompleteVariables) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onMutate: async ({ taskId, status = 'completed' }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      await queryClient.cancelQueries({ queryKey: ['task-stats'] })

      // Snapshot previous values
      const previousTasks = queryClient.getQueryData(['tasks'])
      const previousStats = queryClient.getQueryData(['task-stats'])

      // Optimistically update tasks
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old
        return old.map(task => 
          task.id === taskId 
            ? { ...task, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
            : task
        )
      })

      return { previousTasks, previousStats }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['task-stats'], context.previousStats)
      }
      crudToasts.update.error('task')
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.update.success('Task', 'Task marked as complete')
    },
  })
}

// ─── Acknowledge Announcement ────────────────────────

export function useAcknowledgeAnnouncement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ announcementId }: AcknowledgeAnnouncementVariables) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,announcement_id'
        })

      if (error) throw error
      return { announcementId }
    },
    onMutate: async ({ announcementId }) => {
      await queryClient.cancelQueries({ queryKey: ['announcements'] })
      
      const previousAnnouncements = queryClient.getQueryData(['announcements'])

      // Optimistically mark as read
      queryClient.setQueryData(['announcements'], (old: any[] | undefined) => {
        if (!old) return old
        return old.map(announcement => 
          announcement.id === announcementId 
            ? { ...announcement, is_read: true, read_at: new Date().toISOString() }
            : announcement
        )
      })

      return { previousAnnouncements }
    },
    onError: (error, variables, context) => {
      if (context?.previousAnnouncements) {
        queryClient.setQueryData(['announcements'], context.previousAnnouncements)
      }
      crudToasts.update.error('announcement')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      crudToasts.update.success('Announcement', 'Announcement acknowledged')
    },
  })
}

// ─── Approve/Reject Request ──────────────────────────

export function useApproveRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId, action, comment }: ApproveRequestVariables) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase.rpc('request_apply_action', {
        p_request_id: requestId,
        p_action: action,
        p_comment: comment ?? null,
        p_forward_to: null,
        p_visibility: 'all',
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      if (result && result.success === false) {
        throw new Error(result.message || 'Request action failed')
      }

      return { requestId, action }
    },
    onMutate: async ({ requestId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['requests-inbox'] })
      
      const previousRequests = queryClient.getQueryData(['requests-inbox'])

      // Optimistically update request status
      queryClient.setQueryData(['requests-inbox'], (old: any[] | undefined) => {
        if (!old) return old
        return old.map(request => 
          request.id === requestId 
            ? { ...request, status: action === 'approve' ? 'approved' : 'rejected' }
            : request
        )
      })

      return { previousRequests }
    },
    onError: (error, variables, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['requests-inbox'], context.previousRequests)
      }
      const actionType = variables.action === 'approve' ? 'approve' : 'reject'
      crudToasts[actionType].error('request')
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      
      const actionType = variables.action === 'approve' ? 'approve' : 'reject'
      crudToasts[actionType].success('request')
    },
  })
}

// ─── Notification Actions ────────────────────────────

export function useNotificationAction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ notificationId, action }: NotificationActionVariables) => {
      if (!user?.id) throw new Error('User must be authenticated')

      if (action === 'delete') {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', user.id)

        if (error) throw error
        return { notificationId, action }
      }

      const readAt = action === 'mark_read' ? new Date().toISOString() : null

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
      return { notificationId, action }
    },
    onMutate: async ({ notificationId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      
      const previousNotifications = queryClient.getQueryData(['notifications'])

      if (action === 'delete') {
        queryClient.setQueryData(['notifications'], (old: any[] | undefined) => {
          if (!old) return old
          return old.filter(n => n.id !== notificationId)
        })
      } else {
        queryClient.setQueryData(['notifications'], (old: any[] | undefined) => {
          if (!old) return old
          return old.map(notification => 
            notification.id === notificationId 
              ? { 
                  ...notification, 
                  read_at: action === 'mark_read' ? new Date().toISOString() : null,
                  is_read: action === 'mark_read'
                }
              : notification
          )
        })
      }

      return { previousNotifications }
    },
    onError: (error, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications)
      }
      crudToasts.update.error('notification')
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      
      if (variables.action === 'mark_read') {
        crudToasts.update.success('Notification', 'Marked as read')
      }
    },
  })
}

// ─── Mark All Notifications Read ─────────────────────

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      
      const previousNotifications = queryClient.getQueryData(['notifications'])

      queryClient.setQueryData(['notifications'], (old: any[] | undefined) => {
        if (!old) return old
        return old.map(notification => ({
          ...notification,
          read_at: new Date().toISOString(),
          is_read: true
        }))
      })

      return { previousNotifications }
    },
    onError: (error, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications)
      }
      crudToasts.update.error('notifications')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      crudToasts.update.success('Notifications', 'All notifications marked as read')
    },
  })
}
