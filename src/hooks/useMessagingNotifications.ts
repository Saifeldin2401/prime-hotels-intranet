import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMessagingPermissions } from './useMessagingPermissions'
import { crudToasts } from '@/lib/toastHelpers'
import type { Message, Notification } from '@/lib/types'

interface CreateNotificationData {
  user_id: string
  title: string
  message: string
  type: 'message' | 'system' | 'approval' | 'task' | 'training' | 'sop'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  metadata?: Record<string, any>
}

export function useCreateNotification() {
  const queryClient = useQueryClient()
  const { profile, primaryRole } = useAuth()
  const { canManageNotifications } = useMessagingPermissions()

  return useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      if (!profile?.id) throw new Error('User must be authenticated')
      if (!canManageNotifications) throw new Error('Insufficient permissions')

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          action_url: data.action_url,
          metadata: data.metadata,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return notification
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
      type: 'message',
      priority: message.priority,
      action_url: `/messaging/${message.id}`,
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

    const notifications = recipientIds.map(recipientId => ({
      user_id: recipientId,
      title: `New ${message.message_type === 'broadcast' ? 'Broadcast' : 'Message'}: ${message.subject}`,
      message: `From: ${message.sender?.full_name || 'Unknown'}\n${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
      type: 'message' as const,
      priority: message.priority,
      action_url: `/messaging/${message.id}`,
      metadata: {
        message_id: message.id,
        sender_id: message.sender_id,
        message_type: message.message_type
      },
      is_read: false,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) throw error

    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [profile?.id, queryClient])

  const createSystemNotification = useCallback(async (
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    targetUserIds?: string[]
  ) => {
    if (!profile?.id) return

    if (targetUserIds && targetUserIds.length > 0) {
      // Create notifications for specific users
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type: 'system' as const,
        priority,
        metadata: {
          created_by: profile.id
        },
        is_read: false,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) throw error
    } else {
      // Create system-wide notification (admin only)
      const { error } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          type: 'system',
          priority,
          metadata: {
            created_by: profile.id,
            system_wide: true
          },
          is_read: false,
          created_at: new Date().toISOString()
        })

      if (error) throw error
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

export function useNotificationSettings() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notification-settings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', profile.id)
        .eq('category', 'notifications')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data?.settings || {
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
    },
    enabled: !!profile?.id
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (settings: any) => {
      if (!profile?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: profile.id,
          category: 'notifications',
          settings,
          updated_at: new Date().toISOString()
        })
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
