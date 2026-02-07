import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Message, Notification } from '@/lib/types'

// Simple "pop" sound for notifications
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTS1UAAAAOAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYaW5nAAAADwAAAA8AAC1dAAUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBf/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAArwAAAAxAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSZA2AAAAB/AAAAQAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAv/7kmRAAAAAH8AAABAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export function useRealtimeMessaging() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const subscriptionRef = useRef<any>(null)
  const audioUnlockedRef = useRef(false)
  const pendingSoundRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playSound = () => {
    try {
      if (!audioUnlockedRef.current) {
        pendingSoundRef.current = true
        return
      }

      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
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

    const unlockAudio = async () => {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
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
          // Only listen for broadcast messages without a recipient.
          filter: 'recipient_id=is.null'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            void playSound()
          }
          queryClient.invalidateQueries({ queryKey: ['messages'] })
          queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
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
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      window.removeEventListener('pointerdown', onUserGesture)
      window.removeEventListener('keydown', onUserGesture)
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
