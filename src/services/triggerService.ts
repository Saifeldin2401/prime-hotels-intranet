/**
 * Trigger Service
 * 
 * Event-based training auto-assignment engine.
 * Automatically assigns training when specific events occur.
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

export type TriggerEvent =
    | 'SOP_UPDATED'
    | 'INCIDENT_REPORTED'
    | 'NEW_HIRE'
    | 'ROLE_CHANGE'
    | 'AUDIT_FINDING'
    | 'SOP_PUBLISHED'
    | 'CERTIFICATION_EXPIRED'

export interface TriggerRule {
    id: string
    event_type: TriggerEvent
    name: string
    description: string
    conditions: TriggerCondition[]
    actions: TriggerAction[]
    is_active: boolean
    created_at: string
    created_by: string
}

export interface TriggerCondition {
    field: string
    operator: 'equals' | 'contains' | 'not_equals' | 'in'
    value: string | string[]
}

export interface TriggerAction {
    type: 'assign_training' | 'assign_quiz' | 'send_notification' | 'assign_required_reading'
    target_id: string
    target_name?: string
    due_days?: number
}

export interface TriggerContext {
    event: TriggerEvent
    source_id?: string
    source_type?: string
    affected_users?: string[]
    department_id?: string
    metadata?: Record<string, any>
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Process a trigger event and execute matching rules via the backend
 */
export async function processTrigger(context: TriggerContext): Promise<{
    success: boolean
    actionsExecuted: number
    errors: string[]
}> {
    try {
        const { data, error } = await supabase.functions.invoke('process-event', {
            body: {
                event_type: context.event,
                payload: {
                    ...context.metadata,
                    user_id: context.affected_users?.[0], // Primary user
                    department_id: context.department_id,
                    source_id: context.source_id,
                    source_type: context.source_type,
                    affected_users: context.affected_users
                }
            }
        })

        if (error) throw error

        return {
            success: data.success,
            actionsExecuted: data.results?.length || 0,
            errors: data.results?.filter((r: { success: boolean; error?: string }) => !r.success).map((r: { success: boolean; error?: string }) => r.error) || []
        }
    } catch (error: unknown) {
        console.error('Trigger service error:', error)
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, actionsExecuted: 0, errors: [message] }
    }
}

/**
 * Check if context matches rule conditions
 */
function matchesConditions(conditions: TriggerCondition[], context: TriggerContext): boolean {
    if (!conditions || conditions.length === 0) {
        return true
    }

    for (const condition of conditions) {
        const value = getContextValue(condition.field, context)

        switch (condition.operator) {
            case 'equals':
                if (value !== condition.value) return false
                break
            case 'not_equals':
                if (value === condition.value) return false
                break
            case 'contains':
                if (!String(value).includes(String(condition.value))) return false
                break
            case 'in':
                if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false
                break
        }
    }

    return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContextValue(field: string, context: TriggerContext): any {
    switch (field) {
        case 'department_id':
            return context.department_id
        case 'source_type':
            return context.source_type
        case 'event':
            return context.event
        default:
            return context.metadata?.[field]
    }
}

/**
 * Execute a trigger action
 */
async function executeAction(action: TriggerAction, context: TriggerContext): Promise<void> {
    const affectedUsers = context.affected_users || []

    switch (action.type) {
        case 'assign_training':
            await assignTrainingToUsers(action.target_id, affectedUsers, action.due_days)
            break

        case 'assign_quiz':
            await assignQuizToUsers(action.target_id, affectedUsers, action.due_days)
            break

        case 'assign_required_reading':
            await assignRequiredReading(action.target_id, affectedUsers, action.due_days)
            break

        case 'send_notification':
            await sendNotifications(action.target_id, affectedUsers, context)
            break
    }
}

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

async function assignTrainingToUsers(
    trainingId: string,
    userIds: string[],
    dueDays?: number
): Promise<void> {
    const dueDate = dueDays
        ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const assignments = userIds.map(userId => ({
        content_type: 'module',
        content_id: trainingId,
        target_type: 'user',
        target_id: userId,
        status: 'assigned',
        due_date: dueDate,
        created_at: new Date().toISOString()
    }))

    // Note: Upsert conflict on generic (target_id, content_id) if constraint exists
    const { error } = await supabase
        .from('learning_assignments')
        .upsert(assignments) // removed specific conflict target constraint name as it might differ

    if (error) throw error
}

async function assignQuizToUsers(
    quizId: string,
    userIds: string[],
    dueDays?: number
): Promise<void> {
    const dueDate = dueDays
        ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const assignments = userIds.map(userId => ({
        content_type: 'quiz',
        content_id: quizId,
        target_type: 'user',
        target_id: userId,
        status: 'assigned',
        due_date: dueDate
    }))

    const { error } = await supabase
        .from('learning_assignments')
        .upsert(assignments)

    if (error) throw error
}

async function assignRequiredReading(
    documentId: string,
    userIds: string[],
    dueDays?: number
): Promise<void> {
    const dueDate = dueDays
        ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const assignments = userIds.map(userId => ({
        document_id: documentId,
        user_id: userId,
        due_date: dueDate,
        assigned_at: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('knowledge_required_reading')
        .upsert(assignments, { onConflict: 'document_id,user_id' })

    if (error) throw error
}

async function sendNotifications(
    templateId: string,
    userIds: string[],
    context: TriggerContext
): Promise<void> {
    const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'trigger_notification',
        title: `Action Required: ${context.event.replace('_', ' ')}`,
        message: `Please review the ${context.source_type || 'item'} that was ${context.event.toLowerCase().replace('_', ' ')}.`,
        link: context.source_id ? `/${context.source_type}/${context.source_id}` : null,
        is_read: false
    }))

    const { error } = await supabase
        .from('notifications')
        .insert(notifications)

    if (error) throw error
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Trigger when a SOP is published
 */
export async function onSOPPublished(sopId: string, departmentId?: string): Promise<void> {
    // Get users in department
    let affectedUsers: string[] = []

    if (departmentId) {
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .eq('department_id', departmentId)

        affectedUsers = users?.map(u => u.id) || []
    }

    await processTrigger({
        event: 'SOP_PUBLISHED',
        source_id: sopId,
        source_type: 'knowledge',
        department_id: departmentId,
        affected_users: affectedUsers
    })
}

/**
 * Trigger when a new user is hired
 */
export async function onNewHire(userId: string, departmentId: string): Promise<void> {
    await processTrigger({
        event: 'NEW_HIRE',
        source_id: userId,
        source_type: 'user',
        department_id: departmentId,
        affected_users: [userId]
    })
}

/**
 * Trigger when user changes role
 */
export async function onRoleChange(
    userId: string,
    oldRole: string,
    newRole: string,
    departmentId: string
): Promise<void> {
    await processTrigger({
        event: 'ROLE_CHANGE',
        source_id: userId,
        source_type: 'user',
        department_id: departmentId,
        affected_users: [userId],
        metadata: { old_role: oldRole, new_role: newRole }
    })
}

export const triggerService = {
    processTrigger,
    onSOPPublished,
    onNewHire,
    onRoleChange
}
