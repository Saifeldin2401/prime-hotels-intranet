import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { crudToasts } from '@/lib/toastHelpers'
import type { LeaveRequest } from '@/lib/types'
import { notifyApprovalOutcome } from '@/services/approvalNotificationService'

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
          rejected_by:profiles!rejected_by_id(id, full_name, email)
        `)
        .eq('requester_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Filter by current property if selected
      if (currentProperty && currentProperty.id !== 'all') {
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
          rejected_by:profiles!rejected_by_id(id, full_name, email)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // SMART ROUTING based on role and context
      if (isRegionalAccess) {
        // Regional admin/hr sees ALL leave requests
        // Optionally filter by selected property if not "all"
        if (currentProperty && currentProperty.id !== 'all') {
          query = query.eq('property_id', currentProperty.id)
        }
      } else if (isPropertyLevel) {
        // Property manager/hr sees requests for their properties
        if (currentProperty && currentProperty.id !== 'all') {
          query = query.eq('property_id', currentProperty.id)
        } else if (properties && properties.length > 0) {
          query = query.in('property_id', properties.map(p => p.id))
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
        if (currentProperty && currentProperty.id !== 'all') {
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

  // Debug: log to console
  console.log('[usePendingLeaveRequests] Role check:', {
    primaryRole,
    rolesList,
    isRegionalAccess,
    isPropertyLevel,
    isDepartmentHead,
    canApprove,
    currentPropertyId: currentProperty?.id,
    assignedProperties: properties?.map(p => p.id)
  })

  return useQuery({
    queryKey: ['leave-requests', 'pending', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Let RLS handle access control - just filter by status and property if selected
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name)
        `)
        .eq('status', 'pending')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Only apply property filter if a specific property is selected
      if (currentProperty && currentProperty.id !== 'all') {
        query = query.eq('property_id', currentProperty.id)
      }

      const { data, error } = await query

      console.log('[usePendingLeaveRequests] Query result:', {
        count: data?.length,
        error: error?.message,
        firstItem: data?.[0]
      })

      if (error) throw error
      return data as LeaveRequest[]
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

      // Use the currently selected property, or fallback to first assigned
      const propertyId = (currentProperty && currentProperty.id !== 'all')
        ? currentProperty.id
        : (properties.length > 0 ? properties[0].id : null)
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
