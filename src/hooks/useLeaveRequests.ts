import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { LeaveRequest } from '@/lib/types'

export function useMyLeaveRequests() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['leave-requests', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!user?.id
  })
}

export function useTeamLeaveRequests() {
  const { user, roles, properties, departments } = useAuth()

  return useQuery({
    queryKey: ['leave-requests', 'team', roles, properties, departments],
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
        .order('created_at', { ascending: false })

      // Filter based on user's role and access
      const userRole = roles[0]?.role
      if (userRole === 'staff') {
        // Staff can only see their own requests
        query = query.eq('requester_id', user.id)
      } else if (userRole === 'department_head') {
        // Department heads can see requests for their departments
        const deptIds = departments.map(d => d.id)
        if (deptIds.length > 0) {
          query = query.in('department_id', deptIds)
        }
      } else if (userRole === 'property_hr' || userRole === 'property_manager') {
        // Property HR/Managers can see requests for their properties
        const propIds = properties.map(p => p.id)
        if (propIds.length > 0) {
          query = query.in('property_id', propIds)
        }
      }
      // Regional admins and regional HR can see all requests

      const { data, error } = await query

      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!user?.id
  })
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient()
  const { user, properties, departments } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      start_date: string
      end_date: string
      type: LeaveRequest['type']
      reason?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      // Determine property_id and department_id from user's assignments
      const propertyId = properties.length > 0 ? properties[0].id : null
      const departmentId = departments.length > 0 ? departments[0].id : null

      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert({
          requester_id: user.id,
          property_id: propertyId,
          department_id: departmentId,
          start_date: data.start_date,
          end_date: data.end_date,
          type: data.type,
          reason: data.reason || null
        })
        .select()
        .single()

      if (error) throw error
      return result as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    }
  })
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error
      return data as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    }
  })
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      reason 
    }: { 
      requestId: string
      reason?: string 
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          rejected_by_id: user.id,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error
      return data as LeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
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
    }
  })
}
