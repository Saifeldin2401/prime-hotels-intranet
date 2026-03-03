import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { crudToasts } from '@/lib/toastHelpers'
import type { LeaveRequest } from '@/lib/types'
import { notifyApprovalOutcome } from '@/services/approvalNotificationService'
import { isRealPropertyId } from '@/lib/propertyScope'

/**
 * Smart Leave Request Hooks
 * 
 * ROUTING LOGIC:
 * - Regional Admin / Regional HR: Full access to ALL leave requests
 * - Property Manager / Property HR: See requests for their assigned properties
 * - Department Head: See requests for their managed departments
 * - Staff: See only their own requests
 * 
 * Property selector integration: All queries respect the currentProperty selection
 */

export function useMyLeaveRequests() {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['leave-requests', 'my', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          approved_by:profiles!approved_by_id(id, full_name, email),
          rejected_by:profiles!rejected_by_id(id, full_name, email),
          workflow:requests!workflow_request_id(id, request_no)
        `)
        .eq('requester_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Filter by current property if selected
      if (isRealPropertyId(currentProperty?.id)) {
        query = query.eq('property_id', currentProperty.id)
      }

      const { data, error } = await query

      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!user?.id
  })
}

export function useTeamLeaveRequests() {
  const { user, roles, properties, departments, primaryRole } = useAuth()
  const { currentProperty } = useProperty()

  // Determine access level
  const isRegionalAccess = ['regional_admin', 'regional_hr'].includes(primaryRole || '')
  const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '')
  const isDepartmentHead = primaryRole === 'department_head'

  return useQuery({
    queryKey: ['leave-requests', 'team', primaryRole, properties?.map(p => p.id), departments?.map(d => d.id), currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          approved_by:profiles!approved_by_id(id, full_name, email),
          rejected_by:profiles!rejected_by_id(id, full_name, email),
          workflow:requests!workflow_request_id(id, request_no)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // SMART ROUTING based on role and context
      if (isRegionalAccess) {
        // Regional admin/hr sees ALL leave requests
        // Optionally filter by selected property if not "all"
        if (isRealPropertyId(currentProperty?.id)) {
          query = query.eq('property_id', currentProperty.id)
        }
      } else if (isPropertyLevel) {
        // Property manager/hr sees requests for their properties
        if (isRealPropertyId(currentProperty?.id)) {
          query = query.eq('property_id', currentProperty.id)
        } else if (properties && properties.length > 0) {
          query = query.in('property_id', properties.map(p => p.id).filter(isRealPropertyId))
        } else {
          // No properties assigned, see only own requests
          query = query.eq('requester_id', user.id)
        }
      } else if (isDepartmentHead) {
        // Department head sees requests for their departments
        if (departments && departments.length > 0) {
          query = query.in('department_id', departments.map(d => d.id))
        } else {
          query = query.eq('requester_id', user.id)
        }
        // Also filter by property if selected
        if (isRealPropertyId(currentProperty?.id)) {
          query = query.eq('property_id', currentProperty.id)
        }
      } else {
        // Regular staff: only see their own requests
        query = query.eq('requester_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!user?.id
  })
}

export function usePendingLeaveRequests() {
  const { user, roles, properties, departments, primaryRole } = useAuth()
  const { currentProperty } = useProperty()

  // Determine access level - check both primaryRole and roles array
  const rolesList = roles?.map(r => r.role) || []
  const isRegionalAccess = ['regional_admin', 'regional_hr'].includes(primaryRole || '') ||
    rolesList.some(r => ['regional_admin', 'regional_hr'].includes(r))
  const isPropertyLevel = ['property_manager', 'property_hr'].includes(primaryRole || '') ||
    (rolesList.some(r => ['property_manager', 'property_hr'].includes(r)) && !isRegionalAccess)
  const isDepartmentHead = primaryRole === 'department_head' ||
    (rolesList.includes('department_head') && !isRegionalAccess && !isPropertyLevel)
  const canApprove = isRegionalAccess || isPropertyLevel || isDepartmentHead

  return useQuery({
    queryKey: ['leave-requests', 'pending', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []
      if (!canApprove) return []

      // 1) Workflow-based pending approvals assigned to the current user
      const { data: workflowRows, error: workflowError } = await supabase
        .from('requests')
        .select(`
          id,
          status,
          created_at,
          leave_request:leave_requests!workflow_request_id(
            *,
            requester:profiles!requester_id(id, full_name, email),
            property:properties(id, name),
            department:departments(id, name)
          )
        `)
        .eq('entity_type', 'leave_request')
        .in('status', ['pending_supervisor_approval', 'pending_hr_review'])
        .eq('current_assignee_id', user.id)
        .order('created_at', { ascending: false })

      if (workflowError) throw workflowError

      const workflowItems = (workflowRows || [])
        .map((row: any) => row.leave_request)
        .filter(Boolean)

      // 2) Legacy pending leave requests without workflow linkage (fallback)
      let legacyQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          workflow:requests!workflow_request_id(id, request_no)
        `)
        .eq('status', 'pending')
        .eq('is_deleted', false)
        .is('workflow_request_id', null)
        .order('created_at', { ascending: false })

      if (isRegionalAccess) {
        if (isRealPropertyId(currentProperty?.id)) {
          legacyQuery = legacyQuery.eq('property_id', currentProperty.id)
        }
      } else if (isPropertyLevel) {
        if (isRealPropertyId(currentProperty?.id)) {
          legacyQuery = legacyQuery.eq('property_id', currentProperty.id)
        } else if (properties && properties.length > 0) {
          legacyQuery = legacyQuery.in('property_id', properties.map(p => p.id).filter(isRealPropertyId))
        } else {
          legacyQuery = legacyQuery.eq('requester_id', user.id)
        }
      } else if (isDepartmentHead) {
        if (departments && departments.length > 0) {
          legacyQuery = legacyQuery.in('department_id', departments.map(d => d.id))
        } else {
          legacyQuery = legacyQuery.eq('requester_id', user.id)
        }
        if (isRealPropertyId(currentProperty?.id)) {
          legacyQuery = legacyQuery.eq('property_id', currentProperty.id)
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

      // Determine property for the request
      const assignedPropertyIds = (properties || []).map((property) => property.id).filter(isRealPropertyId)
      const propertyId: string | null = isRealPropertyId(currentProperty?.id)
        ? currentProperty.id
        : (assignedPropertyIds.length === 1 ? assignedPropertyIds[0] : null)

      if (!propertyId && assignedPropertyIds.length > 1) {
        throw new Error('Please select a specific property for your leave request')
      }
      if (!propertyId && assignedPropertyIds.length === 0) {
        throw new Error('No property access found for this account')
      }

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
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.submit.success('Leave request')
    },
    onError: () => {
      crudToasts.submit.error('leave request')
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
