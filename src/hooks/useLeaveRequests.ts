import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { crudToasts } from '@/lib/toastHelpers'
import type { Database } from '@/types/supabase'

export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'] & {
  requester?: {
    id: string
    full_name: string
    avatar_url: string | null
    email?: string
    phone?: string
    job_title?: string
    hire_date?: string
    reporting_to?: string
  }
  workflow?: {
    request_no: string
  }
}

export type VacationBalance = Database['public']['Tables']['user_vacation_balance']['Row']

export function useVacationBalance(userId?: string, year?: number) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const targetYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: ['vacation-balance', targetUserId, targetYear],
    queryFn: async () => {
      if (!targetUserId) return null

      const { data, error } = await supabase
        .from('user_vacation_balance')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('year', targetYear)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // Return a default balance if none exists yet
        return {
          user_id: targetUserId,
          year: targetYear,
          total_days: 25,
          used_days: 0,
          pending_days: 0,
          carried_over: 0,
          remaining_days: 25
        }
      }

      return {
        ...data,
        remaining_days: (data.total_days || 0) + (data.carried_over || 0) - (data.used_days || 0) - (data.pending_days || 0)
      }
    },
    enabled: !!targetUserId
  })
}

export function useLeaveRequests() {
  const { user, roles } = useAuth()
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['leave-requests', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const userRoles = roles.map((r) => r.role)
      const isHR = userRoles.some((role) =>
        ['regional_admin', 'regional_hr', 'property_hr'].includes(role)
      )

      // Fetch workflow-based requests
      let workflowQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!leave_requests_requester_id_fkey(id, full_name, avatar_url, email, phone, job_title, hire_date, reporting_to),
          workflow:requests!leave_requests_workflow_request_id_fkey(request_no)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (!isHR) {
        workflowQuery = workflowQuery.eq('requester_id', user.id)
      }

      if (currentProperty && currentProperty.id !== 'all') {
        workflowQuery = workflowQuery.eq('property_id', currentProperty.id)
      }

      const { data: workflowItems, error: workflowError } = await workflowQuery
      if (workflowError) throw workflowError

      // Fetch legacy requests (those without workflow_request_id)
      let legacyQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!leave_requests_requester_id_fkey(id, full_name, avatar_url, email, phone, job_title, hire_date, reporting_to)
        `)
        .eq('is_deleted', false)
        .is('workflow_request_id', null)
        .order('created_at', { ascending: false })

      if (isHR) {
        if (currentProperty && currentProperty.id === 'all') {
          // No additional filter, HR sees all legacy
        } else if (currentProperty) {
          legacyQuery = legacyQuery.eq('property_id', currentProperty.id)
        } else {
          legacyQuery = legacyQuery.eq('requester_id', user.id)
        }
      } else {
        legacyQuery = legacyQuery.eq('requester_id', user.id)
      }

      const { data: legacyRows, error: legacyError } = await legacyQuery
      if (legacyError) throw legacyError

      const combined = [...workflowItems, ...(legacyRows || [])]
      const seen = new Set<string>()
      return combined.filter((item: any) => {
        if (!item?.id) return false
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      }) as LeaveRequest[]
    },
    enabled: !!user?.id
  })
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient()
  const { user, properties, departments } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (data: {
      start_date: string
      end_date: string
      type: LeaveRequest['type']
      reason?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      // W-001: Validate no overlapping leave requests
      const { data: overlapping } = await supabase
        .from('leave_requests')
        .select('id, start_date, end_date, type')
        .eq('requester_id', user.id)
        .eq('is_deleted', false)
        .not('status', 'in', '("rejected","cancelled")')
        .lte('start_date', data.end_date)
        .gte('end_date', data.start_date)
        .limit(1)

      if (overlapping && overlapping.length > 0) {
        throw new Error(
          `You already have a leave request (${overlapping[0].type}) from ${overlapping[0].start_date} to ${overlapping[0].end_date} that overlaps with this period.`
        )
      }

      // Check vacation balance for annual leave
      if (data.type === 'annual') {
        const startDate = new Date(data.start_date)
        const endDate = new Date(data.end_date)
        const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const year = startDate.getFullYear()

        const { data: balance } = await supabase
          .from('user_vacation_balance')
          .select('*')
          .eq('user_id', user.id)
          .eq('year', year)
          .maybeSingle()

        const remaining = balance
          ? (balance.total_days || 0) + (balance.carried_over || 0) - (balance.used_days || 0) - (balance.pending_days || 0)
          : 25 // Default fallback

        if (daysRequested > remaining) {
          throw new Error(`Insufficient vacation balance. You have ${remaining} days remaining for ${year}, but you are requesting ${daysRequested} days.`)
        }
      }

      // Determine property for the request
      let propertyId: string | null = null

      if (currentProperty && currentProperty.id !== 'all') {
        // User has explicitly selected a property
        propertyId = currentProperty.id
      } else if (properties.length === 1) {
        // User only has one property, use it
        propertyId = properties[0].id
      } else if (properties.length > 1) {
        // User has multiple properties but hasn't selected one
        throw new Error('Please select a specific property for your leave request')
      }
      // If properties.length === 0, propertyId stays null (handled by backend validation)

      const departmentId = departments.length > 0 ? departments[0].id : null

      const insertData = {
        requester_id: user.id,
        property_id: propertyId,
        department_id: departmentId,
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        reason: data.reason || null
      }

      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw error
      }

      return result as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.submit.success('Leave request')
    },
    onError: (error: Error) => {
      if (error.message.includes('Insufficient vacation balance')) {
        crudToasts.submit.error(error.message)
      } else {
        crudToasts.submit.error('leave request')
      }
    }
  })
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data: workflowLink, error: workflowError } = await supabase
        .from('leave_requests')
        .select('id, workflow_request_id')
        .eq('id', requestId)
        .single()

      if (workflowError) throw workflowError

      if (workflowLink?.workflow_request_id) {
        const { data, error } = await supabase.rpc('request_apply_action', {
          p_request_id: workflowLink.workflow_request_id,
          p_action: 'approve',
          p_comment: null,
          p_forward_to: null,
          p_visibility: 'all'
        })

        if (error) throw error
        const result = Array.isArray(data) ? data[0] : data
        if (result && result.success === false) {
          throw new Error(result.message || 'Approval failed')
        }
        return { id: requestId } as LeaveRequest
      }

      const notificationPayload = {
        type: 'leave_request',
        title: 'Leave Request Approved',
        message: `Your leave request has been approved by ${profile?.full_name || 'HR'}`,
        link: `/my-requests`,
        data: { requestId }
      }

      const { data, error } = await supabase.rpc('approve_leave_request', {
        request_id: requestId,
        approver_id: user.id,
        notification_payload: notificationPayload
      })

      if (error) throw error
      return data as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.approve.success('Leave request')
    },
    onError: () => {
      crudToasts.approve.error('leave request')
    }
  })
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async ({
      requestId,
      reason
    }: {
      requestId: string
      reason: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      if (!reason || reason.trim().length === 0) {
        throw new Error('Rejection reason is required')
      }

      const { data: workflowLink, error: workflowError } = await supabase
        .from('leave_requests')
        .select('id, workflow_request_id')
        .eq('id', requestId)
        .single()

      if (workflowError) throw workflowError

      if (workflowLink?.workflow_request_id) {
        const { data, error } = await supabase.rpc('request_apply_action', {
          p_request_id: workflowLink.workflow_request_id,
          p_action: 'reject',
          p_comment: reason,
          p_forward_to: null,
          p_visibility: 'all'
        })

        if (error) throw error
        const result = Array.isArray(data) ? data[0] : data
        if (result && result.success === false) {
          throw new Error(result.message || 'Rejection failed')
        }
        return { id: requestId, rejectionReason: reason } as LeaveRequest & { rejectionReason: string }
      }

      const notificationPayload = {
        type: 'leave_request',
        title: 'Leave Request Rejected',
        message: `Your leave request has been rejected. Reason: ${reason}`,
        link: `/my-requests`,
        data: { requestId, reason }
      }

      const { data, error } = await supabase.rpc('reject_leave_request', {
        request_id: requestId,
        rejector_id: user.id,
        rejection_reason: reason,
        notification_payload: notificationPayload
      })

      if (error) throw error
      return { ...data, rejectionReason: reason } as LeaveRequest & { rejectionReason: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.reject.success('Leave request')
    },
    onError: (error: Error) => {
      if (error.message === 'Rejection reason is required') {
        crudToasts.reject.error('Rejection reason is required')
      } else {
        crudToasts.reject.error('leave request')
      }
    }
  })
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('requester_id', user.id)
        .in('status', ['pending'])
        .select()
        .single()

      if (error) throw error
      return data as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.delete.success('Leave request')
    },
    onError: () => {
      crudToasts.delete.error('leave request')
    }
  })
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient()
  const { user, roles } = useAuth()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const userRoles = roles.map(r => r.role)
      const canDelete = userRoles.some(role =>
        ['regional_admin', 'regional_hr', 'property_hr'].includes(role)
      )

      if (!canDelete) {
        throw new Error('Only HR staff can delete leave requests')
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update({ is_deleted: true })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      return data as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.delete.success('Leave request')
    },
    onError: (error: Error) => {
      if (error.message.includes('HR staff')) {
        crudToasts.delete.error('Permission denied')
      } else {
        crudToasts.delete.error('leave request')
      }
    }
  })
}
