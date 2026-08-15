import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AuditRetentionPolicy {
    id: string
    name: string
    description: string | null
    retention_days: number
    applies_to_formats: string[]
    auto_delete: boolean
    notify_before_delete_days: number | null
    is_default: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

export const useAuditRetention = () => {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery({
        queryKey: ['audit_export_retention_policies'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_export_retention_policies')
                .select('*')
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as AuditRetentionPolicy[]
        }
    })

    const createMutation = useMutation({
        mutationFn: async (policy: Omit<AuditRetentionPolicy, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
            // First disable other defaults if this is marked as default
            if (policy.is_default) {
                await supabase.from('audit_export_retention_policies').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000')
            }

            const { data, error } = await supabase
                .from('audit_export_retention_policies')
                .insert({
                    name: policy.name,
                    description: policy.description,
                    retention_days: policy.retention_days,
                    applies_to_formats: policy.applies_to_formats,
                    auto_delete: policy.auto_delete,
                    notify_before_delete_days: policy.notify_before_delete_days,
                    is_default: policy.is_default,
                    created_by: policy.created_by,
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit_export_retention_policies'] })
            toast({ title: 'Success', description: 'New retention ruleset correctly applied.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const updateMutation = useMutation({
        mutationFn: async (policy: Partial<AuditRetentionPolicy> & { id: string }) => {
            if (policy.is_default) {
                await supabase.from('audit_export_retention_policies').update({ is_default: false }).neq('id', policy.id)
            }

            const { data, error } = await supabase
                .from('audit_export_retention_policies')
                .update({
                    ...policy,
                    updated_at: new Date().toISOString()
                })
                .eq('id', policy.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit_export_retention_policies'] })
            toast({ title: 'Saved', description: 'Policy metrics and boundaries updated successfully.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // Check if it's default before deleting
            const { data: fetchPolicy } = await supabase.from('audit_export_retention_policies').select('is_default').eq('id', id).single()
            if (fetchPolicy?.is_default) throw new Error("Cannot delete the active default policy. Reassign default status first.")

            const { error } = await supabase
                .from('audit_export_retention_policies')
                .delete()
                .eq('id', id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit_export_retention_policies'] })
            toast({ title: 'Deleted', description: 'Policy removed from the governance system.' })
        },
        onError: (error) => {
            toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' })
        }
    })

    return {
        data,
        isLoading,
        error,
        createPolicy: createMutation,
        updatePolicy: updateMutation,
        deletePolicy: deleteMutation
    }
}
