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
    PMSSystem,
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
// PMS SYSTEMS
// ============================================================================

export function usePMSSystems(options?: { includeInactive?: boolean }) {
    const { currentProperty } = useProperty()
    const includeInactive = options?.includeInactive ?? false

    return useQuery({
        queryKey: ['pms-systems', currentProperty?.id, includeInactive],
        queryFn: async () => {
            let query = supabase
                .from('pms_systems')
                .select(`
          *,
          property:properties(id, name)
        `)
                .order('created_at', { ascending: false })

            if (!includeInactive) {
                query = query.eq('is_active', true)
            }

            const propertyId = currentProperty?.id
            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as PMSSystem[]
        }
    })
}

// ============================================================================
// DAILY OCCUPANCY
// ============================================================================

export function useDailyOccupancy(filters?: {
    propertyId?: string
    startDate?: string
    endDate?: string
}) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['daily-occupancy', filters, currentProperty?.id],
        queryFn: async () => {
            let query = supabase
                .from('daily_occupancy')
                .select(`
          *,
          property:properties(id, name)
        `)
                .order('business_date', { ascending: false })

            const propertyId = filters?.propertyId !== undefined ? filters.propertyId : currentProperty?.id
            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            if (filters?.startDate) {
                query = query.gte('business_date', filters.startDate)
            }
            if (filters?.endDate) {
                query = query.lte('business_date', filters.endDate)
            }

            const { data, error } = await query.limit(90) // Last 90 days max
            if (error) throw error
            return data as DailyOccupancy[]
        }
    })
}

export function useUpsertOccupancy() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: Partial<DailyOccupancy>) => {
            const { data: result, error } = await supabase
                .from('daily_occupancy')
                .upsert(data, { onConflict: 'property_id,business_date' })
                .select()
                .single()

            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-occupancy'] })
            queryClient.invalidateQueries({ queryKey: ['operations-kpis'] })
            crudToasts.update.success('Occupancy data')
        },
        onError: () => crudToasts.update.error('occupancy data')
    })
}

// ============================================================================
// DAILY REVENUE
// ============================================================================

export function useDailyRevenue(filters?: {
    propertyId?: string
    startDate?: string
    endDate?: string
}) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['daily-revenue', filters, currentProperty?.id],
        queryFn: async () => {
            let query = supabase
                .from('daily_revenue')
                .select(`
          *,
          property:properties(id, name)
        `)
                .order('business_date', { ascending: false })

            const propertyId = filters?.propertyId !== undefined ? filters.propertyId : currentProperty?.id
            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            if (filters?.startDate) {
                query = query.gte('business_date', filters.startDate)
            }
            if (filters?.endDate) {
                query = query.lte('business_date', filters.endDate)
            }

            const { data, error } = await query.limit(90)
            if (error) throw error
            return data as DailyRevenue[]
        }
    })
}

export function useUpsertRevenue() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: Partial<DailyRevenue>) => {
            const { data: result, error } = await supabase
                .from('daily_revenue')
                .upsert(data, { onConflict: 'property_id,business_date' })
                .select()
                .single()

            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-revenue'] })
            queryClient.invalidateQueries({ queryKey: ['operations-kpis'] })
            crudToasts.update.success('Revenue data')
        },
        onError: () => crudToasts.update.error('revenue data')
    })
}

// ============================================================================
// MARKET SEGMENTS
// ============================================================================

export function useMarketSegments(filters?: {
    propertyId?: string
    businessDate?: string
}) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['market-segments', filters, currentProperty?.id],
        queryFn: async () => {
            let query = supabase
                .from('market_segments')
                .select('*')
                .order('revenue', { ascending: false })

            const propertyId = filters?.propertyId !== undefined ? filters.propertyId : currentProperty?.id
            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            if (filters?.businessDate) {
                query = query.eq('business_date', filters.businessDate)
            }

            const { data, error } = await query
            if (error) throw error
            return data as MarketSegment[]
        }
    })
}

// ============================================================================
// ROOM INVENTORY
// ============================================================================

export function useRoomInventory(filters?: {
    propertyId?: string
    businessDate?: string
}) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['room-inventory', filters, currentProperty?.id],
        queryFn: async () => {
            let query = supabase
                .from('room_inventory')
                .select('*')
                .order('room_type', { ascending: true })

            const propertyId = filters?.propertyId || currentProperty?.id
            if (isRealPropertyId(propertyId)) {
                query = query.eq('property_id', propertyId)
            }

            if (filters?.businessDate) {
                query = query.eq('business_date', filters.businessDate)
            }

            const { data, error } = await query
            if (error) throw error
            return data as RoomInventory[]
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
            queryClient.invalidateQueries({ queryKey: ['daily-occupancy'] })
            queryClient.invalidateQueries({ queryKey: ['daily-revenue'] })
            queryClient.invalidateQueries({ queryKey: ['operations-kpis'] })
            crudToasts.delete.success('Import history and associated data')
        },
        onError: () => crudToasts.delete.error('import history')
    })
}

// ============================================================================
// OPERATIONS KPIs
// ============================================================================

export function useOperationsKPIs(filters?: {
    propertyId?: string
    businessDate?: string
}) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['operations-kpis', filters, currentProperty?.id],
        queryFn: async () => {
            const propertyId = filters?.propertyId !== undefined ? filters.propertyId : currentProperty?.id
            const businessDate = filters?.businessDate || new Date().toISOString().split('T')[0]

            // Fetch occupancy
            let occQuery = supabase
                .from('daily_occupancy')
                .select('rooms_available, rooms_sold, occupancy_rate')
                .eq('business_date', businessDate)

            if (isRealPropertyId(propertyId)) {
                occQuery = occQuery.eq('property_id', propertyId)
            }

            const { data: occData } = await occQuery

            // Fetch revenue
            let revQuery = supabase
                .from('daily_revenue')
                .select('room_revenue, fb_revenue, spa_revenue, other_revenue, total_revenue, adr, revpar')
                .eq('business_date', businessDate)

            if (isRealPropertyId(propertyId)) {
                revQuery = revQuery.eq('property_id', propertyId)
            }

            const { data: revData } = await revQuery

            // Aggregate KPIs
            const kpis: OperationsKPIs = {
                totalRooms: occData?.reduce((sum, o) => sum + (o.rooms_available || 0), 0) || 0,
                roomsSold: occData?.reduce((sum, o) => sum + (o.rooms_sold || 0), 0) || 0,
                occupancyRate: 0,
                adr: 0,
                revpar: 0,
                totalRevenue: revData?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0,
                roomRevenue: revData?.reduce((sum, r) => sum + (r.room_revenue || 0), 0) || 0,
                fbRevenue: revData?.reduce((sum, r) => sum + (r.fb_revenue || 0), 0) || 0
            }

            // Calculate aggregated rates
            if (kpis.totalRooms > 0) {
                kpis.occupancyRate = Math.round((kpis.roomsSold / kpis.totalRooms) * 100 * 10) / 10
            }
            if (kpis.roomsSold > 0) {
                kpis.adr = Math.round((kpis.roomRevenue / kpis.roomsSold) * 100) / 100
            }
            if (kpis.totalRooms > 0) {
                kpis.revpar = Math.round((kpis.roomRevenue / kpis.totalRooms) * 100) / 100
            }

            return kpis
        }
    })
}
