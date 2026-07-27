export interface CrmAccount {
    id: string
    property_id: string | null
    account_name: string
    industry: string | null
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    account_type: 'corporate' | 'travel_agency' | 'event_organizer' | 'government' | 'other'
    status: 'active' | 'inactive' | 'prospect'
    notes: string | null
    owner_id: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface CrmLead {
    id: string
    account_id: string | null
    property_id: string
    lead_name: string
    source: string | null
    estimated_value: number | null
    stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
    expected_close_date: string | null
    owner_id: string | null
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface CrmContract {
    id: string
    account_id: string
    property_id: string
    contract_name: string
    contract_value: number | null
    start_date: string | null
    end_date: string | null
    status: 'draft' | 'active' | 'expired' | 'terminated'
    document_url: string | null
    created_by: string
    created_at: string
    updated_at: string
}
