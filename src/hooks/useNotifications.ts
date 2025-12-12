import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Notification } from '@/lib/types'
import { useNotificationPreferences } from './useNotificationPreferences'
import { mockEmailService } from '@/lib/mockEmailService'

import { useToast } from '@/components/ui/use-toast'

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { preferences } = useNotificationPreferences()
  const { toast } = useToast()

  // Use ref to access latest preferences safely inside effect callback
  const preferencesRef = useRef(preferences)
  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      console.log('Fetched notifications:', data?.length)

      // Map database fields to TS interface if needed
      // Assuming 'read_at' exists in DB and 'is_read' is expected by UI
      return (data || []).map((n: any) => ({
        ...n,
        is_read: !!n.read_at
      })) as Notification[]
    },
    enabled: !!user,
  })

  // Count unread
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Subscribe to new notifications
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })

          // Trigger Toast
          toast({
            title: payload.new.title || 'New Notification',
            description: payload.new.message,
          })


          // Trigger Browser Notification
          if (
            preferencesRef.current?.browser_push_enabled &&
            Notification.permission === 'granted'
          ) {
            new Notification(payload.new.title || 'New Notification', {
              body: payload.new.message,
              icon: '/favicon.ico' // Verify if favicon exists or use generic
            })
          }

          // Trigger Mock Email Service based on preferences
          const newNotification = payload.new as any
          const prefs = preferencesRef.current

          if (prefs?.email_enabled) {
            let shouldSend = false
            const type = newNotification.type || 'system'

            // Mapping types to preference keys
            if (['approval_required', 'request_approved', 'request_rejected'].includes(type) && prefs.approval_email) shouldSend = true
            else if (['training_assigned', 'training_deadline'].includes(type) && prefs.training_email) shouldSend = true
            else if (['announcement_new'].includes(type) && prefs.announcement_email) shouldSend = true
            else if (['maintenance_assigned', 'maintenance_resolved'].includes(type) && prefs.maintenance_email) shouldSend = true

            // Default fallback if type is generic
            if (!shouldSend && type === 'system') shouldSend = true

            if (shouldSend) {
              await mockEmailService.sendEmail({
                to: user.email || 'user@example.com',
                subject: newNotification.title || 'New Notification',
                body: newNotification.message || '',
                metadata: { type, id: newNotification.id }
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    }
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null) // Only update unread ones
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    }
  })

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  }
}
