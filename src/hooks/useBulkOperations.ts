/**
 * Bulk Operations Hook
 * 
 * Provides bulk actions for tasks, maintenance tickets, and other entities.
 * Includes progress tracking and error handling for partial failures.
 */

import { useAuth } from '@/hooks/useAuth'
import { logAuditEvent } from '@/lib/auditLog'
import { getValidNextStatuses, validateTransition } from '@/lib/statusTransitions'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface BulkOperationResult {
    success: string[]
    failed: Array<{ id: string; error: string }>
    total: number
    undoToken?: BulkUndoToken
}

type BulkEntity = 'task' | 'maintenance_ticket' | 'leave_request'

type BulkUndoAction =
    | 'update'
    | 'assign'
    | 'status'
    | 'delete'
    | 'approve'

export interface BulkUndoToken {
    entity: BulkEntity
    action: BulkUndoAction
    snapshots: Array<{
        id: string
        before: Record<string, unknown>
    }>
    createdAt: string
}

const MAX_BULK_OPERATION_IDS = 200

const assertBulkOperationSize = (ids: string[], operationLabel: string) => {
    if (ids.length > MAX_BULK_OPERATION_IDS) {
        throw new Error(`${operationLabel} limited to ${MAX_BULK_OPERATION_IDS} items per operation. Selected: ${ids.length}`)
    }
}

interface BulkUpdateParams {
    ids: string[]
    updates: Record<string, unknown>
}

interface BulkAssignParams {
    ids: string[]
    assigneeId: string | null
}

interface BulkStatusParams {
    ids: string[]
    newStatus: string
}

const getBulkEntityTable = (entity: BulkEntity) => {
    if (entity === 'task') return 'tasks'
    if (entity === 'maintenance_ticket') return 'maintenance_tickets'
    return 'leave_requests'
}

const sanitizeUndoPayload = (before: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(before).filter(([, value]) => value !== undefined))

export async function undoBulkOperation(token: BulkUndoToken): Promise<BulkOperationResult> {
    const table = getBulkEntityTable(token.entity)
    const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: token.snapshots.length
    }

    for (const snapshot of token.snapshots) {
        const payload = sanitizeUndoPayload({
            ...snapshot.before,
            updated_at: new Date().toISOString()
        })

        const { data, error } = await supabase
            .from(table)
            .update(payload)
            .eq('id', snapshot.id)
            .select('id')
            .maybeSingle()

        if (error || !data?.id) {
            result.failed.push({ id: snapshot.id, error: error?.message || 'Unable to undo item' })
        } else {
            result.success.push(data.id)
        }
    }

    return result
}

/**
 * Bulk update tasks
 */
export function useBulkUpdateTasks() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, updates }: BulkUpdateParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk update tasks')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const updateKeys = Object.keys(updates).filter((key) => key !== 'updated_at')
            const selectColumns = ['id', ...updateKeys].join(',')
            const { data: beforeRows } = updateKeys.length > 0
                ? await supabase
                    .from('tasks')
                    .select(selectColumns)
                    .in('id', ids)
                : { data: [] as Array<{ id: string }> }

            const beforeById = new Map(
                (beforeRows || []).map((row: Record<string, unknown>) => {
                    const id = String(row.id)
                    const before = updateKeys.reduce<Record<string, unknown>>((acc, key) => {
                        acc[key] = row[key]
                        return acc
                    }, {})
                    return [id, before]
                })
            )

            // Process in batches of 10
            const batchSize = 10
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize)

                const { data, error } = await supabase
                    .from('tasks')
                    .update({ ...updates, updated_at: new Date().toISOString() })
                    .in('id', batch)
                    .select('id')

                if (error) {
                    batch.forEach(id => result.failed.push({ id, error: error.message }))
                } else {
                    data?.forEach(item => result.success.push(item.id))
                }
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'task',
                    description: 'Bulk update tasks',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length,
                        updates
                    }
                })
            }

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'task',
                    action: 'update',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
            queryClient.invalidateQueries({ queryKey: ['task-stats'] })

            if (result.failed.length === 0) {
                crudToasts.update.success(`${result.success.length} tasks`)
            } else if (result.success.length > 0) {
                crudToasts.update.success(`${result.success.length} tasks (${result.failed.length} failed)`)
            } else {
                crudToasts.update.error('tasks')
            }
        }
    })
}

/**
 * Bulk assign tasks to a user
 */
