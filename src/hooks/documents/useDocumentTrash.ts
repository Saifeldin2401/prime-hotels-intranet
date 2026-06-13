import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { Document } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useDocumentTrash() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-trash', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          description,
          content_type,
          status,
          visibility,
          property_id,
          department_id,
          folder_id,
          file_type,
          file_extension,
          file_size,
          file_url,
          role,
          requires_acknowledgment,
          current_version,
          storage_bucket,
          storage_path,
          view_count,
          download_count,
          is_archived,
          is_deleted,
          deleted_at,
          expires_at,
          confidentiality_level,
          created_by,
          created_at,
          updated_at,
          folder:document_folders(id, name),
          tag_assignments:document_tag_assignments(tag:document_tags(id, name, color)),
          author:profiles!documents_created_by_fkey(id, full_name)
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      if (error) throw error

      return (data || []).map(doc => {
        const hydrated = doc as any
        if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
          hydrated.tags = hydrated.tag_assignments
            .map((a: any) => a.tag)
            .filter(Boolean)
        }
        if (Array.isArray(hydrated.author) && hydrated.author.length > 0) {
          hydrated.author = hydrated.author[0]
        }
        return hydrated as unknown as Document
      })
    },
  })
}

export function useRestoreDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-trash'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.update.success('Document restored')
    },
    onError: () => crudToasts.update.error('restore')
  })
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: doc } = await supabase
        .from('documents')
        .select('storage_bucket, storage_path')
        .eq('id', documentId)
        .single()

      if (doc?.storage_bucket && doc?.storage_path) {
        await supabase.storage
          .from(doc.storage_bucket)
          .remove([doc.storage_path])
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-trash'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.delete.success('Document permanently deleted')
    },
    onError: () => crudToasts.delete.error('permanent deletion')
  })
}
