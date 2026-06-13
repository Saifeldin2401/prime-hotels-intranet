import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type {
    DailyOccupancy,
    DailyRevenue,
    DataImportLog,
    MarketSegment,
    OperationsKPIs,
    RoomInventory
} from '@/types/operations'
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
// PMS SYSTEMS — removed: pms_systems table dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns an empty array. */
export function usePMSSystems(_options?: { includeInactive?: boolean }) {
    return useQuery({
        queryKey: ['pms-systems-removed'],
        queryFn: async () => [] as never[],
        staleTime: Infinity,
    })
}

// ============================================================================
// DAILY OCCUPANCY — removed: daily_occupancy table dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns an empty array. */
export function useDailyOccupancy(_filters?: {
    propertyId?: string
    startDate?: string
    endDate?: string
}) {
    return useQuery({
        queryKey: ['daily-occupancy-removed'],
        queryFn: async () => [] as DailyOccupancy[],
        staleTime: Infinity,
    })
}

/** @deprecated PMS module has been removed. Mutation is a no-op. */
export function useUpsertOccupancy() {
    return useMutation({
        mutationFn: async (_data: Partial<DailyOccupancy>) => null,
    })
}

// ============================================================================
// DAILY REVENUE — removed: daily_revenue table dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns an empty array. */
export function useDailyRevenue(_filters?: {
    propertyId?: string
    startDate?: string
    endDate?: string
}) {
    return useQuery({
        queryKey: ['daily-revenue-removed'],
        queryFn: async () => [] as DailyRevenue[],
        staleTime: Infinity,
    })
}

/** @deprecated PMS module has been removed. Mutation is a no-op. */
export function useUpsertRevenue() {
    return useMutation({
        mutationFn: async (_data: Partial<DailyRevenue>) => null,
    })
}

// ============================================================================
// MARKET SEGMENTS — removed: market_segments table dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns an empty array. */
export function useMarketSegments(_filters?: {
    propertyId?: string
    businessDate?: string
}) {
    return useQuery({
        queryKey: ['market-segments-removed'],
        queryFn: async () => [] as MarketSegment[],
        staleTime: Infinity,
    })
}

// ============================================================================
// ROOM INVENTORY — removed: room_inventory table dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns an empty array. */
export function useRoomInventory(_filters?: {
    propertyId?: string
    businessDate?: string
}) {
    return useQuery({
        queryKey: ['room-inventory-removed'],
        queryFn: async () => [] as RoomInventory[],
        staleTime: Infinity,
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
            queryClient.invalidateQueries({ queryKey: ['daily-occupancy'] })
            queryClient.invalidateQueries({ queryKey: ['daily-revenue'] })
            queryClient.invalidateQueries({ queryKey: ['operations-kpis'] })
            crudToasts.delete.success('Import history and associated data')
        },
        onError: () => crudToasts.delete.error('import history')
    })
}

// ============================================================================
// OPERATIONS KPIs — removed: underlying PMS tables dropped
// ============================================================================

/** @deprecated PMS module has been removed. Always returns zero-value KPIs. */
export function useOperationsKPIs(_filters?: {
    propertyId?: string
    businessDate?: string
}) {
    return useQuery({
        queryKey: ['operations-kpis-removed'],
        queryFn: async (): Promise<OperationsKPIs> => ({
            totalRooms: 0,
            roomsSold: 0,
            occupancyRate: 0,
            adr: 0,
            revpar: 0,
            totalRevenue: 0,
            roomRevenue: 0,
            fbRevenue: 0,
        }),
        staleTime: Infinity,
    })
}
