import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Message, Comment, Notification } from '@/lib/types'

// Message Hooks
export function useMessages(filters?: {
  status?: Message['status']
  message_type?: Message['message_type']
  priority?: Message['priority']
  sender_id?: string
  recipient_id?: string
}) {
  const { user, properties } = useAuth()

  return useQuery({
    queryKey: ['messages', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, email, avatar_url),
          recipient:profiles(id, full_name, email, avatar_url),
          property:properties(id, name),
          department:departments(id, name),
          parent_message:messages(id, subject),
          replies:messages(id, subject, created_at),
          attachments:message_attachments(*)
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
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

      // Filter by properties if user has property access
      if (properties.length > 0 && !filters?.sender_id && !filters?.recipient_id) {
        query = query.in('property_id', properties.map(p => p.id))
      }

      const { data, error } = await query

      if (error) throw error
      return data as Message[]
    },
    enabled: !!user?.id
  })
}

export function useMessage(messageId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      if (!user?.id || !messageId) return null

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email, avatar_url),
          property:properties(id, name),
          department:departments(id, name),
          parent_message:messages!messages_parent_message_id_fkey(*),
          replies:messages!messages_parent_message_id_fkey(*, sender:profiles!messages_sender_id_fkey(id, full_name)),
          attachments:message_attachments(*)
        `)
        .eq('id', messageId)
        .single()

      if (error) throw error
      return data as Message
    },
    enabled: !!user?.id && !!messageId
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

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
      if (!user?.id) throw new Error('User must be authenticated')

      // Create or find conversation for direct messages
      let conversationId = null
      if (data.recipient_id && data.message_type === 'direct') {
        // Check if conversation already exists between these users
        const { data: existingParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id, participant_id')
          .in('participant_id', [user.id, data.recipient_id])

        // Find conversation where both users are participants
        const conversationsByUser = existingParticipants?.reduce((acc: any, participant: any) => {
          if (!acc[participant.conversation_id]) {
            acc[participant.conversation_id] = []
          }
          acc[participant.conversation_id].push(participant.participant_id)
          return acc
        }, {})

        const existingConvId = Object.entries(conversationsByUser || {}).find(
          ([_, participants]: [string, any]) =>
            Array.isArray(participants) && participants.length === 2 &&
            participants.includes(user.id) && participants.includes(data.recipient_id)
        )?.[0]

        if (existingConvId) {
          conversationId = existingConvId
        } else {
          // Create new conversation
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              title: data.subject,
              last_message_at: new Date().toISOString()
            })
            .select()
            .single()

          if (newConv) {
            conversationId = newConv.id

            // Add both participants to the conversation
            await supabase
              .from('conversation_participants')
              .insert([
                { conversation_id: conversationId, participant_id: user.id },
                { conversation_id: conversationId, participant_id: data.recipient_id }
              ])
          }
        }
      }

      // Create message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: data.recipient_id || null,
          subject: data.subject,
          content: data.content,
          message_type: data.message_type,
          priority: data.priority || 'medium',
          property_id: data.property_id || null,
          department_id: data.department_id || null,
          parent_message_id: data.parent_message_id || null,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (messageError) throw messageError

      // Update conversation's last_message_at if this is part of a conversation
      if (conversationId) {
        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId)
      }

      // Handle attachments
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          const fileName = `${Date.now()}_${file.name}`
          const filePath = `message-attachments/${message.id}/${fileName}`

          // Upload file to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from('message_attachments')
            .insert({
              message_id: message.id,
              uploaded_by_id: user.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size
            })

          if (attachmentError) throw attachmentError
        }
      }

      return message
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
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
      const { data, error } = await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
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
    }
  })
}

// Conversation Hooks
export function useConversations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:profiles(id, full_name, email, avatar_url)
        `)
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.id
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
      return data as Notification[]
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
        .update({ is_read: true })
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
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

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
