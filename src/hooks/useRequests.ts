import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type RequestStatus =
  | 'draft'
  | 'pending_supervisor_approval'
  | 'pending_hr_review'
  | 'approved'
  | 'rejected'
  | 'returned_for_correction'
  | 'closed'

export type RequestStepStatus = 'waiting' | 'pending' | 'approved' | 'rejected' | 'returned' | 'skipped'

export type RequestEventType =
  | 'created'
  | 'submitted'
  | 'status_changed'
  | 'approved'
  | 'rejected'
  | 'forwarded'
  | 'returned_for_correction'
  | 'closed'
  | 'comment_added'
  | 'attachment_added'

export interface RequestProfileLite {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
  job_title?: string | null
  hire_date?: string | null
  reporting_to?: string | null
}

export interface RequestRow {
  id: string
  request_no: number
  entity_type: string
  entity_id: string
  requester_id: string
  supervisor_id: string | null
  current_assignee_id: string | null
  status: RequestStatus
  submitted_at: string | null
  closed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string

  requester?: RequestProfileLite
  supervisor?: RequestProfileLite | null
  current_assignee?: RequestProfileLite | null
}

export interface RequestStepRow {
  id: string
  request_id: string
  step_order: number
  assignee_id: string | null
  assignee_role: string | null
  status: RequestStepStatus
  acted_at: string | null
  comment: string | null
  created_by: string | null
  created_at: string

  assignee?: RequestProfileLite | null
}

export interface RequestCommentRow {
  id: string
  request_id: string
  author_id: string
  comment: string
  visibility: 'all' | 'internal'
  created_at: string

  author?: RequestProfileLite | null
}

export interface RequestEventRow {
  id: string
  request_id: string
  actor_id: string | null
  event_type: RequestEventType
  payload: Record<string, unknown>
  created_at: string

  actor?: RequestProfileLite | null
}

export interface RequestAttachmentRow {
  id: string
  request_id: string
  uploaded_by: string | null
  storage_bucket: string
  storage_path: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  created_at: string
}

export function useRequest(requestId?: string) {
  return useQuery({
    queryKey: ['request', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('Missing request id')

      const { data, error } = await supabase
        .from('requests')
        .select(
          `
          *,
          requester:profiles!requests_requester_id_fkey(id, full_name, email, phone, job_title, hire_date, reporting_to),
          supervisor:profiles!requests_supervisor_id_fkey(id, full_name, email, phone, job_title),
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email, phone, job_title)
        `.trim()
        )
        .eq('id', requestId)
        .single()

      if (error) throw error
      return data as unknown as RequestRow
    },
  })
}

export function useRequestSteps(requestId?: string) {
  return useQuery({
    queryKey: ['request', requestId, 'steps'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('Missing request id')

      const { data, error } = await supabase
        .from('request_steps')
        .select(
          `
          *,
          assignee:profiles!request_steps_assignee_id_fkey(id, full_name, email, phone, job_title)
        `.trim()
        )
        .eq('request_id', requestId)
        .order('step_order', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as RequestStepRow[]
    },
  })
}

export function useRequestComments(requestId?: string) {
  return useQuery({
    queryKey: ['request', requestId, 'comments'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('Missing request id')

      const { data, error } = await supabase
        .from('request_comments')
        .select(
          `
          *,
          author:profiles!request_comments_author_id_fkey(id, full_name, email, phone, job_title)
        `.trim()
        )
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as RequestCommentRow[]
    },
  })
}

export function useRequestEvents(requestId?: string) {
  return useQuery({
    queryKey: ['request', requestId, 'events'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('Missing request id')

      const { data, error } = await supabase
        .from('request_events')
        .select(
          `
          *,
          actor:profiles!request_events_actor_id_fkey(id, full_name, email)
        `.trim()
        )
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as RequestEventRow[]
    },
  })
}

export function useRequestAttachments(requestId?: string) {
  return useQuery({
    queryKey: ['request', requestId, 'attachments'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('Missing request id')

      const { data, error } = await supabase
        .from('request_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as RequestAttachmentRow[]
    },
  })
}

export function useRequestAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      requestId: string
      action: 'approve' | 'reject' | 'return' | 'forward' | 'close' | 'add_comment'
      comment?: string
      forwardTo?: string
      visibility?: 'all' | 'internal'
    }) => {
      const { requestId, action, comment, forwardTo, visibility } = params

      const { error } = await supabase.rpc('request_apply_action', {
        p_request_id: requestId,
        p_action: action === 'add_comment' ? 'add_comment' : action,
        p_comment: comment ?? null,
        p_forward_to: forwardTo ?? null,
        p_visibility: visibility ?? 'all',
      })

      if (error) throw error
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] }),
        queryClient.invalidateQueries({ queryKey: ['request', variables.requestId, 'steps'] }),
        queryClient.invalidateQueries({ queryKey: ['request', variables.requestId, 'comments'] }),
        queryClient.invalidateQueries({ queryKey: ['request', variables.requestId, 'events'] }),
        queryClient.invalidateQueries({ queryKey: ['request', variables.requestId, 'attachments'] }),
        queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['requests-inbox'] }),
      ])
    },
  })
}

import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'

/**
 * Smart Requests Inbox
 * 
 * ROUTING LOGIC:
 * - Regional Admin / Regional HR: Full access to ALL requests
 * - Property Manager / Property HR: See requests for their assigned properties
 * - Department Head: See requests for their managed departments
 * - Staff: See only their own requests
 */
export function useRequestsInbox(filters?: {
  status?: RequestStatus[]
  department?: string[]
  employee?: string
  dateRange?: { start: string; end: string }
  search?: string
}) {
  const { user, primaryRole, properties, departments } = useAuth()
  const { currentProperty } = useProperty()

  // Determine access level
  const isRegionalAccess = ['regional_admin', 'regional_hr'].includes(primaryRole || '')
  const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '')
  const isDepartmentHead = primaryRole === 'department_head'

  return useQuery({
    queryKey: ['requests-inbox', filters, primaryRole, currentProperty?.id, properties?.map(p => p.id), departments?.map(d => d.id)],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('requests')
        .select(
          `
          *,
          requester:profiles!requests_requester_id_fkey(id, full_name, email, phone, job_title, hire_date, reporting_to),
          supervisor:profiles!requests_supervisor_id_fkey(id, full_name, email, phone, job_title),
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email, phone, job_title)
        `.trim()
        )
        .order('created_at', { ascending: false })

      // SMART ROUTING based on role and context
      // NOTE: The 'requests' table uses requester_id and current_assignee_id for routing
      // It does NOT have property_id or department_id columns
      if (isRegionalAccess) {
        // Regional admin/hr sees ALL requests - no additional filter needed
      } else if (isPropertyLevel || isDepartmentHead) {
        // Property/Department level sees requests assigned to them OR where they are supervisor
        query = query.or(`requester_id.eq.${user.id},current_assignee_id.eq.${user.id},supervisor_id.eq.${user.id}`)
      } else {
        // Regular staff: only see requests where they are the requester or assignee
        query = query.or(`requester_id.eq.${user.id},current_assignee_id.eq.${user.id}`)
      }

      // Apply additional filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.search) {
        query = query.or(`request_no.ilike.%${filters.search}%`)
      }

      if (filters?.employee) {
        query = query.eq('requester_id', filters.employee)
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as unknown as RequestRow[]
    },
  })
}

