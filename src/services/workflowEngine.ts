/**
 * Workflow Engine Service
 * 
 * Core service for executing automated workflows across the hotel intranet system.
 * Handles scheduled jobs, event-based triggers, and workflow execution logging.
 */

import { supabase } from '@/lib/supabase'
import { createNotification } from '@/lib/notificationService'

export interface WorkflowDefinition {
    id: string
    name: string
    description?: string
    type: 'scheduled' | 'event-based' | 'manual'
    trigger_config: Record<string, any>
    action_config: Record<string, any>
    is_active: boolean
}

export interface WorkflowExecution {
    id: string
    workflow_id: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    started_at: string
    completed_at?: string
    result?: Record<string, any>
    error?: string
    metadata?: Record<string, any>
    execution_time_ms?: number
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
    notification_data?: Record<string, any>
}

/**
 * Execute a workflow by ID via the backend engine
 */
export async function executeWorkflow(
    workflowId: string,
    metadata?: Record<string, any>
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
 * Send leave balance alerts
 */
async function sendLeaveBalanceAlerts(config: Record<string, any>): Promise<Record<string, any>> {
    // This is now handled by the backend engine
    return { alerts_sent: 0 }
}

/**
 * Resolve target users from assignment target_type and target_id
 */
async function resolveAssignmentTargets(targetType: string, targetId: string | null): Promise<string[]> {
    const userIds: string[] = []

    switch (targetType) {
        case 'everyone':
            // Get all active users
            const { data: allUsers } = await supabase
                .from('profiles')
                .select('id')
            if (allUsers) userIds.push(...allUsers.map(u => u.id))
            break

        case 'user':
            if (targetId) userIds.push(targetId)
            break

        case 'department':
            if (targetId) {
                const { data: deptUsers } = await supabase
                    .from('user_departments')
                    .select('user_id')
                    .eq('department_id', targetId)
                if (deptUsers) userIds.push(...deptUsers.map(u => u.user_id))
            }
            break

        case 'property':
            if (targetId) {
                const { data: propUsers } = await supabase
                    .from('user_properties')
                    .select('user_id')
                    .eq('property_id', targetId)
                if (propUsers) userIds.push(...propUsers.map(u => u.user_id))
            }
            break
    }

    return [...new Set(userIds)] // Remove duplicates
}

/**
 * Get all active workflows
 */
export async function getActiveWorkflows(): Promise<WorkflowDefinition[]> {
    const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('is_active', true)
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
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)

    if (workflowId) {
        query = query.eq('workflow_id', workflowId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as WorkflowExecution[]
}
