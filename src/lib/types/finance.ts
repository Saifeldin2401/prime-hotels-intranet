export interface Budget {
    id: string
    property_id: string
    department_id: string | null
    fiscal_year: number
    period_type: 'annual' | 'quarterly' | 'monthly'
    period_label: string | null
    category: string
    allocated_amount: number
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface Invoice {
    id: string
    property_id: string
    department_id: string | null
    supplier_id: string | null
    purchase_order_id: string | null
    invoice_number: string
    amount: number
    invoice_date: string
    due_date: string | null
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'
    workflow_request_id: string | null
    submitted_by: string
    created_at: string
    updated_at: string
}
