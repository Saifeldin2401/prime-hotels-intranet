import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeMessaging() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  const audioUnlockedRef = useRef(false)
  const pendingSoundRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const playSound = () => {
    try {
      if (!audioUnlockedRef.current) {
        pendingSoundRef.current = true
        return
      }

      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = (window.AudioContext || audioWindow.webkitAudioContext) as typeof AudioContext | undefined
      if (!AudioCtx) return

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx()
      }

      const ctx = audioCtxRef.current
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.14)
    } catch {
      pendingSoundRef.current = true
    }
  }

  useEffect(() => {
    if (!user?.id) return

    let isMounted = true
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null
    let pendingMessagesInvalidate = false
    let pendingStatsInvalidate = false
    let pendingNotificationsInvalidate = false

    const scheduleInvalidation = (options: {
      messages?: boolean
      stats?: boolean
      notifications?: boolean
    }) => {
      if (options.messages) pendingMessagesInvalidate = true
      if (options.stats) pendingStatsInvalidate = true
      if (options.notifications) pendingNotificationsInvalidate = true

      if (invalidateTimer) return

      invalidateTimer = setTimeout(() => {
        invalidateTimer = null

        if (pendingMessagesInvalidate) {
          pendingMessagesInvalidate = false
          queryClient.invalidateQueries({ queryKey: ['messages'] })
        }
        if (pendingStatsInvalidate) {
          pendingStatsInvalidate = false
          queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
        }
        if (pendingNotificationsInvalidate) {
          pendingNotificationsInvalidate = false
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      }, 300)
    }

    const unlockAudio = async () => {
      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = (window.AudioContext || audioWindow.webkitAudioContext) as typeof AudioContext | undefined
      if (!AudioCtx) {
        audioUnlockedRef.current = true
        if (pendingSoundRef.current) pendingSoundRef.current = false
        return
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx()
      }

      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }

      audioUnlockedRef.current = true
      if (pendingSoundRef.current) {
        pendingSoundRef.current = false
        playSound()
      }
    }

    const onUserGesture = () => {
      void unlockAudio()
      playSound()
    }

    window.addEventListener('pointerdown', onUserGesture, { once: true })
    window.addEventListener('keydown', onUserGesture, { once: true })

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
          // Update local cache with new/updated message
          if (payload.eventType === 'INSERT') {
            void playSound() // Play sound on new message
            scheduleInvalidation({ messages: true, stats: true, notifications: true })
          } else if (payload.eventType === 'UPDATE') {
            scheduleInvalidation({ messages: true, stats: true })
          } else if (payload.eventType === 'DELETE') {
            scheduleInvalidation({ messages: true, stats: true })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          // Only listen for broadcast messages without a recipient.
          filter: 'recipient_id=is.null'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            void playSound()
          }
          scheduleInvalidation({ messages: true, stats: true, notifications: true })
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
        () => {
          scheduleInvalidation({ messages: true, stats: true })
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
        () => {
          scheduleInvalidation({ notifications: true })
        }
      )
      .subscribe((status) => {
        if (!isMounted) return

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    subscriptionRef.current = channel

    return () => {
      isMounted = false
      window.removeEventListener('pointerdown', onUserGesture)
      window.removeEventListener('keydown', onUserGesture)
      if (invalidateTimer) {
        clearTimeout(invalidateTimer)
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => undefined)
        audioCtxRef.current = null
      }
      setIsConnected(false)
    }
  }, [user?.id, queryClient])

  return {
    isConnected
  }
}

export function useMessageTypingIndicator(conversationId?: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

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
