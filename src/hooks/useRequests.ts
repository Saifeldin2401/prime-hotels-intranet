import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'

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
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'forwarded'
  | 'comment_added'
  | 'returned_for_correction'
  | 'closed'
  | 'attachment_added'
  | 'status_changed'

export interface RequestRow {
  id: string
  request_no: number
  entity_type: string
  entity_id: string
  requester_id: string
  supervisor_id: string | null
  current_assignee_id: string | null
  status: RequestStatus
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  due_at?: string | null
  last_action_at?: string | null
  submitted_at: string | null
  closed_at: string | null
  metadata: any
  created_at: string
  updated_at: string
  property_id: string | null
  department_id?: string | null
  requester?: {
    phone: string | null
    job_title: string | null
  }
  current_assignee?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
  }
  property?: {
    id: string
    name: string
  }
}

export interface RequestStepRow {
  id: string
  request_id: string
  step_order: number
  step_name: string
  assignee_id: string | null
  status: RequestStepStatus
  acted_at: string | null
  completed_at: string | null
  due_at?: string | null
  sla_hours?: number | null
  escalated_at?: string | null
  metadata: any
  comment: string | null
  created_by: string | null
  created_at: string
  assignee?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
  }
}

export interface RequestCommentRow {
  id: string
  request_id: string
  author_id: string
  comment: string
  visibility: 'all' | 'internal'
  created_at: string
  author?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
  }
}

export interface RequestEventRow {
  id: string
  request_id: string
  event_type: RequestEventType
  actor_id: string | null
  payload: any
  created_at: string
  actor?: {
    id: string
    full_name: string
    email: string
  }
}

export interface RequestAttachmentRow {
  id: string
  request_id: string
  uploader_id: string
  file_name: string
  file_path?: string // Keeping for backward compat if needed, but adding storage_path
  storage_path: string
  file_type: string
  file_size: number
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
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email, phone, job_title),
          property:properties(id, name)
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

      const { data, error } = await supabase.rpc('request_apply_action', {
        p_request_id: requestId,
        p_action: action === 'add_comment' ? 'add_comment' : action,
        p_comment: comment ?? null,
        p_forward_to: forwardTo ?? null,
        p_visibility: visibility ?? 'all',
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      if (result && result.success === false) {
        throw new Error(result.message || 'Request action failed')
      }
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

/**
 * Smart Requests Inbox
 * 
 * ROUTING LOGIC:
 * - Regional Admin / Regional HR: Full access to ALL requests
 * - Property Manager / Property HR: See requests for their assigned properties
 * - Department Head: See requests for their managed departments
 * - Staff: See only their own requests
 * - DELEGATION: See requests for anyone who has delegated to the user
 */
export function useRequestsInbox(filters?: {
  status?: RequestStatus[]
  priority?: Array<'low' | 'normal' | 'high' | 'urgent'>
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

      // 1. Fetch active delegations for this user
      const { data: delegations } = await supabase
        .from('temporary_approvers')
        .select('delegator_id')
        .eq('delegate_id', user.id)
        .eq('status', 'active')
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString())

      const delegatorIds = delegations?.map(d => d.delegator_id) || []
      const idList = [user.id, ...delegatorIds]

      // 2. Build the main query
      let query = supabase
        .from('requests')
        .select(
          `
          *,
          requester:profiles!requests_requester_id_fkey(id, full_name, email, phone, job_title, hire_date, reporting_to),
          supervisor:profiles!requests_supervisor_id_fkey(id, full_name, email, phone, job_title),
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email, phone, job_title),
          property:properties(id, name)
        `.trim()
        )
        .order('created_at', { ascending: false })

      // SMART ROUTING based on role and context
      if (isRegionalAccess) {
        // Regional admin/hr sees ALL requests
      } else if (isPropertyLevel || isDepartmentHead) {
        // Property/Department level sees requests assigned to them OR where they are supervisor
        // Include delegators in the ID search
        const formattedIdList = idList.map(id => `'${id}'`).join(',')
        query = query.or(`requester_id.in.(${formattedIdList}),current_assignee_id.in.(${formattedIdList}),supervisor_id.in.(${formattedIdList})`)
      } else {
        // Regular staff: only see requests where they (or their delegators) are requester or assignee
        const formattedIdList = idList.map(id => `'${id}'`).join(',')
        query = query.or(`requester_id.in.(${formattedIdList}),current_assignee_id.in.(${formattedIdList})`)
      }

      // 3. Strict Property Scoping (Global Filter)
      if (currentProperty && currentProperty.id !== 'all') {
        query = query.eq('property_id', currentProperty.id)
      } else if (!isRegionalAccess) {
        const propIds = properties?.map(p => p.id) || []
        if (propIds.length > 0) {
          query = query.in('property_id', propIds)
        }
      }

      // 4. Apply additional filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters?.search) {
        const trimmed = filters.search.trim()
        if (trimmed.length > 0) {
          const numericValue = Number(trimmed)
          if (Number.isFinite(numericValue) && /^\d+$/.test(trimmed)) {
            query = query.eq('request_no', numericValue)
          }
        }
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
