import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { createNotification } from '@/services/notificationService'
import type { Document, DocumentApproval } from '@/lib/types'
import type { AppRole } from '@/lib/constants'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useSubmitForApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error('User must be authenticated')

      const nowIso = new Date().toISOString()

      const { error: docError } = await supabase
        .from('documents')
        .update({ status: 'PENDING_REVIEW', updated_at: nowIso })
        .eq('id', documentId)

      if (docError) throw docError

      const { error: cleanupError } = await supabase
        .from('document_approvals')
        .delete()
        .eq('document_id', documentId)
        .eq('status', 'pending')

      if (cleanupError) throw cleanupError

      const { data: doc } = await supabase
        .from('documents')
        .select('visibility, property_id, department_id, title')
        .eq('id', documentId)
        .single()

      if (!doc) throw new Error('Document not found')

      let roleFilters: AppRole[] = []
      if (doc.visibility === 'all_properties') {
        roleFilters = ['administrator', 'super_admin', 'corporate_admin', 'knowledge_manager', 'regional_admin']
      } else if (doc.visibility === 'property') {
        roleFilters = ['administrator', 'super_admin', 'corporate_admin', 'property_manager', 'property_hr']
      } else if (doc.visibility === 'department') {
        roleFilters = ['administrator', 'super_admin', 'corporate_admin', 'department_head', 'author']
      } else if (doc.visibility === 'role') {
        roleFilters = ['administrator', 'super_admin', 'corporate_admin', 'knowledge_manager', 'regional_admin']
      }

      let approverQuery = supabase
        .from('profiles')
        .select('id, user_roles!inner(role), user_properties(property_id), user_departments(department_id)')
        .eq('is_active', true)
        .in('user_roles.role', roleFilters)

      if (doc.visibility === 'property' && doc.property_id) {
        approverQuery = approverQuery.eq('user_properties.property_id', doc.property_id)
      }
      if (doc.visibility === 'department' && doc.department_id) {
        approverQuery = approverQuery.eq('user_departments.department_id', doc.department_id)
      }

      const { data: approverProfiles, error: approverError } = await approverQuery

      if (approverError) throw approverError

      const approverIds = Array.from(new Set((approverProfiles || []).map(p => p.id)))

      if (approverIds.length === 0) {
        throw new Error('No approvers found for this document scope')
      }

      const approvalRows = approverIds.map(approverId => ({
        document_id: documentId,
        approver_id: approverId,
        approver_role: roleFilters[0] ?? null,
        status: 'pending',
        is_active: true,
        entity_type: 'document',
        entity_id: documentId,
      }))

      const { error: approvalError } = await supabase
        .from('document_approvals')
        .insert(approvalRows)

      if (approvalError) throw approvalError

      await Promise.all(approverIds.map(approverId =>
        createNotification({
          userId: approverId,
          type: 'approval_required',
          title: 'Approval Required',
          message: `A document "${doc.title || 'Document'}" is awaiting your approval.`,
          entityType: 'document',
          entityId: documentId,
          link: '/approvals',
          metadata: { document_id: documentId },
        })
      ))

      return documentId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
  })
}

export function useDocumentVersions(documentId: string) {
  const { user } = useAuth()
  type VersionCreator = {
    id: string
    full_name: string | null
    avatar_url: string | null
  }

  return useQuery({
    queryKey: ['document-versions', documentId],
    enabled: !!documentId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
            *,
            creator:profiles!document_versions_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data as (import('@/lib/types').DocumentVersion & { creator: VersionCreator | null })[]
    },
  })
}

export function usePendingApprovals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['pending-approvals', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          document:documents!document_approvals_document_id_fkey(
            *,
            profiles:profiles!documents_created_by_fkey(full_name)
          )
        `)
        .eq('status', 'pending')
        .eq('approver_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as unknown as (DocumentApproval & {
        document: Document & { profiles?: { full_name: string } }
      })[]
    },
  })
}

export function useApproveDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, feedback }: { approvalId: string, feedback?: string }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase.rpc('approve_document_atomic', {
        p_approval_id: approvalId,
        p_approver_id: user.id,
        p_feedback: feedback || null
      })

      if (error) {
        console.error('Document approval failed:', error)
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
    },
  })
}

export function useRejectDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string, reason: string }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase.rpc('reject_document_atomic', {
        p_approval_id: approvalId,
        p_approver_id: user.id,
        p_reason: reason
      })

      if (error) {
        console.error('Document rejection failed:', error)
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}
