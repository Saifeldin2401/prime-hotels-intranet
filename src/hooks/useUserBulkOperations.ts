import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import type { AppRole } from '@/lib/constants'

interface BulkOperationResult {
    success: number
    failed: number
    errors: string[]
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
            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }

            for (const userId of userIds) {
                try {
                    // Check if user already has this role
                    const { data: existingRole } = await supabase
                        .from('user_roles')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('role', role)
                        .maybeSingle()

                    if (existingRole) {
                        result.success++
                        continue
                    }

                    // Remove existing roles and assign new one
                    await supabase.from('user_roles').delete().eq('user_id', userId)
                    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role })
                    if (error) throw error

                    // Audit
                    await supabase.from('audit_logs').insert({
                        entity_type: 'user',
                        entity_id: userId,
                        action: 'bulk_role_assign',
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        details: { new_role: role, bulk_operation: true },
                    })

                    result.success++
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
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
            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }

            for (const userId of userIds) {
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            is_active: false,
                            account_status: 'suspended',
                            suspend_reason: reason || 'Bulk deactivation',
                            suspended_at: new Date().toISOString(),
                            suspended_until: suspendUntil || null,
                        })
                        .eq('id', userId)

                    if (error) throw error

                    if (note && note.trim()) {
                        await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_deactivate',
                                note: note.trim(),
                                created_by: (await supabase.auth.getUser()).data.user?.id,
                                metadata: { suspend_until: suspendUntil || null, notify_user: !!notifyUser }
                            })
                    }

                    if (notifyUser) {
                        await supabase.from('notifications').insert({
                            user_id: userId,
                            type: 'system',
                            title: 'Account Suspended',
                            message: suspendUntil
                                ? `Your account has been suspended until ${new Date(suspendUntil).toLocaleString()}.`
                                : 'Your account has been suspended by an administrator.',
                            metadata: { action: 'bulk_deactivate', suspend_until: suspendUntil || null }
                        })
                    }

                    await supabase.from('audit_logs').insert({
                        entity_type: 'user',
                        entity_id: userId,
                        action: 'bulk_deactivate',
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        details: { reason, bulk_operation: true, suspend_until: suspendUntil || null },
                    })

                    result.success++
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
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
            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }

            for (const userId of userIds) {
                try {
                    const { error } = await supabase
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

                    if (error) throw error

                    if (note && note.trim()) {
                        await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_activate',
                                note: note.trim(),
                                created_by: (await supabase.auth.getUser()).data.user?.id,
                                metadata: { notify_user: !!notifyUser }
                            })
                    }

                    if (notifyUser) {
                        await supabase.from('notifications').insert({
                            user_id: userId,
                            type: 'system',
                            title: 'Account Activated',
                            message: 'Your account has been activated.',
                            metadata: { action: 'bulk_activate' }
                        })
                    }

                    await supabase.from('audit_logs').insert({
                        entity_type: 'user',
                        entity_id: userId,
                        action: 'bulk_activate',
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        details: { bulk_operation: true },
                    })

                    result.success++
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
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
            const result: BulkOperationResult = { success: 0, failed: 0, errors: [] }

            for (const userId of userIds) {
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            force_password_reset: true,
                            is_temp_password: true,
                        })
                        .eq('id', userId)

                    if (error) throw error

                    if (note && note.trim()) {
                        await supabase
                            .from('account_action_notes')
                            .insert({
                                user_id: userId,
                                action: 'bulk_force_password_reset',
                                note: note.trim(),
                                created_by: (await supabase.auth.getUser()).data.user?.id,
                                metadata: { notify_user: !!notifyUser }
                            })
                    }

                    if (notifyUser) {
                        await supabase.from('notifications').insert({
                            user_id: userId,
                            type: 'system',
                            title: 'Password Reset Required',
                            message: 'Your account requires a password reset. Please update your password to continue.',
                            metadata: { action: 'bulk_force_password_reset' }
                        })
                    }

                    await supabase.from('audit_logs').insert({
                        entity_type: 'user',
                        entity_id: userId,
                        action: 'bulk_force_password_reset',
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        details: { bulk_operation: true },
                    })

                    result.success++
                } catch (err) {
                    result.failed++
                    result.errors.push(`User ${userId}: ${(err as Error).message}`)
                }
            }
            return result
        },
        onSuccess: (result) => showResult('Password Reset', result),
    })

    return {
        bulkAssignRole,
        bulkDeactivate,
        bulkActivate,
        bulkForcePasswordReset,
        isLoading:
            bulkAssignRole.isPending ||
            bulkDeactivate.isPending ||
            bulkActivate.isPending ||
            bulkForcePasswordReset.isPending,
    }
}
