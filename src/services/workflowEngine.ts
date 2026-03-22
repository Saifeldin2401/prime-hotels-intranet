/**
 * Workflow Engine Service
 * 
 * Core service for executing automated workflows across the hotel intranet system.
 * Handles scheduled jobs, event-based triggers, and workflow execution logging.
 */

import { supabase } from '@/lib/supabase'

export interface WorkflowDefinition {
    id: string
    name: string
    description?: string
    type: 'scheduled' | 'event-based' | 'manual'
    trigger_config
    action_config
    is_active: boolean
}

export interface WorkflowExecution {
    id: string
    workflow_id: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    started_at: string
    completed_at?: string
    result?
    error?: string
    metadata?
    execution_time_ms?: number
    workflow_definitions?: { name: string } | null
}

export interface ScheduledReminder {
    id: string
    entity_type: string
    entity_id: string
    user_id: string
    reminder_type: string
    scheduled_for: string
    sent_at?: string
    status: 'pending' | 'sent' | 'failed' | 'cancelled'
    notification_data?
}

/**
 * Execute a workflow by ID via the backend engine
 */
export async function executeWorkflow(
    workflowId: string,
    metadata?
): Promise<WorkflowExecution> {
    // 1. Create execution record (if not already exists via trigger)
    const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
            workflow_id: workflowId,
            status: 'pending',
            metadata: metadata || {}
        })
        .select()
        .single()

    if (execError || !execution) {
        throw new Error(`Failed to create workflow execution: ${execError?.message}`)
    }

    // 2. Invoke the engine
    const { data, error } = await supabase.functions.invoke('workflow-engine', {
        body: { execution_id: execution.id }
    })

    if (error) {
        // Mark as failed
        await supabase
            .from('workflow_executions')
            .update({
                status: 'failed',
                error: error.message,
                completed_at: new Date().toISOString()
            })
            .eq('id', execution.id)
        throw error
    }

    return data as WorkflowExecution
}



/**
 * Get all active workflows
 */
export async function getActiveWorkflows(): Promise<WorkflowDefinition[]> {
    const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name')

    if (error) throw error
    return data as WorkflowDefinition[]
}

/**
 * Get workflow execution history
 */
export async function getWorkflowExecutions(
    workflowId?: string,
    limit: number = 50
): Promise<WorkflowExecution[]> {
    let query = supabase
        .from('workflow_executions')
        .select('*, workflow_definitions(name)')
        .order('started_at', { ascending: false })
        .limit(limit)

    if (workflowId) {
        query = query.eq('workflow_id', workflowId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as WorkflowExecution[]
}
