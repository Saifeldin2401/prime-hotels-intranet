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
    const { user, roles, properties, departments, primaryRole } = useAuth()

    const isApprover = roles.some(r =>
        ['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head'].includes(r.role)
    )

    return useQuery({
        queryKey: ['approval-stats', user?.id, primaryRole, properties?.map(p => p.id), departments?.map(d => d.id)],
        enabled: !!user?.id && isApprover,
        queryFn: async () => {
            if (!user?.id) {
                return {
                    total_pending: 0,
                    leave_requests: 0,
                    promotions: 0,
                    transfers: 0,
                    job_applications: 0,
                    oldest_pending_days: 0
                }
            }

            const role = primaryRole || roles[0]?.role
            const propertyIds = properties.map(p => p.id)
            const departmentIds = departments.map(d => d.id)

            const applyScope = <T,>(query: any) => {
                if (!role) return query
                if (role === 'department_head') {
                    return departmentIds.length > 0 ? query.in('department_id', departmentIds) : null
                }
                if (role === 'property_hr' || role === 'property_manager') {
                    return propertyIds.length > 0 ? query.in('property_id', propertyIds) : null
                }
                return query
            }

            // 1) Workflow-based pending approvals assigned to current user
            const workflowCountQuery = supabase
                .from('requests')
                .select('id', { count: 'exact', head: true })
                .eq('entity_type', 'leave_request')
                .in('status', ['pending_supervisor_approval', 'pending_hr_review'])
                .eq('current_assignee_id', user.id)

            const workflowOldestQuery = supabase
                .from('requests')
                .select('created_at')
                .eq('entity_type', 'leave_request')
                .in('status', ['pending_supervisor_approval', 'pending_hr_review'])
                .eq('current_assignee_id', user.id)
                .order('created_at', { ascending: true })
                .limit(1)

            // 2) Legacy pending leave requests without workflow linkage
            let legacyCountQuery = supabase
                .from('leave_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .eq('is_deleted', false)
                .is('workflow_request_id', null)

            let legacyOldestQuery = supabase
                .from('leave_requests')
                .select('created_at')
                .eq('status', 'pending')
                .eq('is_deleted', false)
                .is('workflow_request_id', null)
                .order('created_at', { ascending: true })
                .limit(1)

            legacyCountQuery = applyScope(legacyCountQuery)
            legacyOldestQuery = applyScope(legacyOldestQuery)

            const [
                { count: workflowCount },
                { data: workflowOldest },
                legacyCountResult,
                legacyOldestResult
            ] = await Promise.all([
                workflowCountQuery,
                workflowOldestQuery.single(),
                legacyCountQuery ? legacyCountQuery : Promise.resolve({ count: 0 }),
                legacyOldestQuery ? legacyOldestQuery.single() : Promise.resolve({ data: null })
            ])

            const legacyCount = legacyCountResult?.count || 0
            const legacyOldest = legacyOldestResult?.data

            let oldestDays = 0
            const oldestCandidates = [workflowOldest?.created_at, legacyOldest?.created_at].filter(Boolean) as string[]
            if (oldestCandidates.length > 0) {
                const oldest = oldestCandidates.sort()[0]
                const created = new Date(oldest)
                const now = new Date()
                oldestDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
            }

            // For now, focus on leave requests (expand to other types later)
            const totalLeavePending = (workflowCount || 0) + legacyCount
            const stats: ApprovalStats = {
                total_pending: totalLeavePending,
                leave_requests: totalLeavePending,
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
    const { user, roles, properties, departments, primaryRole } = useAuth()

    const userRole = primaryRole || roles[0]?.role

    return useQuery({
        queryKey: ['leave-approvals-pending', user?.id, userRole],
        enabled: !!user?.id && !!userRole,
        queryFn: async () => {
            if (!user?.id) return []

            // 1) Workflow-based pending items assigned to current user
            const { data: workflowRows, error: workflowError } = await supabase
                .from('requests')
                .select(`
          id,
          request_no,
          status,
          created_at,
          leave_request:leave_requests!workflow_request_id(
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
          )
        `)
                .eq('entity_type', 'leave_request')
                .in('status', ['pending_supervisor_approval', 'pending_hr_review'])
                .eq('current_assignee_id', user.id)
                .order('created_at', { ascending: true })

            if (workflowError) throw workflowError

            const workflowItems = (workflowRows || [])
                .map((row: any) => row.leave_request)
                .filter(Boolean)

            // 2) Legacy pending leave requests without workflow linkage (fallback)
            let legacyQuery = supabase
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
                .eq('is_deleted', false)
                .is('workflow_request_id', null)
                .order('created_at', { ascending: true })

            if (userRole === 'department_head') {
                const deptIds = departments.map(d => d.id)
                if (deptIds.length > 0) {
                    legacyQuery = legacyQuery.in('department_id', deptIds)
                } else {
                    legacyQuery = null as any
                }
            } else if (userRole === 'property_hr' || userRole === 'property_manager') {
                const propIds = properties.map(p => p.id)
                if (propIds.length > 0) {
                    legacyQuery = legacyQuery.in('property_id', propIds)
                } else {
                    legacyQuery = null as any
                }
            }

            let legacyItems: any[] = []
            if (legacyQuery) {
                const { data: legacyRows, error: legacyError } = await legacyQuery
                if (legacyError) throw legacyError
                legacyItems = legacyRows || []
            }

            const combined = [...workflowItems, ...legacyItems]
            const seen = new Set<string>()
            return combined.filter((item: any) => {
                if (!item?.id) return false
                if (seen.has(item.id)) return false
                seen.add(item.id)
                return true
            })
        }
    })
}
