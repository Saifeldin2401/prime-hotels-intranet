export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            attendance: {
                Row: {
                    id: string
                    employee_id: string
                    date: string
                    check_in: string | null
                    check_out: string | null
                    status: string
                    notes: string | null
                    property_id: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    date: string
                    check_in?: string | null
                    check_out?: string | null
                    status?: string
                    notes?: string | null
                    property_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    date?: string
                    check_in?: string | null
                    check_out?: string | null
                    status?: string
                    notes?: string | null
                    property_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            shifts: {
                Row: {
                    id: string
                    user_id: string
                    shift_type: string
                    start_time: string
                    end_time: string
                    location: string | null
                    department_id: string | null
                    property_id: string | null
                    notes: string | null
                    status: string
                    break_duration_minutes: number
                    created_by: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    shift_type?: string
                    start_time: string
                    end_time: string
                    location?: string | null
                    department_id?: string | null
                    property_id?: string | null
                    notes?: string | null
                    status?: string
                    break_duration_minutes?: number
                    created_by?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    shift_type?: string
                    start_time?: string
                    end_time?: string
                    location?: string | null
                    department_id?: string | null
                    property_id?: string | null
                    notes?: string | null
                    status?: string
                    break_duration_minutes?: number
                    created_by?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            performance_reviews: {
                Row: {
                    id: string
                    employee_id: string
                    reviewer_id: string | null
                    review_period: string
                    review_date: string
                    overall_rating: number
                    rating: number
                    strengths: string | null
                    areas_for_improvement: string | null
                    comments: string | null
                    goals: string | null
                    status: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    reviewer_id?: string | null
                    review_period: string
                    review_date?: string
                    overall_rating: number
                    strengths?: string | null
                    areas_for_improvement?: string | null
                    comments?: string | null
                    goals?: string | null
                    status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    reviewer_id?: string | null
                    review_period?: string
                    review_date?: string
                    overall_rating?: number
                    strengths?: string | null
                    areas_for_improvement?: string | null
                    comments?: string | null
                    goals?: string | null
                    status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            goals: {
                Row: {
                    id: string
                    employee_id: string
                    title: string
                    description: string | null
                    target_date: string | null
                    progress: number | null
                    status: string
                    category: string | null
                    training_module_id: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    title: string
                    description?: string | null
                    target_date?: string | null
                    progress?: number | null
                    status?: string
                    category?: string | null
                    training_module_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    title?: string
                    description?: string | null
                    target_date?: string | null
                    progress?: number | null
                    status?: string
                    category?: string | null
                    training_module_id?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            payslips: {
                Row: {
                    id: string
                    employee_id: string
                    month: number
                    year: number
                    basic_salary: number | null
                    gross_salary: number | null
                    deductions: number | null
                    net_salary: number | null
                    components: Json | null
                    status: string | null
                    payment_date: string | null
                    period_start: string | null
                    period_end: string | null
                    currency: string | null
                    is_published: boolean | null
                    storage_path: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    month: number
                    year: number
                    basic_salary?: number | null
                    gross_salary?: number | null
                    deductions?: number | null
                    net_salary?: number | null
                    components?: Json | null
                    status?: string | null
                    payment_date?: string | null
                    period_start?: string | null
                    period_end?: string | null
                    currency?: string | null
                    is_published?: boolean | null
                    storage_path?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    month?: number
                    year?: number
                    basic_salary?: number | null
                    gross_salary?: number | null
                    deductions?: number | null
                    net_salary?: number | null
                    components?: Json | null
                    status?: string | null
                    payment_date?: string | null
                    period_start?: string | null
                    period_end?: string | null
                    currency?: string | null
                    is_published?: boolean | null
                    storage_path?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            // Re-include existing tables to prevent regression
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
            }
            announcements: {
                Row: {
                    content: string
                    created_at: string | null
                    created_by: string
                    expires_at: string | null
                    id: string
                    is_active: boolean | null
                    is_deleted: boolean | null
                    is_pinned: boolean | null
                    property_id: string | null
                    title: string
                    updated_at: string | null
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    created_by: string
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_deleted?: boolean | null
                    is_pinned?: boolean | null
                    property_id?: string | null
                    title: string
                    updated_at?: string | null
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    created_by?: string
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_deleted?: boolean | null
                    is_pinned?: boolean | null
                    property_id?: string | null
                    title?: string
                    updated_at?: string | null
                }
            }
            user_dashboard_preferences: {
                Row: {
                    id: string
                    user_id: string
                    widget_visibility: Json
                    widget_order: Json
                    property_filter: string | null
                    department_filter: string[] | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    widget_visibility?: Json
                    widget_order?: Json
                    property_filter?: string | null
                    department_filter?: string[] | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    widget_visibility?: Json
                    widget_order?: Json
                    property_filter?: string | null
                    department_filter?: string[] | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
        }
        Enums: {
            app_role: "corporate_admin" | "regional_admin" | "regional_hr" | "property_manager" | "property_hr" | "department_head" | "manager" | "staff"
            approval_request_status: "pending" | "approved" | "rejected" | "cancelled"
            content_type: "sop" | "policy" | "how_to" | "checklist" | "quick_ref" | "faq"
            document_status: "draft" | "pending_review" | "approved" | "published" | "archived" | "rejected"
            entity_status: "draft" | "pending" | "submitted" | "approved" | "rejected" | "todo" | "open" | "in_progress" | "on_hold" | "review" | "pending_parts" | "completed" | "cancelled" | "archived" | "published" | "closed" | "filled" | "active" | "inactive"
            learning_target_type: "user" | "department" | "role" | "property" | "everyone"
            leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
            leave_type: "annual" | "sick" | "unpaid" | "maternity" | "paternity" | "personal" | "other"
            module_status: "draft" | "published" | "archived"
            notification_type: "approval_required" | "request_approved" | "request_rejected" | "training_assigned" | "training_deadline" | "document_published" | "document_acknowledgment_required" | "announcement_new" | "escalation_alert" | "referral_status_update" | "maintenance_assigned" | "maintenance_resolved" | "request_submitted" | "comment_added" | "request_returned" | "request_closed" | "task_assigned" | "document_review_pending" | "document_approved" | "document_rejected" | "document_changes_requested"
            pms_type: "opera" | "cloudbeds" | "mews" | "local" | "other"
            question_difficulty: "easy" | "medium" | "hard" | "expert"
            question_status: "draft" | "pending_review" | "published" | "archived"
            question_type: "mcq" | "mcq_multi" | "true_false" | "fill_blank" | "scenario"
            question_usage_type: "sop_inline" | "lesson" | "quiz" | "certification" | "assessment" | "daily_challenge"
            quiz_type: "mcq" | "true_false" | "fill_blank"
            sync_status: "pending" | "syncing" | "completed" | "failed"
            task_priority: "low" | "medium" | "high" | "urgent"
            training_status: "not_started" | "in_progress" | "completed" | "expired"
        }
    }
}
