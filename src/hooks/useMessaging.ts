import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

// Message Hooks
// Comment Hooks
// Conversation Hooks
// Messaging Statistics
export function useMessagingStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['messaging-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const accessFilter = `sender_id.eq.${user.id},recipient_id.eq.${user.id},recipient_id.is.null`

      const [
        totalResult,
        sentResult,
        receivedResult,
        unreadResult,
        urgentResult,
        directResult,
        broadcastResult,
        systemResult
      ] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .or(accessFilter),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', user.id),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .neq('status', 'read'),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('priority', 'urgent')
          .neq('status', 'read'),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('message_type', 'direct')
          .or(accessFilter),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('message_type', 'broadcast')
          .or(accessFilter),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('message_type', 'system')
          .or(accessFilter),
      ])

      const results = [
        totalResult,
        sentResult,
        receivedResult,
        unreadResult,
        urgentResult,
        directResult,
        broadcastResult,
        systemResult
      ]

      const errored = results.find((result) => result.error)
      if (errored?.error) throw errored.error

      const stats = {
        totalMessages: totalResult.count || 0,
        sentMessages: sentResult.count || 0,
        receivedMessages: receivedResult.count || 0,
        unreadMessages: unreadResult.count || 0,
        urgentMessages: urgentResult.count || 0,
        messagesByType: {
          direct: directResult.count || 0,
          broadcast: broadcastResult.count || 0,
          system: systemResult.count || 0
        }
      }

      return stats
    },
    enabled: !!user?.id,
    staleTime: 30_000
  })
}
