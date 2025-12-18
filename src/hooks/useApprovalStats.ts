import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface ApprovalStats {
    total_pending: number
    leave_requests: number
    promotions: number
    transfers: number
    job_applications: number
    oldest_pending_days: number
}

export function useApprovalStats() {
    const { user, roles } = useAuth()

    const isApprover = roles.some(r =>
        ['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head'].includes(r.role)
    )

    return useQuery({
        queryKey: ['approval-stats', user?.id],
        enabled: !!user?.id && isApprover,
        queryFn: async () => {
            // Get pending leave requests count
            const { count: leaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            // Get oldest pending request
            const { data: oldestRequest } = await supabase
                .from('leave_requests')
                .select('created_at')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1)
                .single()

            let oldestDays = 0
            if (oldestRequest?.created_at) {
                const created = new Date(oldestRequest.created_at)
                const now = new Date()
                oldestDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
            }

            // For now, focus on leave requests (expand to other types later)
            const stats: ApprovalStats = {
                total_pending: leaveCount || 0,
                leave_requests: leaveCount || 0,
                promotions: 0,
                transfers: 0,
                job_applications: 0,
                oldest_pending_days: oldestDays
            }

            return stats
        },
        staleTime: 30000, // Cache for 30 seconds
        refetchInterval: 60000 // Refetch every minute
    })
}

export function usePendingApprovals() {
    const { user, roles, properties, departments } = useAuth()

    const userRole = roles[0]?.role

    return useQuery({
        queryKey: ['pending-approvals', user?.id, userRole],
        enabled: !!user?.id && !!userRole,
        queryFn: async () => {
            let query = supabase
                .from('leave_requests')
                .select(`
          id,
          type,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          requester:profiles!requester_id(id, full_name, avatar_url, email),
          property:properties(id, name),
          department:departments(id, name)
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            // Filter based on role
            if (userRole === 'department_head') {
                const deptIds = departments.map(d => d.id)
                if (deptIds.length > 0) {
                    query = query.in('department_id', deptIds)
                }
            } else if (userRole === 'property_hr' || userRole === 'property_manager') {
                const propIds = properties.map(p => p.id)
                if (propIds.length > 0) {
                    query = query.in('property_id', propIds)
                }
            }
            // Regional roles can see all

            const { data, error } = await query

            if (error) throw error
            return data || []
        }
    })
}
