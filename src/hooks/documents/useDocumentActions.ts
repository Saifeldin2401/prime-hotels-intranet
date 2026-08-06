import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { Document } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserFriendlyErrorMessage } from './errors'

export function useCreateDocument() {
  const queryClient = useQueryClient()
  const { user, primaryRole } = useAuth()
  const { currentProperty, propertyIds } = useProperty()

  return useMutation({
    mutationFn: async (document: Partial<Document>) => {
      if (!user) throw new Error('User must be authenticated')

      const resolvedPropertyId = isRealPropertyId(document.property_id)
        ? document.property_id
        : (
          isRealPropertyId(currentProperty?.id)
            ? currentProperty.id
            : (propertyIds[0] ?? null)
        )

      const resolvedVisibility = document.visibility ?? (resolvedPropertyId ? 'property' : 'all_properties')

      if (!resolvedPropertyId && resolvedVisibility !== 'all_properties') {
        throw new Error('A valid property_id is required for non-global documents')
      }

      const canAutoPublish = primaryRole === 'regional_admin' || primaryRole === 'regional_hr' || primaryRole === 'corporate_admin'
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          property_id: resolvedPropertyId,
          visibility: resolvedVisibility,
          created_by: user.id,
          status: canAutoPublish ? 'PUBLISHED' : 'DRAFT',
          ...(canAutoPublish && {
            published_at: now,
            last_published_by: user.id,
          }),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.create.success(data?.status === 'PUBLISHED' ? 'Document published' : 'Document created as draft')
    },
    onError: (error) => {
      const message = getUserFriendlyErrorMessage(error, 'Failed to create document')
      crudToasts.create.error(message)
    }
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      if (updates.property_id !== undefined) {
        if (updates.property_id === null) {
          if (updates.visibility && updates.visibility !== 'all_properties') {
            throw new Error('property_id can only be cleared for global documents')
          }
        } else if (!isRealPropertyId(updates.property_id)) {
          throw new Error('A valid property_id is required when updating document scope')
        }
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document', data.id] })
      crudToasts.update.success('Document')
    },
    onError: (error) => {
      const message = getUserFriendlyErrorMessage(error, 'Failed to update document')
      crudToasts.update.error(message)
    }
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.delete.success('Document')
    },
    onError: (error) => {
      const message = getUserFriendlyErrorMessage(error, 'Failed to delete document')
      crudToasts.delete.error(message)
    }
  })
}

export function useDocumentStats() {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['document-stats', primaryRole],
    queryFn: async () => {
      const { data: basicData, error: basicError } = await supabase
        .from('documents')
        .select('status, file_size, file_extension, folder_id, view_count, download_count, expires_at, is_archived')
        .eq('is_deleted', false)
        .eq('content_type', 'document')

      if (basicError) throw basicError

      const { data: folderStats, error: folderError } = await supabase
        .from('documents')
        .select('folder_id, file_size')
        .eq('is_deleted', false)
        .eq('content_type', 'document')

      if (folderError) throw folderError

      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { count: expiringSoonCount, error: expiryError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .lte('expires_at', thirtyDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString())

      if (expiryError) throw expiryError

      const { count: expiredCount, error: expiredError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .lt('expires_at', new Date().toISOString())

      if (expiredError) throw expiredError

      const fileTypeStats: Record<string, number> = {}
      basicData?.forEach(doc => {
        const type = doc.file_extension || 'unknown'
        fileTypeStats[type] = (fileTypeStats[type] || 0) + 1
      })

      const storageByFolder: Record<string, number> = {}
      folderStats?.forEach(doc => {
        const folderId = doc.folder_id || 'root'
        storageByFolder[folderId] = (storageByFolder[folderId] || 0) + (doc.file_size || 0)
      })

      return {
        total: basicData?.length || 0,
        draft: basicData?.filter(d => d.status === 'DRAFT').length || 0,
        pending: basicData?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        approved: basicData?.filter(d => d.status === 'APPROVED').length || 0,
        published: basicData?.filter(d => d.status === 'PUBLISHED').length || 0,
        rejected: basicData?.filter(d => d.status === 'REJECTED').length || 0,
        archived: basicData?.filter(d => d.is_archived === true).length || 0,
        totalBytes: basicData?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0,
        storageByFolder,
        documentsByFileType: fileTypeStats,
        totalViews: basicData?.reduce((acc, doc) => acc + (doc.view_count || 0), 0) || 0,
        totalDownloads: basicData?.reduce((acc, doc) => acc + (doc.download_count || 0), 0) || 0,
        expiringSoon: expiringSoonCount || 0,
        expired: expiredCount || 0,
      }
    },
  })
}
