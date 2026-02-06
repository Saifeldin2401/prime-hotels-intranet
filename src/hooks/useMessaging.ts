import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { crudToasts } from '@/lib/toastHelpers'
import type { Message, Comment, Notification } from '@/lib/types'

// Message Hooks
export function useMessages(filters?: {
  status?: Message['status']
  message_type?: Message['message_type']
  priority?: Message['priority']
  sender_id?: string
  recipient_id?: string
  propertyId?: string
}) {
  const { profile, properties } = useAuth()

  return useQuery({
    queryKey: ['messages', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return []

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, email, avatar_url, job_title),
          recipient:profiles!recipient_id(id, full_name, email, avatar_url, job_title)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.message_type) {
        query = query.eq('message_type', filters.message_type)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.sender_id) {
        query = query.eq('sender_id', filters.sender_id)
      }
      if (filters?.recipient_id) {
        query = query.eq('recipient_id', filters.recipient_id)
      }

      // Filter by user's access (sent or received messages)
      query = query.or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id},recipient_id.is.null`)

      const { data, error } = await query.limit(100)

      if (error) throw error
      return data as Message[]
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always' // Always refetch when component mounts
  })
}

export function useMessage(messageId: string) {
  const { user, profile } = useAuth()

  return useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      if (!profile?.id || !messageId) return null

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, email, avatar_url, job_title),
          recipient:profiles!recipient_id(id, full_name, email, avatar_url, job_title)
        `)
        .eq('id', messageId)
        .single()

      if (error) throw error
      return data as Message
    },
    enabled: !!profile?.id && !!messageId
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      recipient_id?: string
      subject: string
      content: string
      message_type: Message['message_type']
      priority?: Message['priority']
      property_id?: string
      department_id?: string
      parent_message_id?: string
      attachments?: File[]
    }) => {
      if (!profile?.id) throw new Error('User must be authenticated')

      const subject = data.subject && data.subject.trim() !== ''
        ? data.subject
        : (data.content || '').trim().slice(0, 80) || 'Message'

      const normalizedRecipientId = data.recipient_id && data.recipient_id.trim() !== ''
        ? data.recipient_id
        : null

      if (data.message_type === 'direct' && !normalizedRecipientId) {
        throw new Error('Recipient is required for direct messages')
      }

      const effectiveRecipientId = data.message_type === 'direct'
        ? normalizedRecipientId
        : null

      // Create or find conversation for direct messages
      let conversationId = null
      if (effectiveRecipientId && data.message_type === 'direct') {
        // Check if conversation already exists between these users
        const { data: existingConversations } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [profile.id, effectiveRecipientId])

        const existingConv = existingConversations?.find(conv =>
          conv.participant_ids.includes(profile.id) &&
          conv.participant_ids.includes(effectiveRecipientId) &&
          conv.participant_ids.length === 2
        )

        if (existingConv) {
          conversationId = existingConv.id
        } else {
          // Create new conversation
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              title: data.subject,
              participant_ids: [profile.id, effectiveRecipientId]
            })
            .select()
            .single()

          if (newConv) {
            conversationId = newConv.id
          }
        }
      }

      // Insert the message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: effectiveRecipientId,
          subject,
          content: data.content,
          message_type: data.message_type,
          priority: data.priority || 'medium',
          status: 'sent',
          sent_at: new Date().toISOString(),
          parent_message_id: data.parent_message_id,
          property_id: data.property_id,
          department_id: data.department_id,
          conversation_id: conversationId
        })
        .select('*')
        .single()

      if (error) throw error

      return message
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      crudToasts.create.success('Message')
    },
    onError: (err) => {
      console.error('Failed to send message:', err)
      crudToasts.create.error('message')
    }
  })
}

export function useUpdateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, updates }: {
      messageId: string
      updates: Partial<Message>
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

export function useArchiveMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from('messages')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
      crudToasts.update.success('Message archived')
    },
    onError: () => {
      crudToasts.update.error('message')
    }
  })
}

// Comment Hooks
export function useComments(entityType: Comment['entity_type'], entityId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!author_id(id, full_name, email, avatar_url),
          parent_comment:comments!parent_comment_id(id, content, author_id),
          replies:comments(*),
          mentions:profiles(id, full_name, email)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Comment[]
    },
    enabled: !!user?.id && !!entityType && !!entityId
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      entity_type: Comment['entity_type']
      entity_id: string
      content: string
      parent_comment_id?: string
      is_internal?: boolean
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          author_id: user.id,
          content: data.content,
          parent_comment_id: data.parent_comment_id || null,
          is_internal: data.is_internal || false,
          is_edited: false
        })
        .select(`
          *,
          author:profiles!author_id(id, full_name, email, avatar_url)
        `)
        .single()

      if (error) throw error
      return comment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.entity_type, variables.entity_id] })
      crudToasts.create.success('Comment')
    },
    onError: () => {
      crudToasts.create.error('comment')
    }
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, content }: {
      commentId: string
      content: string
    }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate comment queries
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      crudToasts.update.success('Comment')
    },
    onError: () => {
      crudToasts.update.error('comment')
    }
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      return commentId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      crudToasts.delete.success('Comment')
    },
    onError: () => {
      crudToasts.delete.error('comment')
    }
  })
}

