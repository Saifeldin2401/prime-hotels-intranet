export interface GuestRequest {
    id: string
    property_id: string
    department_id: string | null
    room_number: string | null
    guest_name: string | null
    request_type: string
    description: string | null
    status: 'open' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    assigned_to: string | null
    created_by: string
    completed_at: string | null
    created_at: string
    updated_at: string
}

export interface Incident {
    id: string
    property_id: string
    department_id: string | null
    incident_type: string
    severity: 'minor' | 'moderate' | 'major' | 'critical'
    description: string
    location: string | null
    root_cause?: string | null
    action_plan?: string | null
    estimated_damage_sar?: number | null
    insurance_claimed?: boolean
    reported_by: string
    status: 'open' | 'investigating' | 'resolved' | 'closed'
    resolved_at: string | null
    created_at: string
    updated_at: string
}

export interface VipGuest {
    id: string
    property_id: string
    guest_name: string
    room_number: string | null
    vip_tier: string | null
    notes: string | null
    arrival_date: string | null
    departure_date: string | null
    flagged_by: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface LostFoundItem {
    id: string
    property_id: string
    item_description: string
    found_location: string | null
    found_date: string
    status: 'unclaimed' | 'claimed' | 'disposed'
    claimed_by_guest_name: string | null
    claimed_at: string | null
    stored_location: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface LogbookEntry {
    id: string
    property_id: string
    department_id: string | null
    shift: 'morning' | 'afternoon' | 'evening' | 'night' | null
    entry_type: 'general' | 'handover' | 'incident_ref'
    content: string
    incident_id: string | null
    created_by: string
    created_at: string
    updated_at: string
}
