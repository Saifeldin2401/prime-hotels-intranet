export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            announcement_attachments: {
                Row: {
                    announcement_id: string
                    created_at: string | null
                    file_name: string | null
                    file_type: string | null
                    file_url: string
                    id: string
                }
                Insert: {
                    announcement_id: string
                    created_at?: string | null
                    file_name?: string | null
                    file_type?: string | null
                    file_url: string
                    id?: string
                }
                Update: {
                    announcement_id?: string
                    created_at?: string | null
                    file_name?: string | null
                    file_type?: string | null
                    file_url?: string
                    id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "announcement_attachments_announcement_id_fkey"
                        columns: ["announcement_id"]
                        isOneToOne: false
                        referencedRelation: "announcements"
                        referencedColumns: ["id"]
                    },
                ]
            }
            announcement_reads: {
                Row: {
                    announcement_id: string
                    id: string
                    read_at: string | null
                    user_id: string
                }
                Insert: {
                    announcement_id: string
                    id?: string
                    read_at?: string | null
                    user_id: string
                }
                Update: {
                    announcement_id?: string
                    id?: string
                    read_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "announcement_reads_announcement_id_fkey"
                        columns: ["announcement_id"]
                        isOneToOne: false
                        referencedRelation: "announcements"
                        referencedColumns: ["id"]
                    },
                ]
            }
            announcements: {
                Row: {
                    content: string
                    created_at: string | null
                    created_by: string
                    department_id: string | null
                    id: string
                    is_active: boolean
                    priority: Database["public"]["Enums"]["announcement_priority"]
                    property_id: string | null
                    target_audience: Database["public"]["Enums"]["announcement_audience"]
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    created_by: string
                    department_id?: string | null
                    id?: string
                    is_active?: boolean
                    priority?: Database["public"]["Enums"]["announcement_priority"]
                    property_id?: string | null
                    target_audience?: Database["public"]["Enums"]["announcement_audience"]
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    created_by?: string
                    department_id?: string | null
                    id?: string
                    is_active?: boolean
                    priority?: Database["public"]["Enums"]["announcement_priority"]
                    property_id?: string | null
                    target_audience?: Database["public"]["Enums"]["announcement_audience"]
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "announcements_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "announcements_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            audit_logs: {
                Row: {
                    action: string
                    changed_data: Json | null
                    created_at: string | null
                    entity_id: string
                    entity_type: string
                    id: string
                    performed_by: string | null
                    previous_data: Json | null
                }
                Insert: {
                    action: string
                    changed_data?: Json | null
                    created_at?: string | null
                    entity_id: string
                    entity_type: string
                    id?: string
                    performed_by?: string | null
                    previous_data?: Json | null
                }
                Update: {
                    action?: string
                    changed_data?: Json | null
                    created_at?: string | null
                    entity_id?: string
                    entity_type?: string
                    id?: string
                    performed_by?: string | null
                    previous_data?: Json | null
                }
                Relationships: []
            }
            departments: {
                Row: {
                    created_at: string
                    description: string | null
                    description_ar: string | null
                    id: string
                    is_deleted: boolean
                    manager_id: string | null
                    name: string
                    name_ar: string | null
                    property_id: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    description_ar?: string | null
                    id?: string
                    is_deleted?: boolean
                    manager_id?: string | null
                    name: string
                    name_ar?: string | null
                    property_id: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    description_ar?: string | null
                    id?: string
                    is_deleted?: boolean
                    manager_id?: string | null
                    name?: string
                    name_ar?: string | null
                    property_id?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "departments_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            document_approvals: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    approver_role: Database["public"]["Enums"]["app_role"]
                    created_at: string | null
                    document_id: string
                    entity_id: string
                    entity_type: string
                    feedback: string | null
                    id: string
                    rejected_at: string | null
                    rejected_by: string | null
                    rejection_reason: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    approver_role: Database["public"]["Enums"]["app_role"]
                    created_at?: string | null
                    document_id: string
                    entity_id: string
                    entity_type: string
                    feedback?: string | null
                    id?: string
                    rejected_at?: string | null
                    rejected_by?: string | null
                    rejection_reason?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    approver_role?: Database["public"]["Enums"]["app_role"]
                    created_at?: string | null
                    document_id?: string
                    entity_id?: string
                    entity_type?: string
                    feedback?: string | null
                    id?: string
                    rejected_at?: string | null
                    rejected_by?: string | null
                    rejection_reason?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "document_approvals_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                ]
            }
            document_versions: {
                Row: {
                    change_summary: string | null
                    created_at: string | null
                    created_by: string
                    document_id: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id: string
                    version_number: number
                }
                Insert: {
                    change_summary?: string | null
                    created_at?: string | null
                    created_by: string
                    document_id: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id?: string
                    version_number: number
                }
                Update: {
                    change_summary?: string | null
                    created_at?: string | null
                    created_by?: string
                    document_id?: string
                    file_path?: string
                    file_size?: number
                    file_type?: string
                    id?: string
                    version_number?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "document_versions_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                ]
            }
            documents: {
                Row: {
                    category: string
                    created_at: string | null
                    created_by: string
                    department_id: string | null
                    description: string | null
                    expiry_date: string | null
                    file_path: string
                    file_size: number
                    file_type: string
                    id: string
                    is_deleted: boolean
                    next_review_date: string | null
                    property_id: string | null
                    status: Database["public"]["Enums"]["document_status"]
                    tags: string[] | null
                    title: string
                    updated_at: string | null
                    version: number
                    visibility: Database["public"]["Enums"]["document_visibility"]
                }
                Insert: {
                    category: string
                    created_at?: string | null
                    created_by: string
                    department_id?: string | null
                    description?: string | null
                    expiry_date?: string | null
                    file_path: string
                    file_size: number
                    file_type: string
                    id?: string
                    is_deleted?: boolean
                    next_review_date?: string | null
                    property_id?: string | null
                    status?: Database["public"]["Enums"]["document_status"]
                    tags?: string[] | null
                    title: string
                    updated_at?: string | null
                    version?: number
                    visibility?: Database["public"]["Enums"]["document_visibility"]
                }
                Update: {
                    category?: string
                    created_at?: string | null
                    created_by?: string
                    department_id?: string | null
                    description?: string | null
                    expiry_date?: string | null
                    file_path?: string
                    file_size?: number
                    file_type?: string
                    id?: string
                    is_deleted?: boolean
                    next_review_date?: string | null
                    property_id?: string | null
                    status?: Database["public"]["Enums"]["document_status"]
                    tags?: string[] | null
                    title?: string
                    updated_at?: string | null
                    version?: number
                    visibility?: Database["public"]["Enums"]["document_visibility"]
                }
                Relationships: [
                    {
                        foreignKeyName: "documents_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "documents_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            job_applications: {
                Row: {
                    applicant_email: string
                    applicant_name: string
                    applicant_phone: string | null
                    cover_letter: string | null
                    created_at: string | null
                    cv_url: string
                    id: string
                    job_posting_id: string
                    linkedin_url: string | null
                    notes: string | null
                    portfolio_url: string | null
                    referred_by: string | null
                    status: Database["public"]["Enums"]["application_status"]
                    updated_at: string | null
                }
                Insert: {
                    applicant_email: string
                    applicant_name: string
                    applicant_phone?: string | null
                    cover_letter?: string | null
                    created_at?: string | null
                    cv_url: string
                    id?: string
                    job_posting_id: string
                    linkedin_url?: string | null
                    notes?: string | null
                    portfolio_url?: string | null
                    referred_by?: string | null
                    status?: Database["public"]["Enums"]["application_status"]
                    updated_at?: string | null
                }
                Update: {
                    applicant_email?: string
                    applicant_name?: string
                    applicant_phone?: string | null
                    cover_letter?: string | null
                    created_at?: string | null
                    cv_url?: string
                    id?: string
                    job_posting_id?: string
                    linkedin_url?: string | null
                    notes?: string | null
                    portfolio_url?: string | null
                    referred_by?: string | null
                    status?: Database["public"]["Enums"]["application_status"]
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "job_applications_job_posting_id_fkey"
                        columns: ["job_posting_id"]
                        isOneToOne: false
                        referencedRelation: "job_postings"
                        referencedColumns: ["id"]
                    },
                ]
            }
            job_postings: {
                Row: {
                    closes_at: string | null
                    created_at: string | null
                    created_by: string
                    department_id: string | null
                    description: string | null
                    employment_type: Database["public"]["Enums"]["employment_type"]
                    id: string
                    is_deleted: boolean
                    location: string | null
                    priority: string | null
                    property_id: string | null
                    published_at: string | null
                    requirements: string | null
                    responsibilities: string | null
                    salary_range_max: number | null
                    salary_range_min: number | null
                    seniority_level: Database["public"]["Enums"]["seniority_level"]
                    status: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    closes_at?: string | null
                    created_at?: string | null
                    created_by: string
                    department_id?: string | null
                    description?: string | null
                    employment_type?: Database["public"]["Enums"]["employment_type"]
                    id?: string
                    is_deleted?: boolean
                    location?: string | null
                    priority?: string | null
                    property_id?: string | null
                    published_at?: string | null
                    requirements?: string | null
                    responsibilities?: string | null
                    salary_range_max?: number | null
                    salary_range_min?: number | null
                    seniority_level?: Database["public"]["Enums"]["seniority_level"]
                    status?: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    closes_at?: string | null
                    created_at?: string | null
                    created_by?: string
                    department_id?: string | null
                    description?: string | null
                    employment_type?: Database["public"]["Enums"]["employment_type"]
                    id?: string
                    is_deleted?: boolean
                    location?: string | null
                    priority?: string | null
                    property_id?: string | null
                    published_at?: string | null
                    requirements?: string | null
                    responsibilities?: string | null
                    salary_range_max?: number | null
                    salary_range_min?: number | null
                    seniority_level?: Database["public"]["Enums"]["seniority_level"]
                    status?: Database["public"]["Enums"]["entity_status"]
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "job_postings_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "job_postings_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            leave_requests: {
                Row: {
                    approved_at: string | null
                    approved_by_id: string | null
                    created_at: string | null
                    department_id: string | null
                    end_date: string
                    id: string
                    is_deleted: boolean
                    property_id: string | null
                    reason: string | null
                    rejected_at: string | null
                    rejected_by_id: string | null
                    rejection_reason: string | null
                    requester_id: string
                    start_date: string
                    status: Database["public"]["Enums"]["entity_status"]
                    type: Database["public"]["Enums"]["leave_type"]
                    updated_at: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by_id?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    end_date: string
                    id?: string
                    is_deleted?: boolean
                    property_id?: string | null
                    reason?: string | null
                    rejected_at?: string | null
                    rejected_by_id?: string | null
                    rejection_reason?: string | null
                    requester_id: string
                    start_date: string
                    status?: Database["public"]["Enums"]["entity_status"]
                    type: Database["public"]["Enums"]["leave_type"]
                    updated_at?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by_id?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    end_date?: string
                    id?: string
                    is_deleted?: boolean
                    property_id?: string | null
                    reason?: string | null
                    rejected_at?: string | null
                    rejected_by_id?: string | null
                    rejection_reason?: string | null
                    requester_id?: string
                    start_date?: string
                    status?: Database["public"]["Enums"]["entity_status"]
                    type?: Database["public"]["Enums"]["leave_type"]
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "leave_requests_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "leave_requests_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_attachments: {
                Row: {
                    created_at: string | null
                    description: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id: string
                    ticket_id: string
                    uploaded_by_id: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id?: string
                    ticket_id: string
                    uploaded_by_id: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    file_type?: string
                    id?: string
                    ticket_id?: string
                    uploaded_by_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_attachments_ticket_id_fkey"
                        columns: ["ticket_id"]
                        isOneToOne: false
                        referencedRelation: "maintenance_tickets"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_comments: {
                Row: {
                    author_id: string
                    comment: string
                    created_at: string | null
                    id: string
                    internal_only: boolean | null
                    ticket_id: string
                    updated_at: string | null
                }
                Insert: {
                    author_id: string
                    comment: string
                    created_at?: string | null
                    id?: string
                    internal_only?: boolean | null
                    ticket_id: string
                    updated_at?: string | null
                }
                Update: {
                    author_id?: string
                    comment?: string
                    created_at?: string | null
                    id?: string
                    internal_only?: boolean | null
                    ticket_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_comments_ticket_id_fkey"
                        columns: ["ticket_id"]
                        isOneToOne: false
                        referencedRelation: "maintenance_tickets"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_schedules: {
                Row: {
                    assigned_to_id: string | null
                    created_at: string | null
                    created_by: string | null
                    description: string | null
                    frequency: string
                    id: string
                    is_active: boolean | null
                    last_generated_at: string | null
                    next_run_at: string
                    priority: string
                    property_id: string | null
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    assigned_to_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    frequency: string
                    id?: string
                    is_active?: boolean | null
                    last_generated_at?: string | null
                    next_run_at: string
                    priority?: string
                    property_id?: string | null
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    assigned_to_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    frequency?: string
                    id?: string
                    is_active?: boolean | null
                    last_generated_at?: string | null
                    next_run_at?: string
                    priority?: string
                    property_id?: string | null
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_schedules_assigned_to_id_fkey"
                        columns: ["assigned_to_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "maintenance_schedules_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "maintenance_schedules_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            maintenance_tickets: {
                Row: {
                    assigned_to_id: string | null
                    category: string
                    completed_at: string | null
                    created_at: string | null
                    department_id: string | null
                    description: string
                    id: string
                    is_deleted: boolean
                    labor_hours: number | null
                    material_cost: number | null
                    notes: string | null
                    priority: Database["public"]["Enums"]["maintenance_priority"]
                    property_id: string | null
                    reported_by_id: string
                    room_number: string | null
                    status: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    assigned_to?: string | null
                    category: string
                    completed_at?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    description: string
                    id?: string
                    is_deleted?: boolean
                    labor_hours?: number | null
                    material_cost?: number | null
                    notes?: string | null
                    priority?: Database["public"]["Enums"]["maintenance_priority"]
                    property_id?: string | null
                    reported_by: string
                    room_number?: string | null
                    status?: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    assigned_to?: string | null
                    category?: string
                    completed_at?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    description?: string
                    id?: string
                    is_deleted?: boolean
                    labor_hours?: number | null
                    material_cost?: number | null
                    notes?: string | null
                    priority?: Database["public"]["Enums"]["maintenance_priority"]
                    property_id?: string | null
                    reported_by?: string
                    room_number?: string | null
                    status?: Database["public"]["Enums"]["entity_status"]
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "maintenance_tickets_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "maintenance_tickets_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notifications: {
                Row: {
                    created_at: string | null
                    data: Json | null
                    id: string
                    is_read: boolean | null
                    link: string | null
                    message: string
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    data?: Json | null
                    id?: string
                    is_read?: boolean | null
                    link?: string | null
                    message: string
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    data?: Json | null
                    id?: string
                    is_read?: boolean | null
                    link?: string | null
                    message?: string
                    title?: string
                    type?: Database["public"]["Enums"]["notification_type"]
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    bio: string | null
                    created_at: string | null
                    department_id: string | null
                    email: string
                    full_name: string | null
                    id: string
                    is_active: boolean | null
                    is_deleted: boolean
                    job_title: string | null
                    phone_number: string | null
                    property_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    email: string
                    full_name?: string | null
                    id: string
                    is_active?: boolean | null
                    is_deleted?: boolean
                    job_title?: string | null
                    phone_number?: string | null
                    property_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string | null
                    department_id?: string | null
                    email?: string
                    full_name?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_deleted?: boolean
                    job_title?: string | null
                    phone_number?: string | null
                    property_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "profiles_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            properties: {
                Row: {
                    address: string | null
                    created_at: string
                    id: string
                    is_deleted: boolean
                    name: string
                    updated_at: string
                }
                Insert: {
                    address?: string | null
                    created_at?: string
                    id?: string
                    is_deleted?: boolean
                    name: string
                    updated_at?: string
                }
                Update: {
                    address?: string | null
                    created_at?: string
                    id?: string
                    is_deleted?: boolean
                    name?: string
                    updated_at?: string
                }
                Relationships: []
            }
            role_permissions: {
                Row: {
                    id: string
                    permission: Database["public"]["Enums"]["app_permission"]
                    role: Database["public"]["Enums"]["app_role"]
                }
                Insert: {
                    id?: string
                    permission: Database["public"]["Enums"]["app_permission"]
                    role: Database["public"]["Enums"]["app_role"]
                }
                Update: {
                    id?: string
                    permission?: Database["public"]["Enums"]["app_permission"]
                    role?: Database["public"]["Enums"]["app_role"]
                }
                Relationships: []
            }
            task_attachments: {
                Row: {
                    created_at: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id: string
                    task_id: string
                    uploaded_by_id: string
                }
                Insert: {
                    created_at?: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    id?: string
                    task_id: string
                    uploaded_by_id: string
                }
                Update: {
                    created_at?: string | null
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    file_type?: string
                    id?: string
                    task_id?: string
                    uploaded_by_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "task_attachments_task_id_fkey"
                        columns: ["task_id"]
                        isOneToOne: false
                        referencedRelation: "tasks"
                        referencedColumns: ["id"]
                    },
                ]
            }
            task_comments: {
                Row: {
                    author_id: string
                    comment: string
                    created_at: string | null
                    id: string
                    task_id: string
                    updated_at: string | null
                }
                Insert: {
                    author_id: string
                    comment: string
                    created_at?: string | null
                    id?: string
                    task_id: string
                    updated_at?: string | null
                }
                Update: {
                    author_id?: string
                    comment?: string
                    created_at?: string | null
                    id?: string
                    task_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "task_comments_task_id_fkey"
                        columns: ["task_id"]
                        isOneToOne: false
                        referencedRelation: "tasks"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tasks: {
                Row: {
                    assigned_to_id: string | null
                    created_at: string | null
                    created_by_id: string
                    department_id: string | null
                    description: string | null
                    due_date: string | null
                    id: string
                    is_deleted: boolean
                    priority: Database["public"]["Enums"]["task_priority"]
                    property_id: string | null
                    status: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    assigned_to_id?: string | null
                    created_at?: string | null
                    created_by_id: string
                    department_id?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    is_deleted?: boolean
                    priority?: Database["public"]["Enums"]["task_priority"]
                    property_id?: string | null
                    status?: Database["public"]["Enums"]["entity_status"]
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    assigned_to_id?: string | null
                    created_at?: string | null
                    created_by_id?: string
                    department_id?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    is_deleted?: boolean
                    priority?: Database["public"]["Enums"]["task_priority"]
                    property_id?: string | null
                    status?: Database["public"]["Enums"]["entity_status"]
                    title?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tasks_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tasks_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_assignments: {
                Row: {
                    assigned_by: string
                    assigned_to_department_id: string | null
                    assigned_to_property_id: string | null
                    assigned_to_user_id: string | null
                    created_at: string | null
                    deadline: string | null
                    id: string
                    is_deleted: boolean
                    reminder_sent: boolean | null
                    training_module_id: string
                }
                Insert: {
                    assigned_by: string
                    assigned_to_department_id?: string | null
                    assigned_to_property_id?: string | null
                    assigned_to_user_id?: string | null
                    created_at?: string | null
                    deadline?: string | null
                    id?: string
                    is_deleted?: boolean
                    reminder_sent?: boolean | null
                    training_module_id: string
                }
                Update: {
                    assigned_by?: string
                    assigned_to_department_id?: string | null
                    assigned_to_property_id?: string | null
                    assigned_to_user_id?: string | null
                    created_at?: string | null
                    deadline?: string | null
                    id?: string
                    is_deleted?: boolean
                    reminder_sent?: boolean | null
                    training_module_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "training_assignments_assigned_to_department_id_fkey"
                        columns: ["assigned_to_department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_assignments_assigned_to_property_id_fkey"
                        columns: ["assigned_to_property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_assignments_training_module_id_fkey"
                        columns: ["training_module_id"]
                        isOneToOne: false
                        referencedRelation: "training_modules"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_assignment_rules: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    id: string
                    is_active: boolean | null
                    target_department_id: string | null
                    target_role: string
                    training_module_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    is_active?: boolean | null
                    target_department_id?: string | null
                    target_role: string
                    training_module_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    is_active?: boolean | null
                    target_department_id?: string | null
                    target_role?: string
                    training_module_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "training_assignment_rules_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_assignment_rules_target_department_id_fkey"
                        columns: ["target_department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_assignment_rules_training_module_id_fkey"
                        columns: ["training_module_id"]
                        isOneToOne: false
                        referencedRelation: "training_modules"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_content_blocks: {
                Row: {
                    content: Json
                    created_at: string | null
                    estimated_minutes: number
                    id: string
                    is_deleted: boolean
                    is_mandatory: boolean
                    order: number
                    title: string
                    training_module_id: string
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    content: Json
                    created_at?: string | null
                    estimated_minutes?: number
                    id?: string
                    is_deleted?: boolean
                    is_mandatory?: boolean
                    order: number
                    title: string
                    training_module_id: string
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    content?: Json
                    created_at?: string | null
                    estimated_minutes?: number
                    id?: string
                    is_deleted?: boolean
                    is_mandatory?: boolean
                    order?: number
                    title?: string
                    training_module_id?: string
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "training_content_blocks_training_module_id_fkey"
                        columns: ["training_module_id"]
                        isOneToOne: false
                        referencedRelation: "training_modules"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_modules: {
                Row: {
                    category: string
                    created_at: string | null
                    created_by: string
                    description: string | null
                    department_id: string | null
                    difficulty_level: string
                    estimated_duration_minutes: number | null
                    id: string
                    is_active: boolean
                    is_deleted: boolean
                    property_id: string | null
                    status: string
                    title: string
                    updated_at: string | null
                    updated_by: string | null
                    views_count: number | null
                }
                Insert: {
                    category: string
                    created_at?: string | null
                    created_by: string
                    description?: string | null
                    department_id?: string | null
                    difficulty_level?: string
                    estimated_duration_minutes?: number | null
                    id?: string
                    is_active?: boolean
                    is_deleted?: boolean
                    property_id?: string | null
                    status?: string
                    title: string
                    updated_at?: string | null
                    updated_by?: string | null
                    views_count?: number | null
                }
                Update: {
                    category?: string
                    created_at?: string | null
                    created_by?: string
                    description?: string | null
                    department_id?: string | null
                    difficulty_level?: string
                    estimated_duration_minutes?: number | null
                    id?: string
                    is_active?: boolean
                    is_deleted?: boolean
                    property_id?: string | null
                    status?: string
                    title?: string
                    updated_at?: string | null
                    updated_by?: string | null
                    views_count?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "training_modules_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_modules_department_id_fkey"
                        columns: ["department_id"]
                        isOneToOne: false
                        referencedRelation: "departments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_modules_property_id_fkey"
                        columns: ["property_id"]
                        isOneToOne: false
                        referencedRelation: "properties"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_modules_updated_by_fkey"
                        columns: ["updated_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_progress: {
                Row: {
                    assignment_id: string | null
                    can_retry: boolean | null
                    completed_at: string | null
                    created_at: string | null
                    current_step: number | null
                    feedback: string | null
                    id: string
                    is_deleted: boolean
                    last_accessed_at: string | null
                    quiz_answers: Json | null
                    quiz_score: number | null
                    started_at: string | null
                    status: string
                    time_spent_seconds: number | null
                    training_id: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    assignment_id?: string | null
                    can_retry?: boolean | null
                    completed_at?: string | null
                    created_at?: string | null
                    current_step?: number | null
                    feedback?: string | null
                    id?: string
                    is_deleted?: boolean
                    last_accessed_at?: string | null
                    quiz_answers?: Json | null
                    quiz_score?: number | null
                    started_at?: string | null
                    status?: string
                    time_spent_seconds?: number | null
                    training_id: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    assignment_id?: string | null
                    can_retry?: boolean | null
                    completed_at?: string | null
                    created_at?: string | null
                    current_step?: number | null
                    feedback?: string | null
                    id?: string
                    is_deleted?: boolean
                    last_accessed_at?: string | null
                    quiz_answers?: Json | null
                    quiz_score?: number | null
                    started_at?: string | null
                    status?: string
                    time_spent_seconds?: number | null
                    training_id?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "training_progress_assignment_id_fkey"
                        columns: ["assignment_id"]
                        isOneToOne: false
                        referencedRelation: "training_assignments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "training_progress_training_id_fkey"
                        columns: ["training_id"]
                        isOneToOne: false
                        referencedRelation: "training_modules"
                        referencedColumns: ["id"]
                    },
                ]
            }
            training_quizzes: {
                Row: {
                    correct_answer: string
                    created_at: string | null
                    explanation: string | null
                    id: string
                    is_deleted: boolean
                    options: Json
                    order: number
                    question: string
                    training_module_id: string
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    correct_answer: string
                    created_at?: string | null
                    explanation?: string | null
                    id?: string
                    is_deleted?: boolean
                    options: Json
                    order: number
                    question: string
                    training_module_id: string
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    correct_answer?: string
                    created_at?: string | null
                    explanation?: string | null
                    id?: string
                    is_deleted?: boolean
                    options?: Json
                    order?: number
                    question?: string
                    training_module_id?: string
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "training_quizzes_training_module_id_fkey"
                        columns: ["training_module_id"]
                        isOneToOne: false
                        referencedRelation: "training_modules"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_roles: {
                Row: {
                    created_at: string | null
                    id: string
                    role: Database["public"]["Enums"]["app_role"]
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    role: Database["public"]["Enums"]["app_role"]
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    role?: Database["public"]["Enums"]["app_role"]
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_task_stats: {
                Args: {
                    user_id_param: string
                }
                Returns: {
                    total_tasks: number
                    completed_tasks: number
                    pending_tasks: number
                    overdue_tasks: number
                }
            }
        }
        Enums: {
            announcement_audience: "all_staff" | "department" | "property" | "role"
            announcement_priority: "low" | "normal" | "high" | "critical"
            app_permission:
            | "users.view"
            | "users.create"
            | "users.edit"
            | "users.delete"
            | "content.view"
            | "content.create"
            | "content.edit"
            | "content.delete"
            | "reports.view"
            | "settings.view"
            | "settings.edit"
            app_role:
            | "super_admin"
            | "regional_admin"
            | "regional_hr"
            | "property_manager"
            | "property_hr"
            | "department_head"
            | "staff"
            application_status:
            | "received"
            | "review"
            | "shortlisted"
            | "interview"
            | "offer"
            | "hired"
            | "rejected"
            document_status:
            | "DRAFT"
            | "PENDING_REVIEW"
            | "APPROVED"
            | "PUBLISHED"
            | "ARCHIVED"
            | "REJECTED"
            document_visibility:
            | "all_properties"
            | "property"
            | "department"
            | "role"
            employment_type: "full_time" | "part_time" | "contract" | "internship"
            entity_status:
            | "draft"
            | "pending"
            | "approved"
            | "rejected"
            | "published"
            | "archived"
            | "active"
            | "inactive"
            | "open"
            | "in_progress"
            | "completed"
            | "cancelled"
            | "on_hold"
            | "closed"
            | "filled"
            job_posting_status: "draft" | "open" | "closed" | "filled" | "cancelled"
            leave_type:
            | "annual"
            | "sick"
            | "unpaid"
            | "maternity"
            | "paternity"
            | "personal"
            | "other"
            maintenance_priority: "low" | "medium" | "high" | "critical"
            notification_type:
            | "task_assigned"
            | "maintenance_assigned"
            | "maintenance_completed"
            | "leave_status_update"
            | "document_approval_request"
            | "document_approved"
            | "document_rejected"
            | "announcement"
            seniority_level:
            | "entry"
            | "junior"
            | "mid"
            | "senior"
            | "lead"
            | "manager"
            | "director"
            | "vp"
            | "c_level"
            task_priority: "low" | "medium" | "high" | "critical"
        }
    }
}
