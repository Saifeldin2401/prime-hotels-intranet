/**
 * Supabase Database Types
 * Generated from the prime-connect project schema
 * Regenerate with: npx supabase gen types typescript --project-id htsvjfrofcpkfzvjpwvx
 */

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
      // Tables are dynamically typed based on schema
      // Use helper types below for specific table access
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: unknown[]
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
        Relationships: unknown[]
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      app_role:
      | "staff"
      | "manager"
      | "property_manager"
      | "department_head"
      | "property_hr"
      | "regional_admin"
      | "corporate_admin"
      | "super_admin"
      approval_request_status: "pending" | "approved" | "rejected" | "cancelled"
      content_type: "sop" | "policy" | "how_to" | "checklist" | "quick_ref" | "faq"
      document_status:
      | "draft"
      | "pending_review"
      | "approved"
      | "published"
      | "archived"
      | "rejected"
      learning_target_type: "user" | "department" | "role" | "property" | "everyone"
      leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
      | "annual"
      | "sick"
      | "unpaid"
      | "maternity"
      | "paternity"
      | "personal"
      | "other"
      module_status: "draft" | "published" | "archived"
      notification_type:
      | "approval_required"
      | "request_approved"
      | "request_rejected"
      | "training_assigned"
      | "training_deadline"
      | "document_published"
      | "document_acknowledgment_required"
      | "announcement_new"
      | "escalation_alert"
      | "referral_status_update"
      | "maintenance_assigned"
      | "maintenance_resolved"
      | "request_submitted"
      | "comment_added"
      | "request_returned"
      | "request_closed"
      | "task_assigned"
      | "document_review_pending"
      | "document_approved"
      | "document_rejected"
      | "document_changes_requested"
      pms_type: "opera" | "cloudbeds" | "mews" | "local" | "other"
      question_difficulty: "easy" | "medium" | "hard" | "expert"
      question_status: "draft" | "pending_review" | "published" | "archived"
      question_type: "mcq" | "mcq_multi" | "true_false" | "fill_blank" | "scenario"
      question_usage_type:
      | "sop_inline"
      | "lesson"
      | "quiz"
      | "certification"
      | "assessment"
      | "daily_challenge"
      quiz_type: "mcq" | "true_false" | "fill_blank"
      sync_status: "pending" | "syncing" | "completed" | "failed"
      training_status: "not_started" | "in_progress" | "completed" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for type-safe database access
export type AppRole = Database['public']['Enums']['app_role']
export type ContentType = Database['public']['Enums']['content_type']
export type DocumentStatus = Database['public']['Enums']['document_status']
export type NotificationType = Database['public']['Enums']['notification_type']
export type TrainingStatus = Database['public']['Enums']['training_status']
export type QuestionType = Database['public']['Enums']['question_type']
export type QuestionDifficulty = Database['public']['Enums']['question_difficulty']
export type LeaveType = Database['public']['Enums']['leave_type']
export type LeaveRequestStatus = Database['public']['Enums']['leave_request_status']
