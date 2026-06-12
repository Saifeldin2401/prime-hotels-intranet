import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { sanitizeSearchInput } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentTag } from './types'

export function useDocumentTags() {
  return useQuery({
    queryKey: ['document-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tags')
        .select(`
          *,
          usage_count:document_tag_assignments(count)
        `)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(tag => ({
        ...tag,
        usage_count: tag.usage_count?.[0]?.count || 0
      })) as DocumentTag[]
    },
  })
}

export function useSearchDocumentTags(searchQuery: string) {
  return useQuery({
    queryKey: ['document-tags-search', searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      // SECURE: Sanitize input to remove dangerous characters
      // Note: Supabase client properly escapes values passed to .ilike()
      // but we add additional sanitization for defense-in-depth
      const sanitized = sanitizeSearchInput(searchQuery)

      if (!sanitized) {
        return [] as DocumentTag[]
      }

      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .ilike('name', `%${sanitized}%`)
        .order('name', { ascending: true })
        .limit(20)

      if (error) throw error
      return data as DocumentTag[]
    },
  })
}

export function usePopularDocumentTags(limit: number = 10) {
  return useQuery({
    queryKey: ['document-tags-popular', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tags')
        .select(`
          *,
          usage_count:document_tag_assignments(count)
        `)
        .order('usage_count', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(tag => ({
        ...tag,
        usage_count: tag.usage_count?.[0]?.count || 0
      })) as DocumentTag[]
    },
  })
}

export function useCreateDocumentTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tag: Partial<DocumentTag>) => {
      const { data, error } = await supabase
        .from('document_tags')
        .insert(tag)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags'] })
      crudToasts.create.success('Tag')
    },
    onError: () => crudToasts.create.error('tag')
  })
}

export function useAssignDocumentTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, tagIds }: { documentId: string; tagIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from('document_tag_assignments')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) throw deleteError

      if (tagIds.length > 0) {
        const mappings = tagIds.map(tagId => ({
          document_id: documentId,
          tag_id: tagId
        }))

        const { error: insertError } = await supabase
          .from('document_tag_assignments')
          .insert(mappings)

        if (insertError) throw insertError
      }

      return { documentId, tagIds }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-tags'] })
    },
  })
}
