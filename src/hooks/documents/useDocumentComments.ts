import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentComment } from './types'

export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ['document-comments', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const comments = (data || []) as any[]
      const commentMap = new Map(comments.map((c) => [c.id, { ...c, replies: [] as any[] }]))
      const rootComments = []

      comments.forEach((comment) => {
        const commentWithReplies = commentMap.get(comment.id)!
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id)
          if (parent) parent.replies.push(commentWithReplies)
        } else {
          rootComments.push(commentWithReplies)
        }
      })

      return rootComments as DocumentComment[]
    },
  })
}

export function useAddDocumentComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (comment: { documentId: string; content: string; parentId?: string | null }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: comment.documentId,
          parent_id: comment.parentId ?? null,
          user_id: user.id,
          content: comment.content,
        })
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] })
      crudToasts.create.success('Comment')
    },
    onError: () => crudToasts.create.error('comment')
  })
}

export function useUpdateDocumentComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string; documentId: string }) => {
      const { data, error } = await supabase
        .from('document_comments')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments'] })
      crudToasts.update.success('Comment')
    },
    onError: () => crudToasts.update.error('comment')
  })
}

export function useDeleteDocumentComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; documentId: string }) => {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] })
      crudToasts.delete.success('Comment')
    },
    onError: () => crudToasts.delete.error('comment')
  })
}
