/**
 * Status Transition Validation
 * 
 * Defines valid state transitions for all entities with status fields.
 * Prevents invalid status changes and ensures business logic consistency.
 */

import type { Database } from '@/types/supabase'

type EntityStatus = Database['public']['Enums']['entity_status']

export type EntityType = 'task' | 'maintenance_ticket' | 'leave_request' | 'job_posting'

/**
 * Valid status transitions for each entity type
 * Key: current status, Value: array of valid next statuses
 */
const STATUS_TRANSITIONS: Record<EntityType, Record<string, EntityStatus[]>> = {
    // Tasks: open → in_progress → completed/cancelled
    task: {
        open: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled', 'on_hold'],
        on_hold: ['in_progress', 'cancelled'],
        completed: [], // Terminal state
        cancelled: [], // Terminal state
    },

    // Maintenance Tickets: open → in_progress → pending_parts → completed → closed
    maintenance_ticket: {
        open: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'pending_parts', 'on_hold', 'cancelled'],
        pending_parts: ['in_progress', 'completed', 'cancelled'],
        on_hold: ['in_progress', 'cancelled'],
        completed: ['closed'], // Can be closed after completion
        closed: [], // Terminal state
        cancelled: [], // Terminal state
    },

    // Leave Requests: pending → approved/rejected/cancelled
    leave_request: {
        pending: ['approved', 'rejected', 'cancelled'],
        approved: ['cancelled'], // Can cancel approved requests
        rejected: [], // Terminal state
        cancelled: [], // Terminal state
    },

    // Job Postings: draft → open → filled/closed/cancelled
    job_posting: {
        draft: ['open', 'cancelled'],
        open: ['filled', 'closed', 'on_hold', 'cancelled'],
        on_hold: ['open', 'cancelled'],
        filled: ['closed'], // Can close filled positions
        closed: [], // Terminal state
        cancelled: [], // Terminal state
    },
}

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
    entityType: EntityType,
    fromStatus: string,
    toStatus: string
): boolean {
    const validNextStatuses = STATUS_TRANSITIONS[entityType][fromStatus]

    if (!validNextStatuses) {
        console.warn(`Unknown status "${fromStatus}" for entity type "${entityType}"`)
        return false
    }

    return validNextStatuses.includes(toStatus as EntityStatus)
}

/**
 * Get all valid next statuses for a given current status
 */
export function getValidNextStatuses(
    entityType: EntityType,
    currentStatus: string
): EntityStatus[] {
    return STATUS_TRANSITIONS[entityType][currentStatus] || []
}

/**
 * Validate a status transition and throw error if invalid
 */
export function validateTransition(
    entityType: EntityType,
    fromStatus: string,
    toStatus: string
): void {
    if (!isValidTransition(entityType, fromStatus, toStatus)) {
        const validOptions = getValidNextStatuses(entityType, fromStatus)
        const validStr = validOptions.length > 0
            ? validOptions.join(', ')
            : 'none (terminal state)'

        throw new Error(
            `Invalid status transition for ${entityType}: "${fromStatus}" → "${toStatus}". ` +
            `Valid transitions from "${fromStatus}": ${validStr}`
        )
    }
}

/**
 * Check if a status is a terminal state (no further transitions allowed)
 */
export function isTerminalStatus(
    entityType: EntityType,
    status: string
): boolean {
    const validNext = STATUS_TRANSITIONS[entityType][status]
    return validNext !== undefined && validNext.length === 0
}

/**
 * Get human-readable status transition error message
 */
export function getTransitionErrorMessage(
    entityType: EntityType,
    fromStatus: string,
    toStatus: string
): string {
    if (isTerminalStatus(entityType, fromStatus)) {
        return `Cannot change status from "${fromStatus}" - this is a final state.`
    }

    const validOptions = getValidNextStatuses(entityType, fromStatus)
    const entityName = entityType.replace('_', ' ')

    return `Cannot transition ${entityName} from "${fromStatus}" to "${toStatus}". Valid options: ${validOptions.join(', ')}`
}

/**
 * Status transition helpers for common patterns
 */
export const StatusHelpers = {
    /**
     * Can this entity be cancelled?
     */
    canCancel: (entityType: EntityType, currentStatus: string): boolean => {
        return getValidNextStatuses(entityType, currentStatus).includes('cancelled' as EntityStatus)
    },

    /**
     * Can this entity be completed?
     */
    canComplete: (entityType: EntityType, currentStatus: string): boolean => {
        return getValidNextStatuses(entityType, currentStatus).includes('completed' as EntityStatus)
    },

    /**
     * Can this entity be put on hold?
     */
    canPutOnHold: (entityType: EntityType, currentStatus: string): boolean => {
        return getValidNextStatuses(entityType, currentStatus).includes('on_hold' as EntityStatus)
    },

    /**
     * Can this entity be reopened?
     */
    canReopen: (entityType: EntityType, currentStatus: string): boolean => {
        const validNext = getValidNextStatuses(entityType, currentStatus)
        return validNext.includes('open' as EntityStatus) || validNext.includes('in_progress' as EntityStatus)
    },
}