export function useBulkAssignTasks() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, assigneeId }: BulkAssignParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk assign tasks')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const { data: beforeRows } = await supabase
                .from('tasks')
                .select('id,assigned_to_id')
                .in('id', ids)

            const { data, error } = await supabase
                .from('tasks')
                .update({
                    assigned_to_id: assigneeId,
                    updated_at: new Date().toISOString()
                })
                .in('id', ids)
                .select('id')

            if (error) {
                ids.forEach(id => result.failed.push({ id, error: error.message }))
            } else {
                data?.forEach(item => result.success.push(item.id))
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'task',
                    description: 'Bulk assign tasks',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length,
                        assigned_to_id: assigneeId
                    }
                })
            }

            const beforeById = new Map(
                (beforeRows || []).map((row: { id: string; assigned_to_id: string | null }) => [
                    row.id,
                    { assigned_to_id: row.assigned_to_id }
                ])
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'task',
                    action: 'assign',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })

            if (result.success.length > 0) {
                crudToasts.update.success(`Assigned ${result.success.length} tasks`)
            }
        }
    })
}

/**
 * Bulk update task status with validation
 */
export function useBulkUpdateTaskStatus() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, newStatus }: BulkStatusParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk update task status')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            // Get current statuses for validation
            const { data: currentTasks } = await supabase
                .from('tasks')
                .select('id, status')
                .in('id', ids)

            if (!currentTasks) {
                ids.forEach(id => result.failed.push({ id, error: 'Task not found' }))
                return result
            }

            // Validate and separate valid/invalid transitions
            const validIds: string[] = []

            for (const task of currentTasks) {
                try {
                    validateTransition('task', task.status, newStatus)
                    validIds.push(task.id)
                } catch (_error) {
                    const validOptions = getValidNextStatuses('task', task.status)
                    result.failed.push({
                        id: task.id,
                        error: `Cannot change from "${task.status}" to "${newStatus}". Valid: ${validOptions.join(', ')}`
                    })
                }
            }

            // Update valid tasks
            if (validIds.length > 0) {
                const { data, error } = await supabase
                    .from('tasks')
                    .update({
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', validIds)
                    .select('id')

                if (error) {
                    validIds.forEach(id => result.failed.push({ id, error: error.message }))
                } else {
                    data?.forEach(item => result.success.push(item.id))
                }
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'task',
                    description: 'Bulk update task status',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length,
                        new_status: newStatus
                    }
                })
            }

            const beforeById = new Map(
                currentTasks.map((task) => [task.id, { status: task.status }])
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'task',
                    action: 'status',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
            queryClient.invalidateQueries({ queryKey: ['task-stats'] })

            if (result.failed.length === 0) {
                crudToasts.update.success(`${result.success.length} tasks`)
            } else if (result.success.length > 0) {
                crudToasts.update.success(`${result.success.length} tasks updated (${result.failed.length} skipped - invalid transitions)`)
            } else {
                crudToasts.update.error('No valid status transitions')
            }
        }
    })
}

/**
 * Bulk soft-delete tasks
 */
export function useBulkDeleteTasks() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk delete tasks')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const { data: beforeRows } = await supabase
                .from('tasks')
                .select('id,is_deleted')
                .in('id', ids)

            const { data, error } = await supabase
                .from('tasks')
                .update({ is_deleted: true })
                .in('id', ids)
                .select('id')

            if (error) {
                ids.forEach(id => result.failed.push({ id, error: error.message }))
            } else {
                data?.forEach(item => result.success.push(item.id))
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'task',
                    description: 'Bulk delete tasks',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length
                    }
                })
            }

            const beforeById = new Map(
                (beforeRows || []).map((row: { id: string; is_deleted: boolean | null }) => [
                    row.id,
                    { is_deleted: row.is_deleted ?? false }
                ])
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'task',
                    action: 'delete',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
            queryClient.invalidateQueries({ queryKey: ['task-stats'] })
            queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })

            if (result.success.length > 0) {
                crudToasts.delete.success(`${result.success.length} tasks`)
            }
        }
    })
}

/**
 * Bulk update maintenance tickets
 */
