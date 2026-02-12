import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

type AccountAction = 'suspend' | 'reactivate' | 'force_password_reset' | 'unlock'

interface AccountActionParams {
    action: AccountAction
    user_id: string
    reason?: string
    suspend_until?: string
    notify_user?: boolean
    note?: string
}

export function useAccountActions() {
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const accountActionMutation = useMutation({
        mutationFn: async (params: AccountActionParams) => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await supabase.functions.invoke('admin-account-actions', {
                body: params,
            })

            if (response.error) {
                throw new Error(response.error.message || 'Action failed')
            }

            // Post-action updates (notes, notify, suspension scheduling)
            const { user_id, action, suspend_until, notify_user, note } = params

            if (action === 'suspend' && suspend_until) {
                await supabase
                    .from('profiles')
                    .update({ suspended_until: suspend_until })
                    .eq('id', user_id)
            }

            if (action === 'reactivate' || action === 'unlock') {
                await supabase
                    .from('profiles')
                    .update({ suspended_until: null })
                    .eq('id', user_id)
            }

            if (note && note.trim().length > 0) {
                await supabase
                    .from('account_action_notes')
                    .insert({
                        user_id,
                        action,
                        note: note.trim(),
                        created_by: session.user.id,
                        metadata: {
                            suspend_until: suspend_until || null,
                            notify_user: !!notify_user
                        }
                    })
            }

            if (notify_user) {
                const titleMap: Record<AccountAction, string> = {
                    suspend: 'Account Suspended',
                    reactivate: 'Account Reactivated',
                    force_password_reset: 'Password Reset Required',
                    unlock: 'Account Unlocked',
                }

                const messageMap: Record<AccountAction, string> = {
                    suspend: suspend_until
                        ? `Your account has been suspended until ${new Date(suspend_until).toLocaleString()}.`
                        : 'Your account has been suspended by an administrator.',
                    reactivate: 'Your account has been reactivated.',
                    force_password_reset: 'Your account requires a password reset. Please update your password to continue.',
                    unlock: 'Your account has been unlocked.',
                }

                await supabase
                    .from('notifications')
                    .insert({
                        user_id,
                        type: 'system',
                        title: titleMap[action],
                        message: messageMap[action],
                        metadata: {
                            action,
                            suspend_until: suspend_until || null,
                        }
                    })
            }

            return response.data
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] })

            const actionMessages: Record<AccountAction, string> = {
                suspend: 'Account has been suspended',
                reactivate: 'Account has been reactivated',
                force_password_reset: 'Password reset initiated',
                unlock: 'Account has been unlocked',
            }

            toast({
                title: 'Action Completed',
                description: actionMessages[variables.action],
            })
        },
        onError: (error: Error) => {
            toast({
                title: 'Action Failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const suspendAccount = (
        userId: string,
        reason?: string,
        options?: { suspendUntil?: string; notifyUser?: boolean; note?: string }
    ) =>
        accountActionMutation.mutateAsync({
            action: 'suspend',
            user_id: userId,
            reason,
            suspend_until: options?.suspendUntil,
            notify_user: options?.notifyUser,
            note: options?.note
        })

    const reactivateAccount = (
        userId: string,
        options?: { notifyUser?: boolean; note?: string }
    ) =>
        accountActionMutation.mutateAsync({
            action: 'reactivate',
            user_id: userId,
            notify_user: options?.notifyUser,
            note: options?.note
        })

    const forcePasswordReset = (
        userId: string,
        options?: { notifyUser?: boolean; note?: string }
    ) =>
        accountActionMutation.mutateAsync({
            action: 'force_password_reset',
            user_id: userId,
            notify_user: options?.notifyUser,
            note: options?.note
        })

    const unlockAccount = (
        userId: string,
        options?: { notifyUser?: boolean; note?: string }
    ) =>
        accountActionMutation.mutateAsync({
            action: 'unlock',
            user_id: userId,
            notify_user: options?.notifyUser,
            note: options?.note
        })

    return {
        suspendAccount,
        reactivateAccount,
        forcePasswordReset,
        unlockAccount,
        isLoading: accountActionMutation.isPending,
    }
}
