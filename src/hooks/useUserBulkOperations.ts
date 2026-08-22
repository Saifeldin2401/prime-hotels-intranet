import { useToast } from '@/components/ui/use-toast'
import type { AppRole } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface BulkOperationResult {
    success: number
    failed: number
    errors: string[]
}

const MAX_BULK_OPERATION_IDS = 200

const assertBulkOperationSize = (ids: string[], operationLabel: string) => {
    if (ids.length > MAX_BULK_OPERATION_IDS) {
        throw new Error(`${operationLabel} limited to ${MAX_BULK_OPERATION_IDS} items per operation. Selected: ${ids.length}`)
    }
}

export function useUserBulkOperations() {
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const showResult = (action: string, result: BulkOperationResult) => {
        if (result.failed === 0) {
            toast({
                title: `Bulk ${action} Complete`,
                description: `Successfully updated ${result.success} user(s).`,
            })
        } else {
            toast({
                title: `Bulk ${action} Partially Complete`,
                description: `${result.success} succeeded, ${result.failed} failed.`,
                variant: 'destructive',
            })
        }
        queryClient.invalidateQueries({ queryKey: ['users'] })
    }

    // Bulk role assignment
    const bulkAssignRole = useMutation({
        mutationFn: async ({ userIds, role }: { userIds: string[]; role: AppRole }) => {
            assertBulkOperationSize(userIds, 'Bulk role assignment')

            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }
            const { data: authData } = await supabase.auth.getUser()
            const actorId = authData.user?.id ?? null

            // Batch the pre-check: fetch every selected user's current roles in one
            // round-trip instead of querying per user inside the loop.
            const { data: existingRoleRows, error: existingRolesError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('user_id', userIds)
            if (existingRolesError) throw existingRolesError

            const existingRolesByUser = new Map<string, Set<AppRole>>()
            for (const row of existingRoleRows || []) {
                const set = existingRolesByUser.get(row.user_id) ?? new Set<AppRole>()
                set.add(row.role)
                existingRolesByUser.set(row.user_id, set)
            }

            const succeededUserIds: string[] = []

            await Promise.all(userIds.map(async (userId) => {
                try {
                    // Preserve at least one role during updates using the pre-fetched roles.
                    const currentRoles = existingRolesByUser.get(userId) ?? new Set<AppRole>()
                    const staleRoles = [...currentRoles].filter((r) => r !== role)

                    const { error: upsertRoleError } = await supabase
                        .from('user_roles')
                        .upsert(
                            { user_id: userId, role },
                            { onConflict: 'user_id,role', ignoreDuplicates: true }
                        )
                    if (upsertRoleError) throw upsertRoleError

                    if (staleRoles.length > 0) {
                        // RLS (get_role_priority(role) > get_user_role_priority(caller)) silently
                        // matches 0 rows - not an error - when the caller lacks the priority to
                        // remove a stale role (e.g. a regional_hr targeting a regional_admin).
                        // Assert the affected rows to avoid reporting a revocation that never
                        // happened as a success.
                        const { data: deletedRoles, error: deleteStaleError } = await supabase
                            .from('user_roles')
                            .delete()
                            .eq('user_id', userId)
                            .in('role', staleRoles)
                            .select('role')
                        if (deleteStaleError) throw deleteStaleError

                        const deletedRoleSet = new Set((deletedRoles || []).map((r) => r.role))
                        const undeletedRoles = staleRoles.filter((r) => !deletedRoleSet.has(r))
                        if (undeletedRoles.length > 0) {
                            throw new Error(
                                `Insufficient privilege to revoke role(s): ${undeletedRoles.join(', ')}`
                            )
                        }
                    }

                    result.success++
                    succeededUserIds.push(userId)
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }))

            // Batch the audit trail into a single multi-row insert instead of one
            // insert per user.
            if (succeededUserIds.length > 0) {
                const { error: auditError } = await supabase.from('system_events').insert(
                    succeededUserIds.map((userId) => ({
                        event_type: 'audit',
                        actor_id: actorId,
                        entity_type: 'user',
                        entity_id: userId,
                        metadata: { action: 'bulk_role_assign', details: { new_role: role, bulk_operation: true } },
                    }))
                )
                if (auditError) {
                    console.error('Failed to record audit log for bulk role assignment:', auditError)
                }
            }

            return result
        },
        onSuccess: (result) => showResult('Role Assignment', result),
    })

    // Bulk deactivate
    const bulkDeactivate = useMutation({
        mutationFn: async ({
            userIds,
            reason,
            suspendUntil,
            notifyUser,
            note
        }: {
            userIds: string[]
            reason?: string
            suspendUntil?: string
            notifyUser?: boolean
            note?: string
        }) => {
            assertBulkOperationSize(userIds, 'Bulk deactivation')

            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }
            const { data: authData } = await supabase.auth.getUser()
            const actorId = authData.user?.id ?? null

            const succeededUserIds: string[] = []

            await Promise.all(userIds.map(async (userId) => {
                try {
                    // RLS (has_profile_access) silently matches 0 rows - not an error - when the
                    // caller lacks access to this profile. Assert an affected row so a blocked
                    // update isn't reported as a successful deactivation.
                    const { data: updatedRows, error } = await supabase
                        .from('profiles')
                        .update({
                            is_active: false,
                            account_status: 'suspended',
                            suspend_reason: reason || 'Bulk deactivation',
                            suspended_at: new Date().toISOString(),
                            suspended_until: suspendUntil || null,
                        })
                        .eq('id', userId)
                        .select('id')

                    if (error) throw error
                    if (!updatedRows || updatedRows.length === 0) {
                        throw new Error('Insufficient privilege to deactivate this user')
                    }

                    if (note && note.trim()) {
                        const { error: noteError } = await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_deactivate',
                                note: note.trim(),
                                created_by: actorId,
                                metadata: { suspend_until: suspendUntil || null, notify_user: !!notifyUser }
                            })
                        if (noteError) throw noteError
                    }

                    if (notifyUser) {
                        const { error: notifyError } = await supabase.rpc('create_notification', {
                            p_user_id: userId,
                            p_type: 'system',
                            p_title: 'Account Suspended',
                            p_body: suspendUntil
                                ? `Your account has been suspended until ${new Date(suspendUntil).toLocaleString()}.`
                                : 'Your account has been suspended by an administrator.',
                            p_metadata: { action: 'bulk_deactivate', suspend_until: suspendUntil || null },
                        })
                        if (notifyError) throw notifyError
                    }

                    result.success++
                    succeededUserIds.push(userId)
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }))

            if (succeededUserIds.length > 0) {
                const { error: auditError } = await supabase.from('system_events').insert(
                    succeededUserIds.map((userId) => ({
                        event_type: 'audit',
                        actor_id: actorId,
                        entity_type: 'user',
                        entity_id: userId,
                        metadata: { action: 'bulk_deactivate', details: { reason, bulk_operation: true, suspend_until: suspendUntil || null } },
                    }))
                )
                if (auditError) {
                    console.error('Failed to record audit log for bulk deactivation:', auditError)
                }
            }

            return result
        },
        onSuccess: (result) => showResult('Deactivation', result),
    })

    // Bulk activate
    const bulkActivate = useMutation({
        mutationFn: async ({
            userIds,
            notifyUser,
            note
        }: {
            userIds: string[]
            notifyUser?: boolean
            note?: string
        }) => {
            assertBulkOperationSize(userIds, 'Bulk activation')

            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }
            const { data: authData } = await supabase.auth.getUser()
            const actorId = authData.user?.id ?? null

            const succeededUserIds: string[] = []

            await Promise.all(userIds.map(async (userId) => {
                try {
                    // RLS (has_profile_access) silently matches 0 rows - not an error - when the
                    // caller lacks access to this profile. Assert an affected row so a blocked
                    // update isn't reported as a successful activation.
                    const { data: updatedRows, error } = await supabase
                        .from('profiles')
                        .update({
                            is_active: true,
                            account_status: 'active',
                            suspended_at: null,
                            suspended_by: null,
                            suspend_reason: null,
                            suspended_until: null,
                        })
                        .eq('id', userId)
                        .select('id')

                    if (error) throw error
                    if (!updatedRows || updatedRows.length === 0) {
                        throw new Error('Insufficient privilege to activate this user')
                    }

                    if (note && note.trim()) {
                        const { error: noteError } = await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_activate',
                                note: note.trim(),
                                created_by: actorId,
                                metadata: { notify_user: !!notifyUser }
                            })
                        if (noteError) throw noteError
                    }

                    if (notifyUser) {
                        const { error: notifyError } = await supabase.rpc('create_notification', {
                            p_user_id: userId,
                            p_type: 'system',
                            p_title: 'Account Activated',
                            p_body: 'Your account has been activated.',
                            p_metadata: { action: 'bulk_activate' },
                        })
                        if (notifyError) throw notifyError
                    }

                    result.success++
                    succeededUserIds.push(userId)
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }))

            if (succeededUserIds.length > 0) {
                const { error: auditError } = await supabase.from('system_events').insert(
                    succeededUserIds.map((userId) => ({
                        event_type: 'audit',
                        actor_id: actorId,
                        entity_type: 'user',
                        entity_id: userId,
                        metadata: { action: 'bulk_activate', details: { bulk_operation: true } },
                    }))
                )
                if (auditError) {
                    console.error('Failed to record audit log for bulk activation:', auditError)
                }
            }

            return result
        },
        onSuccess: (result) => showResult('Activation', result),
    })

    // Bulk force password reset
    const bulkForcePasswordReset = useMutation({
        mutationFn: async ({
            userIds,
            notifyUser,
            note
        }: {
            userIds: string[]
            notifyUser?: boolean
            note?: string
        }) => {
            assertBulkOperationSize(userIds, 'Bulk force password reset')

            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }
            const { data: authData } = await supabase.auth.getUser()
            const actorId = authData.user?.id ?? null

            const succeededUserIds: string[] = []

            await Promise.all(userIds.map(async (userId) => {
                try {
                    // Call the edge function which sets the flag, generates recovery link, and sends email
                    const response = await supabase.functions.invoke('admin-account-actions', {
                        body: {
                            action: 'force_password_reset',
                            user_id: userId,
                            reason: note || 'Bulk force password reset',
                        },
                    })

                    if (response.error) {
                        throw new Error(response.error.message || 'Edge function failed')
                    }

                    if (note && note.trim()) {
                        const { error: noteError } = await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_force_password_reset',
                                note: note.trim(),
                                created_by: actorId,
                                metadata: { notify_user: !!notifyUser }
                            })
                        if (noteError) throw noteError
                    }

                    if (notifyUser) {
                        const { error: notifyError } = await supabase.rpc('create_notification', {
                            p_user_id: userId,
                            p_type: 'system',
                            p_title: 'Password Reset Required',
                            p_body: 'Your account requires a password reset. Please update your password to continue.',
                            p_metadata: { action: 'bulk_force_password_reset' },
                        })
                        if (notifyError) throw notifyError
                    }

                    result.success++
                    succeededUserIds.push(userId)
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }))

            if (succeededUserIds.length > 0) {
                const { error: auditError } = await supabase.from('system_events').insert(
                    succeededUserIds.map((userId) => ({
                        event_type: 'audit',
                        actor_id: actorId,
                        entity_type: 'user',
                        entity_id: userId,
                        metadata: { action: 'bulk_force_password_reset', details: { bulk_operation: true } },
                    }))
                )
                if (auditError) {
                    console.error('Failed to record audit log for bulk force password reset:', auditError)
                }
            }

            return result
        },
        onSuccess: (result) => showResult('Password Reset', result),
    })

    // Bulk cancel password reset
    const bulkCancelPasswordReset = useMutation({
        mutationFn: async ({
            userIds,
            notifyUser,
            note
        }: {
            userIds: string[]
            notifyUser?: boolean
            note?: string
        }) => {
            assertBulkOperationSize(userIds, 'Bulk cancel password reset')

            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }
            const { data: authData } = await supabase.auth.getUser()
            const actorId = authData.user?.id ?? null

            const succeededUserIds: string[] = []

            await Promise.all(userIds.map(async (userId) => {
                try {
                    const response = await supabase.functions.invoke('admin-account-actions', {
                        body: {
                            action: 'cancel_password_reset',
                            user_id: userId,
                            reason: note || 'Bulk cancel password reset',
                        },
                    })

                    if (response.error) {
                        throw new Error(response.error.message || 'Edge function failed')
                    }

                    if (note && note.trim()) {
                        const { error: noteError } = await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_cancel_password_reset',
                                note: note.trim(),
                                created_by: actorId,
                                metadata: { notify_user: !!notifyUser }
                            })
                        if (noteError) throw noteError
                    }

                    if (notifyUser) {
                        const { error: notifyError } = await supabase.rpc('create_notification', {
                            p_user_id: userId,
                            p_type: 'system',
                            p_title: 'Password Reset Cancelled',
                            p_body: 'Your account no longer requires a password reset.',
                            p_metadata: { action: 'bulk_cancel_password_reset' },
                        })
                        if (notifyError) throw notifyError
                    }

                    result.success++
                    succeededUserIds.push(userId)
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }))

            if (succeededUserIds.length > 0) {
                const { error: auditError } = await supabase.from('system_events').insert(
                    succeededUserIds.map((userId) => ({
                        event_type: 'audit',
                        actor_id: actorId,
                        entity_type: 'user',
                        entity_id: userId,
                        metadata: { action: 'bulk_cancel_password_reset', details: { bulk_operation: true } },
                    }))
                )
                if (auditError) {
                    console.error('Failed to record audit log for bulk cancel password reset:', auditError)
                }
            }

            return result
        },
        onSuccess: (result) => showResult('Cancel Reset', result),
    })

    return {
        bulkAssignRole,
        bulkDeactivate,
        bulkActivate,
        bulkForcePasswordReset,
        bulkCancelPasswordReset,
        isLoading:
            bulkAssignRole.isPending ||
            bulkDeactivate.isPending ||
            bulkActivate.isPending ||
            bulkForcePasswordReset.isPending ||
            bulkCancelPasswordReset.isPending,
    }
}
