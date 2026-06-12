import { useAuth } from '@/hooks/useAuth'
import { logAuditEvent } from '@/lib/auditLog'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BulkOperationResult } from './types'
import { assertBulkOperationSize } from './utils'

export function useDocumentBulkDelete() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      if (!user?.id) throw new Error('User must be authenticated')

      assertBulkOperationSize(ids, 'Bulk delete documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk delete documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })

      if (result.failed.length === 0) {
        crudToasts.delete.success(`${result.success.length} documents`)
      } else {
        crudToasts.delete.success(`${result.success.length} documents (${result.failed.length} failed)`)
      }
    }
  })
}

export function useDocumentBulkRestore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk restore documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk restore documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-trash'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Restored ${result.success.length} documents`)
      }
    }
  })
}

export function useDocumentBulkMove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk move documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }

      if (folderId === null) {
        updateData.folder_id = null
      } else {
        updateData.folder_id = folderId
      }

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .in('id', ids)
        .select('id')

      if (error) {
        console.error('Bulk move error:', error)
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk move documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            folder_id: folderId
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-folders'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Moved ${result.success.length} documents`)
      }
    }
  })
}

export function useDocumentBulkAddTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, tagIds }: { ids: string[]; tagIds: string[] }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk tag documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const mappings = ids.flatMap(docId =>
        tagIds.map(tagId => ({
          document_id: docId,
          tag_id: tagId
        }))
      )

      const { error } = await supabase
        .from('document_tag_assignments')
        .upsert(mappings, { onConflict: 'document_id,tag_id' })

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        result.success = ids
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk tag documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            tag_ids: tagIds
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-tags'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Added tags to ${result.success.length} documents`)
      }
    }
  })
}

export function useDocumentBulkArchive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk archive documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk archive documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Archived ${result.success.length} documents`)
      }
    }
  })
}
