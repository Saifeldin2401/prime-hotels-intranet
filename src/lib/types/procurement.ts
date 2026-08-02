export interface Supplier {
    id: string
    supplier_name: string
    category: string | null
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    is_active: boolean
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface PurchaseRequest {
    id: string
    property_id: string
    department_id: string | null
    requested_by: string
    item_description: string
    quantity: number
    estimated_cost: number | null
    justification: string | null
    status: 'pending' | 'approved' | 'rejected' | 'converted_to_po'
    approved_by: string | null
    approved_at: string | null
    created_at: string
    updated_at: string
}

export interface PurchaseOrderItem {
    id: string
    purchase_order_id: string
    item_description: string
    quantity: number
    unit_price: number
    total_price: number
    unit: string
    created_at: string
    updated_at: string
}

export interface PurchaseOrder {
    id: string
    purchase_request_id: string | null
    property_id: string
    supplier_id: string
    po_number: string
    total_amount: number
    status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled'
    order_date: string | null
    expected_delivery_date: string | null
    created_by: string
    created_at: string
    updated_at: string
    items?: PurchaseOrderItem[]
}

export interface PoReceipt {
    id: string
    purchase_order_id: string
    received_by: string
    quantity_received: number
    condition_notes: string | null
    received_at: string
    created_at: string
}

export interface GoodsReceivedNote {
    id: string
    grn_number: string
    po_id: string | null
    supplier_id: string | null
    property_id: string | null
    received_date: string
    inspection_status: 'pending' | 'passed' | 'partially_rejected' | 'rejected'
    matching_status: 'unmatched' | 'matched' | 'variance_flagged'
    received_by: string | null
    notes: string | null
    created_at: string
    purchase_order: { po_number: string; total_amount: number } | null
    supplier: { supplier_name: string } | null
}

export interface InventoryItem {
    id: string
    property_id: string
    item_name: string
    category: string | null
    unit: string | null
    quantity_on_hand: number
    reorder_threshold: number | null
    last_updated_by: string | null
    created_at: string
    updated_at: string
}
