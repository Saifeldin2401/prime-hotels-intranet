import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentAnalytics } from './types'

export function useDocumentAnalytics(documentId: string) {
  return useQuery({
    queryKey: ['document-analytics', documentId],
    enabled: !!documentId,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<DocumentAnalytics> => {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('view_count, download_count')
        .eq('id', documentId)
        .single()

      if (docError) throw docError

      const { count: ackCount, error: ackError } = await supabase
        .from('document_acknowledgments')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', documentId)

      if (ackError) throw ackError

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: viewsData, error: viewsError } = await supabase
        .from('system_events')
        .select('created_at')
        .eq('event_type', 'doc_view')
        .eq('entity_type', 'document')
        .eq('entity_id', documentId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (viewsError) throw viewsError

      const viewsOverTime: Record<string, number> = {}
      viewsData?.forEach(view => {
        const date = new Date(view.created_at).toISOString().split('T')[0]
        viewsOverTime[date] = (viewsOverTime[date] || 0) + 1
      })

      const { data: uniqueViewers, error: uniqueError } = await supabase
        .from('system_events')
        .select('actor_id', { count: 'exact' })
        .eq('event_type', 'doc_view')
        .eq('entity_type', 'document')
        .eq('entity_id', documentId)

      if (uniqueError) throw uniqueError

      let viewersByDepartment: Array<{ department_name: string; count: number }> = []
      try {
        const { data: deptData, error: deptError } = await supabase.rpc('get_document_viewers_by_department', {
          p_document_id: documentId
        })

        if (!deptError && deptData) {
          viewersByDepartment = deptData
        }
        // Silently ignore RPC not found errors (PGRST202)
      } catch {
        // RPC unavailable – continue without department data
      }

      return {
        document_id: documentId,
        view_count: doc?.view_count || 0,
        download_count: doc?.download_count || 0,
        unique_viewers: uniqueViewers?.length || 0,
        acknowledgment_count: ackCount || 0,
        views_over_time: Object.entries(viewsOverTime).map(([date, count]) => ({ date, count })),
        downloads_over_time: [], // Would need separate tracking table
        viewers_by_department: viewersByDepartment
      }
    },
  })
}

export function useRecordDocumentView() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) return

      // Prefer RPC if present (SECURITY DEFINER), fallback to insert
      const { error: rpcError } = await supabase.rpc('log_document_view', {
        p_document_id: documentId,
        p_user_id: user.id,
      })

      if (rpcError) {
        const { error } = await supabase
          .from('system_events')
          .insert({
            event_type: 'doc_view',
            entity_type: 'document',
            entity_id: documentId,
            actor_id: user.id,
          })

        if (error && !error.message.toLowerCase().includes('duplicate')) {
          console.warn('Failed to record document view:', error)
        }
      }

      return documentId
    },
    onSuccess: (documentId) => {
      if (documentId) {
        queryClient.invalidateQueries({ queryKey: ['document-analytics', documentId] })
      }
    }
  })
}

export function useRecordDocumentDownload() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) return documentId

      // Prefer single RPC that logs + increments. Fallback to increment only.
      const { error: logError } = await supabase.rpc('log_document_download', {
        p_document_id: documentId,
        p_user_id: user.id,
        p_ip_address: null,
      })

      if (logError) {
        const { error: incError } = await supabase.rpc('increment_document_download_count', {
          p_document_id: documentId,
        })
        if (incError) {
          console.warn('Failed to increment download count:', incError)
        }
      }

      return documentId
    },
    onSuccess: (documentId) => {
      queryClient.invalidateQueries({ queryKey: ['document-analytics', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    }
  })
}
