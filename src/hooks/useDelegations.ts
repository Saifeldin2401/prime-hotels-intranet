import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface Delegation {
    id: string
    delegator_id: string
    delegate_id: string
    delegation_type: 'full_access' | 'specific_permissions' | 'approval_authority'
    permissions: string[]
    reason: string | null
    starts_at: string
    ends_at: string
    is_active: boolean
    auto_expired: boolean
    created_at: string
    updated_at: string
    revoked_at: string | null
    revoked_by: string | null
    paused_at?: string | null
    paused_by?: string | null
    max_approvals?: number | null
    approvals_used?: number | null
    allow_redelegate?: boolean | null
    fallback_delegate_ids?: string[] | null
    notify_delegate?: boolean | null
    notify_delegator?: boolean | null
    notify_on_action?: boolean | null
    notify_on_expiry?: boolean | null
    // Joined data
    delegator?: { id: string; full_name: string; email: string }
    delegate?: { id: string; full_name: string; email: string }
}

interface CreateDelegationInput {
    delegate_id: string
    delegation_type: Delegation['delegation_type']
    permissions?: string[]
    reason?: string
    starts_at: string
    ends_at: string
    max_approvals?: number | null
    allow_redelegate?: boolean
    fallback_delegate_ids?: string[]
    notify_delegate?: boolean
    notify_delegator?: boolean
    notify_on_action?: boolean
    notify_on_expiry?: boolean
}

interface UpdateDelegationInput {
    id: string
    updates: Partial<{
        delegation_type: Delegation['delegation_type']
        permissions: string[]
        reason: string | null
        starts_at: string
        ends_at: string
        is_active: boolean
        max_approvals: number | null
        allow_redelegate: boolean
        fallback_delegate_ids: string[]
        notify_delegate: boolean
        notify_delegator: boolean
        notify_on_action: boolean
        notify_on_expiry: boolean
        paused_at: string | null
        paused_by: string | null
        revoked_at: string | null
        revoked_by: string | null
        updated_at: string
    }>
}

export function useDelegations() {
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const { user } = useAuth()

    const { data: delegations = [], isLoading } = useQuery({
        queryKey: ['delegations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('admin_delegations')
                .select(`
          *,
          delegator:delegator_id(id, full_name, email),
          delegate:delegate_id(id, full_name, email)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as Delegation[]
        },
    })

    const createDelegation = useMutation({
        mutationFn: async (input: CreateDelegationInput) => {
            const { data, error } = await supabase
                .from('admin_delegations')
                .insert({
                    delegator_id: user?.id,
                    ...input,
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            toast({ title: 'Delegation created', description: 'The delegation has been set up successfully.' })
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to create delegation', description: error.message, variant: 'destructive' })
        },
    })

    const revokeDelegation = useMutation({
        mutationFn: async (delegationId: string) => {
            const { error } = await supabase
                .from('admin_delegations')
                .update({
                    is_active: false,
                    revoked_at: new Date().toISOString(),
                    revoked_by: user?.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', delegationId)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Delegation revoked', description: 'The delegation has been revoked.' })
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to revoke delegation', description: error.message, variant: 'destructive' })
        },
    })

    const updateDelegation = useMutation({
        mutationFn: async ({ id, updates }: UpdateDelegationInput) => {
            const { error } = await supabase
                .from('admin_delegations')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Delegation updated', description: 'Changes saved successfully.' })
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to update delegation', description: error.message, variant: 'destructive' })
        },
    })

    const pauseDelegation = useMutation({
        mutationFn: async (delegationId: string) => {
            const { error } = await supabase
                .from('admin_delegations')
                .update({
                    is_active: false,
                    paused_at: new Date().toISOString(),
                    paused_by: user?.id ?? null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', delegationId)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Delegation paused', description: 'The delegation is now paused.' })
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to pause delegation', description: error.message, variant: 'destructive' })
        },
    })

    const resumeDelegation = useMutation({
        mutationFn: async (delegationId: string) => {
            const { error } = await supabase
                .from('admin_delegations')
                .update({
                    is_active: true,
                    paused_at: null,
                    paused_by: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', delegationId)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Delegation resumed', description: 'The delegation is active again.' })
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to resume delegation', description: error.message, variant: 'destructive' })
        },
    })

    // Expire delegations that have passed their end date
    const expireDelegations = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('expire_delegations')
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delegations'] })
        },
    })

    const isDelegationWithinApprovalLimit = (delegation: Delegation) => {
        if (delegation.max_approvals === null || delegation.max_approvals === undefined) {
            return true
        }
        const approvalsUsed = delegation.approvals_used ?? 0
        return approvalsUsed < delegation.max_approvals
    }

    // Filter helpers
    const activeDelegations = delegations.filter(
        d => d.is_active && new Date(d.ends_at) > new Date() && isDelegationWithinApprovalLimit(d)
    )
    const pausedDelegations = delegations.filter(
        d => !d.is_active && !d.revoked_at && new Date(d.ends_at) > new Date()
    )
    const expiredDelegations = delegations.filter(
        d => d.revoked_at || d.auto_expired || new Date(d.ends_at) <= new Date()
    )
    const myDelegations = delegations.filter(d => d.delegator_id === user?.id)
    const receivedDelegations = delegations.filter(
        d => d.delegate_id === user?.id && d.is_active && isDelegationWithinApprovalLimit(d)
    )

    return {
        delegations,
        activeDelegations,
        pausedDelegations,
        expiredDelegations,
        myDelegations,
        receivedDelegations,
        isLoading,
        createDelegation,
        updateDelegation,
        revokeDelegation,
        pauseDelegation,
        resumeDelegation,
        expireDelegations,
    }
}
