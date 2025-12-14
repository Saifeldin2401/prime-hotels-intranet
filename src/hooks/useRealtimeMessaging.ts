import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Message, Notification } from '@/lib/types'

export function useRealtimeMessaging() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (!user?.id) return

    // Set up real-time subscription for messages
    const channel = supabase
      .channel('messaging-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time message update:', payload)
          
          // Update local cache with new/updated message
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: ['messages'] })
            queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          } else if (payload.eventType === 'UPDATE') {
            queryClient.invalidateQueries({ queryKey: ['messages'] })
            queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
          } else if (payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['messages'] })
            queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time sent message update:', payload)
          queryClient.invalidateQueries({ queryKey: ['messages'] })
          queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time notification update:', payload)
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
      })

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [user?.id, queryClient])

  return {
    isConnected: !!subscriptionRef.current
  }
}

export function useMessageTypingIndicator(conversationId?: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user } = useAuth()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!conversationId || !user?.id) return

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'broadcast',
        { event: 'typing' },
        (payload: any) => {
          if (payload.payload.userId !== user.id) {
            setTypingUsers(prev => {
              if (payload.payload.isTyping) {
                return [...prev.filter(id => id !== payload.payload.userId), payload.payload.userId]
              } else {
                return prev.filter(id => id !== payload.payload.userId)
              }
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [conversationId, user?.id])

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!conversationId || !user?.id || !channelRef.current) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        isTyping,
        timestamp: Date.now()
      }
    })
  }

  return {
    typingUsers,
    sendTypingIndicator
  }
}
