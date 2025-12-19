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
                }
            }
            performance_reviews: {
                Row: {
                    id: string
                    employee_id: string
                    reviewer_id: string | null
                    review_period: string
                    overall_rating: number
                    strengths: string | null
                    areas_for_improvement: string | null
                    comments: string | null
                    goals: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    reviewer_id?: string | null
                    review_period: string
                    overall_rating: number
                    strengths?: string | null
                    areas_for_improvement?: string | null
                    comments?: string | null
                    goals?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    reviewer_id?: string | null
                    review_period?: string
                    overall_rating?: number
                    strengths?: string | null
                    areas_for_improvement?: string | null
                    comments?: string | null
                    goals?: string | null
                    created_at?: string | null
                }
            }
            goals: {
                Row: {
                    id: string
                    employee_id: string
                    title: string
                    description: string | null
                    target_date: string | null
                    status: string
                    category: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    title: string
                    description?: string | null
                    target_date?: string | null
                    status?: string
                    category?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    title?: string
                    description?: string | null
                    target_date?: string | null
                    status?: string
                    category?: string | null
                    created_at?: string | null
                }
            }
            payslips: {
                Row: {
                    id: string
                    employee_id: string
                    month: number
                    year: number
                    payment_date: string | null
                    net_pay: number | null
                    is_published: boolean
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    employee_id: string
                    month: number
                    year: number
                    payment_date?: string | null
                    net_pay?: number | null
                    is_published?: boolean | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    employee_id?: string
                    month?: number
                    year?: number
                    payment_date?: string | null
                    net_pay?: number | null
                    is_published?: boolean | null
                    created_at?: string | null
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
        }
        Enums: {
            entity_status: "active" | "inactive" | "pending" | "archived"
            task_priority: "low" | "medium" | "high" | "urgent"
        }
    }
}
