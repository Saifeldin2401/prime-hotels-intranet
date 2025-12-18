/**
 * Bulk Operations Hook
 * 
 * Provides bulk actions for tasks, maintenance tickets, and other entities.
 * Includes progress tracking and error handling for partial failures.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { crudToasts } from '@/lib/toastHelpers'
import { validateTransition, getValidNextStatuses } from '@/lib/statusTransitions'
import type { EntityType } from '@/lib/statusTransitions'

export interface BulkOperationResult {
    success: string[]
    failed: Array<{ id: string; error: string }>
    total: number
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

/**
 * Bulk update tasks
 */
export function useBulkUpdateTasks() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ ids, updates }: BulkUpdateParams): Promise<BulkOperationResult> => {
            if (!user?.id) throw new Error('User must be authenticated')

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
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

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })

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
                } catch (e) {
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

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
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

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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

            return result
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
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

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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

            const result: BulkOperationResult = {
                success: [],
                failed: [],
                total: ids.length
            }

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
