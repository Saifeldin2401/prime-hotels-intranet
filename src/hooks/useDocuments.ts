import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
        .select(`
          *,
          profiles!documents_created_by_fkey(
            full_name,
            email
          ),
          properties(id, name),
          departments(id, name),
          document_approvals(
            id,
            status,
            approver_role,
            approved_at,
            rejected_at,
            approved_by,
            rejected_by,
            rejection_reason
          )
        `)
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
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Apply RLS - user can only see documents they have access to
      // This will be enforced by RLS policies, but we can optimize client-side

      const { data, error } = await query

      if (error) throw error
      return data as (Document & {
        profiles?: { full_name: string; email: string }
        properties?: { id: string; name: string }
        departments?: { id: string; name: string }
        document_approvals?: DocumentApproval[]
      })[]
    },
  })
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles!documents_created_by_fkey(
            full_name,
            email
          ),
          properties(id, name),
          departments(id, name),
          document_approvals(
            id,
            status,
            approver_role,
            approved_at,
            rejected_at,
            approved_by,
            rejected_by,
            rejection_reason
          )
        `)
        .eq('id', documentId)
        .single()

      if (error) throw error
      return data as Document & {
        profiles?: { full_name: string; email: string }
        properties?: { id: string; name: string }
        departments?: { id: string; name: string }
        document_approvals?: DocumentApproval[]
      }
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
        .delete()
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

      // Update document status
      const { error: docError } = await supabase
        .from('documents')
        .update({ status: 'PENDING_REVIEW' })
        .eq('id', documentId)

      if (docError) throw docError

      // Create approval requests based on document visibility
      const { data: doc } = await supabase
        .from('documents')
        .select('visibility, property_id, department_id')
        .eq('id', documentId)
        .single()

      if (!doc) throw new Error('Document not found')

      // Determine approvers based on visibility
      let approvers: string[] = []

      if (doc.visibility === 'all_properties') {
        approvers = ['regional_admin']
      } else if (doc.visibility === 'property') {
        approvers = ['property_manager', 'property_hr']
      } else if (doc.visibility === 'department') {
        approvers = ['department_head']
      } else if (doc.visibility === 'role') {
        approvers = ['regional_admin'] // Default to regional admin for role-specific
      }

      // Create approval requests
      const approvalRequests = approvers.map(role => ({
        entity_type: 'document',
        entity_id: documentId,
        approver_role: role,
        status: 'pending',
      }))

      const { error: approvalError } = await supabase
        .from('document_approvals')
        .insert(approvalRequests)

      if (approvalError) throw approvalError

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
        .select('status')
        .order('created_at', { ascending: false })

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        draft: data?.filter(d => d.status === 'DRAFT').length || 0,
        pending: data?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        approved: data?.filter(d => d.status === 'APPROVED').length || 0,
        published: data?.filter(d => d.status === 'PUBLISHED').length || 0,
        rejected: data?.filter(d => d.status === 'REJECTED').length || 0,
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
  const { user, primaryRole } = useAuth()

  return useQuery({
    queryKey: ['pending-approvals', primaryRole],
    enabled: !!user && !!primaryRole,
    queryFn: async () => {
      // Find approvals where the role matches the user's primary role (simplification)
      // In a real app we'd check all user roles
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          document:documents(*)
        `)
        .eq('status', 'pending')
        .eq('approver_role', primaryRole)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (DocumentApproval & { document: Document })[]
    },
  })
}

export function useApproveDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, feedback }: { approvalId: string, feedback?: string }) => {
      if (!user) throw new Error('User must be authenticated')

      // 1. Update the approval record
      const { data: approval, error: approvalError } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          feedback
        })
        .eq('id', approvalId)
        .select()
        .single()

      if (approvalError) throw approvalError

      // 2. Check if all required approvals for this document are complete
      // (This logic might ideally be a database trigger)
      const { count, error: countError } = await supabase
        .from('document_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', approval.document_id)
        .eq('status', 'pending')

      if (countError) throw countError

      // If no pending approvals left, update document status to APPROVED (or PUBLISHED if logic dictates)
      if (count === 0) {
        await supabase
          .from('documents')
          .update({ status: 'APPROVED' })
          .eq('id', approval.document_id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

export function useRejectDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string, reason: string }) => {
      if (!user) throw new Error('User must be authenticated')

      // 1. Update approval record
      const { data: approval, error: approvalError } = await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', approvalId)
        .select()
        .single()

      if (approvalError) throw approvalError

      // 2. Update document status to REJECTED immediately
      await supabase
        .from('documents')
        .update({ status: 'REJECTED' })
        .eq('id', approval.document_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}
