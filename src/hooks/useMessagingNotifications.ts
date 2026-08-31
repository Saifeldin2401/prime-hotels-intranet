import { useAuth } from '@/hooks/useAuth'
import { createBulkNotifications, createNotification } from '@/services/notificationService'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { Message } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useMessagingPermissions } from './useMessagingPermissions'

interface CreateNotificationData {
  user_id: string
  title: string
  message: string
  type: 'message_received' | 'system'
  link?: string
  metadata?: Record<string, unknown>
}

export function useCreateNotification() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { canManageNotifications } = useMessagingPermissions()

  return useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      if (!profile?.id) throw new Error('User must be authenticated')
      if (!canManageNotifications) throw new Error('Insufficient permissions')

	  await createNotification({
		  userId: data.user_id,
		  type: data.type,
		  title: data.title,
		  message: data.message,
		  entityType: 'message',
		  entityId: typeof data.metadata?.message_id === 'string' ? data.metadata.message_id : undefined,
		  metadata: data.metadata,
		  link: data.link || null,
	  })

	  return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      crudToasts.create.success('Notification')
    },
    onError: () => {
      crudToasts.create.error('notification')
    }
  })
}

export function useMessageNotifications() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const createNotificationMutation = useCreateNotification()

  const createMessageNotification = useCallback(async (
    message: Message,
    recipientId: string
  ) => {
    if (!profile?.id) return

    const notificationData: CreateNotificationData = {
      user_id: recipientId,
      title: `New Message: ${message.subject}`,
      message: `From: ${message.sender?.full_name || 'Unknown'}\n${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
	  type: 'message_received',
	  link: `/messaging/${message.id}`,
      metadata: {
        message_id: message.id,
        sender_id: message.sender_id,
        message_type: message.message_type
      }
    }

    await createNotificationMutation.mutateAsync(notificationData)
  }, [profile?.id, createNotificationMutation])

  const createBulkMessageNotifications = useCallback(async (
    message: Message,
    recipientIds: string[]
  ) => {
    if (!profile?.id) return

	  await createBulkNotifications({
		  userIds: recipientIds,
		  type: 'message_received',
		  title: `New ${message.message_type === 'broadcast' ? 'Broadcast' : 'Message'}: ${message.subject}`,
		  message: `From: ${message.sender?.full_name || 'Unknown'}\n${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
		  entityType: 'message',
		  entityId: message.id,
		  link: `/messaging/${message.id}`,
		  metadata: {
			  message_id: message.id,
			  sender_id: message.sender_id,
			  message_type: message.message_type,
		  },
	  })

    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [profile?.id, queryClient])

  const createSystemNotification = useCallback(async (
    title: string,
    message: string,
    targetUserIds?: string[]
  ) => {
    if (!profile?.id) return

    if (targetUserIds && targetUserIds.length > 0) {
	  await createBulkNotifications({
		  userIds: targetUserIds,
		  type: 'system',
		  title,
		  message,
		  metadata: {
			  created_by: profile.id,
		  },
	  })
    } else {
	  await createNotification({
		  userId: profile.id,
		  type: 'system',
		  title,
		  message,
		  metadata: {
			  created_by: profile.id,
			  system_wide: true,
		  },
	  })
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [profile?.id, queryClient])

  return {
    createMessageNotification,
    createBulkMessageNotifications,
    createSystemNotification,
    isCreating: createNotificationMutation.isPending
  }
}

export interface NotificationPreferencesState {
  email_notifications: boolean
  push_notifications: boolean
  message_notifications: boolean
  task_notifications: boolean
  approval_notifications: boolean
  system_notifications: boolean
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
  }
}

export function useNotificationSettings() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notification-settings', profile?.id],
    queryFn: async (): Promise<NotificationPreferencesState> => {
      if (!profile?.id) {
        return {
          email_notifications: true,
          push_notifications: true,
          message_notifications: true,
          task_notifications: true,
          approval_notifications: true,
          system_notifications: true,
          quiet_hours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          }
        }
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        return {
          email_notifications: true,
          push_notifications: true,
          message_notifications: true,
          task_notifications: true,
          approval_notifications: true,
          system_notifications: true,
          quiet_hours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          }
        }
      }

      return {
        email_notifications: data.email_enabled ?? true,
        push_notifications: data.browser_push_enabled ?? true,
        message_notifications: true,
        task_notifications: true,
        approval_notifications: data.approval_push ?? true,
        system_notifications: true,
        quiet_hours: {
          enabled: data.quiet_hours_enabled ?? false,
          start: data.quiet_hours_start ?? '22:00',
          end: data.quiet_hours_end ?? '08:00'
        }
      }
    },
    enabled: !!profile?.id
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (settings: Partial<NotificationPreferencesState>) => {
      if (!profile?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile.id,
          email_enabled: settings.email_notifications,
          browser_push_enabled: settings.push_notifications,
          approval_push: settings.approval_notifications,
          approval_email: settings.approval_notifications,
          quiet_hours_enabled: settings.quiet_hours?.enabled,
          quiet_hours_start: settings.quiet_hours?.start,
          quiet_hours_end: settings.quiet_hours?.end,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      crudToasts.update.success('Notification settings')
    },
    onError: () => {
      crudToasts.update.error('notification settings')
    }
  })
}
