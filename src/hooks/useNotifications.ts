import { supabase } from '@/lib/supabase'
import type { Notification } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Derive is_read from read_at for frontend compatibility
      return data.map((n) => ({
        ...n,
        is_read: !!n.read_at,
        entity_type: n.entity_type || (n.metadata as any)?.entity_type || null,
        entity_id: n.entity_id || (n.metadata as any)?.entity_id || null,
      })) as Notification[]
    },
    enabled: !!user,
    refetchInterval: 180000, // 3 min (Realtime in sidebar handles immediate badge updates)
    refetchOnWindowFocus: false,
    staleTime: 60000, // Fresh for 1 minute
  })

  // Start checking for unread count
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    }
  })

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    }
  })

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    }
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingRead: markAsRead.isPending || markAllAsRead.isPending
  }
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: async () => {
      if (!user) return 0

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
      return count || 0
    },
    enabled: !!user,
    refetchInterval: 180000, // 3 min (sidebar Realtime handles badge counts)
    refetchOnWindowFocus: false,
    staleTime: 60000, // Fresh for 1 minute
  })
}
