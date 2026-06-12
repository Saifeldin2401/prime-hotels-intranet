import { logAuditEvent } from '@/lib/auditLog'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BulkOperationResult } from './types'
import { assertBulkOperationSize } from './utils'

export function useDocumentBulkUnarchive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk unarchive documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_archived: false,
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
          description: 'Bulk unarchive documents',
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
        crudToasts.update.success(`Unarchived ${result.success.length} documents`)
      }
    }
  })
}

export function useDocumentBulkChangeConfidentiality() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      level
    }: {
      ids: string[];
      level: 'public' | 'internal' | 'confidential' | 'restricted'
    }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk change document confidentiality')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          confidentiality_level: level,
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
          description: 'Bulk change document confidentiality',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            confidentiality_level: level
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Updated confidentiality for ${result.success.length} documents`)
      }
    }
  })
}
