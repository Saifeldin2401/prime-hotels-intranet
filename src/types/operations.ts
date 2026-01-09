/**
 * PMS Integration Types
 * Standardized operational data model for hotel operations reporting
 */

// Enums matching database
export type PMSType = 'opera' | 'cloudbeds' | 'mews' | 'local' | 'other'
export type ImportType = 'csv' | 'api' | 'manual'
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed'

// PMS System Configuration
export interface PMSSystem {
    id: string
    property_id: string
    pms_type: PMSType
    pms_name: string
    api_endpoint?: string
    api_credentials?: Record<string, unknown>
    sync_frequency: string
    reporting_cutoff_time: string
    last_sync_at?: string
    sync_status: SyncStatus
    is_active: boolean
    created_at: string
    updated_at: string
    created_by?: string
    // Joined
    property?: { id: string; name: string }
}

// Field Mapping Rule
export interface PMSFieldMapping {
    id: string
    pms_system_id: string
    source_field: string
    target_table: string
    target_field: string
    transform_rule?: {
        type: 'direct' | 'lookup' | 'formula'
        config?: Record<string, unknown>
    }
    is_active: boolean
    created_at: string
}

// Daily Occupancy Data
export interface DailyOccupancy {
    id: string
    property_id: string
    business_date: string
    rooms_available: number
    rooms_sold: number
    rooms_ooo: number
    occupancy_rate: number // Generated column
    adults: number
    children: number
    no_shows: number
    cancellations: number
    walk_ins: number
    source_import_id?: string
    created_at: string
    updated_at: string
    // Joined
    property?: { id: string; name: string }
}

// Daily Revenue Data
export interface DailyRevenue {
    id: string
    property_id: string
    business_date: string
    room_revenue: number
    fb_revenue: number
    spa_revenue: number
    other_revenue: number
    total_revenue: number // Generated column
    rooms_sold: number
    adr: number // Generated column
    revpar: number
    cash_collections: number
    credit_collections: number
    ar_collections: number
    source_import_id?: string
    created_at: string
    updated_at: string
    // Joined
    property?: { id: string; name: string }
}

// Market Segment Data
export interface MarketSegment {
    id: string
    property_id: string
    business_date: string
    segment_code: string
    segment_name: string
    room_nights: number
    revenue: number
    guests: number
    source_import_id?: string
    created_at: string
}

// Room Inventory by Type
export interface RoomInventory {
    id: string
    property_id: string
    business_date: string
    room_type: string
    rooms_available: number
    rooms_sold: number
    rooms_ooo: number
    avg_rate: number
    source_import_id?: string
    created_at: string
}

// Rate Summary
export interface RateSummary {
    id: string
    property_id: string
    business_date: string
    rate_code: string
    rate_name: string
    room_nights: number
    revenue: number
    avg_rate: number
    source_import_id?: string
    created_at: string
}

// Data Import Log
export interface DataImportLog {
    id: string
    property_id: string
    pms_system_id?: string
    import_type: ImportType
    file_name?: string
    business_date_start?: string
    business_date_end?: string
    started_at: string
    completed_at?: string
    status: SyncStatus
    records_processed: number
    records_failed: number
    error_details?: Record<string, unknown>
    imported_by?: string
    created_at: string
    // Joined
    property?: { id: string; name: string }
    imported_by_profile?: { id: string; full_name: string }
}

// Dashboard KPIs
export interface OperationsKPIs {
    totalRooms: number
    roomsSold: number
    occupancyRate: number
    adr: number
    revpar: number
    totalRevenue: number
    roomRevenue: number
    fbRevenue: number
}

// Flash Report Data
export interface DailyFlashReport {
    date: string
    properties: {
        property_id: string
        property_name: string
        occupancy: DailyOccupancy
        revenue: DailyRevenue
        segments: MarketSegment[]
    }[]
    consolidated: OperationsKPIs
}

// CSV Import Template Types
export interface OccupancyCSVRow {
    business_date: string
    rooms_available: number
    rooms_sold: number
    rooms_ooo?: number
    adults?: number
    children?: number
    no_shows?: number
    cancellations?: number
    walk_ins?: number
}

export interface RevenueCSVRow {
    business_date: string
    room_revenue: number
    fb_revenue?: number
    spa_revenue?: number
    other_revenue?: number
    rooms_sold: number
    cash_collections?: number
    credit_collections?: number
    ar_collections?: number
}
