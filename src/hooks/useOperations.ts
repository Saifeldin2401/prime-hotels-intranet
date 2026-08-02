import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { DataImportLog } from '@/types/operations'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// PROPERTIES
// ============================================================================

export function useProperties() {
    return useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true })

            if (error) throw error
            return data
        }
    })
}

// ============================================================================
// DATA IMPORT LOGS
// ============================================================================

export function useDataImportLogs(propertyId?: string) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['data-import-logs', propertyId, currentProperty?.id],
        queryFn: async () => {
            let query = supabase
                .from('data_import_logs')
                .select(`
          *,
          property:properties(id, name),
          imported_by_profile:profiles!imported_by(id, full_name)
        `)
                .order('started_at', { ascending: false })
                .limit(50)

            const propId = propertyId !== undefined ? propertyId : currentProperty?.id
            if (isRealPropertyId(propId)) {
                query = query.eq('property_id', propId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as DataImportLog[]
        }
    })
}

export function useCreateImportLog() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: Partial<DataImportLog>) => {
            const { data: result, error } = await supabase
                .from('data_import_logs')
                .insert(data)
                .select()
                .single()

            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['data-import-logs'] })
        }
    })
}

export function useDeleteImportLog() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('delete_operations_import', {
                import_log_id: id,
            })

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['data-import-logs'] })
            crudToasts.delete.success('Import history and associated data')
        },
        onError: () => crudToasts.delete.error('import history')
    })
}
