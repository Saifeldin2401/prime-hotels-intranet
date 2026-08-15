import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.generated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ReportDefinition {
    id: string
    name: string
    description: string | null
    scope_type: 'global' | 'property' | 'department'
    property_id: string | null
    department_id: string | null
    report_type: string
    filters?: Record<string, unknown> | null
    schedule_cron: string | null
    is_active: boolean
    created_by: string | null
    created_at: string
    updated_at: string
}

export const useReports = () => {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: reports, isLoading, error } = useQuery({
        queryKey: ['report_definitions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('report_definitions')
                .select(`
                    *,
                    properties:property_id (name_en, name_ar),
                    departments:department_id (name_en, name_ar),
                    creator:created_by (first_name, last_name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        }
    })

    const createMutation = useMutation({
        mutationFn: async (report: Omit<ReportDefinition, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
            const { data, error } = await supabase
                .from('report_definitions')
                .insert({
                    name: report.name,
                    description: report.description,
                    scope_type: report.scope_type,
                    property_id: report.property_id,
                    department_id: report.department_id,
                    report_type: report.report_type,
                    filters: report.filters as unknown as Json,
                    schedule_cron: report.schedule_cron,
                    is_active: report.is_active,
                    created_by: report.created_by,
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report_definitions'] })
            toast({ title: 'Report Created', description: 'The new data query has been successfully constructed.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...report }: Partial<ReportDefinition> & { id: string }) => {
            const { data, error } = await supabase
                .from('report_definitions')
                .update({
                    ...(report.name !== undefined ? { name: report.name } : {}),
                    ...(report.description !== undefined ? { description: report.description } : {}),
                    ...(report.scope_type !== undefined ? { scope_type: report.scope_type } : {}),
                    ...(report.property_id !== undefined ? { property_id: report.property_id } : {}),
                    ...(report.department_id !== undefined ? { department_id: report.department_id } : {}),
                    ...(report.report_type !== undefined ? { report_type: report.report_type } : {}),
                    ...(report.filters !== undefined ? { filters: report.filters as unknown as Json } : {}),
                    ...(report.schedule_cron !== undefined ? { schedule_cron: report.schedule_cron } : {}),
                    ...(report.is_active !== undefined ? { is_active: report.is_active } : {}),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report_definitions'] })
            toast({ title: 'Report Updated', description: 'Query parameters saved securely.' })
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('report_definitions')
                .delete()
                .eq('id', id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report_definitions'] })
            toast({ title: 'Report Deleted', description: 'Query schema purged from database.' })
        },
        onError: (error) => {
            toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' })
        }
    })

    return {
        reports,
        isLoading,
        error,
        createReport: createMutation,
        updateReport: updateMutation,
        deleteReport: deleteMutation
    }
}
