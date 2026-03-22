import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AuditRetentionPolicy {
    id: string
    policy_name: string
    description: string | null
    default_retention_days: number
    max_retention_days: number
    min_retention_days: number
    pdf_retention_days: number | null
    excel_retention_days: number | null
    csv_retention_days: number | null
    json_retention_days: number | null
    auto_soft_delete: boolean
    auto_purge_after_days: number
    corporate_admin_retention_days: number | null
    compliance_officer_retention_days: number | null
    is_active: boolean
    is_default: boolean
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
        mutationFn: async (policy: Partial<AuditRetentionPolicy>) => {
            // First disable other defaults if this is marked as default
            if (policy.is_default) {
                await supabase.from('audit_export_retention_policies').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000')
            }

            const { data, error } = await supabase
                .from('audit_export_retention_policies')
                .insert([policy])
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
