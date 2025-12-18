import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkflowDefinition, WorkflowExecution } from '@/services/workflowEngine'
import { executeWorkflow, getActiveWorkflows, getWorkflowExecutions } from '@/services/workflowEngine'

/**
 * Hook to fetch all active workflows
 */
export function useWorkflows() {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: getActiveWorkflows
    })
}

/**
 * Hook to fetch workflow execution history
 */
export function useWorkflowExecutions(workflowId?: string, limit: number = 50) {
    return useQuery({
        queryKey: ['workflow-executions', workflowId, limit],
        queryFn: () => getWorkflowExecutions(workflowId, limit)
    })
}

/**
 * Hook to manually execute a workflow
 */
export function useExecuteWorkflow() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ workflowId, metadata }: { workflowId: string; metadata?: Record<string, any> }) => {
            return await executeWorkflow(workflowId, metadata)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-executions'] })
        }
    })
}

/**
 * Hook to toggle workflow active status
 */
export function useToggleWorkflow() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ workflowId, isActive }: { workflowId: string; isActive: boolean }) => {
            const { data, error } = await supabase
                .from('workflow_definitions')
                .update({ is_active: isActive })
                .eq('id', workflowId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
        }
    })
}

/**
 * Hook to get workflow statistics
 */
export function useWorkflowStats() {
    return useQuery({
        queryKey: ['workflow-stats'],
        queryFn: async () => {
            // Get execution counts by status
            const { data: executions, error } = await supabase
                .from('workflow_executions')
                .select('status, execution_time_ms, started_at')
                .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

            if (error) throw error

            const stats = {
                total: executions.length,
                completed: executions.filter(e => e.status === 'completed').length,
                failed: executions.filter(e => e.status === 'failed').length,
                running: executions.filter(e => e.status === 'running').length,
                avgExecutionTime: executions
                    .filter(e => e.execution_time_ms)
                    .reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length || 0
            }

            return stats
        }
    })
}

/**
 * Hook to get pending reminders
 */
export function usePendingReminders(userId?: string) {
    return useQuery({
        queryKey: ['pending-reminders', userId],
        enabled: !!userId,
        queryFn: async () => {
            let query = supabase
                .from('scheduled_reminders')
                .select('*')
                .eq('status', 'pending')
                .order('scheduled_for', { ascending: true })

            if (userId) {
                query = query.eq('user_id', userId)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        }
    })
}
