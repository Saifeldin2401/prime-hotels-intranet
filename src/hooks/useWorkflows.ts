import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { executeWorkflow, getWorkflowExecutions } from '@/services/workflowEngine'

export interface WorkflowDefinition {
    id: string
    name: string
    description?: string
    type: 'scheduled' | 'event-based' | 'manual'
    trigger_config: Record<string, any>
    action_config: Record<string, any>
    is_active: boolean
    updated_at?: string
}

export interface WorkflowExecution {
    id: string
    workflow_id: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
    started_at: string
    completed_at?: string
    result?: Record<string, any>
    error?: string
    metadata?: Record<string, any>
    execution_time_ms?: number
    current_step_id?: string
}

/**
 * Hook to fetch all active workflows
 */
export interface WorkflowStep {
    id: string
    workflow_id: string
    step_order: number
    name: string
    action: string
    config: Record<string, any>
}

/**
 * Hook to fetch all workflows
 */
export function useWorkflows() {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('workflow_definitions')
                .select('*')
                .order('name')
            if (error) throw error
            return data as WorkflowDefinition[]
        }
    })
}

/**
 * Hook to fetch workflow steps
 */
export function useWorkflowSteps(workflowId: string) {
    return useQuery({
        queryKey: ['workflow-steps', workflowId],
        enabled: !!workflowId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('workflow_steps')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('step_order', { ascending: true })
            if (error) throw error
            return data as WorkflowStep[]
        }
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
 * Hook to create a workflow
 */
export function useCreateWorkflow() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (workflow: Omit<WorkflowDefinition, 'id'>) => {
            const { data, error } = await supabase
                .from('workflow_definitions')
                .insert(workflow)
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
 * Hook to update a workflow
 */
export function useUpdateWorkflow() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...workflow }: Partial<WorkflowDefinition> & { id: string }) => {
            const { data, error } = await supabase
                .from('workflow_definitions')
                .update(workflow)
                .eq('id', id)
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
 * Hook to update workflow steps
 */
export function useUpdateWorkflowSteps(workflowId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (steps: Omit<WorkflowStep, 'id' | 'workflow_id'>[]) => {
            // First delete existing steps
            await supabase
                .from('workflow_steps')
                .delete()
                .eq('workflow_id', workflowId)

            // Insert new steps
            const { data, error } = await supabase
                .from('workflow_steps')
                .insert(steps.map((s, i) => ({ ...s, workflow_id: workflowId, step_order: i + 1 })))
                .select()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-steps', workflowId] })
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
