import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { escapeSearchQuery } from '@/lib/utils'
import type { Document, DocumentApproval, DocumentVersion } from '@/lib/types'

export function useDocuments(filters?: {
  status?: string
  visibility?: string
  property_id?: string
  department_id?: string
  search?: string
}) {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['documents', filters, primaryRole],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility)
      }
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }
      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id)
      }
      if (filters?.search) {
        const escaped = escapeSearchQuery(filters.search)
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
      }

      // Apply RLS - user can only see documents they have access to
      // This will be enforced by RLS policies, but we can optimize client-side

      const { data, error } = await query

      if (error) throw error
      return data as Document[]
    },
  })
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, departments(name), properties(name), profiles(full_name)')
        .eq('id', documentId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      return data as Document
    },
    enabled: !!documentId,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (document: Partial<Document>) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          created_by: user.id,
          status: 'DRAFT',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', data.id] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true })
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error('User must be authenticated')

      const nowIso = new Date().toISOString()

      // Update document status
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

      // Create approval requests based on document visibility
      const { data: doc } = await supabase
        .from('documents')
        .select('visibility, property_id, department_id, title')
        .eq('id', documentId)
        .single()

      if (!doc) throw new Error('Document not found')

      let roleFilters: string[] = []
      if (doc.visibility === 'all_properties') {
        roleFilters = ['regional_admin']
      } else if (doc.visibility === 'property') {
        roleFilters = ['property_manager', 'property_hr']
      } else if (doc.visibility === 'department') {
        roleFilters = ['department_head']
      } else if (doc.visibility === 'role') {
        roleFilters = ['regional_admin']
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
        approver_role: (roleFilters[0] as any),
        status: 'pending',
        is_active: true,
        entity_type: 'document',
        entity_id: documentId,
      }))

      const { error: approvalError } = await supabase
        .from('document_approvals')
        .insert(approvalRows)

      if (approvalError) throw approvalError

      const { error: notifyError } = await supabase.from('notifications').insert(
        approverIds.map(approverId => ({
          user_id: approverId,
          type: 'approval_required',
          title: 'Approval Required',
          message: `A document "${doc.title || 'Document'}" is awaiting your approval.`,
          entity_type: 'document',
          entity_id: documentId,
          link: '/approvals',
          metadata: { document_id: documentId }
        })))

      if (notifyError) throw notifyError

      return documentId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
  })
}

export function useDocumentStats() {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['document-stats', primaryRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('status, file_size')
        .eq('is_deleted', false)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        draft: data?.filter(d => d.status === 'DRAFT').length || 0,
        pending: data?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        approved: data?.filter(d => d.status === 'APPROVED').length || 0,
        published: data?.filter(d => d.status === 'PUBLISHED').length || 0,
        rejected: data?.filter(d => d.status === 'REJECTED').length || 0,
        totalBytes: data?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0
      }

      return stats
    },
  })
}



export function useDocumentVersions(documentId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-versions', documentId],
    enabled: !!documentId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
            *,
            creator:profiles!created_by(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as (DocumentVersion & { creator: any })[]
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
          document:documents(
            *,
            profiles:created_by(full_name)
          )
        `)
        .eq('status', 'pending')
        .eq('approver_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (DocumentApproval & {
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

      // Use atomic RPC function to prevent race conditions
      // This handles: update approval, check remaining, update document status, send notification
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
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

export function useFavorites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_favorites')
        .select('document_id')
        .eq('user_id', user!.id)

      if (error) throw error
      return new Set(data?.map(f => f.document_id) || [])
    }
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ documentId, isFavorite }: { documentId: string, isFavorite: boolean }) => {
      if (!user) throw new Error('User must be authenticated')

      if (isFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('document_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', documentId)

        if (error) throw error
      } else {
        // Add favorite
        const { error } = await supabase
          .from('document_favorites')
          .insert({
            user_id: user.id,
            document_id: documentId
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-favorites'] })
    }
  })
}
