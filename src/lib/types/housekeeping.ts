export interface Room {
    id: string
    property_id: string
    room_number: string
    floor: string | null
    room_type: string | null
    status: 'clean' | 'dirty' | 'inspected' | 'out_of_order' | 'occupied' | 'vacant'
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface HousekeepingTask {
    id: string
    room_id: string
    property_id: string
    task_type: 'checkout_clean' | 'stayover_clean' | 'deep_clean' | 'inspection' | 'maintenance_flag'
    status: 'pending' | 'in_progress' | 'completed' | 'verified'
    priority: 'low' | 'normal' | 'high'
    assigned_to: string | null
    notes: string | null
    started_at: string | null
    completed_at: string | null
    created_by: string
    created_at: string
    updated_at: string
}
