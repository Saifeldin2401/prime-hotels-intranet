/**
 * Trigger Service
 * 
 * Event-based training auto-assignment engine.
 * Automatically assigns training when specific events occur.
 */

import { supabase } from '@/lib/supabase'
import { createBulkNotifications } from '@/lib/notificationService'

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
    metadata?: Record<string, unknown>
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
        if (!data || typeof data !== 'object') {
            return {
                success: false,
                actionsExecuted: 0,
                errors: ['No response from trigger processor']
            }
        }

        type TriggerExecutionResult = { success?: boolean; error?: string | null }
        type TriggerProcessorResponse = {
            success?: boolean
            results?: TriggerExecutionResult[]
        }

        const payload = data as TriggerProcessorResponse
        const results = Array.isArray(payload.results) ? payload.results : []

        return {
            success: Boolean(payload.success),
            actionsExecuted: results.length,
            errors: results
                .map((result) => (result.success === false ? result.error : null))
                .filter((errorMessage): errorMessage is string => typeof errorMessage === 'string' && errorMessage.length > 0)
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
                if (!Array.isArray(condition.value) || !condition.value.includes(String(value))) return false
                break
        }
    }

    return true
}

function getContextValue(field: string, context: TriggerContext): unknown {
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
    const title = `Action Required: ${context.event.replace('_', ' ')}`
    const message = `Please review the ${context.source_type || 'item'} that was ${context.event.toLowerCase().replace('_', ' ')}.`
    const link = context.source_id ? `/${context.source_type}/${context.source_id}` : null

    await createBulkNotifications({
        userIds,
        type: 'trigger_notification',
        title,
        message,
        metadata: {
            link,
            source_type: context.source_type,
            source_id: context.source_id,
            event: context.event
        }
    })
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Trigger when a SOP is published
 */
export async function onSOPPublished(sopId: string, departmentId?: string): Promise<void> {
    // 1. Fetch document details for accurate targeting
    const { data: document } = await supabase
        .from('documents')
        .select('title, visibility, property_id, department_id')
        .eq('id', sopId)
        .single()

    // 2. Determine Audience based on Visibility
    let affectedUsers: string[] = []
    let targetId = departmentId || document?.department_id

    if (document) {
        if (document.visibility === 'department' && document.department_id) {
            targetId = document.department_id
            const { data: users } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', document.department_id)
            affectedUsers = users?.map(u => u.user_id) || []
        } else if (document.visibility === 'property' && document.property_id) {
            // For property-wide SOPs, notify all staff in that property
            const { data: users } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', document.property_id)
            affectedUsers = users?.map(u => u.user_id) || []
        }
    } else if (targetId) {
        // Fallback if document fetch failed (legacy behavior)
        const { data: users } = await supabase
            .from('user_departments')
            .select('user_id')
            .eq('department_id', targetId)
        affectedUsers = users?.map(u => u.user_id) || []
    }

    // 3. Send Direct Notification (Bypassing Rule Engine for Critical Visibility)
    if (affectedUsers.length > 0 && document) {
        await createBulkNotifications({
            userIds: affectedUsers,
            type: 'announcement_new', // Triggers email + in-app
            title: `New SOP Published: ${document.title}`,
            message: `A new Standard Operating Procedure "${document.title}" has been published for your ${document.visibility === 'department' ? 'department' : 'property'}.`,
            link: `/knowledge/${sopId}`,
            entityType: 'document',
            entityId: sopId,
            skipDbInsert: false // We need to insert this because backend rules seemingly aren't
        })
    }

    // 4. Call Legacy Trigger (for other side effects like audits)
    await processTrigger({
        event: 'SOP_PUBLISHED',
        source_id: sopId,
        source_type: 'knowledge',
        department_id: targetId,
        affected_users: affectedUsers
    })
}

const normalizeDepartmentId = (departmentId?: string): string | undefined => {
    if (!departmentId) return undefined
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(departmentId)
        ? departmentId
        : undefined
}

/**
 * Trigger when a new user is hired
 */
export async function onNewHire(userId: string, departmentId?: string): Promise<void> {
    await processTrigger({
        event: 'NEW_HIRE',
        source_id: userId,
        source_type: 'user',
        department_id: normalizeDepartmentId(departmentId),
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
    departmentId?: string
): Promise<void> {
    await processTrigger({
        event: 'ROLE_CHANGE',
        source_id: userId,
        source_type: 'user',
        department_id: normalizeDepartmentId(departmentId),
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
