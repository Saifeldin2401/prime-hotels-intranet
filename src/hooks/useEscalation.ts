import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Types
export interface EscalationRule {
    id: string
    action_type: string
    threshold_hours: number
    next_role: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface ApprovalRequest {
    id: string
    entity_type: string
    entity_id: string
    current_approver_id: string | null
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    updated_at: string
    // Computed fields
    hours_pending?: number
    is_overdue?: boolean
}

// Fetch all escalation rules (admin only)
export function useEscalationRules() {
    return useQuery({
        queryKey: ['escalation-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('escalation_rules')
                .select('*')
                .order('action_type')

            if (error) throw error
            return data as EscalationRule[]
        }
    })
}

// Update escalation rule
export function useUpdateEscalationRule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            ruleId,
            updates
        }: {
            ruleId: string
            updates: Partial<Pick<EscalationRule, 'threshold_hours' | 'next_role' | 'is_active'>>
        }) => {
            const { data, error } = await supabase
                .from('escalation_rules')
                .update(updates)
                .eq('id', ruleId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })
        }
    })
}

// Fetch pending approval requests with escalation status
export function usePendingApprovalRequests(entityType?: string) {
    return useQuery({
        queryKey: ['approval-requests', 'pending', entityType],
        queryFn: async () => {
            let query = supabase
                .from('approval_requests')
                .select(`
          *,
          current_approver:profiles!current_approver_id(id, full_name, avatar_url)
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            if (entityType) {
                query = query.eq('entity_type', entityType)
            }

            const { data, error } = await query

            if (error) throw error

            // Calculate hours pending and overdue status
            const now = new Date()
            const enriched = (data || []).map(request => {
                const created = new Date(request.created_at)
                const hoursPending = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))

                return {
                    ...request,
                    hours_pending: hoursPending,
                    is_overdue: hoursPending > 48 // Default threshold, could be dynamic
                }
            })

            return enriched as ApprovalRequest[]
        }
    })
}

// Create approval request
export function useCreateApprovalRequest() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            entityType,
            entityId,
            approverId
        }: {
            entityType: string
            entityId: string
            approverId: string
        }) => {
            const { data, error } = await supabase
                .from('approval_requests')
                .insert({
                    entity_type: entityType,
                    entity_id: entityId,
                    current_approver_id: approverId,
                    status: 'pending'
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
        }
    })
}

// Manual escalation trigger (admin only)
export function useTriggerEscalation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('check_and_escalate_approvals')
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
    })
}

// Get overdue items count for dashboard badges
export function useOverdueItemsCount() {
    return useQuery({
        queryKey: ['overdue-items-count'],
        queryFn: async () => {
            const now = new Date()
            const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
            const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

            // Count overdue tasks (24h threshold)
            const { count: overdueTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .lt('created_at', threshold24h)

            // Count overdue maintenance tickets (48h threshold)
            const { count: overdueTickets } = await supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open')
                .lt('created_at', threshold48h)

            // Count overdue leave requests (48h threshold)
            const { count: overdueLeaves } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .lt('created_at', threshold48h)

            return {
                tasks: overdueTasks || 0,
                maintenance: overdueTickets || 0,
                leave: overdueLeaves || 0,
                total: (overdueTasks || 0) + (overdueTickets || 0) + (overdueLeaves || 0)
            }
        },
        refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
    })
}
