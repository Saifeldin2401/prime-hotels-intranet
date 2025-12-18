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
 * Execute a workflow by ID
 */
export async function executeWorkflow(
    workflowId: string,
    metadata?: Record<string, any>
): Promise<WorkflowExecution> {
    const startTime = Date.now()

    // Create execution record
    const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
            workflow_id: workflowId,
            status: 'running',
            metadata
        })
        .select()
        .single()

    if (execError || !execution) {
        throw new Error(`Failed to create workflow execution: ${execError?.message}`)
    }

    try {
        // Get workflow definition
        const { data: workflow, error: workflowError } = await supabase
            .from('workflow_definitions')
            .select('*')
            .eq('id', workflowId)
            .eq('is_active', true)
            .single()

        if (workflowError || !workflow) {
            throw new Error(`Workflow not found or inactive: ${workflowError?.message}`)
        }

        // Execute the workflow action
        const result = await executeWorkflowAction(workflow)

        // Update execution as completed
        const executionTime = Date.now() - startTime
        const { data: completedExecution } = await supabase
            .from('workflow_executions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                result,
                execution_time_ms: executionTime
            })
            .eq('id', execution.id)
            .select()
            .single()

        return completedExecution as WorkflowExecution
    } catch (error) {
        // Update execution as failed
        const executionTime = Date.now() - startTime
        await supabase
            .from('workflow_executions')
            .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
                execution_time_ms: executionTime
            })
            .eq('id', execution.id)

        throw error
    }
}

/**
 * Execute the actual workflow action based on configuration
 */
async function executeWorkflowAction(workflow: WorkflowDefinition): Promise<Record<string, any>> {
    const { action_config } = workflow

    switch (action_config.action) {
        case 'send_training_reminders':
            return await sendTrainingReminders(action_config)

        case 'escalate_approvals':
            return await escalateApprovals(action_config)

        case 'notify_overdue_tasks':
            return await notifyOverdueTasks(action_config)

        case 'send_leave_balance_alerts':
            return await sendLeaveBalanceAlerts(action_config)

        default:
            throw new Error(`Unknown workflow action: ${action_config.action}`)
    }
}

/**
 * Send training deadline reminders
 */
async function sendTrainingReminders(config: Record<string, any>): Promise<Record<string, any>> {
    const daysBeforeArray = config.days_before || [3, 1]
    let totalSent = 0

    for (const daysBefore of daysBeforeArray) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + daysBefore)
        targetDate.setHours(23, 59, 59, 999)

        // Find training assignments with upcoming deadlines
        const { data: assignments, error } = await supabase
            .from('learning_assignments')
            .select(`
                id,
                content_id,
                target_type,
                target_id,
                due_date,
                training_modules:content_id (
                    id,
                    title
                )
            `)
            .eq('content_type', 'module')
            .not('due_date', 'is', null)
            .gte('due_date', new Date().toISOString())
            .lte('due_date', targetDate.toISOString())

        if (error || !assignments) continue

        // Resolve target users and send notifications
        for (const assignment of assignments) {
            const userIds = await resolveAssignmentTargets(assignment.target_type, assignment.target_id)
            const moduleTitle = (assignment.training_modules as any)?.title || 'Training Module'

            for (const userId of userIds) {
                // Check if reminder already sent
                const { data: existing } = await supabase
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'training_assignment')
                    .eq('entity_id', assignment.id)
                    .eq('user_id', userId)
                    .eq('reminder_type', `${daysBefore}_days_before`)
                    .eq('status', 'sent')
                    .maybeSingle()

                if (existing) continue

                // Send notification
                await createNotification({
                    userId,
                    type: 'training_deadline',
                    title: 'Training Deadline Approaching',
                    message: `Your training "${moduleTitle}" is due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}. Please complete it soon.`,
                    entityType: 'training_assignment',
                    entityId: assignment.id,
                    link: '/training/my-learning',
                    metadata: { days_remaining: daysBefore }
                })

                // Mark reminder as sent
                await supabase.from('scheduled_reminders').insert({
                    entity_type: 'training_assignment',
                    entity_id: assignment.id,
                    user_id: userId,
                    reminder_type: `${daysBefore}_days_before`,
                    scheduled_for: new Date().toISOString(),
                    sent_at: new Date().toISOString(),
                    status: 'sent'
                })

                totalSent++
            }
        }
    }

    return { reminders_sent: totalSent }
}

/**
 * Escalate pending approvals
 */
async function escalateApprovals(config: Record<string, any>): Promise<Record<string, any>> {
    const timeoutHours = config.timeout_hours || 48
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours)

    let totalEscalated = 0

    // Find pending document approvals
    const { data: docApprovals } = await supabase
        .from('document_approvals')
        .select(`
            id,
            document_id,
            approver_role,
            documents:document_id (
                id,
                title,
                created_by
            )
        `)
        .eq('status', 'pending')
        .lt('created_at', cutoffTime.toISOString())

    if (docApprovals) {
        for (const approval of docApprovals) {
            // Get users with the approver role
            const { data: approvers } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', approval.approver_role)

            if (approvers) {
                for (const approver of approvers) {
                    await createNotification({
                        userId: approver.user_id,
                        type: 'approval_required',
                        title: 'Approval Overdue - Escalated',
                        message: `Document "${(approval.documents as any)?.title}" has been pending approval for over ${timeoutHours} hours. Please review urgently.`,
                        entityType: 'document',
                        entityId: approval.document_id,
                        link: '/approvals',
                        metadata: { escalated: true, hours_pending: timeoutHours }
                    })
                    totalEscalated++
                }
            }
        }
    }

    return { approvals_escalated: totalEscalated }
}

/**
 * Notify users of overdue tasks
 */
async function notifyOverdueTasks(config: Record<string, any>): Promise<Record<string, any>> {
    const now = new Date().toISOString()
    let totalNotified = 0

    // Find overdue tasks
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, assigned_to_id, due_date, created_by_id')
        .eq('status', 'open')
        .not('due_date', 'is', null)
        .lt('due_date', now)
        .eq('is_deleted', false)

    if (tasks) {
        for (const task of tasks) {
            if (!task.assigned_to_id) continue

            // Check if already notified today
            const today = new Date().toISOString().split('T')[0]
            const { data: existing } = await supabase
                .from('scheduled_reminders')
                .select('id')
                .eq('entity_type', 'task')
                .eq('entity_id', task.id)
                .eq('user_id', task.assigned_to_id)
                .eq('reminder_type', 'overdue_daily')
                .gte('sent_at', `${today}T00:00:00Z`)
                .maybeSingle()

            if (existing) continue

            await createNotification({
                userId: task.assigned_to_id,
                type: 'task_overdue',
                title: 'Task Overdue',
                message: `Your task "${task.title}" is overdue. Please complete it as soon as possible.`,
                entityType: 'task',
                entityId: task.id,
                link: '/tasks',
                metadata: { due_date: task.due_date }
            })

            await supabase.from('scheduled_reminders').insert({
                entity_type: 'task',
                entity_id: task.id,
                user_id: task.assigned_to_id,
                reminder_type: 'overdue_daily',
                scheduled_for: new Date().toISOString(),
                sent_at: new Date().toISOString(),
                status: 'sent'
            })

            totalNotified++
        }
    }

    return { tasks_notified: totalNotified }
}

/**
 * Send leave balance alerts
 */
async function sendLeaveBalanceAlerts(config: Record<string, any>): Promise<Record<string, any>> {
    // This would query leave balances and send alerts
    // Implementation depends on your leave balance tracking system
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
