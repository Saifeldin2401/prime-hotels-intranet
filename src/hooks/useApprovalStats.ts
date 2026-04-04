import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface ApprovalStats {
    total_pending: number
    leave_requests: number
    promotions: number
    transfers: number
    job_applications: number
    oldest_pending_days: number
}

type SettledPayload = {
    count?: number | null
    data?: unknown
    error?: { message?: string } | null
}

type PendingLeaveRequest = {
    id: string
    type?: string | null
    start_date?: string | null
    end_date?: string | null
    reason?: string | null
    status?: string | null
    created_at?: string | null
    requester?: Array<{ id: string; full_name: string | null; avatar_url: string | null; email: string | null }> | null
    property?: Array<{ id: string; name: string | null }> | null
    department?: Array<{ id: string; name: string | null }> | null
}

type WorkflowRequestRow = {
    leave_request?: PendingLeaveRequest[] | PendingLeaveRequest | null
}

const settledReasonToMessage = (reason: unknown) => {
    if (reason instanceof Error) return reason.message
    if (typeof reason === 'string') return reason
    return 'Unknown rejection'
}

const getSettledCount = (result: PromiseSettledResult<unknown>, label: string): number => {
    if (result.status === 'rejected') {
        console.warn(`${label} query rejected:`, settledReasonToMessage(result.reason))
        return 0
    }
    const payload = result.value as SettledPayload
    if (payload?.error) {
        console.warn(`${label} query returned error:`, payload.error.message || 'Unknown error')
        return 0
    }
    return payload?.count ?? 0
}

const getSettledData = <T,>(result: PromiseSettledResult<unknown>, label: string, fallback: T): T => {
    if (result.status === 'rejected') {
        console.warn(`${label} query rejected:`, settledReasonToMessage(result.reason))
        return fallback
    }
    const payload = result.value as SettledPayload
    if (payload?.error) {
        console.warn(`${label} query returned error:`, payload.error.message || 'Unknown error')
        return fallback
    }
    if (payload && 'data' in payload && payload.data !== undefined && payload.data !== null) {
        return payload.data as T
    }
    return fallback
}

export function useApprovalStats() {
    const { user, roles, properties, departments, primaryRole } = useAuth()
    const { hasPermission } = usePermissions()

    const isApprover = hasPermission('approvals.view')

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

            const applyScope = <T,>(query: T): T | null => {
                const scopedQuery = query as any
                if (!role) return query
                if (role === 'department_head') {
                    return departmentIds.length > 0 ? scopedQuery.in('department_id', departmentIds) : null
                }
                if (role === 'property_hr' || role === 'property_manager') {
                    return propertyIds.length > 0 ? scopedQuery.in('property_id', propertyIds) : null
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

            const approvalSettled = await Promise.allSettled([
                workflowCountQuery,
                workflowOldestQuery.single(),
                legacyCountQuery ? legacyCountQuery : Promise.resolve({ count: 0 }),
                legacyOldestQuery ? legacyOldestQuery.single() : Promise.resolve({ data: null })
            ])

            const workflowCount = getSettledCount(approvalSettled[0], 'Approval stats workflow count')
            const workflowOldest = getSettledData<{ created_at?: string } | null>(
                approvalSettled[1],
                'Approval stats workflow oldest',
                null
            )
            const legacyCount = getSettledCount(approvalSettled[2], 'Approval stats legacy count')
            const legacyOldest = getSettledData<{ created_at?: string } | null>(
                approvalSettled[3],
                'Approval stats legacy oldest',
                null
            )

            let oldestDays = 0
            const oldestCandidates = [workflowOldest?.created_at, legacyOldest?.created_at].filter(Boolean) as string[]
            if (oldestCandidates.length > 0) {
                const oldest = [...oldestCandidates].sort()[0]
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
        staleTime: 120000, // Cache for 2 minutes
        refetchInterval: 300000 // Refetch every 5 minutes
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

            const workflowItems = ((workflowRows || []) as unknown as WorkflowRequestRow[])
                .map((row) => Array.isArray(row.leave_request) ? row.leave_request[0] : row.leave_request)
                .filter((item): item is PendingLeaveRequest => Boolean(item?.id))

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

            let skipLegacyQuery = false
            if (userRole === 'department_head') {
                const deptIds = departments.map(d => d.id)
                if (deptIds.length > 0) {
                    legacyQuery = legacyQuery.in('department_id', deptIds)
                } else {
                    skipLegacyQuery = true
                }
            } else if (userRole === 'property_hr' || userRole === 'property_manager') {
                const propIds = properties.map(p => p.id)
                if (propIds.length > 0) {
                    legacyQuery = legacyQuery.in('property_id', propIds)
                } else {
                    skipLegacyQuery = true
                }
            }

            let legacyItems: PendingLeaveRequest[] = []
            if (!skipLegacyQuery) {
                const { data: legacyRows, error: legacyError } = await legacyQuery
                if (legacyError) throw legacyError
                legacyItems = (legacyRows || []) as PendingLeaveRequest[]
            }

            const combined = [...workflowItems, ...legacyItems]
            const seen = new Set<string>()
            return combined.filter((item) => {
                if (!item?.id) return false
                if (seen.has(item.id)) return false
                seen.add(item.id)
                return true
            })
        }
    })
}