export function useBulkUpdateMaintenanceTickets() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, updates }: BulkUpdateParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk update maintenance tickets')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const updateKeys = Object.keys(updates).filter((key) => key !== 'updated_at')
            const selectColumns = ['id', ...updateKeys].join(',')
            const { data: beforeRows } = updateKeys.length > 0
                ? await supabase
                    .from('maintenance_tickets')
                    .select(selectColumns)
                    .in('id', ids)
                : { data: [] as Array<{ id: string }> }

            const { data, error } = await supabase
                .from('maintenance_tickets')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .in('id', ids)
                .select('id')

            if (error) {
                ids.forEach(id => result.failed.push({ id, error: error.message }))
            } else {
                data?.forEach(item => result.success.push(item.id))
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'maintenance_ticket',
                    description: 'Bulk update maintenance tickets',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length,
                        updates
                    }
                })
            }

            const beforeById = new Map(
                (beforeRows || []).map((row: Record<string, unknown>) => {
                    const id = String(row.id)
                    const before = updateKeys.reduce<Record<string, unknown>>((acc, key) => {
                        acc[key] = row[key]
                        return acc
                    }, {})
                    return [id, before]
                })
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'maintenance_ticket',
                    action: 'update',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })

            if (result.success.length > 0) {
                crudToasts.update.success(`${result.success.length} tickets`)
            }
        }
    })
}

/**
 * Bulk assign maintenance tickets
 */
export function useBulkAssignMaintenanceTickets() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, assigneeId }: BulkAssignParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk assign maintenance tickets')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const { data: beforeRows } = await supabase
                .from('maintenance_tickets')
                .select('id,assigned_to_id,status')
                .in('id', ids)

            const updates: Record<string, unknown> = {
                assigned_to_id: assigneeId,
                updated_at: new Date().toISOString()
            }

            // If assigning, also set to in_progress
            if (assigneeId) {
                updates.status = 'in_progress'
            }

            const { data, error } = await supabase
                .from('maintenance_tickets')
                .update(updates)
                .in('id', ids)
                .select('id')

            if (error) {
                ids.forEach(id => result.failed.push({ id, error: error.message }))
            } else {
                data?.forEach(item => result.success.push(item.id))
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'maintenance_ticket',
                    description: 'Bulk assign maintenance tickets',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length,
                        assigned_to_id: assigneeId
                    }
                })
            }

            const beforeById = new Map(
                (beforeRows || []).map((row: { id: string; assigned_to_id: string | null; status: string }) => [
                    row.id,
                    { assigned_to_id: row.assigned_to_id, status: row.status }
                ])
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'maintenance_ticket',
                    action: 'assign',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })

            if (result.success.length > 0) {
                crudToasts.update.success(`Assigned ${result.success.length} tickets`)
            }
        }
    })
}

/**
 * Bulk approve leave requests
 */
export function useBulkApproveLeaveRequests() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            assertBulkOperationSize(ids, 'Bulk approve leave requests')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

            const { data: beforeRows } = await supabase
                .from('leave_requests')
                .select('id,status,approved_by_id')
                .in('id', ids)

            const { data, error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'approved',
                    approved_by_id: user.id,
                    updated_at: new Date().toISOString()
                })
                .in('id', ids)
                .eq('status', 'pending')
                .select('id')

            if (error) {
                ids.forEach(id => result.failed.push({ id, error: error.message }))
            } else {
                data?.forEach(item => result.success.push(item.id))
                // Mark non-updated as already processed
                const notUpdated = ids.filter(id => !data?.find(d => d.id === id))
                notUpdated.forEach(id => result.failed.push({ id, error: 'Already processed or not found' }))
            }

            if (result.success.length > 0) {
                await logAuditEvent({
                    event_type: 'admin.action',
                    entity_type: 'leave_request',
                    description: 'Bulk approve leave requests',
                    metadata: {
                        bulk_operation: true,
                        total_selected: result.total,
                        success_count: result.success.length,
                        failure_count: result.failed.length
                    }
                })
            }

            const beforeById = new Map(
                (beforeRows || []).map((row: { id: string; status: string; approved_by_id: string | null }) => [
                    row.id,
                    { status: row.status, approved_by_id: row.approved_by_id }
                ])
            )

            const undoSnapshots = result.success
                .map((id) => ({
                    id,
                    before: beforeById.get(id)
                }))
                .filter((entry): entry is { id: string; before: Record<string, unknown> } => !!entry.before)

            if (undoSnapshots.length > 0) {
                result.undoToken = {
                    entity: 'leave_request',
                    action: 'approve',
                    snapshots: undoSnapshots,
                    createdAt: new Date().toISOString()
                }
            }

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
            queryClient.invalidateQueries({ queryKey: ['approval-stats'] })

            if (result.success.length > 0) {
                crudToasts.approve.success(`${result.success.length} leave requests`)
            }
        }
    })
}