// Conversation Hooks
export function useConversations() {
  const { user, profile } = useAuth()

  return useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages:messages(
            id,
            subject,
            content,
            sender_id,
            created_at,
            sender:profiles!sender_id(id, full_name, email, avatar_url)
          )
        `)
        .contains('participant_ids', [profile.id])
        .order('last_message_at', { ascending: false })

      if (error) throw error

      // Get participant details for each conversation
      const conversationsWithParticipants = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: participants } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, job_title')
            .in('id', conv.participant_ids)

          const participantIds: string[] = Array.isArray(conv.participant_ids) ? conv.participant_ids : []
          const { data: userProps } = participantIds.length
            ? await supabase
              .from('user_properties')
              .select('user_id, properties(name)')
              .in('user_id', participantIds)
            : { data: [] as any[] }

          const primaryPropertyByUserId = new Map<string, string>()
          ;(userProps || []).forEach((row: any) => {
            if (!row?.user_id) return
            if (primaryPropertyByUserId.has(row.user_id)) return
            const propName = row?.properties?.name
            if (propName) primaryPropertyByUserId.set(row.user_id, propName)
          })

          const enrichedParticipants = (participants || []).map((p: any) => ({
            ...p,
            property_name: primaryPropertyByUserId.get(p.id) || null,
          }))

          const messages = Array.isArray(conv.messages) ? [...conv.messages] : []
          messages.sort((a: any, b: any) => {
            const aTime = new Date(a.created_at).getTime()
            const bTime = new Date(b.created_at).getTime()
            return bTime - aTime
          })

          const lastMessage = messages[0]

          return {
            ...conv,
            participants: enrichedParticipants,
            messages,
            last_message_preview: lastMessage?.content || lastMessage?.subject || ''
          }
        })
      )

      return conversationsWithParticipants
    },
    enabled: !!profile?.id
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (params: { otherUserId: string; title?: string | null }) => {
      if (!profile?.id) throw new Error('User must be authenticated')

      const participantIds = [profile.id, params.otherUserId]

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: params.title || null,
          participant_ids: participantIds,
        })
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useConversationMessages(params: {
  conversationId?: string | null
  participantIds?: string[]
  limit?: number
}) {
  const { profile } = useAuth()
  const limit = params.limit ?? 50

  return useQuery({
    queryKey: ['conversation-messages', profile?.id, params.conversationId, params.participantIds, limit],
    queryFn: async () => {
      if (!profile?.id) return []

      if (params.conversationId) {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(id, full_name, email, avatar_url, job_title),
            recipient:profiles!recipient_id(id, full_name, email, avatar_url, job_title)
          `)
          .eq('conversation_id', params.conversationId)
          .order('created_at', { ascending: true })
          .limit(limit)

        if (error) throw error
        return (data || []) as Message[]
      }

      const ids = params.participantIds || []
      if (ids.length !== 2) return []
      const [a, b] = ids

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, email, avatar_url, job_title),
          recipient:profiles!recipient_id(id, full_name, email, avatar_url, job_title)
        `)
        .or(`and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a})`)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data || []) as Message[]
    },
    enabled: !!profile?.id && (!!params.conversationId || (params.participantIds?.length === 2)),
    staleTime: 1000 * 10,
  })
}

export function useChannelMessages(params: {
  channel: 'broadcast' | 'system'
  limit?: number
}) {
  const { profile } = useAuth()
  const limit = params.limit ?? 100

  return useQuery({
    queryKey: ['channel-messages', profile?.id, params.channel, limit],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, email, avatar_url, job_title),
          recipient:profiles!recipient_id(id, full_name, email, avatar_url, job_title)
        `)
        .eq('message_type', params.channel)
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data || []) as Message[]
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 10,
  })
}

// Notification Hooks
export function useNotifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          user:profiles!user_id(id, full_name, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data || []).map((n: any) => ({
        ...n,
        is_read: !!n.read_at,
      })) as Notification[]
    },
    enabled: !!user?.id
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

// Messaging Statistics
export function useMessagingStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['messaging-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},recipient_id.is.null`)

      if (error) throw error

      const stats = {
        totalMessages: messages?.length || 0,
        sentMessages: messages?.filter(m => m.sender_id === user.id).length || 0,
        receivedMessages: messages?.filter(m => m.recipient_id === user.id).length || 0,
        unreadMessages: messages?.filter(m => m.recipient_id === user.id && m.status !== 'read').length || 0,
        urgentMessages: messages?.filter(m => m.priority === 'urgent' && m.status !== 'read').length || 0,
        messagesByType: {
          direct: messages?.filter(m => m.message_type === 'direct').length || 0,
          broadcast: messages?.filter(m => m.message_type === 'broadcast').length || 0,
          system: messages?.filter(m => m.message_type === 'system').length || 0
        }
      }

      return stats
    },
    enabled: !!user?.id
  })
}
