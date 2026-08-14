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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_action_notes: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          note: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          note: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_action_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_action_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_action_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_action_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      achievement_definitions: {
        Row: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          color: string | null
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          points: number | null
          title: string
        }
        Insert: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          color?: string | null
          criteria: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          title: string
        }
        Update: {
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          color?: string | null
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          title?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category: string | null
          event_name: string
          id: string
          metadata: Json | null
          page_url: string | null
          properties: Json | null
          session_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          properties?: Json | null
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          properties?: Json | null
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcement_acknowledgments: {
        Row: {
          acknowledged_at: string
          announcement_id: string
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          announcement_id: string
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          announcement_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_acknowledgments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
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
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcement_targets: {
        Row: {
          announcement_id: string
          id: string
          target_departments: string[] | null
          target_properties: string[] | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
        }
        Insert: {
          announcement_id: string
          id?: string
          target_departments?: string[] | null
          target_properties?: string[] | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Update: {
          announcement_id?: string
          id?: string
          target_departments?: string[] | null
          target_properties?: string[] | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: true
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean | null
          attachments: Json | null
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          created_by_id: string | null
          department_id: string | null
          expires_at: string | null
          id: string
          pinned: boolean | null
          priority: Database["public"]["Enums"]["announcement_priority"]
          property_id: string | null
          requires_acknowledgment: boolean | null
          scheduled_at: string | null
          send_email: boolean | null
          send_push_notification: boolean | null
          target_audience: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          attachments?: Json | null
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_id?: string | null
          department_id?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          property_id?: string | null
          requires_acknowledgment?: boolean | null
          scheduled_at?: string | null
          send_email?: boolean | null
          send_push_notification?: boolean | null
          target_audience?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          attachments?: Json | null
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_id?: string | null
          department_id?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          property_id?: string | null
          requires_acknowledgment?: boolean | null
          scheduled_at?: string | null
          send_email?: boolean | null
          send_push_notification?: boolean | null
          target_audience?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
      approval_history: {
        Row: {
          action: string
          approval_request_id: string
          approver_id: string | null
          created_at: string | null
          feedback: string | null
          id: string
          original_approver_id: string | null
          was_delegate: boolean | null
        }
        Insert: {
          action: string
          approval_request_id: string
          approver_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          original_approver_id?: string | null
          was_delegate?: boolean | null
        }
        Update: {
          action?: string
          approval_request_id?: string
          approver_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          original_approver_id?: string | null
          was_delegate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_history_original_approver_id_fkey"
            columns: ["original_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_original_approver_id_fkey"
            columns: ["original_approver_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string | null
          current_approver_id: string | null
          entity_id: string
          entity_type: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_approver_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_approver_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          property_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_export_retention_policies: {
        Row: {
          applies_to_formats: string[] | null
          auto_delete: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          notify_before_delete_days: number | null
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          applies_to_formats?: string[] | null
          auto_delete?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          notify_before_delete_days?: number | null
          retention_days?: number
          updated_at?: string | null
        }
        Update: {
          applies_to_formats?: string[] | null
          auto_delete?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          notify_before_delete_days?: number | null
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_export_retention_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_export_retention_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          run_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          run_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          run_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_findings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "audit_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items: {
        Row: {
          category: string | null
          id: string
          order_index: number | null
          required: boolean | null
          severity: string | null
          template_id: string
          title: string
        }
        Insert: {
          category?: string | null
          id?: string
          order_index?: number | null
          required?: boolean | null
          severity?: string | null
          template_id: string
          title: string
        }
        Update: {
          category?: string | null
          id?: string
          order_index?: number | null
          required?: boolean | null
          severity?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          property_id: string | null
          scope_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          property_id?: string | null
          scope_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          property_id?: string | null
          scope_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          name_ar: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          name_ar?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          name_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          category: string
          created_at: string
          created_by: string
          department_id: string | null
          fiscal_year: number
          gl_code: string | null
          id: string
          notes: string | null
          period_label: string | null
          period_type: string
          property_id: string
          updated_at: string
          variance_target_pct: number | null
        }
        Insert: {
          allocated_amount: number
          category: string
          created_at?: string
          created_by: string
          department_id?: string | null
          fiscal_year: number
          gl_code?: string | null
          id?: string
          notes?: string | null
          period_label?: string | null
          period_type?: string
          property_id: string
          updated_at?: string
          variance_target_pct?: number | null
        }
        Update: {
          allocated_amount?: number
          category?: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          fiscal_year?: number
          gl_code?: string | null
          id?: string
          notes?: string | null
          period_label?: string | null
          period_type?: string
          property_id?: string
          updated_at?: string
          variance_target_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_expenditures: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          invoice_number: string | null
          notes: string | null
          project_id: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capex_expenditures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_expenditures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "capex_expenditures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capex_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "capex_milestones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_milestones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "capex_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_project_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_checklist: Json
          description: string | null
          id: string
          is_active: boolean
          template_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          template_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capex_project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      capex_projects: {
        Row: {
          allocated_budget: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          project_manager_id: string | null
          property_id: string | null
          spent_amount: number
          status: string
          target_completion_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allocated_budget: number
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          project_manager_id?: string | null
          property_id?: string | null
          spent_amount?: number
          status?: string
          target_completion_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allocated_budget?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          project_manager_id?: string | null
          property_id?: string | null
          spent_amount?: number
          status?: string
          target_completion_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capex_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "capex_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "capex_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_history: {
        Row: {
          action: string
          certificate_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          certificate_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          certificate_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          accent_color: string
          background_color: string
          created_at: string
          description: string
          font_family: string
          id: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          name: string
          signature_url: string | null
          template_html: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          created_at?: string
          description?: string
          font_family?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name: string
          signature_url?: string | null
          template_html?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          created_at?: string
          description?: string
          font_family?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name?: string
          signature_url?: string | null
          template_html?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          created_at: string | null
          department_id: string | null
          description: string | null
          expiry_date: string | null
          id: string
          issued_by: string | null
          metadata: Json | null
          passing_score: number | null
          pdf_generated_at: string | null
          pdf_url: string | null
          property_id: string | null
          quiz_attempt_id: string | null
          recipient_email: string | null
          recipient_name: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          score: number | null
          sop_id: string | null
          status: string | null
          title: string
          training_module_id: string | null
          training_progress_id: string | null
          updated_at: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          passing_score?: number | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          property_id?: string | null
          quiz_attempt_id?: string | null
          recipient_email?: string | null
          recipient_name: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          sop_id?: string | null
          status?: string | null
          title: string
          training_module_id?: string | null
          training_progress_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: string
          completion_date?: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          passing_score?: number | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          property_id?: string | null
          quiz_attempt_id?: string | null
          recipient_email?: string | null
          recipient_name?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          sop_id?: string | null
          status?: string | null
          title?: string
          training_module_id?: string | null
          training_progress_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_training_progress_id_fkey"
            columns: ["training_progress_id"]
            isOneToOne: false
            referencedRelation: "learning_progress_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_training_progress_id_fkey"
            columns: ["training_progress_id"]
            isOneToOne: false
            referencedRelation: "training_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_name_ar: string | null
          account_type: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_name_ar?: string | null
          account_type: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_name_ar?: string | null
          account_type?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_edited: boolean | null
          is_internal: boolean | null
          parent_comment_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          name_ar: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          name_ar?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          name_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          participant_id: string
        }
        Insert: {
          conversation_id: string
          participant_id: string
        }
        Update: {
          conversation_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_ids: string[]
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_accounts: {
        Row: {
          account_name: string
          account_type: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          industry: string | null
          notes: string | null
          owner_id: string | null
          property_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          industry?: string | null
          notes?: string | null
          owner_id?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          notes?: string | null
          owner_id?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_accounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contracts: {
        Row: {
          account_id: string
          annual_room_nights_goal: number | null
          blackout_dates_apply: boolean | null
          contract_name: string
          contract_value: number | null
          created_at: string
          created_by: string
          document_url: string | null
          end_date: string | null
          id: string
          property_id: string
          rate_type: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          annual_room_nights_goal?: number | null
          blackout_dates_apply?: boolean | null
          contract_name: string
          contract_value?: number | null
          created_at?: string
          created_by: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          property_id: string
          rate_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          annual_room_nights_goal?: number | null
          blackout_dates_apply?: boolean | null
          contract_name?: string
          contract_value?: number | null
          created_at?: string
          created_by?: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          property_id?: string
          rate_type?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          lead_name: string
          notes: string | null
          owner_id: string | null
          property_id: string
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_name: string
          notes?: string | null
          owner_id?: string | null
          property_id: string
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_name?: string
          notes?: string | null
          owner_id?: string | null
          property_id?: string
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_logs: {
        Row: {
          business_date_end: string | null
          business_date_start: string | null
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          file_name: string | null
          id: string
          import_type: Database["public"]["Enums"]["import_type"]
          imported_by: string | null
          pms_system_id: string | null
          property_id: string
          records_failed: number | null
          records_processed: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"] | null
        }
        Insert: {
          business_date_end?: string | null
          business_date_start?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type: Database["public"]["Enums"]["import_type"]
          imported_by?: string | null
          pms_system_id?: string | null
          property_id: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
        }
        Update: {
          business_date_end?: string | null
          business_date_start?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type?: Database["public"]["Enums"]["import_type"]
          imported_by?: string | null
          pms_system_id?: string | null
          property_id?: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_logs_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_logs_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "data_import_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          allow_redelegate: boolean
          approvals_used: number
          auto_expired: boolean
          created_at: string
          delegate_id: string
          delegation_category: string
          delegation_type: string | null
          delegator_id: string
          ends_at: string
          entity_id: string | null
          entity_type: string | null
          fallback_delegate_ids: string[] | null
          id: string
          is_active: boolean
          max_approvals: number | null
          notify_delegate: boolean
          notify_delegator: boolean
          notify_on_action: boolean
          notify_on_expiry: boolean
          paused_at: string | null
          paused_by: string | null
          permissions: string[] | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope_id: string | null
          scope_type: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          allow_redelegate?: boolean
          approvals_used?: number
          auto_expired?: boolean
          created_at?: string
          delegate_id: string
          delegation_category: string
          delegation_type?: string | null
          delegator_id: string
          ends_at: string
          entity_id?: string | null
          entity_type?: string | null
          fallback_delegate_ids?: string[] | null
          id?: string
          is_active?: boolean
          max_approvals?: number | null
          notify_delegate?: boolean
          notify_delegator?: boolean
          notify_on_action?: boolean
          notify_on_expiry?: boolean
          paused_at?: string | null
          paused_by?: string | null
          permissions?: string[] | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope_id?: string | null
          scope_type?: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          allow_redelegate?: boolean
          approvals_used?: number
          auto_expired?: boolean
          created_at?: string
          delegate_id?: string
          delegation_category?: string
          delegation_type?: string | null
          delegator_id?: string
          ends_at?: string
          entity_id?: string | null
          entity_type?: string | null
          fallback_delegate_ids?: string[] | null
          id?: string
          is_active?: boolean
          max_approvals?: number | null
          notify_delegate?: boolean
          notify_delegator?: boolean
          notify_on_action?: boolean
          notify_on_expiry?: boolean
          paused_at?: string | null
          paused_by?: string | null
          permissions?: string[] | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope_id?: string | null
          scope_type?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_delegate_id_fkey"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_delegate_id_fkey"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delegations_delegator_id_fkey"
            columns: ["delegator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_delegator_id_fkey"
            columns: ["delegator_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delegations_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_paused_by_fkey"
            columns: ["paused_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delegations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          manager_id: string | null
          name: string
          name_ar: string | null
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          manager_id?: string | null
          name: string
          name_ar?: string | null
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          manager_id?: string | null
          name?: string
          name_ar?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "departments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          approver_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          document_id: string
          entity_id: string | null
          entity_type: string | null
          feedback: string | null
          id: string
          is_active: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          document_id: string
          entity_id?: string | null
          entity_type?: string | null
          feedback?: string | null
          id?: string
          is_active?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          document_id?: string
          entity_id?: string | null
          entity_type?: string | null
          feedback?: string | null
          id?: string
          is_active?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_approvals_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_bookmarks: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_categories: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_pinned: boolean | null
          is_resolved: boolean | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          is_pinned?: boolean | null
          is_resolved?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          is_pinned?: boolean | null
          is_resolved?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_department_access: {
        Row: {
          created_at: string | null
          department_id: string | null
          document_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          document_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          document_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_department_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      document_favorites: {
        Row: {
          created_at: string | null
          document_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      document_feedback: {
        Row: {
          created_at: string | null
          document_id: string
          feedback_text: string | null
          helpful: boolean
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          feedback_text?: string | null
          helpful: boolean
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          feedback_text?: string | null
          helpful?: boolean
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          property_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_folders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_notification_rules: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          notify_on_new: boolean | null
          notify_on_update: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          notify_on_new?: boolean | null
          notify_on_update?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          notify_on_new?: boolean | null
          notify_on_update?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_notification_rules_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_notification_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_notification_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_tag_assignments: {
        Row: {
          created_at: string
          document_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "document_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          document_id: string
          file_url: string
          id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          file_url: string
          id?: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          file_url?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_generated: boolean | null
          ai_source_content: string | null
          ai_category: string | null
          ai_processed_at: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          archived_at: string | null
          archived_by: string | null
          block_order: number | null
          block_type: string | null
          category_id: string | null
          checklist_items: Json
          compliance_level: string | null
          confidentiality_level:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          content: string | null
          content_ar: string | null
          content_data: Json | null
          content_type: string | null
          content_url: string | null
          created_at: string | null
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          department_id: string | null
          description: string | null
          description_ar: string | null
          document_number: string | null
          download_count: number | null
          duration_seconds: number | null
          estimated_read_time: number | null
          expires_at: string | null
          faq_items: Json
          featured: boolean
          file_extension: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          folder_id: string | null
          id: string
          images: Json
          is_archived: boolean | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          last_downloaded_at: string | null
          last_published_by: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          last_translated_at: string | null
          linked_quiz_id: string | null
          linked_training_id: string | null
          next_review_date: string | null
          owner_id: string | null
          passing_score: number | null
          points: number | null
          priority: string | null
          property_id: string | null
          published_at: string | null
          quiz_enabled: boolean | null
          requires_acknowledgment: boolean | null
          requires_quiz: boolean | null
          review_frequency_months: number | null
          review_reminder_date: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          search_vector: unknown
          sop_code: string | null
          status: Database["public"]["Enums"]["document_status"]
          subcategory_id: string | null
          summary: string | null
          summary_ar: string | null
          title: string
          title_ar: string | null
          training_module_id: string | null
          translation_status:
            | Database["public"]["Enums"]["translation_status"]
            | null
          updated_at: string | null
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
          video_url: string | null
          view_count: number
          visibility: Database["public"]["Enums"]["document_visibility"]
          visibility_scope:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_source_content?: string | null
          ai_category?: string | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json
          compliance_level?: string | null
          confidentiality_level?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          content?: string | null
          content_ar?: string | null
          content_data?: Json | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          description_ar?: string | null
          document_number?: string | null
          download_count?: number | null
          duration_seconds?: number | null
          estimated_read_time?: number | null
          expires_at?: string | null
          faq_items?: Json
          featured?: boolean
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          images?: Json
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          last_downloaded_at?: string | null
          last_published_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          last_translated_at?: string | null
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          next_review_date?: string | null
          owner_id?: string | null
          passing_score?: number | null
          points?: number | null
          priority?: string | null
          property_id?: string | null
          published_at?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          title: string
          title_ar?: string | null
          training_module_id?: string | null
          translation_status?:
            | Database["public"]["Enums"]["translation_status"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          video_url?: string | null
          view_count?: number
          visibility?: Database["public"]["Enums"]["document_visibility"]
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_source_content?: string | null
          ai_category?: string | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json
          compliance_level?: string | null
          confidentiality_level?:
            | Database["public"]["Enums"]["document_confidentiality"]
            | null
          content?: string | null
          content_ar?: string | null
          content_data?: Json | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          description_ar?: string | null
          document_number?: string | null
          download_count?: number | null
          duration_seconds?: number | null
          estimated_read_time?: number | null
          expires_at?: string | null
          faq_items?: Json
          featured?: boolean
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          images?: Json
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          last_downloaded_at?: string | null
          last_published_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          last_translated_at?: string | null
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          next_review_date?: string | null
          owner_id?: string | null
          passing_score?: number | null
          points?: number | null
          priority?: string | null
          property_id?: string | null
          published_at?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          title?: string
          title_ar?: string | null
          training_module_id?: string | null
          translation_status?:
            | Database["public"]["Enums"]["translation_status"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          video_url?: string | null
          view_count?: number
          visibility?: Database["public"]["Enums"]["document_visibility"]
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_published_by_fkey"
            columns: ["last_published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_published_by_fkey"
            columns: ["last_published_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_linked_training_id_fkey"
            columns: ["linked_training_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          document_number: string | null
          expiry_date: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_number?: string | null
          expiry_date?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_number?: string | null
          expiry_date?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_of_the_month: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number
          property_id: string | null
          reason_ar: string
          reason_en: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          property_id?: string | null
          reason_ar: string
          reason_en: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          property_id?: string | null
          reason_ar?: string
          reason_en?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_of_the_month_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_the_month_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_of_the_month_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_the_month_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_the_month_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employee_promotions: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          created_at: string | null
          effective_date: string
          employee_id: string
          from_department_id: string | null
          from_role: string | null
          from_title: string | null
          id: string
          is_deleted: boolean | null
          notes: string | null
          to_department_id: string | null
          to_role: string
          to_title: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          effective_date: string
          employee_id: string
          from_department_id?: string | null
          from_role?: string | null
          from_title?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          to_department_id?: string | null
          to_role: string
          to_title: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          from_department_id?: string | null
          from_role?: string | null
          from_title?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          to_department_id?: string | null
          to_role?: string
          to_title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_promotions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_promotions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_promotions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_promotions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_promotions_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_promotions_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_referrals: {
        Row: {
          bonus_amount: number | null
          bonus_status: string | null
          candidate_email: string | null
          candidate_name: string
          candidate_phone: string | null
          created_at: string | null
          department: string | null
          hire_date: string | null
          id: string
          job_posting_id: string | null
          notes: string | null
          position_applied: string | null
          property_id: string | null
          referral_date: string | null
          referred_by: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_amount?: number | null
          bonus_status?: string | null
          candidate_email?: string | null
          candidate_name: string
          candidate_phone?: string | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          position_applied?: string | null
          property_id?: string | null
          referral_date?: string | null
          referred_by: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_amount?: number | null
          bonus_status?: string | null
          candidate_email?: string | null
          candidate_name?: string
          candidate_phone?: string | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          position_applied?: string | null
          property_id?: string | null
          referral_date?: string | null
          referred_by?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_referrals_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_referrals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_referrals_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_referrals_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employee_transfers: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          created_at: string | null
          effective_date: string
          employee_id: string
          from_department_id: string | null
          from_property_id: string | null
          id: string
          notes: string | null
          reason: string | null
          to_department_id: string | null
          to_property_id: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          effective_date: string
          employee_id: string
          from_department_id?: string | null
          from_property_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_department_id?: string | null
          to_property_id: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          from_department_id?: string | null
          from_property_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_department_id?: string | null
          to_property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_transfers_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_from_property_id_fkey"
            columns: ["from_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_to_property_id_fkey"
            columns: ["to_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      eom_auto_selections: {
        Row: {
          announced_at: string | null
          announced_eom_id: string | null
          created_at: string | null
          id: string
          month: number
          property_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scoring_history_id: string | null
          selection_reason_ar: string
          selection_reason_en: string
          status: string
          total_score: number
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          announced_at?: string | null
          announced_eom_id?: string | null
          created_at?: string | null
          id?: string
          month: number
          property_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scoring_history_id?: string | null
          selection_reason_ar: string
          selection_reason_en: string
          status?: string
          total_score: number
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          announced_at?: string | null
          announced_eom_id?: string | null
          created_at?: string | null
          id?: string
          month?: number
          property_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scoring_history_id?: string | null
          selection_reason_ar?: string
          selection_reason_en?: string
          status?: string
          total_score?: number
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "eom_auto_selections_announced_eom_id_fkey"
            columns: ["announced_eom_id"]
            isOneToOne: false
            referencedRelation: "employee_of_the_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_auto_selections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_auto_selections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_auto_selections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eom_auto_selections_scoring_history_id_fkey"
            columns: ["scoring_history_id"]
            isOneToOne: false
            referencedRelation: "eom_scoring_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_auto_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_auto_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      eom_automation_config: {
        Row: {
          announcement_day: number | null
          attendance_weight: number | null
          auto_announce: boolean | null
          created_at: string | null
          exclude_recent_winners: boolean | null
          exclusion_months: number | null
          id: string
          is_enabled: boolean | null
          min_attendance_rate: number | null
          min_employment_days: number | null
          min_task_completion_rate: number | null
          property_id: string
          sop_compliance_weight: number | null
          task_completion_weight: number | null
          training_completion_weight: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          announcement_day?: number | null
          attendance_weight?: number | null
          auto_announce?: boolean | null
          created_at?: string | null
          exclude_recent_winners?: boolean | null
          exclusion_months?: number | null
          id?: string
          is_enabled?: boolean | null
          min_attendance_rate?: number | null
          min_employment_days?: number | null
          min_task_completion_rate?: number | null
          property_id: string
          sop_compliance_weight?: number | null
          task_completion_weight?: number | null
          training_completion_weight?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          announcement_day?: number | null
          attendance_weight?: number | null
          auto_announce?: boolean | null
          created_at?: string | null
          exclude_recent_winners?: boolean | null
          exclusion_months?: number | null
          id?: string
          is_enabled?: boolean | null
          min_attendance_rate?: number | null
          min_employment_days?: number | null
          min_task_completion_rate?: number | null
          property_id?: string
          sop_compliance_weight?: number | null
          task_completion_weight?: number | null
          training_completion_weight?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eom_automation_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_automation_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_automation_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      eom_scoring_history: {
        Row: {
          attendance_rate: number | null
          attendance_score: number | null
          created_at: string | null
          id: string
          ineligibility_reason: string | null
          is_eligible: boolean | null
          month: number
          property_id: string
          rank: number
          sop_compliance_rate: number | null
          sop_compliance_score: number | null
          task_completion_rate: number | null
          task_completion_score: number | null
          total_score: number
          training_completion_rate: number | null
          training_completion_score: number | null
          user_id: string
          year: number
        }
        Insert: {
          attendance_rate?: number | null
          attendance_score?: number | null
          created_at?: string | null
          id?: string
          ineligibility_reason?: string | null
          is_eligible?: boolean | null
          month: number
          property_id: string
          rank: number
          sop_compliance_rate?: number | null
          sop_compliance_score?: number | null
          task_completion_rate?: number | null
          task_completion_score?: number | null
          total_score: number
          training_completion_rate?: number | null
          training_completion_score?: number | null
          user_id: string
          year: number
        }
        Update: {
          attendance_rate?: number | null
          attendance_score?: number | null
          created_at?: string | null
          id?: string
          ineligibility_reason?: string | null
          is_eligible?: boolean | null
          month?: number
          property_id?: string
          rank?: number
          sop_compliance_rate?: number | null
          sop_compliance_score?: number | null
          task_completion_rate?: number | null
          task_completion_score?: number | null
          total_score?: number
          training_completion_rate?: number | null
          training_completion_score?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "eom_scoring_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_scoring_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eom_scoring_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      eosb_calculations: {
        Row: {
          basic_salary_sar: number
          calculation_status: string
          created_at: string
          employee_id: string | null
          hire_date: string
          housing_allowance_sar: number
          id: string
          termination_date: string
          termination_reason: string
          total_eosb_sar: number
          transport_allowance_sar: number
          years_of_service: number
        }
        Insert: {
          basic_salary_sar: number
          calculation_status?: string
          created_at?: string
          employee_id?: string | null
          hire_date: string
          housing_allowance_sar?: number
          id?: string
          termination_date: string
          termination_reason: string
          total_eosb_sar: number
          transport_allowance_sar?: number
          years_of_service: number
        }
        Update: {
          basic_salary_sar?: number
          calculation_status?: string
          created_at?: string
          employee_id?: string | null
          hire_date?: string
          housing_allowance_sar?: number
          id?: string
          termination_date?: string
          termination_reason?: string
          total_eosb_sar?: number
          transport_allowance_sar?: number
          years_of_service?: number
        }
        Relationships: [
          {
            foreignKeyName: "eosb_calculations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eosb_calculations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          next_role: Database["public"]["Enums"]["app_role"]
          threshold_hours: number
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_role: Database["public"]["Enums"]["app_role"]
          threshold_hours?: number
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_role?: Database["public"]["Enums"]["app_role"]
          threshold_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          created_at: string | null
          created_by: string
          department_id: string | null
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean | null
          location: string | null
          property_id: string | null
          start_date: string
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string | null
          created_by: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          property_id?: string | null
          start_date: string
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          property_id?: string | null
          start_date?: string
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by_id: string | null
          category: string
          created_at: string | null
          currency: string
          department_id: string | null
          description: string | null
          expense_date: string
          id: string
          metadata: Json | null
          paid_at: string | null
          property_id: string | null
          receipt_bucket: string | null
          receipt_path: string | null
          rejected_at: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          requester_id: string
          status: string | null
          updated_at: string | null
          vendor_name: string | null
          workflow_request_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          department_id?: string | null
          description?: string | null
          expense_date: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          property_id?: string | null
          receipt_bucket?: string | null
          receipt_path?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requester_id: string
          status?: string | null
          updated_at?: string | null
          vendor_name?: string | null
          workflow_request_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          department_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          property_id?: string | null
          receipt_bucket?: string | null
          receipt_path?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requester_id?: string
          status?: string | null
          updated_at?: string | null
          vendor_name?: string | null
          workflow_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_claims_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_claims_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_claims_workflow_request_id_fkey"
            columns: ["workflow_request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempt_count: number
          captcha_required: boolean
          email: string
          first_attempt_at: string
          id: string
          ip_address: string | null
          last_attempt_at: string
          locked_until: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_count?: number
          captcha_required?: boolean
          email: string
          first_attempt_at?: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_count?: number
          captcha_required?: boolean
          email?: string
          first_attempt_at?: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          feed_item_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          feed_item_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          feed_item_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          feed_item_id: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fiscal_period_closes: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          fiscal_month: number
          fiscal_year: number
          id: string
          notes: string | null
          property_id: string | null
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          fiscal_month: number
          fiscal_year: number
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          fiscal_month?: number
          fiscal_year?: number
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_period_closes_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_period_closes_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fiscal_period_closes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          progress: number | null
          status: string | null
          target_date: string | null
          title: string
          training_module_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title: string
          training_module_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title?: string
          training_module_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "goals_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          created_at: string
          grn_number: string
          id: string
          inspection_status: string
          matching_status: string
          notes: string | null
          po_id: string | null
          property_id: string | null
          received_by: string | null
          received_date: string
          supplier_id: string | null
        }
        Insert: {
          created_at?: string
          grn_number: string
          id?: string
          inspection_status?: string
          matching_status?: string
          notes?: string | null
          po_id?: string | null
          property_id?: string | null
          received_by?: string | null
          received_date?: string
          supplier_id?: string | null
        }
        Update: {
          created_at?: string
          grn_number?: string
          id?: string
          inspection_status?: string
          matching_status?: string
          notes?: string | null
          po_id?: string | null
          property_id?: string | null
          received_by?: string | null
          received_date?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "goods_received_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          guest_name: string | null
          id: string
          priority: string
          property_id: string
          request_type: string
          room_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          guest_name?: string | null
          id?: string
          priority?: string
          property_id: string
          request_type: string
          room_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          guest_name?: string | null
          id?: string
          priority?: string
          property_id?: string
          request_type?: string
          room_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_optional: boolean | null
          name: string
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_optional?: boolean | null
          name: string
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_optional?: boolean | null
          name?: string
          property_id?: string | null
        }
        Relationships: []
      }
      hospitality_news: {
        Row: {
          category: string | null
          created_at: string | null
          guid: string | null
          id: string
          image_url: string | null
          is_visible: boolean | null
          original_language: string | null
          original_title: string
          published_at: string
          source: string
          source_url: string | null
          summary_ar: string | null
          summary_en: string | null
          tags: string[] | null
          title_ar: string | null
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          guid?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          original_language?: string | null
          original_title: string
          published_at: string
          source: string
          source_url?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          tags?: string[] | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          guid?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          original_language?: string | null
          original_title?: string
          published_at?: string
          source?: string
          source_url?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          tags?: string[] | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      housekeeping_dispatch: {
        Row: {
          attendant_id: string | null
          completed_at: string | null
          dispatch_status: string
          dispatched_at: string
          estimated_minutes: number
          id: string
          priority_score: number
          property_id: string | null
          room_id: string | null
        }
        Insert: {
          attendant_id?: string | null
          completed_at?: string | null
          dispatch_status?: string
          dispatched_at?: string
          estimated_minutes?: number
          id?: string
          priority_score?: number
          property_id?: string | null
          room_id?: string | null
        }
        Update: {
          attendant_id?: string | null
          completed_at?: string | null
          dispatch_status?: string
          dispatched_at?: string
          estimated_minutes?: number
          id?: string
          priority_score?: number
          property_id?: string | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_dispatch_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_dispatch_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "housekeeping_dispatch_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_dispatch_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          priority: string
          property_id: string
          room_id: string
          started_at: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          priority?: string
          property_id: string
          room_id: string
          started_at?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          attachment_downloads: Json
          attachments: Json
          bcc: string[]
          cc: string[]
          content_fetch_error: string | null
          content_fetched_at: string | null
          created_at: string
          email_id: string | null
          event_type: string
          from: string | null
          headers: Json | null
          html: string | null
          id: string
          message_id: string | null
          raw_download_url: string | null
          raw_event: Json
          raw_expires_at: string | null
          received_created_at: string | null
          reply_to: string[]
          subject: string | null
          text: string | null
          to: string[]
          webhook_created_at: string | null
        }
        Insert: {
          attachment_downloads?: Json
          attachments?: Json
          bcc?: string[]
          cc?: string[]
          content_fetch_error?: string | null
          content_fetched_at?: string | null
          created_at?: string
          email_id?: string | null
          event_type?: string
          from?: string | null
          headers?: Json | null
          html?: string | null
          id?: string
          message_id?: string | null
          raw_download_url?: string | null
          raw_event: Json
          raw_expires_at?: string | null
          received_created_at?: string | null
          reply_to?: string[]
          subject?: string | null
          text?: string | null
          to?: string[]
          webhook_created_at?: string | null
        }
        Update: {
          attachment_downloads?: Json
          attachments?: Json
          bcc?: string[]
          cc?: string[]
          content_fetch_error?: string | null
          content_fetched_at?: string | null
          created_at?: string
          email_id?: string | null
          event_type?: string
          from?: string | null
          headers?: Json | null
          html?: string | null
          id?: string
          message_id?: string | null
          raw_download_url?: string | null
          raw_event?: Json
          raw_expires_at?: string | null
          received_created_at?: string | null
          reply_to?: string[]
          subject?: string | null
          text?: string | null
          to?: string[]
          webhook_created_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          action_plan: string | null
          created_at: string
          department_id: string | null
          description: string
          estimated_damage_sar: number | null
          id: string
          incident_type: string
          insurance_claimed: boolean | null
          location: string | null
          property_id: string
          reported_by: string
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          created_at?: string
          department_id?: string | null
          description: string
          estimated_damage_sar?: number | null
          id?: string
          incident_type: string
          insurance_claimed?: boolean | null
          location?: string | null
          property_id: string
          reported_by: string
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          created_at?: string
          department_id?: string | null
          description?: string
          estimated_damage_sar?: number | null
          id?: string
          incident_type?: string
          insurance_claimed?: boolean | null
          location?: string | null
          property_id?: string
          reported_by?: string
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          last_updated_by: string | null
          property_id: string
          quantity_on_hand: number
          reorder_threshold: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          last_updated_by?: string | null
          property_id: string
          quantity_on_hand?: number
          reorder_threshold?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          last_updated_by?: string | null
          property_id?: string
          quantity_on_hand?: number
          reorder_threshold?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          department_id: string | null
          due_date: string | null
          gl_code: string | null
          id: string
          invoice_date: string
          invoice_number: string
          po_matching_status: string | null
          property_id: string
          purchase_order_id: string | null
          status: string
          submitted_by: string
          supplier_id: string | null
          updated_at: string
          workflow_request_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          department_id?: string | null
          due_date?: string | null
          gl_code?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          po_matching_status?: string | null
          property_id: string
          purchase_order_id?: string | null
          status?: string
          submitted_by: string
          supplier_id?: string | null
          updated_at?: string
          workflow_request_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          department_id?: string | null
          due_date?: string | null
          gl_code?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          po_matching_status?: string | null
          property_id?: string
          purchase_order_id?: string | null
          status?: string
          submitted_by?: string
          supplier_id?: string | null
          updated_at?: string
          workflow_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          cv_bucket: string | null
          cv_filename: string | null
          cv_mime: string | null
          cv_path: string | null
          cv_size: number | null
          cv_url: string | null
          id: string
          job_posting_id: string | null
          notes: string | null
          referral_source: string | null
          referred_by: string | null
          routed_to: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string | null
          cv_bucket?: string | null
          cv_filename?: string | null
          cv_mime?: string | null
          cv_path?: string | null
          cv_size?: number | null
          cv_url?: string | null
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          referral_source?: string | null
          referred_by?: string | null
          routed_to?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string | null
          cv_bucket?: string | null
          cv_filename?: string | null
          cv_mime?: string | null
          cv_path?: string | null
          cv_size?: number | null
          cv_url?: string | null
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          referral_source?: string | null
          referred_by?: string | null
          routed_to?: string[] | null
          status?: string
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
          {
            foreignKeyName: "job_applications_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      job_postings: {
        Row: {
          closes_at: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          employment_type: string
          id: string
          is_deleted: boolean | null
          property_id: string | null
          published_at: string | null
          requirements: string | null
          responsibilities: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          seniority_level: string
          status: Database["public"]["Enums"]["entity_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type: string
          id?: string
          is_deleted?: boolean | null
          property_id?: string | null
          published_at?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          seniority_level: string
          status?: Database["public"]["Enums"]["entity_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string
          id?: string
          is_deleted?: boolean | null
          property_id?: string | null
          published_at?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          seniority_level?: string
          status?: Database["public"]["Enums"]["entity_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
      job_title_role_mappings: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          job_title: string
          system_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          job_title: string
          system_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          job_title?: string
          system_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      job_titles: {
        Row: {
          category: string
          created_at: string | null
          default_role: Database["public"]["Enums"]["app_role"]
          department_id: string | null
          id: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          default_role?: Database["public"]["Enums"]["app_role"]
          department_id?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          default_role?: Database["public"]["Enums"]["app_role"]
          department_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_number: string
          id: string
          posting_date: string
          posting_status: string
          property_id: string | null
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_number: string
          id?: string
          posting_date?: string
          posting_status?: string
          property_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_number?: string
          id?: string
          posting_date?: string
          posting_status?: string
          property_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_name: string
          credit: number
          debit: number
          gl_account_code: string
          id: string
          journal_entry_id: string
          notes: string | null
        }
        Insert: {
          account_name: string
          credit?: number
          debit?: number
          gl_account_code: string
          id?: string
          journal_entry_id: string
          notes?: string | null
        }
        Update: {
          account_name?: string
          credit?: number
          debit?: number
          gl_account_code?: string
          id?: string
          journal_entry_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_related_articles: {
        Row: {
          created_at: string | null
          document_id: string
          related_document_id: string
          relation_type: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          related_document_id: string
          relation_type?: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          related_document_id?: string
          relation_type?: string
        }
        Relationships: []
      }
      knowledge_required_reading: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          document_id: string
          due_date: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          document_id: string
          due_date?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          document_id?: string
          due_date?: string | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_required_reading_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      kudos: {
        Row: {
          category: string | null
          created_at: string | null
          giver_id: string
          id: string
          is_public: boolean | null
          likes_count: number | null
          message: string
          recipient_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          giver_id: string
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          message: string
          recipient_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          giver_id?: string
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          message?: string
          recipient_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kudos_likes: {
        Row: {
          created_at: string | null
          id: string
          kudos_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kudos_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kudos_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_likes_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assignment_exemptions: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["learning_content_type"]
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["learning_content_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["learning_content_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignment_exemptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignment_exemptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_assignment_exemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignment_exemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_assignment_user_overrides: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["learning_content_type"]
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          instructions: string | null
          priority: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["learning_content_type"]
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          priority?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["learning_content_type"]
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          priority?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignment_user_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignment_user_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_assignment_user_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignment_user_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_assignment_user_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignment_user_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_quizzes: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          linked_sop_id: string | null
          max_attempts: number | null
          passing_score_percentage: number | null
          randomize_answers: boolean
          randomize_questions: boolean | null
          show_feedback_during: boolean | null
          source_document_id: string | null
          status: Database["public"]["Enums"]["question_status"]
          time_limit_minutes: number | null
          title: string
          training_module_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          linked_sop_id?: string | null
          max_attempts?: number | null
          passing_score_percentage?: number | null
          randomize_answers?: boolean
          randomize_questions?: boolean | null
          show_feedback_during?: boolean | null
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          time_limit_minutes?: number | null
          title: string
          training_module_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          linked_sop_id?: string | null
          max_attempts?: number | null
          passing_score_percentage?: number | null
          randomize_answers?: boolean
          randomize_questions?: boolean | null
          show_feedback_during?: boolean | null
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          time_limit_minutes?: number | null
          title?: string
          training_module_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "learning_quizzes_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by_id: string | null
          created_at: string
          department_id: string | null
          end_date: string
          id: string
          is_deleted: boolean | null
          property_id: string | null
          reason: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          requester_id: string
          start_date: string
          status: Database["public"]["Enums"]["entity_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at: string
          workflow_request_id: string | null
        }
        Insert: {
          approved_by_id?: string | null
          created_at?: string
          department_id?: string | null
          end_date: string
          id?: string
          is_deleted?: boolean | null
          property_id?: string | null
          reason?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requester_id: string
          start_date: string
          status?: Database["public"]["Enums"]["entity_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
          workflow_request_id?: string | null
        }
        Update: {
          approved_by_id?: string | null
          created_at?: string
          department_id?: string | null
          end_date?: string
          id?: string
          is_deleted?: boolean | null
          property_id?: string | null
          reason?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requester_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["entity_status"]
          type?: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
          workflow_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "leave_requests_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_rejected_by_id_fkey"
            columns: ["rejected_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leave_requests_workflow_request_id_fkey"
            columns: ["workflow_request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          carry_forward: boolean | null
          created_at: string | null
          days_per_year: number | null
          id: string
          name: string
        }
        Insert: {
          carry_forward?: boolean | null
          created_at?: string | null
          days_per_year?: number | null
          id?: string
          name: string
        }
        Update: {
          carry_forward?: boolean | null
          created_at?: string | null
          days_per_year?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      logbook_entries: {
        Row: {
          content: string
          created_at: string
          created_by: string
          department_id: string | null
          entry_type: string
          id: string
          incident_id: string | null
          property_id: string
          shift: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          department_id?: string | null
          entry_type?: string
          id?: string
          incident_id?: string | null
          property_id: string
          shift?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          entry_type?: string
          id?: string
          incident_id?: string | null
          property_id?: string
          shift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logbook_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "logbook_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logbook_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_items: {
        Row: {
          claimed_at: string | null
          claimed_by_guest_name: string | null
          created_at: string
          created_by: string
          found_date: string
          found_location: string | null
          id: string
          item_description: string
          property_id: string
          status: string
          stored_location: string | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_guest_name?: string | null
          created_at?: string
          created_by: string
          found_date?: string
          found_location?: string | null
          id?: string
          item_description: string
          property_id: string
          status?: string
          stored_location?: string | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_guest_name?: string | null
          created_at?: string
          created_by?: string
          found_date?: string
          found_location?: string | null
          id?: string
          item_description?: string
          property_id?: string
          status?: string
          stored_location?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lost_found_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          ticket_id: string
          uploaded_by_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          ticket_id: string
          uploaded_by_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
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
          {
            foreignKeyName: "maintenance_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      maintenance_comments: {
        Row: {
          author_id: string
          comment: string
          created_at: string
          id: string
          internal_only: boolean | null
          ticket_id: string
        }
        Insert: {
          author_id: string
          comment: string
          created_at?: string
          id?: string
          internal_only?: boolean | null
          ticket_id: string
        }
        Update: {
          author_id?: string
          comment?: string
          created_at?: string
          id?: string
          internal_only?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "maintenance_schedules_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
      maintenance_sla_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          priority: string
          sla_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority: string
          sla_hours: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: string
          sla_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_tickets: {
        Row: {
          actual_completion_date: string | null
          ai_notes: string | null
          ai_triage_notes: string | null
          ai_triage_status: string | null
          ai_triaged_at: string | null
          assigned_to_id: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          completed_at: string | null
          created_at: string
          department_id: string | null
          description: string
          due_at: string | null
          escalated_at: string | null
          estimated_completion_date: string | null
          estimated_cost: number | null
          id: string
          is_deleted: boolean | null
          labor_hours: number | null
          material_cost: number | null
          notes: string | null
          parts_needed: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          property_id: string | null
          reported_by_id: string
          room_number: string | null
          sla_hours: number | null
          status: Database["public"]["Enums"]["entity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          ai_notes?: string | null
          ai_triage_notes?: string | null
          ai_triage_status?: string | null
          ai_triaged_at?: string | null
          assigned_to_id?: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          description: string
          due_at?: string | null
          escalated_at?: string | null
          estimated_completion_date?: string | null
          estimated_cost?: number | null
          id?: string
          is_deleted?: boolean | null
          labor_hours?: number | null
          material_cost?: number | null
          notes?: string | null
          parts_needed?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id?: string | null
          reported_by_id: string
          room_number?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          ai_notes?: string | null
          ai_triage_notes?: string | null
          ai_triage_status?: string | null
          ai_triaged_at?: string | null
          assigned_to_id?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          description?: string
          due_at?: string | null
          escalated_at?: string | null
          estimated_completion_date?: string | null
          estimated_cost?: number | null
          id?: string
          is_deleted?: boolean | null
          labor_hours?: number | null
          material_cost?: number | null
          notes?: string | null
          parts_needed?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id?: string | null
          reported_by_id?: string
          room_number?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "maintenance_tickets_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_asset_usages: {
        Row: {
          created_at: string | null
          id: string
          media_asset_id: string
          usage_entity_id: string
          usage_entity_title: string | null
          usage_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_asset_id: string
          usage_entity_id: string
          usage_entity_title?: string | null
          usage_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_asset_id?: string
          usage_entity_id?: string
          usage_entity_title?: string | null
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_usages_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          category: Database["public"]["Enums"]["media_category"] | null
          content_disposition: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size_bytes: number
          filename: string
          height: number | null
          id: string
          is_archived: boolean | null
          is_public: boolean | null
          last_used_at: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json | null
          mime_type: string
          original_filename: string
          property_id: string | null
          public_url: string
          scanned_at: string | null
          sha256_hash: string | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          usage_count: number | null
          virus_scan_score: number | null
          virus_scan_status: string | null
          width: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["media_category"] | null
          content_disposition?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes: number
          filename: string
          height?: number | null
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json | null
          mime_type: string
          original_filename: string
          property_id?: string | null
          public_url: string
          scanned_at?: string | null
          sha256_hash?: string | null
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          virus_scan_score?: number | null
          virus_scan_status?: string | null
          width?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["media_category"] | null
          content_disposition?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number
          filename?: string
          height?: number | null
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json | null
          mime_type?: string
          original_filename?: string
          property_id?: string | null
          public_url?: string
          scanned_at?: string | null
          sha256_hash?: string | null
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          virus_scan_score?: number | null
          virus_scan_status?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_collection_items: {
        Row: {
          added_at: string | null
          collection_id: string | null
          id: string
          media_asset_id: string | null
        }
        Insert: {
          added_at?: string | null
          collection_id?: string | null
          id?: string
          media_asset_id?: string | null
        }
        Update: {
          added_at?: string | null
          collection_id?: string | null
          id?: string
          media_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "media_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_collection_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_collections: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "media_collections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          message_id: string
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
          message_id: string
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
          message_id?: string
          uploaded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          department_id: string | null
          id: string
          message_type: string
          parent_message_id: string | null
          priority: string
          property_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          message_type: string
          parent_message_id?: string | null
          priority?: string
          property_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          message_type?: string
          parent_message_id?: string | null
          priority?: string
          property_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mfa_secrets: {
        Row: {
          backup_codes: string[]
          created_at: string
          enabled: boolean
          id: string
          secret: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          secret: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          secret?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      microlearning_content: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      module_skills: {
        Row: {
          id: string
          module_id: string
          points_awarded: number | null
          skill_id: string
        }
        Insert: {
          id?: string
          module_id: string
          points_awarded?: number | null
          skill_id: string
        }
        Update: {
          id?: string
          module_id?: string
          points_awarded?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_skills_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_content: {
        Row: {
          author_ar: string | null
          author_en: string | null
          category: string | null
          content_ar: string
          content_en: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          author_ar?: string | null
          author_en?: string | null
          category?: string | null
          content_ar: string
          content_en: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          author_ar?: string | null
          author_en?: string | null
          category?: string | null
          content_ar?: string
          content_en?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_batches: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          email_failed_count: number
          email_sent_count: number
          failed_count: number | null
          id: string
          job_type: string
          last_processed_at: string | null
          metadata: Json | null
          processed_count: number | null
          started_at: string | null
          status: string
          total_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_failed_count?: number
          email_sent_count?: number
          failed_count?: number | null
          id?: string
          job_type: string
          last_processed_at?: string | null
          metadata?: Json | null
          processed_count?: number | null
          started_at?: string | null
          status?: string
          total_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email_failed_count?: number
          email_sent_count?: number
          failed_count?: number | null
          id?: string
          job_type?: string
          last_processed_at?: string | null
          metadata?: Json | null
          processed_count?: number | null
          started_at?: string | null
          status?: string
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_delivery_events: {
        Row: {
          attempts: number
          batch_id: string | null
          business_domain: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          notification_id: string | null
          notification_type: string
          opened_at: string | null
          provider: string
          provider_message_id: string | null
          queue_id: string | null
          recipient_email: string
          request_payload: Json
          response_payload: Json
          sent_at: string | null
          status: string
          template_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          batch_id?: string | null
          business_domain?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notification_id?: string | null
          notification_type?: string
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          queue_id?: string | null
          recipient_email: string
          request_payload?: Json
          response_payload?: Json
          sent_at?: string | null
          status?: string
          template_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          batch_id?: string | null
          business_domain?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notification_id?: string | null
          notification_type?: string
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          queue_id?: string | null
          recipient_email?: string
          request_payload?: Json
          response_payload?: Json
          sent_at?: string | null
          status?: string
          template_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "notification_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_email_templates: {
        Row: {
          business_domain: string
          created_at: string
          from_email: string
          from_name: string
          html_template: string
          id: string
          is_active: boolean
          metadata: Json
          notification_type: string
          subject_template: string
          template_key: string
          text_template: string | null
          updated_at: string
          version: number
        }
        Insert: {
          business_domain?: string
          created_at?: string
          from_email?: string
          from_name?: string
          html_template: string
          id?: string
          is_active?: boolean
          metadata?: Json
          notification_type?: string
          subject_template: string
          template_key: string
          text_template?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          business_domain?: string
          created_at?: string
          from_email?: string
          from_name?: string
          html_template?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          notification_type?: string
          subject_template?: string
          template_key?: string
          text_template?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          announcement_email: boolean | null
          announcement_push: boolean | null
          approval_email: boolean | null
          approval_push: boolean | null
          browser_push_enabled: boolean | null
          created_at: string | null
          daily_digest_enabled: boolean | null
          email_enabled: boolean | null
          id: string
          maintenance_email: boolean | null
          maintenance_push: boolean | null
          notification_sounds_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          training_email: boolean | null
          training_push: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_email?: boolean | null
          announcement_push?: boolean | null
          approval_email?: boolean | null
          approval_push?: boolean | null
          browser_push_enabled?: boolean | null
          created_at?: string | null
          daily_digest_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          maintenance_email?: boolean | null
          maintenance_push?: boolean | null
          notification_sounds_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          training_email?: boolean | null
          training_push?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_email?: boolean | null
          announcement_push?: boolean | null
          approval_email?: boolean | null
          approval_push?: boolean | null
          browser_push_enabled?: boolean | null
          created_at?: string | null
          daily_digest_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          maintenance_email?: boolean | null
          maintenance_push?: boolean | null
          notification_sounds_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          training_email?: boolean | null
          training_push?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          batch_id: string
          business_domain: string
          channels: string[]
          created_at: string | null
          email_payload: Json
          email_subject: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          notification_data: Json
          notification_type: string
          priority: string
          processed_at: string | null
          scheduled_for: string | null
          send_email: boolean
          status: string
          template_key: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          batch_id: string
          business_domain?: string
          channels?: string[]
          created_at?: string | null
          email_payload?: Json
          email_subject?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          notification_data?: Json
          notification_type: string
          priority?: string
          processed_at?: string | null
          scheduled_for?: string | null
          send_email?: boolean
          status?: string
          template_key?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          batch_id?: string
          business_domain?: string
          channels?: string[]
          created_at?: string | null
          email_payload?: Json
          email_subject?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          notification_data?: Json
          notification_type?: string
          priority?: string
          processed_at?: string | null
          scheduled_for?: string | null
          send_email?: boolean
          status?: string
          template_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_process: {
        Row: {
          created_at: string
          id: string
          progress_percent: number | null
          start_date: string
          status: Database["public"]["Enums"]["entity_status"] | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress_percent?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["entity_status"] | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          progress_percent?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["entity_status"] | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_process_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_process_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_process_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          link_id: string | null
          link_type: string | null
          process_id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          link_id?: string | null
          link_type?: string | null
          process_id: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          link_id?: string | null
          link_type?: string | null
          process_id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_process"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          required_training_ids: string[]
          role: Database["public"]["Enums"]["app_role"] | null
          tasks: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          required_training_ids?: string[]
          role?: Database["public"]["Enums"]["app_role"] | null
          tasks?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          required_training_ids?: string[]
          role?: Database["public"]["Enums"]["app_role"] | null
          tasks?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_briefing_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          mandate_type: string | null
          message: string | null
          name: string
          organization: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mandate_type?: string | null
          message?: string | null
          name: string
          organization?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mandate_type?: string | null
          message?: string | null
          name?: string
          organization?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      payslips: {
        Row: {
          basic_salary: number | null
          components: Json | null
          created_at: string | null
          currency: string | null
          deductions: number | null
          employee_id: string
          gross_salary: number | null
          id: string
          is_published: boolean | null
          month: number
          net_salary: number | null
          payment_date: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          storage_path: string | null
          updated_at: string
          year: number
        }
        Insert: {
          basic_salary?: number | null
          components?: Json | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          employee_id: string
          gross_salary?: number | null
          id?: string
          is_published?: boolean | null
          month: number
          net_salary?: number | null
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          basic_salary?: number | null
          components?: Json | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          employee_id?: string
          gross_salary?: number | null
          id?: string
          is_published?: boolean | null
          month?: number
          net_salary?: number | null
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pending_user_approvals: {
        Row: {
          email: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_user_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_user_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          areas_for_improvement: string | null
          comments: string | null
          created_at: string | null
          employee_id: string
          goals: string | null
          id: string
          overall_rating: number | null
          rating: number | null
          review_date: string | null
          review_period: string | null
          reviewer_id: string | null
          status: string | null
          strengths: string | null
          updated_at: string | null
        }
        Insert: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          employee_id: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          rating?: number | null
          review_date?: string | null
          review_period?: string | null
          reviewer_id?: string | null
          status?: string | null
          strengths?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          employee_id?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          rating?: number | null
          review_date?: string | null
          review_period?: string | null
          reviewer_id?: string | null
          status?: string | null
          strengths?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      po_receipts: {
        Row: {
          condition_notes: string | null
          created_at: string
          id: string
          purchase_order_id: string
          quantity_received: number
          received_at: string
          received_by: string
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string
          id?: string
          purchase_order_id: string
          quantity_received: number
          received_at?: string
          received_by: string
        }
        Update: {
          condition_notes?: string | null
          created_at?: string
          id?: string
          purchase_order_id?: string
          quantity_received?: number
          received_at?: string
          received_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pre_opening_checklist_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          phase: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_opening_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_opening_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pre_opening_checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_opening_checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pre_opening_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_maintenance_schedules: {
        Row: {
          asset_name: string
          assigned_technician_id: string | null
          created_at: string
          frequency_days: number
          id: string
          last_serviced_at: string | null
          location: string
          next_due_date: string
          property_id: string | null
          status: string
        }
        Insert: {
          asset_name: string
          assigned_technician_id?: string | null
          created_at?: string
          frequency_days?: number
          id?: string
          last_serviced_at?: string | null
          location: string
          next_due_date: string
          property_id?: string | null
          status?: string
        }
        Update: {
          asset_name?: string
          assigned_technician_id?: string | null
          created_at?: string
          frequency_days?: number
          id?: string
          last_serviced_at?: string | null
          location?: string
          next_due_date?: string
          property_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_maintenance_schedules_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_maintenance_schedules_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "preventive_maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          bio: string | null
          blood_group: string | null
          contract_end_date: string | null
          created_at: string | null
          date_of_birth: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string | null
          failed_login_attempts: number | null
          force_password_reset: boolean
          full_name: string | null
          hire_date: string | null
          id: string
          iqama_expiry: string | null
          iqama_number: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          is_temp_password: boolean | null
          job_title: string | null
          language: string
          last_login_at: string | null
          locked_until: string | null
          mfa_required: boolean | null
          national_id: string | null
          nationality: string | null
          password_initialized: boolean | null
          password_last_changed_at: string | null
          phone: string | null
          phone_extension: string | null
          reporting_to: string | null
          salary_grade: string | null
          staff_id: string | null
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          date_of_birth: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          failed_login_attempts?: number | null
          force_password_reset?: boolean
          full_name?: string | null
          hire_date?: string | null
          id: string
          iqama_expiry?: string | null
          iqama_number?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_temp_password?: boolean | null
          job_title?: string | null
          language?: string
          last_login_at?: string | null
          locked_until?: string | null
          mfa_required?: boolean | null
          national_id?: string | null
          nationality?: string | null
          password_initialized?: boolean | null
          password_last_changed_at?: string | null
          phone?: string | null
          phone_extension?: string | null
          reporting_to?: string | null
          salary_grade?: string | null
          staff_id?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          date_of_birth?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          failed_login_attempts?: number | null
          force_password_reset?: boolean
          full_name?: string | null
          hire_date?: string | null
          id?: string
          iqama_expiry?: string | null
          iqama_number?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_temp_password?: boolean | null
          job_title?: string | null
          language?: string
          last_login_at?: string | null
          locked_until?: string | null
          mfa_required?: boolean | null
          national_id?: string | null
          nationality?: string | null
          password_initialized?: boolean | null
          password_last_changed_at?: string | null
          phone?: string | null
          phone_extension?: string | null
          reporting_to?: string | null
          salary_grade?: string | null
          staff_id?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          brand_id: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          is_headquarters: boolean | null
          name: string
          phone: string | null
          property_code: string | null
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_headquarters?: boolean | null
          name: string
          phone?: string | null
          property_code?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_headquarters?: boolean | null
          name?: string
          phone?: string | null
          property_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_description: string
          purchase_order_id: string
          quantity: number
          total_price: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description: string
          purchase_order_id: string
          quantity: number
          total_price?: number
          unit?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string
          purchase_order_id?: string
          quantity?: number
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          expected_delivery_date: string | null
          id: string
          order_date: string | null
          po_number: string
          property_id: string
          purchase_request_id: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expected_delivery_date?: string | null
          id?: string
          order_date?: string | null
          po_number: string
          property_id: string
          purchase_request_id?: string | null
          status?: string
          supplier_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_delivery_date?: string | null
          id?: string
          order_date?: string | null
          po_number?: string
          property_id?: string
          purchase_request_id?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          department_id: string | null
          estimated_cost: number | null
          id: string
          item_description: string
          justification: string | null
          property_id: string
          quantity: number
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department_id?: string | null
          estimated_cost?: number | null
          id?: string
          item_description: string
          justification?: string | null
          property_id: string
          quantity: number
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department_id?: string | null
          estimated_cost?: number | null
          id?: string
          item_description?: string
          justification?: string | null
          property_id?: string
          quantity?: number
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_entries: {
        Row: {
          count: number
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      referral_history: {
        Row: {
          change_note: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          referral_id: string
        }
        Insert: {
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          referral_id: string
        }
        Update: {
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      related_articles: {
        Row: {
          created_at: string | null
          id: string
          related_document_id: string
          relevance_score: number | null
          source_document_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_document_id: string
          relevance_score?: number | null
          source_document_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          related_document_id?: string
          relevance_score?: number | null
          source_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          filters: Json | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          property_id: string | null
          report_type: string
          schedule_cron: string | null
          schedule_frequency: string | null
          scope_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          property_id?: string | null
          report_type: string
          schedule_cron?: string | null
          schedule_frequency?: string | null
          scope_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          property_id?: string | null
          report_type?: string
          schedule_cron?: string | null
          schedule_frequency?: string | null
          scope_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_definitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          output_bucket: string | null
          output_path: string | null
          output_url: string | null
          report_id: string
          row_count: number | null
          started_at: string | null
          status: string | null
          triggered_by: string | null
          triggered_via: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          output_bucket?: string | null
          output_path?: string | null
          output_url?: string | null
          report_id: string
          row_count?: number | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
          triggered_via?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          output_bucket?: string | null
          output_path?: string | null
          output_url?: string | null
          report_id?: string
          row_count?: number | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
          triggered_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          request_id: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          request_id: string
          storage_bucket: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          request_id?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      request_comments: {
        Row: {
          author_id: string
          comment: string
          created_at: string | null
          id: string
          request_id: string
          visibility: string
        }
        Insert: {
          author_id: string
          comment: string
          created_at?: string | null
          id?: string
          request_id: string
          visibility?: string
        }
        Update: {
          author_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          request_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_sla_policies: {
        Row: {
          created_at: string
          default_priority: string | null
          entity_type: string
          id: string
          is_active: boolean
          sla_hours: number | null
          step_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_priority?: string | null
          entity_type: string
          id?: string
          is_active?: boolean
          sla_hours?: number | null
          step_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_priority?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          sla_hours?: number | null
          step_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      request_steps: {
        Row: {
          acted_at: string | null
          assignee_id: string | null
          assignee_role: string | null
          comment: string | null
          created_at: string | null
          created_by: string | null
          due_at: string | null
          escalated_at: string | null
          id: string
          request_id: string
          sla_hours: number | null
          status: string
          step_order: number
        }
        Insert: {
          acted_at?: string | null
          assignee_id?: string | null
          assignee_role?: string | null
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          escalated_at?: string | null
          id?: string
          request_id: string
          sla_hours?: number | null
          status?: string
          step_order: number
        }
        Update: {
          acted_at?: string | null
          assignee_id?: string | null
          assignee_role?: string | null
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          escalated_at?: string | null
          id?: string
          request_id?: string
          sla_hours?: number | null
          status?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_steps_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_steps_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "request_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "request_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          closed_at: string | null
          created_at: string | null
          current_assignee_id: string | null
          department_id: string | null
          due_at: string | null
          entity_id: string
          entity_type: string
          id: string
          last_action_at: string | null
          metadata: Json | null
          priority: string
          property_id: string | null
          request_no: number
          requester_id: string
          status: string
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          current_assignee_id?: string | null
          department_id?: string | null
          due_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_action_at?: string | null
          metadata?: Json | null
          priority?: string
          property_id?: string | null
          request_no?: number
          requester_id: string
          status?: string
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          current_assignee_id?: string | null
          department_id?: string | null
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_action_at?: string | null
          metadata?: Json | null
          priority?: string
          property_id?: string | null
          request_no?: number
          requester_id?: string
          status?: string
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_current_assignee_id_fkey"
            columns: ["current_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_current_assignee_id_fkey"
            columns: ["current_assignee_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          granted: boolean
          id: string
          permission: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      room_inspections: {
        Row: {
          checklist_scores: Json
          created_at: string
          id: string
          inspector_id: string
          notes: string | null
          passed: boolean
          property_id: string
          room_id: string
        }
        Insert: {
          checklist_scores?: Json
          created_at?: string
          id?: string
          inspector_id: string
          notes?: string | null
          passed?: boolean
          property_id: string
          room_id: string
        }
        Update: {
          checklist_scores?: Json
          created_at?: string
          id?: string
          inspector_id?: string
          notes?: string | null
          passed?: boolean
          property_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "room_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          floor: string | null
          id: string
          is_active: boolean
          notes: string | null
          property_id: string
          room_number: string
          room_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id: string
          room_number: string
          room_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id?: string
          room_number?: string
          room_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          created_at: string | null
          default_value: number | null
          id: string
          is_percentage: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: number | null
          id?: string
          is_percentage?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: number | null
          id?: string
          is_percentage?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      saudization_nitaqat_snapshots: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          nitaqat_zone: string
          non_saudi_count: number
          property_id: string | null
          saudi_count: number
          saudization_rate_pct: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          nitaqat_zone: string
          non_saudi_count?: number
          property_id?: string | null
          saudi_count?: number
          saudization_rate_pct?: number
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          nitaqat_zone?: string
          non_saudi_count?: number
          property_id?: string | null
          saudi_count?: number
          saudization_rate_pct?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "saudization_nitaqat_snapshots_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saudization_nitaqat_snapshots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_compliance_reports: {
        Row: {
          created_at: string | null
          created_by: string
          delivery_config: Json | null
          description: string | null
          failure_count: number | null
          format: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_run_at: string | null
          next_run_at: string | null
          recipient_roles: string[] | null
          report_name: string
          report_scope: Json | null
          report_type: string
          run_count: number | null
          schedule_cron: string
          schedule_timezone: string | null
          template_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          delivery_config?: Json | null
          description?: string | null
          failure_count?: number | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipient_roles?: string[] | null
          report_name: string
          report_scope?: Json | null
          report_type: string
          run_count?: number | null
          schedule_cron: string
          schedule_timezone?: string | null
          template_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          delivery_config?: Json | null
          description?: string | null
          failure_count?: number | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipient_roles?: string[] | null
          report_name?: string
          report_scope?: Json | null
          report_type?: string
          run_count?: number | null
          schedule_cron?: string
          schedule_timezone?: string | null
          template_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_compliance_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_compliance_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          notification_data: Json | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notification_data?: Json | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notification_data?: Json | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scheduled_report_executions: {
        Row: {
          completed_at: string | null
          emails_delivered: number | null
          emails_failed: number | null
          emails_sent: number | null
          error_details: Json | null
          error_message: string | null
          export_id: string | null
          file_size_bytes: number | null
          id: string
          records_exported: number | null
          report_id: string
          started_at: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          error_details?: Json | null
          error_message?: string | null
          export_id?: string | null
          file_size_bytes?: number | null
          id?: string
          records_exported?: number | null
          report_id: string
          started_at?: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          error_details?: Json | null
          error_message?: string | null
          export_id?: string | null
          file_size_bytes?: number | null
          id?: string
          records_exported?: number | null
          report_id?: string
          started_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_compliance_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          property_id: string | null
          query: string
          result_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          property_id?: string | null
          query: string
          result_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          property_id?: string | null
          query?: string
          result_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_duration_minutes: number | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          end_time: string
          id: string
          location: string | null
          notes: string | null
          property_id: string | null
          shift_type: string | null
          start_time: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          break_duration_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          property_id?: string | null
          shift_type?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          break_duration_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          property_id?: string | null
          shift_type?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sop_comment_votes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "sop_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sop_comments: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          id: string
          is_pinned: boolean | null
          is_question: boolean | null
          parent_id: string | null
          updated_at: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          id?: string
          is_pinned?: boolean | null
          is_question?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          id?: string
          is_pinned?: boolean | null
          is_question?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "sop_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sop_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      supplier_scorecards: {
        Row: {
          comments: string | null
          created_at: string
          delivery_timeliness_score: number
          evaluation_period: string
          evaluator_id: string | null
          id: string
          overall_score: number
          price_score: number
          quality_score: number
          supplier_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          delivery_timeliness_score: number
          evaluation_period: string
          evaluator_id?: string | null
          id?: string
          overall_score: number
          price_score: number
          quality_score: number
          supplier_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          delivery_timeliness_score?: number
          evaluation_period?: string
          evaluator_id?: string | null
          id?: string
          overall_score?: number
          price_score?: number
          quality_score?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_scorecards_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_scorecards_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "supplier_scorecards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          notes: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_events: {
        Row: {
          actor_id: string | null
          created_at: string
          department_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          property_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          department_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          property_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          department_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          property_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_wiki: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][] | null
          content_ar: string | null
          content_en: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          slug: string
          subtopics: Json | null
          title_ar: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][] | null
          content_ar?: string | null
          content_en?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug: string
          subtopics?: Json | null
          title_ar: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][] | null
          content_ar?: string | null
          content_en?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug?: string
          subtopics?: Json | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          task_id: string
          uploaded_by_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          task_id: string
          uploaded_by_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
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
          {
            foreignKeyName: "task_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          assigned_to_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          priority: string | null
          property_id: string | null
          recurrence_config: Json | null
          recurrence_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          priority?: string | null
          property_id?: string | null
          recurrence_config?: Json | null
          recurrence_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          priority?: string | null
          property_id?: string | null
          recurrence_config?: Json | null
          recurrence_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to_id: string | null
          completed_at: string | null
          created_at: string
          created_by_id: string
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_deleted: boolean | null
          priority: Database["public"]["Enums"]["task_priority"]
          property_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_deleted?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_id?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_deleted?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
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
      tax_returns: {
        Row: {
          created_at: string
          id: string
          net_vat_due_sar: number
          period_end: string
          period_name: string
          period_start: string
          property_id: string | null
          submitted_at: string | null
          taxable_purchases_sar: number
          taxable_sales_sar: number
          vat_collected_sar: number
          vat_paid_sar: number
          zatca_submission_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          net_vat_due_sar?: number
          period_end: string
          period_name: string
          period_start: string
          property_id?: string | null
          submitted_at?: string | null
          taxable_purchases_sar?: number
          taxable_sales_sar?: number
          vat_collected_sar?: number
          vat_paid_sar?: number
          zatca_submission_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          net_vat_due_sar?: number
          period_end?: string
          period_name?: string
          period_start?: string
          property_id?: string | null
          submitted_at?: string | null
          taxable_purchases_sar?: number
          taxable_sales_sar?: number
          vat_collected_sar?: number
          vat_paid_sar?: number
          zatca_submission_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_returns_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignment_rules: {
        Row: {
          assigned_by: string | null
          content_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          expires_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          notify_on_due: boolean | null
          priority: string | null
          reminder_days_before: number[] | null
          requires_acknowledgement: boolean | null
          target_department_id: string | null
          target_id: string | null
          target_role: string | null
          target_type: string | null
          training_module_id: string | null
          valid_from: string | null
        }
        Insert: {
          assigned_by?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          notify_on_due?: boolean | null
          priority?: string | null
          reminder_days_before?: number[] | null
          requires_acknowledgement?: boolean | null
          target_department_id?: string | null
          target_id?: string | null
          target_role?: string | null
          target_type?: string | null
          training_module_id?: string | null
          valid_from?: string | null
        }
        Update: {
          assigned_by?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          notify_on_due?: boolean | null
          priority?: string | null
          reminder_days_before?: number[] | null
          requires_acknowledgement?: boolean | null
          target_department_id?: string | null
          target_id?: string | null
          target_role?: string | null
          target_type?: string | null
          training_module_id?: string | null
          valid_from?: string | null
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
            foreignKeyName: "training_assignment_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
      training_block_progress: {
        Row: {
          block_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          last_viewed_at: string | null
          time_spent_seconds: number | null
          training_module_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          time_spent_seconds?: number | null
          training_module_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          time_spent_seconds?: number | null
          training_module_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_block_progress_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_certificate_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          include_completion_date: boolean | null
          include_score: boolean | null
          issue_on_completion: boolean | null
          minimum_score: number | null
          module_id: string
          require_passing_score: boolean | null
          template_id: string | null
          updated_at: string | null
          validity_period: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          include_completion_date?: boolean | null
          include_score?: boolean | null
          issue_on_completion?: boolean | null
          minimum_score?: number | null
          module_id: string
          require_passing_score?: boolean | null
          template_id?: string | null
          updated_at?: string | null
          validity_period?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          include_completion_date?: boolean | null
          include_score?: boolean | null
          issue_on_completion?: boolean | null
          minimum_score?: number | null
          module_id?: string
          require_passing_score?: boolean | null
          template_id?: string | null
          updated_at?: string | null
          validity_period?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_certificate_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificate_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_certificate_settings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificate_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_certificates: {
        Row: {
          attempt_id: string | null
          certificate_url: string
          expires_at: string | null
          id: string
          issued_at: string | null
          training_progress_id: string
          verification_code: string | null
        }
        Insert: {
          attempt_id?: string | null
          certificate_url: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          training_progress_id: string
          verification_code?: string | null
        }
        Update: {
          attempt_id?: string | null
          certificate_url?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          training_progress_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_training_progress_id_fkey"
            columns: ["training_progress_id"]
            isOneToOne: true
            referencedRelation: "learning_progress_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_training_progress_id_fkey"
            columns: ["training_progress_id"]
            isOneToOne: true
            referencedRelation: "training_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      training_content_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_structure: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_structure: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_structure?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_module_prerequisites: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          prerequisite_module_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          prerequisite_module_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          prerequisite_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_module_prerequisites_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_prerequisites_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_versions: {
        Row: {
          created_at: string
          id: string
          published_by: string | null
          snapshot: Json
          training_module_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          published_by?: string | null
          snapshot: Json
          training_module_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          published_by?: string | null
          snapshot?: Json
          training_module_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_module_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_module_versions_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          allow_retake: boolean | null
          audience: string | null
          auto_advance: boolean | null
          category: string | null
          certificate_enabled: boolean
          content_language: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration_minutes: number | null
          id: string
          is_deleted: boolean
          max_attempts: number | null
          passing_score_percentage: number | null
          property_id: string | null
          randomize_questions: boolean | null
          show_answers: boolean | null
          show_feedback: boolean | null
          status: string
          template_id: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
          updated_by: string | null
          validity_period_days: number | null
        }
        Insert: {
          allow_retake?: boolean | null
          audience?: string | null
          auto_advance?: boolean | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_deleted?: boolean
          max_attempts?: number | null
          passing_score_percentage?: number | null
          property_id?: string | null
          randomize_questions?: boolean | null
          show_answers?: boolean | null
          show_feedback?: boolean | null
          status?: string
          template_id?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          validity_period_days?: number | null
        }
        Update: {
          allow_retake?: boolean | null
          audience?: string | null
          auto_advance?: boolean | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_deleted?: boolean
          max_attempts?: number | null
          passing_score_percentage?: number | null
          property_id?: string | null
          randomize_questions?: boolean | null
          show_answers?: boolean | null
          show_feedback?: boolean | null
          status?: string
          template_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          validity_period_days?: number | null
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
            foreignKeyName: "training_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "training_modules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "training_content_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_path_modules: {
        Row: {
          id: string
          is_mandatory: boolean | null
          module_id: string | null
          path_id: string | null
          sequence: number
        }
        Insert: {
          id?: string
          is_mandatory?: boolean | null
          module_id?: string | null
          path_id?: string | null
          sequence: number
        }
        Update: {
          id?: string
          is_mandatory?: boolean | null
          module_id?: string | null
          path_id?: string | null
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_path_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_path_modules_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "training_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      training_paths: {
        Row: {
          certificate_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          path_type: string
          target_department_id: string | null
          target_property_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          certificate_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          path_type: string
          target_department_id?: string | null
          target_property_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          certificate_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          path_type?: string
          target_department_id?: string | null
          target_property_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_paths_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_paths_target_property_id_fkey"
            columns: ["target_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          acknowledged_at: string | null
          assignment_id: string | null
          certificate_url: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_deleted: boolean
          last_accessed_at: string | null
          last_activity_at: string | null
          last_block_id: string | null
          last_block_index: number | null
          last_session_id: string | null
          lp_content_type: string | null
          metadata: Json | null
          passed: boolean | null
          progress_percentage: number | null
          quiz_score: number | null
          score_percentage: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["training_status"]
          time_spent_seconds: number | null
          training_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          last_accessed_at?: string | null
          last_activity_at?: string | null
          last_block_id?: string | null
          last_block_index?: number | null
          last_session_id?: string | null
          lp_content_type?: string | null
          metadata?: Json | null
          passed?: boolean | null
          progress_percentage?: number | null
          quiz_score?: number | null
          score_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          time_spent_seconds?: number | null
          training_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          last_accessed_at?: string | null
          last_activity_at?: string | null
          last_block_id?: string | null
          last_block_index?: number | null
          last_session_id?: string | null
          lp_content_type?: string | null
          metadata?: Json | null
          passed?: boolean | null
          progress_percentage?: number | null
          quiz_score?: number | null
          score_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          time_spent_seconds?: number | null
          training_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unified_question_attempts: {
        Row: {
          attempt_number: number | null
          context_entity_id: string | null
          context_type: string | null
          created_at: string | null
          hint_used: boolean | null
          id: string
          is_correct: boolean | null
          partial_score: number | null
          question_id: string
          selected_answer: string | null
          selected_options: string[] | null
          session_id: string | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          context_entity_id?: string | null
          context_type?: string | null
          created_at?: string | null
          hint_used?: boolean | null
          id?: string
          is_correct?: boolean | null
          partial_score?: number | null
          question_id: string
          selected_answer?: string | null
          selected_options?: string[] | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          context_entity_id?: string | null
          context_type?: string | null
          created_at?: string | null
          hint_used?: boolean | null
          id?: string
          is_correct?: boolean | null
          partial_score?: number | null
          question_id?: string
          selected_answer?: string | null
          selected_options?: string[] | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_question_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          feedback: string | null
          feedback_ar: string | null
          id: string
          is_correct: boolean | null
          match_value: string | null
          match_value_ar: string | null
          option_text: string
          option_text_ar: string | null
          question_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          feedback?: string | null
          feedback_ar?: string | null
          id?: string
          is_correct?: boolean | null
          match_value?: string | null
          match_value_ar?: string | null
          option_text: string
          option_text_ar?: string | null
          question_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          feedback?: string | null
          feedback_ar?: string | null
          id?: string
          is_correct?: boolean | null
          match_value?: string | null
          match_value_ar?: string | null
          option_text?: string
          option_text_ar?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_question_usages: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          question_id: string
          usage_entity_id: string
          usage_type: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          question_id: string
          usage_entity_id: string
          usage_type: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          question_id?: string
          usage_entity_id?: string
          usage_type?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_question_versions: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          data_snapshot: Json
          id: string
          question_id: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          data_snapshot: Json
          id?: string
          question_id: string
          version_number: number
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          data_snapshot?: Json
          id?: string
          question_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_questions: {
        Row: {
          accepted_answers: string[] | null
          ai_confidence_score: number | null
          ai_generated: boolean | null
          ai_model_used: string | null
          ai_prompt_used: string | null
          correct_answer: string | null
          created_at: string | null
          created_by: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          estimated_time_seconds: number | null
          explanation: string | null
          explanation_ar: string | null
          hint: string | null
          hint_ar: string | null
          id: string
          linked_sop_id: string | null
          linked_sop_section: string | null
          points: number | null
          question_text: string
          question_text_ar: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_document_id: string | null
          source_domain: string
          status: Database["public"]["Enums"]["question_status"]
          tags: string[] | null
          training_module_id: string | null
          training_section_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          accepted_answers?: string[] | null
          ai_confidence_score?: number | null
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          id?: string
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          points?: number | null
          question_text: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id?: string | null
          source_domain?: string
          status?: Database["public"]["Enums"]["question_status"]
          tags?: string[] | null
          training_module_id?: string | null
          training_section_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          accepted_answers?: string[] | null
          ai_confidence_score?: number | null
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          id?: string
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          points?: number | null
          question_text?: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id?: string | null
          source_domain?: string
          status?: Database["public"]["Enums"]["question_status"]
          tags?: string[] | null
          training_module_id?: string | null
          training_section_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "unified_questions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unified_quiz_questions: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          points_override: number | null
          question_id: string
          quiz_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          points_override?: number | null
          question_id: string
          quiz_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          points_override?: number | null
          question_id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "learning_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_quiz_sessions: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          earned_points: number | null
          id: string
          passed: boolean | null
          passing_score: number | null
          quiz_entity_id: string | null
          quiz_type: string
          score_percentage: number | null
          started_at: string | null
          time_limit_seconds: number | null
          total_points: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string
          passed?: boolean | null
          passing_score?: number | null
          quiz_entity_id?: string | null
          quiz_type: string
          score_percentage?: number | null
          started_at?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string
          passed?: boolean | null
          passing_score?: number | null
          quiz_entity_id?: string | null
          quiz_type?: string
          score_percentage?: number | null
          started_at?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          color: string | null
          created_at: string
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          metadata: Json | null
          points: number | null
          title: string
          user_id: string
        }
        Insert: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          color?: string | null
          created_at?: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          title: string
          user_id: string
        }
        Update: {
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          color?: string | null
          created_at?: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_dashboard_preferences: {
        Row: {
          created_at: string | null
          department_filter: string[] | null
          id: string
          property_filter: string | null
          updated_at: string | null
          user_id: string
          widget_order: Json | null
          widget_visibility: Json | null
        }
        Insert: {
          created_at?: string | null
          department_filter?: string[] | null
          id?: string
          property_filter?: string | null
          updated_at?: string | null
          user_id: string
          widget_order?: Json | null
          widget_visibility?: Json | null
        }
        Update: {
          created_at?: string | null
          department_filter?: string[] | null
          id?: string
          property_filter?: string | null
          updated_at?: string | null
          user_id?: string
          widget_order?: Json | null
          widget_visibility?: Json | null
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          department_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          department_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          id: string
          invite_url: string | null
          invited_at: string
          invited_by: string
          metadata: Json
          property_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          expires_at: string
          id?: string
          invite_url?: string | null
          invited_at?: string
          invited_by: string
          metadata?: Json
          property_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_url?: string | null
          invited_at?: string
          invited_by?: string
          metadata?: Json
          property_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_path_enrollments: {
        Row: {
          completed_at: string | null
          enrolled_at: string | null
          id: string
          path_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          path_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          path_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_path_enrollments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "training_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_path_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_path_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_pins: {
        Row: {
          display_order: number | null
          id: string
          item_id: string
          item_type: string
          pinned_at: string | null
          user_id: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          item_id: string
          item_type: string
          pinned_at?: string | null
          user_id: string
        }
        Update: {
          display_order?: number | null
          id?: string
          item_id?: string
          item_type?: string
          pinned_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_properties: {
        Row: {
          id: string
          property_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          property_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          property_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          ip_hash: string | null
          is_current: boolean
          last_active_at: string
          metadata: Json | null
          revoked_at: string | null
          revoked_reason: string | null
          session_token_hash: string
          user_agent: string | null
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_current?: boolean
          last_active_at?: string
          metadata?: Json | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash: string
          user_agent?: string | null
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_current?: boolean
          last_active_at?: string
          metadata?: Json | null
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash?: string
          user_agent?: string | null
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          high_contrast: boolean | null
          keyboard_shortcuts: boolean | null
          language: string
          large_text: boolean | null
          push_notifications: boolean
          reduced_motion: boolean | null
          theme: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          high_contrast?: boolean | null
          keyboard_shortcuts?: boolean | null
          language?: string
          large_text?: boolean | null
          push_notifications?: boolean
          reduced_motion?: boolean | null
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          high_contrast?: boolean | null
          keyboard_shortcuts?: boolean | null
          language?: string
          large_text?: boolean | null
          push_notifications?: boolean
          reduced_motion?: boolean | null
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_skills: {
        Row: {
          created_at: string | null
          id: string
          proficiency_level: number | null
          skill_id: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          proficiency_level?: number | null
          skill_id: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          proficiency_level?: number | null
          skill_id?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_vacation_balance: {
        Row: {
          carried_over: number | null
          created_at: string | null
          id: string
          pending_days: number | null
          total_days: number
          updated_at: string | null
          used_days: number | null
          user_id: string
          year: number
        }
        Insert: {
          carried_over?: number | null
          created_at?: string | null
          id?: string
          pending_days?: number | null
          total_days?: number
          updated_at?: string | null
          used_days?: number | null
          user_id: string
          year?: number
        }
        Update: {
          carried_over?: number | null
          created_at?: string | null
          id?: string
          pending_days?: number | null
          total_days?: number
          updated_at?: string | null
          used_days?: number | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      vip_guest_preferences: {
        Row: {
          created_at: string
          dietary_requirements: string | null
          guest_name: string
          id: string
          lifetime_spend_sar: number
          pillow_preference: string | null
          preferred_room_features: string[] | null
          special_notes: string | null
          updated_at: string
          vip_tier: string
        }
        Insert: {
          created_at?: string
          dietary_requirements?: string | null
          guest_name: string
          id?: string
          lifetime_spend_sar?: number
          pillow_preference?: string | null
          preferred_room_features?: string[] | null
          special_notes?: string | null
          updated_at?: string
          vip_tier: string
        }
        Update: {
          created_at?: string
          dietary_requirements?: string | null
          guest_name?: string
          id?: string
          lifetime_spend_sar?: number
          pillow_preference?: string | null
          preferred_room_features?: string[] | null
          special_notes?: string | null
          updated_at?: string
          vip_tier?: string
        }
        Relationships: []
      }
      vip_guests: {
        Row: {
          arrival_date: string | null
          created_at: string
          departure_date: string | null
          flagged_by: string
          guest_name: string
          id: string
          is_active: boolean
          notes: string | null
          property_id: string
          room_number: string | null
          updated_at: string
          vip_tier: string | null
        }
        Insert: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          flagged_by: string
          guest_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id: string
          room_number?: string | null
          updated_at?: string
          vip_tier?: string | null
        }
        Update: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          flagged_by?: string
          guest_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id?: string
          room_number?: string | null
          updated_at?: string
          vip_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_guests_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_guests_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vip_guests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          action_config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          trigger_config: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          trigger_config?: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          trigger_config?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          error: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          result: Json | null
          started_at: string | null
          status: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          timezone: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          timezone?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          timezone?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          action: string
          config: Json | null
          created_at: string | null
          id: string
          name: string
          step_order: number
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          action: string
          config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          step_order?: number
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          action?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          step_order?: number
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      achievement_leaderboard: {
        Row: {
          last_achievement_at: string | null
          total_achievements: number | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
      activity_log_v: {
        Row: {
          action_type: string | null
          created_at: string | null
          department_id: string | null
          id: string | null
          metadata: Json | null
          property_id: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: never
          created_at?: string | null
          department_id?: string | null
          id?: string | null
          metadata?: never
          property_id?: string | null
          target_id?: string | null
          target_name?: never
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: never
          created_at?: string | null
          department_id?: string | null
          id?: string | null
          metadata?: never
          property_id?: string | null
          target_id?: string | null
          target_name?: never
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs_v: {
        Row: {
          action: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: never
          created_at?: string | null
          details?: never
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: never
          created_at?: string | null
          details?: never
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_download_logs_v: {
        Row: {
          document_id: string | null
          downloaded_at: string | null
          id: string | null
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          document_id?: string | null
          downloaded_at?: string | null
          id?: string | null
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          document_id?: string | null
          downloaded_at?: string | null
          id?: string | null
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      document_views_v: {
        Row: {
          document_id: string | null
          id: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          document_id?: string | null
          id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          document_id?: string | null
          id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      knowledge_question_attempts: {
        Row: {
          attempt_number: number | null
          context_entity_id: string | null
          context_type: string | null
          created_at: string | null
          hint_used: boolean | null
          id: string | null
          is_correct: boolean | null
          partial_score: number | null
          question_id: string | null
          selected_answer: string | null
          selected_options: string[] | null
          session_id: string | null
          time_spent_seconds: number | null
          user_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          context_entity_id?: string | null
          context_type?: string | null
          created_at?: string | null
          hint_used?: boolean | null
          id?: string | null
          is_correct?: boolean | null
          partial_score?: number | null
          question_id?: string | null
          selected_answer?: string | null
          selected_options?: string[] | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          context_entity_id?: string | null
          context_type?: string | null
          created_at?: string | null
          hint_used?: boolean | null
          id?: string | null
          is_correct?: boolean | null
          partial_score?: number | null
          question_id?: string | null
          selected_answer?: string | null
          selected_options?: string[] | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_question_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          feedback: string | null
          feedback_ar: string | null
          id: string | null
          is_correct: boolean | null
          match_value: string | null
          match_value_ar: string | null
          option_text: string | null
          option_text_ar: string | null
          question_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_question_usages: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string | null
          is_required: boolean | null
          question_id: string | null
          usage_entity_id: string | null
          usage_type: string | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_question_versions: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          data_snapshot: Json | null
          id: string | null
          question_id: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_questions: {
        Row: {
          accepted_answers: string[] | null
          ai_confidence_score: number | null
          ai_generated: boolean | null
          ai_model_used: string | null
          ai_prompt_used: string | null
          category_id: string | null
          correct_answer: string | null
          created_at: string | null
          created_by: string | null
          difficulty_level:
            | Database["public"]["Enums"]["question_difficulty"]
            | null
          estimated_time_seconds: number | null
          explanation: string | null
          explanation_ar: string | null
          hint: string | null
          hint_ar: string | null
          id: string | null
          linked_sop_id: string | null
          linked_sop_section: string | null
          points: number | null
          question_text: string | null
          question_text_ar: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["question_status"] | null
          tags: string[] | null
          training_module_id: string | null
          training_section_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          accepted_answers?: string[] | null
          ai_confidence_score?: number | null
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          category_id?: never
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["question_difficulty"]
            | null
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          id?: string | null
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          points?: number | null
          question_text?: string | null
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["question_status"] | null
          tags?: string[] | null
          training_module_id?: string | null
          training_section_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          accepted_answers?: string[] | null
          ai_confidence_score?: number | null
          ai_generated?: boolean | null
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          category_id?: never
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["question_difficulty"]
            | null
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          id?: string | null
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          points?: number | null
          question_text?: string | null
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["question_status"] | null
          tags?: string[] | null
          training_module_id?: string | null
          training_section_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "unified_questions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_quiz_sessions: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          earned_points: number | null
          id: string | null
          passed: boolean | null
          passing_score: number | null
          quiz_entity_id: string | null
          quiz_type: string | null
          score_percentage: number | null
          started_at: string | null
          time_limit_seconds: number | null
          total_points: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string | null
          passed?: boolean | null
          passing_score?: number | null
          quiz_entity_id?: string | null
          quiz_type?: string | null
          score_percentage?: number | null
          started_at?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string | null
          passed?: boolean | null
          passing_score?: number | null
          quiz_entity_id?: string | null
          quiz_type?: string | null
          score_percentage?: number | null
          started_at?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_progress_v: {
        Row: {
          acknowledged_at: string | null
          assignment_id: string | null
          completed_at: string | null
          content_id: string | null
          content_type:
            | Database["public"]["Enums"]["learning_content_type"]
            | null
          created_at: string | null
          id: string | null
          is_deleted: boolean | null
          last_accessed_at: string | null
          last_activity_at: string | null
          last_block_id: string | null
          last_block_index: number | null
          last_session_id: string | null
          metadata: Json | null
          passed: boolean | null
          progress_percentage: number | null
          score_percentage: number | null
          status:
            | Database["public"]["Enums"]["learning_assignment_status"]
            | null
          time_spent_seconds: number | null
          training_module_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          content_id?: string | null
          content_type?: never
          created_at?: string | null
          id?: string | null
          is_deleted?: never
          last_accessed_at?: never
          last_activity_at?: never
          last_block_id?: string | null
          last_block_index?: number | null
          last_session_id?: string | null
          metadata?: Json | null
          passed?: boolean | null
          progress_percentage?: never
          score_percentage?: number | null
          status?: never
          time_spent_seconds?: never
          training_module_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          content_id?: string | null
          content_type?: never
          created_at?: string | null
          id?: string | null
          is_deleted?: never
          last_accessed_at?: never
          last_activity_at?: never
          last_block_id?: string | null
          last_block_index?: number | null
          last_session_id?: string | null
          metadata?: Json | null
          passed?: boolean | null
          progress_percentage?: never
          score_percentage?: number | null
          status?: never
          time_spent_seconds?: never
          training_module_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_training_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_training_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_quiz_questions: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string | null
          points_override: number | null
          question_id: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          points_override?: number | null
          question_id?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          points_override?: number | null
          question_id?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "learning_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      media_access_logs_v: {
        Row: {
          access_type: string | null
          accessed_at: string | null
          accessed_by: string | null
          id: string | null
          ip_address: unknown
          media_asset_id: string | null
          metadata: Json | null
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type?: never
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string | null
          ip_address?: unknown
          media_asset_id?: string | null
          metadata?: never
          request_id?: never
          user_agent?: string | null
        }
        Update: {
          access_type?: never
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string | null
          ip_address?: unknown
          media_asset_id?: string | null
          metadata?: never
          request_id?: never
          user_agent?: string | null
        }
        Relationships: []
      }
      pii_access_logs_v: {
        Row: {
          access_type: string | null
          accessed_by_profile: Json | null
          actor_id: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_profile: Json | null
          created_at: string | null
          fields_accessed: string[] | null
          id: string | null
          justification: string | null
          reason: string | null
          resource_type: string | null
          target_user_id: string | null
          user: Json | null
          user_id: string | null
        }
        Insert: {
          access_type?: never
          accessed_by_profile?: never
          actor_id?: string | null
          approved_at?: never
          approved_by?: never
          approved_by_profile?: never
          created_at?: string | null
          fields_accessed?: never
          id?: string | null
          justification?: never
          reason?: never
          resource_type?: never
          target_user_id?: string | null
          user?: never
          user_id?: string | null
        }
        Update: {
          access_type?: never
          accessed_by_profile?: never
          actor_id?: string | null
          approved_at?: never
          approved_by?: never
          approved_by_profile?: never
          created_at?: string | null
          fields_accessed?: never
          id?: string | null
          justification?: never
          reason?: never
          resource_type?: never
          target_user_id?: string | null
          user?: never
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_logs_v: {
        Row: {
          action: string | null
          created_at: string | null
          event_type: string | null
          id: string | null
          ip_address: unknown
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          severity: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action?: never
          created_at?: string | null
          event_type?: never
          id?: string | null
          ip_address?: unknown
          metadata?: never
          new_data?: never
          old_data?: never
          record_id?: string | null
          severity?: never
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: never
        }
        Update: {
          action?: never
          created_at?: string | null
          event_type?: never
          id?: string | null
          ip_address?: unknown
          metadata?: never
          new_data?: never
          old_data?: never
          record_id?: string | null
          severity?: never
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: never
        }
        Relationships: []
      }
      sop_access_logs_v: {
        Row: {
          action: string | null
          created_at: string | null
          document_id: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
          version_id: string | null
        }
        Insert: {
          action?: never
          created_at?: string | null
          document_id?: string | null
          id?: string | null
          ip_address?: never
          metadata?: never
          user_agent?: string | null
          user_id?: string | null
          version_id?: never
        }
        Update: {
          action?: never
          created_at?: string | null
          document_id?: string | null
          id?: string | null
          ip_address?: never
          metadata?: never
          user_agent?: string | null
          user_id?: string | null
          version_id?: never
        }
        Relationships: []
      }
      sop_documents_v: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category_id: string | null
          checklist_items: Json | null
          code: string | null
          compliance_level: string | null
          content: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          current_version_id: string | null
          department_id: string | null
          description: string | null
          description_ar: string | null
          estimated_read_time: number | null
          faq_items: Json | null
          featured: boolean | null
          file_size: number | null
          id: string | null
          images: Json | null
          is_deleted: boolean | null
          is_template: boolean | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          linked_quiz_id: string | null
          linked_training_id: string | null
          next_review_date: string | null
          passing_score: number | null
          priority: string | null
          property_id: string | null
          published_at: string | null
          published_by: string | null
          quiz_enabled: boolean | null
          requires_acknowledgment: boolean | null
          requires_quiz: boolean | null
          review_frequency_months: number | null
          status: string | null
          subcategory_id: string | null
          template_id: string | null
          title: string | null
          title_ar: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          video_url: string | null
          view_count: number | null
          visibility_scope:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          checklist_items?: never
          code?: string | null
          compliance_level?: never
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: never
          department_id?: string | null
          description?: string | null
          description_ar?: never
          estimated_read_time?: number | null
          faq_items?: never
          featured?: boolean | null
          file_size?: never
          id?: string | null
          images?: never
          is_deleted?: never
          is_template?: never
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          next_review_date?: string | null
          passing_score?: never
          priority?: never
          property_id?: string | null
          published_at?: string | null
          published_by?: string | null
          quiz_enabled?: never
          requires_acknowledgment?: never
          requires_quiz?: never
          review_frequency_months?: never
          status?: never
          subcategory_id?: string | null
          template_id?: never
          title?: string | null
          title_ar?: never
          updated_at?: string | null
          updated_by?: string | null
          version?: never
          video_url?: string | null
          view_count?: never
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          checklist_items?: never
          code?: string | null
          compliance_level?: never
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: never
          department_id?: string | null
          description?: string | null
          description_ar?: never
          estimated_read_time?: number | null
          faq_items?: never
          featured?: boolean | null
          file_size?: never
          id?: string | null
          images?: never
          is_deleted?: never
          is_template?: never
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          next_review_date?: string | null
          passing_score?: never
          priority?: never
          property_id?: string | null
          published_at?: string | null
          published_by?: string | null
          quiz_enabled?: never
          requires_acknowledgment?: never
          requires_quiz?: never
          review_frequency_months?: never
          status?: never
          subcategory_id?: string | null
          template_id?: never
          title?: string | null
          title_ar?: never
          updated_at?: string | null
          updated_by?: string | null
          version?: never
          video_url?: string | null
          view_count?: never
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_linked_training_id_fkey"
            columns: ["linked_training_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          id: string | null
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string | null
          question_type: string | null
          sop_document_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      sop_view_history_v: {
        Row: {
          document_id: string | null
          id: string | null
          scroll_depth_percent: number | null
          user_id: string | null
          view_duration_seconds: number | null
          viewed_at: string | null
        }
        Insert: {
          document_id?: string | null
          id?: string | null
          scroll_depth_percent?: never
          user_id?: string | null
          view_duration_seconds?: never
          viewed_at?: string | null
        }
        Update: {
          document_id?: string | null
          id?: string | null
          scroll_depth_percent?: never
          user_id?: string | null
          view_duration_seconds?: never
          viewed_at?: string | null
        }
        Relationships: []
      }
      training_content_blocks_v: {
        Row: {
          ai_generated: boolean | null
          ai_source_content: string | null
          content: string | null
          content_data: Json | null
          content_url: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          order: number | null
          points: number | null
          source_document_id: string | null
          title: string | null
          training_module_id: string | null
          type: string | null
        }
        Insert: {
          ai_generated?: never
          ai_source_content?: string | null
          content?: never
          content_data?: Json | null
          content_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string | null
          is_deleted?: never
          is_mandatory?: never
          order?: never
          points?: never
          source_document_id?: string | null
          title?: string | null
          training_module_id?: string | null
          type?: string | null
        }
        Update: {
          ai_generated?: never
          ai_source_content?: string | null
          content?: never
          content_data?: Json | null
          content_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string | null
          is_deleted?: never
          is_mandatory?: never
          order?: never
          points?: never
          source_document_id?: string | null
          title?: string | null
          training_module_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_linked_training_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_documents_v: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string | null
          is_required: boolean | null
          training_module_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string | null
          is_required?: never
          training_module_id?: string | null
          updated_at?: never
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string | null
          is_required?: never
          training_module_id?: string | null
          updated_at?: never
        }
        Relationships: []
      }
      training_module_resources_v: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string | null
          is_required: boolean | null
          resource_id: string | null
          resource_type: string | null
          resource_url: string | null
          title: string | null
          training_module_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: never
          id?: string | null
          is_required?: never
          resource_id?: string | null
          resource_type?: never
          resource_url?: string | null
          title?: string | null
          training_module_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: never
          id?: string | null
          is_required?: never
          resource_id?: string | null
          resource_type?: never
          resource_url?: string | null
          title?: string | null
          training_module_id?: string | null
        }
        Relationships: []
      }
      training_quizzes: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          id: string | null
          is_deleted: boolean | null
          options: string[] | null
          order: number | null
          question: string | null
          training_module_id: string | null
          type: Database["public"]["Enums"]["question_type"] | null
        }
        Relationships: []
      }
      user_message_stats: {
        Row: {
          email: string | null
          full_name: string | null
          received_messages: number | null
          sent_messages: number | null
          unread_messages: number | null
          urgent_messages: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      announce_eom_from_selection: {
        Args: { p_selection_id: string }
        Returns: string
      }
      approve_document_atomic: {
        Args: {
          p_approval_id: string
          p_approver_id: string
          p_feedback?: string
        }
        Returns: Json
      }
      approve_eom_selection: {
        Args: {
          p_approved_by: string
          p_notes?: string
          p_selection_id: string
        }
        Returns: string
      }
      approve_leave_request: {
        Args: {
          approver_id: string
          notification_payload?: Json
          request_id: string
        }
        Returns: Json
      }
      approve_pending_user: {
        Args: { p_approve?: boolean; p_user_id: string }
        Returns: Json
      }
      approve_training_module: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      archive_expired_documents: { Args: never; Returns: number }
      assign_maintenance_ticket: {
        Args: {
          p_assigned_to_id: string
          p_assigner_id: string
          p_notification_payload?: Json
          p_ticket_id: string
        }
        Returns: Json
      }
      attendance_check_in: {
        Args: { p_notes?: string }
        Returns: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          property_id: string | null
          status: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attendance_check_out: {
        Args: { p_attendance_id: string; p_notes?: string }
        Returns: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          property_id: string | null
          status: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auto_reactivate_suspended_accounts: { Args: never; Returns: undefined }
      award_module_skills: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: number
      }
      base32_decode: { Args: { input: string }; Returns: string }
      bulk_update_reporting_lines: { Args: { p_updates: Json }; Returns: Json }
      calculate_eom_score: {
        Args: {
          p_config: Database["public"]["Tables"]["eom_automation_config"]["Row"]
          p_month: number
          p_property_id: string
          p_user_id: string
          p_year: number
        }
        Returns: {
          attendance_rate: number
          ineligibility_reason: string
          is_eligible: boolean
          sop_compliance_rate: number
          task_completion_rate: number
          total_score: number
          training_completion_rate: number
        }[]
      }
      calculate_next_cron_run: {
        Args: { cron_expr: string; from_time?: string }
        Returns: string
      }
      calculate_next_task_run: {
        Args: { last_run: string; recurrence: string }
        Returns: string
      }
      can_approve_leave: {
        Args: {
          approver_id: string
          request_department_id: string
          request_property_id: string
        }
        Returns: boolean
      }
      can_approve_purchase_request: {
        Args: {
          _approver_id: string
          _department_id: string
          _property_id: string
        }
        Returns: boolean
      }
      can_manage_assignments: { Args: { user_id: string }; Returns: boolean }
      can_user_act_on_document_approval: {
        Args: { p_approval_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_document: { Args: { document_id: string }; Returns: boolean }
      can_view_employee_public_profile: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_view_feed_item: { Args: { _feed_item_id: string }; Returns: boolean }
      can_view_request:
        | { Args: { request_id: string }; Returns: boolean }
        | { Args: { request_id: string; user_id: string }; Returns: boolean }
      cancel_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      check_and_award_achievement: {
        Args: {
          p_achievement_type: Database["public"]["Enums"]["achievement_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      check_and_escalate_approvals: { Args: never; Returns: undefined }
      check_and_escalate_maintenance: { Args: never; Returns: undefined }
      check_and_escalate_pending_actions: { Args: never; Returns: undefined }
      check_and_escalate_requests: { Args: never; Returns: undefined }
      check_expiring_documents: {
        Args: never
        Returns: {
          documents_expired: number
          documents_notified: number
        }[]
      }
      check_password_reuse:
        | { Args: { p_password: string; p_user_id: string }; Returns: boolean }
        | { Args: { plain_password: string }; Returns: boolean }
      check_property_access: {
        Args: { required_property_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      check_user_rate_limit: {
        Args: {
          p_action: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_pii_access_logs: { Args: never; Returns: undefined }
      cleanup_orphaned_media_files: {
        Args: never
        Returns: {
          deleted_count: number
          errors: string[]
        }[]
      }
      clear_failed_login_attempts: {
        Args: { p_email: string }
        Returns: undefined
      }
      complete_maintenance_ticket: {
        Args: {
          completer_id: string
          labor_hours?: number
          material_cost?: number
          notes?: string
          notification_payload?: Json
          ticket_id: string
        }
        Returns: Json
      }
      complete_password_reset: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_metadata?: Json
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification_batch: {
        Args: {
          p_created_by?: string
          p_job_type: string
          p_notification_data: Json
          p_notification_type: string
          p_user_ids: string[]
        }
        Returns: string
      }
      create_sample_questions: {
        Args: { created_by_id: string; sop_id: string }
        Returns: undefined
      }
      create_task_atomic: {
        Args: { notification_payload?: Json; task_data: Json }
        Returns: Json
      }
      create_workflow_notification_batch: {
        Args: {
          p_business_domain?: string
          p_channels?: string[]
          p_created_by?: string
          p_job_type: string
          p_notification_data?: Json
          p_notification_type: string
          p_priority?: string
          p_scheduled_for?: string
          p_template_key?: string
          p_user_ids: string[]
        }
        Returns: string
      }
      decide_purchase_request: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      detect_pii_access_anomalies: {
        Args: { p_lookback_days?: number; p_threshold_multiplier?: number }
        Returns: {
          anomaly_type: string
          details: Json
          detected_at: string
          severity: string
          user_id: string
          user_name: string
        }[]
      }
      disable_mfa: {
        Args: { p_password: string; p_user_id: string }
        Returns: boolean
      }
      duplicate_training_module: {
        Args: { p_module_id: string }
        Returns: string
      }
      enable_mfa: {
        Args: { p_user_id: string; p_verification_code: string }
        Returns: boolean
      }
      enforce_session_limit: {
        Args: { p_max_sessions?: number; p_user_id: string }
        Returns: boolean
      }
      execute_scheduled_report: {
        Args: { p_report_id: string }
        Returns: string
      }
      expire_delegations: { Args: never; Returns: undefined }
      export_birthdays_for_month: {
        Args: { p_month: number; p_property_id?: string; p_year?: number }
        Returns: {
          age: number
          birthday_date: string
          department: string
          full_name: string
          hotel: string
          job_title: string
        }[]
      }
      find_documents: {
        Args: {
          p_folder_id?: string
          p_limit?: number
          p_offset?: number
          p_property_id?: string
          p_query: string
        }
        Returns: {
          created_at: string
          description: string
          file_url: string
          folder_id: string
          headline: string
          id: string
          match_type: string
          property_id: string
          rank: number
          status: Database["public"]["Enums"]["document_status"]
          title: string
        }[]
      }
      find_finance_approver: { Args: { property_id: string }; Returns: string }
      find_hr_assignee: { Args: { property_id: string }; Returns: string }
      fuzzy_search_documents: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          description: string
          id: string
          similarity: number
          title: string
        }[]
      }
      generate_audit_export_hash: {
        Args: { p_data: Json; p_export_id: string }
        Returns: string
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_eom_auto_selection: {
        Args: { p_month: number; p_property_id: string; p_year: number }
        Returns: string
      }
      generate_mfa_secret: { Args: { p_user_id: string }; Returns: Json }
      generate_totp: {
        Args: {
          p_at_time?: number
          p_digits?: number
          p_secret_base32: string
          p_time_step?: number
        }
        Returns: string
      }
      generate_verification_code: { Args: never; Returns: string }
      get_analytics_summary: { Args: never; Returns: Json }
      get_announcement_compliance_breakdown: {
        Args: { p_announcement_id: string }
        Returns: {
          acknowledged_users: number
          read_users: number
          scope_id: string
          scope_name: string
          scope_type: string
          total_users: number
        }[]
      }
      get_audit_data_for_export: {
        Args: { p_batch_offset?: number; p_batch_size?: number; p_scope: Json }
        Returns: {
          action: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          ip_address: string
          log_id: string
          property_id: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_comment_replies: {
        Args: { p_parent_id: string }
        Returns: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_resolved: boolean
          parent_id: string
          updated_at: string
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      get_daily_active_users: {
        Args: { days_ago?: number }
        Returns: {
          active_users: number
          date: string
        }[]
      }
      get_daily_challenge_question_ids: {
        Args: { p_count?: number }
        Returns: {
          id: string
        }[]
      }
      get_dashboard_stats: {
        Args: { user_uuid: string }
        Returns: {
          completed_training: number
          in_progress_training: number
          next_shift_date: string
          next_shift_start: string
          pending_approvals: number
          pending_tasks: number
          unread_announcements: number
          unread_notifications: number
          vacation_remaining: number
        }[]
      }
      get_dashboard_summary: {
        Args: {
          p_department_ids: string[]
          p_property_ids: string[]
          p_roles: string[]
          p_scope_property_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      get_direct_reports: {
        Args: { p_manager_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          job_title: string
        }[]
      }
      get_document_comments_thread: {
        Args: { p_document_id: string }
        Returns: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_pinned: boolean
          is_resolved: boolean
          parent_id: string
          reply_count: number
          updated_at: string
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      get_document_viewers_by_department: {
        Args: { p_document_id: string }
        Returns: {
          count: number
          department_name: string
        }[]
      }
      get_email_runtime_config: { Args: never; Returns: Json }
      get_employee_directory: {
        Args: {
          p_department_id?: string
          p_include_inactive?: boolean
          p_management_level?: string
          p_property_id?: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_search?: string
          p_sort?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          department_ids: string[]
          department_names: string[]
          full_name: string
          id: string
          is_active: boolean
          job_title: string
          joining_date: string
          management_level: string
          manager_id: string
          manager_name: string
          manager_title: string
          phone_extension: string
          primary_department_id: string
          primary_department_name: string
          primary_property_id: string
          primary_property_name: string
          property_ids: string[]
          property_names: string[]
          roles: Database["public"]["Enums"]["app_role"][]
          staff_id: string
          updated_at: string
          work_email: string
        }[]
      }
      get_employee_private_profile: {
        Args: { p_profile_id: string; p_reason?: string }
        Returns: {
          date_of_birth: string
          emergency_contact_name: string
          emergency_contact_phone: string
          employee_id: string
          national_id: string
          salary_grade: string
        }[]
      }
      get_employee_public_profile: {
        Args: { p_profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          certifications: string[]
          department_names: string[]
          direct_reports: Json
          full_name: string
          id: string
          is_active: boolean
          is_edited: boolean
          job_title: string
          joining_date: string
          manager_id: string
          manager_name: string
          manager_title: string
          phone_extension: string
          property_names: string[]
          roles: Database["public"]["Enums"]["app_role"][]
          skills: string[]
          staff_id: string
          updated_at: string
          work_email: string
        }[]
      }
      get_events_for_range: {
        Args: { end_date: string; property_filter?: string; start_date: string }
        Returns: {
          color: string
          created_by: string
          description: string
          end_time: string
          id: string
          start_time: string
          title: string
          type: string
        }[]
      }
      get_expiring_certificates: {
        Args: {
          p_department_id?: string
          p_property_id?: string
          p_within_days?: number
        }
        Returns: {
          certificate_id: string
          days_until_expiry: number
          expiry_date: string
          recipient_name: string
          title: string
          training_module_id: string
          user_id: string
        }[]
      }
      get_expiring_documents: {
        Args: { p_days_ahead?: number }
        Returns: {
          days_until_expiry: number
          document_id: string
          expires_at: string
          owner_email: string
          owner_name: string
          title: string
        }[]
      }
      get_media_asset_with_usage: {
        Args: { p_media_asset_id: string }
        Returns: {
          category: Database["public"]["Enums"]["media_category"]
          created_at: string
          description: string
          duration_seconds: number
          file_size_bytes: number
          filename: string
          id: string
          is_public: boolean
          last_used_at: string
          media_type: Database["public"]["Enums"]["media_type"]
          mime_type: string
          property_id: string
          property_name: string
          public_url: string
          tags: string[]
          thumbnail_url: string
          title: string
          uploaded_by: string
          uploader_name: string
          usage_count: number
          usages: Json
        }[]
      }
      get_my_managed_department_ids: {
        Args: never
        Returns: {
          department_id: string
          department_name: string
        }[]
      }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_next_shift: {
        Args: { user_uuid: string }
        Returns: {
          department_name: string
          end_time: string
          property_name: string
          shift_date: string
          shift_id: string
          start_time: string
        }[]
      }
      get_org_hierarchy: {
        Args: { p_property_id?: string; p_root_user_id?: string }
        Returns: {
          depth: number
          email: string
          full_name: string
          id: string
          job_title: string
          manager_name: string
          path: string[]
          path_names: string[]
          reporting_to: string
        }[]
      }
      get_pii_access_summary: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_target_user_id?: string
        }
        Returns: {
          access_count: number
          access_date: string
          risk_score: number
          top_accessed_fields: string[]
          unique_accessors: number
        }[]
      }
      get_questions_pass_rates: {
        Args: { p_question_ids: string[] }
        Returns: {
          accuracy_rate: number
          correct_attempts: number
          question_id: string
          total_attempts: number
        }[]
      }
      get_reporting_chain: {
        Args: { p_employee_id: string }
        Returns: {
          full_name: string
          id: string
          job_title: string
          level: number
        }[]
      }
      get_role_priority: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      get_search_metrics: {
        Args: { days_ago?: number }
        Returns: {
          avg_results_count: number
          top_queries: Json
          total_searches: number
          zero_results_count: number
        }[]
      }
      get_secure_document_url: {
        Args: { document_id: string }
        Returns: string
      }
      get_secure_document_version_url: {
        Args: { p_version_id: string }
        Returns: string
      }
      get_secure_expense_receipt_url: {
        Args: { p_claim_id: string }
        Returns: string
      }
      get_secure_maintenance_attachment_url: {
        Args: { p_attachment_id: string }
        Returns: string
      }
      get_secure_media_url: {
        Args: { p_expiry_seconds?: number; p_media_asset_id: string }
        Returns: {
          expires_at: string
          signed_url: string
        }[]
      }
      get_secure_payslip_url: {
        Args: { p_payslip_id: string }
        Returns: string
      }
      get_secure_report_run_url: { Args: { p_run_id: string }; Returns: string }
      get_security_summary: { Args: { p_user_id: string }; Returns: Json }
      get_sidebar_counts: {
        Args: {
          p_current_property_id?: string
          p_department_ids?: string[]
          p_property_ids?: string[]
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_skills_matrix: {
        Args: {
          p_department_id?: string
          p_my_team_only?: boolean
          p_property_id?: string
        }
        Returns: {
          department_name: string
          has_skill: boolean
          proficiency_level: number
          skill_category: string
          skill_id: string
          skill_name: string
          user_id: string
          user_name: string
          verified: boolean
        }[]
      }
      get_task_completion_metrics: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          avg_completion_time_hours: number
          completed_tasks: number
          completion_rate: number
          in_progress_tasks: number
          pending_tasks: number
          total_tasks: number
        }[]
      }
      get_task_stats: {
        Args: { user_id_param: string }
        Returns: {
          completed_tasks: number
          in_progress_tasks: number
          overdue_tasks: number
          review_tasks: number
          todo_tasks: number
          total_tasks: number
        }[]
      }
      get_todays_birthdays: {
        Args: { p_property_id?: string }
        Returns: {
          age: number
          avatar_url: string
          birthday: string
          full_name: string
          id: string
          job_title: string
          property_name: string
        }[]
      }
      get_top_events: {
        Args: { limit_count?: number }
        Returns: {
          count: number
          event_name: string
        }[]
      }
      get_top_pii_accessors: {
        Args: { p_date_from?: string; p_date_to?: string; p_limit?: number }
        Returns: {
          accessor_id: string
          accessor_name: string
          accessor_role: string
          last_accessed_at: string
          most_accessed_field: string
          total_accesses: number
          unique_targets: number
        }[]
      }
      get_training_analytics_summary: {
        Args: {
          p_department_id?: string
          p_my_team_only?: boolean
          p_property_id?: string
          p_start_date?: string
        }
        Returns: {
          average_score: number
          completed_count: number
          completion_rate: number
          in_progress_count: number
          not_started_count: number
          overdue_count: number
          total_assignees: number
        }[]
      }
      get_training_completion_trend: {
        Args: {
          p_department_id?: string
          p_my_team_only?: boolean
          p_property_id?: string
          p_weeks?: number
        }
        Returns: {
          completed_count: number
          week_start: string
        }[]
      }
      get_training_module_funnel: {
        Args: { p_module_id: string }
        Returns: {
          block_id: string
          block_order: number
          block_title: string
          block_type: string
          completed_count: number
          completion_rate: number
        }[]
      }
      get_training_module_performance: {
        Args: {
          p_department_id?: string
          p_limit?: number
          p_property_id?: string
        }
        Returns: {
          assignee_count: number
          average_score: number
          completed_count: number
          completion_rate: number
          module_id: string
          title: string
        }[]
      }
      get_training_module_related_resources: {
        Args: { p_module_id: string }
        Returns: {
          description: string
          resource_id: string
          resource_type: string
          title: string
        }[]
      }
      get_user_departments: { Args: { user_id: string }; Returns: string[] }
      get_user_pins_with_details: {
        Args: { p_user_id: string }
        Returns: {
          description: string
          display_order: number
          item_id: string
          item_type: string
          pin_id: string
          pinned_at: string
          title: string
          url: string
        }[]
      }
      get_user_properties: { Args: { user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role_priority: { Args: { _user_id: string }; Returns: number }
      get_user_sessions: { Args: { p_user_id: string }; Returns: Json }
      get_vacation_balance: {
        Args: { user_uuid: string; year_filter?: number }
        Returns: {
          pending_days: number
          remaining_days: number
          total_days: number
          used_days: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_profile_access: {
        Args: { _admin_id: string; _target_user_id: string }
        Returns: boolean
      }
      has_property_access: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_optimized: {
        Args: { check_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      increment_article_view_count: {
        Args: { doc_id: string }
        Returns: undefined
      }
      increment_batch_email_counters: {
        Args: { p_batch_id: string; p_failed?: number; p_sent?: number }
        Returns: undefined
      }
      increment_batch_failed: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      increment_batch_processed: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      increment_document_download_count: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_guest_review_portfolio_admin: { Args: never; Returns: boolean }
      is_hr: { Args: { user_id: string }; Returns: boolean }
      is_hr_or_admin: { Args: { p_user_id?: string }; Returns: boolean }
      is_mfa_enabled: { Args: { p_user_id: string }; Returns: boolean }
      is_regional_admin_or_higher: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_rls_enabled: { Args: { p_table_name: string }; Returns: boolean }
      is_task_creator: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      lock_account: {
        Args: { p_duration_minutes?: number; p_email: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          action: string
          meta?: Json
          target_id?: string
          target_name?: string
          target_type?: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: undefined
      }
      log_document_download: {
        Args: {
          p_document_id: string
          p_ip_address?: unknown
          p_user_id: string
        }
        Returns: string
      }
      log_document_view: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: string
      }
      log_pii_access:
        | {
            Args: {
              p_fields_accessed: string[]
              p_reason?: string
              p_target_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_access_type?: string
              p_justification?: string
              p_pii_fields?: string[]
              p_resource_id?: string
              p_resource_type?: string
              p_user_id: string
            }
            Returns: undefined
          }
      log_security_audit_event_v2: {
        Args: {
          p_action: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
          p_ip_address?: string
          p_metadata?: Json
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_action?: string
          p_event_type: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_severity?: string
          p_table_name?: string
        }
        Returns: undefined
      }
      mark_all_notifications_as_read: { Args: never; Returns: undefined }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      process_certificate_expirations: { Args: never; Returns: number }
      process_due_promotions: { Args: never; Returns: number }
      process_due_transfers: { Args: never; Returns: number }
      process_notification_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          processed: number
          remaining: number
        }[]
      }
      promote_employee: {
        Args: {
          p_effective_date: string
          p_employee_id: string
          p_new_department_id: string
          p_new_job_title: string
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_notes: string
          p_promoter_id: string
        }
        Returns: string
      }
      rebuild_document_search_index: { Args: never; Returns: number }
      record_failed_login_attempt: {
        Args: { p_email: string }
        Returns: undefined
      }
      reject_document_atomic: {
        Args: { p_approval_id: string; p_approver_id: string; p_reason: string }
        Returns: Json
      }
      reject_leave_request: {
        Args: {
          notification_payload?: Json
          rejection_reason: string
          rejector_id: string
          request_id: string
        }
        Returns: Json
      }
      reject_training_module: {
        Args: { p_module_id: string; p_reason?: string }
        Returns: undefined
      }
      reorder_user_pins: {
        Args: { p_pin_orders: Json; p_user_id: string }
        Returns: boolean
      }
      replace_workflow_steps: {
        Args: { p_steps: Json; p_workflow_id: string }
        Returns: undefined
      }
      request_apply_action: {
        Args: {
          p_action: string
          p_comment?: string
          p_forward_to?: string
          p_request_id: string
          p_visibility?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      request_id_from_storage_path: {
        Args: { p_path: string }
        Returns: string
      }
      request_knowledge_content: {
        Args: {
          p_department_id?: string
          p_description?: string
          p_property_id?: string
          p_title: string
        }
        Returns: undefined
      }
      resolve_comment: { Args: { p_comment_id: string }; Returns: boolean }
      resolve_training_certificate_progress: {
        Args: {
          p_completion_date?: string
          p_training_module_id: string
          p_user_id: string
        }
        Returns: string
      }
      resolve_training_module_write_target: {
        Args: { p_module_id: string }
        Returns: string
      }
      revoke_all_other_sessions: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      revoke_session: { Args: { p_session_id: string }; Returns: boolean }
      run_eom_calculation: {
        Args: { p_month: number; p_property_id: string; p_year: number }
        Returns: {
          full_name: string
          is_eligible: boolean
          rank: number
          total_score: number
          user_id: string
        }[]
      }
      safe_notification_type: {
        Args: {
          p_default?: Database["public"]["Enums"]["notification_type"]
          p_value: string
        }
        Returns: Database["public"]["Enums"]["notification_type"]
      }
      sanitize_search_input: { Args: { p_input: string }; Returns: string }
      search_documents: {
        Args: {
          p_folder_id?: string
          p_limit?: number
          p_offset?: number
          p_property_id?: string
          p_query: string
        }
        Returns: {
          created_at: string
          description: string
          file_url: string
          folder_id: string
          headline: string
          id: string
          property_id: string
          rank: number
          status: Database["public"]["Enums"]["document_status"]
          title: string
        }[]
      }
      search_knowledge_articles: {
        Args: {
          p_content_type?: string
          p_department_id?: string
          p_limit?: number
          p_offset?: number
          p_property_id?: string
          p_query?: string
          p_requires_acknowledgment?: boolean
          p_status?: string
        }
        Returns: {
          id: string
          rank: number
          total_count: number
        }[]
      }
      search_media_assets: {
        Args: {
          category_filter?: Database["public"]["Enums"]["media_category"]
          property_id_filter?: string
          search_query: string
          tag_filter?: string[]
          type_filter?: Database["public"]["Enums"]["media_type"]
          uploaded_by_filter?: string
        }
        Returns: {
          category: Database["public"]["Enums"]["media_category"] | null
          content_disposition: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size_bytes: number
          filename: string
          height: number | null
          id: string
          is_archived: boolean | null
          is_public: boolean | null
          last_used_at: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json | null
          mime_type: string
          original_filename: string
          property_id: string | null
          public_url: string
          scanned_at: string | null
          sha256_hash: string | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          usage_count: number | null
          virus_scan_score: number | null
          virus_scan_status: string | null
          width: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      secure_count_documents: {
        Args: {
          p_confidentiality_level?: string
          p_date_from?: string
          p_date_to?: string
          p_department_id?: string
          p_file_type?: string[]
          p_folder_id?: string
          p_include_archived?: boolean
          p_include_deleted?: boolean
          p_property_id?: string
          p_search_query: string
          p_status?: string
          p_visibility?: string
        }
        Returns: number
      }
      secure_search_documents: {
        Args: {
          p_confidentiality_level?: string
          p_date_from?: string
          p_date_to?: string
          p_department_id?: string
          p_file_type?: string[]
          p_folder_id?: string
          p_include_archived?: boolean
          p_include_deleted?: boolean
          p_limit?: number
          p_offset?: number
          p_property_id?: string
          p_search_query: string
          p_sort_by?: string
          p_sort_order?: string
          p_status?: string
          p_visibility?: string
        }
        Returns: {
          author: Json
          confidentiality_level: string
          content: string
          content_type: string
          created_at: string
          created_by: string
          department_id: string
          description: string
          download_count: number
          expires_at: string
          file_extension: string
          file_size: number
          file_type: string
          file_url: string
          folder_id: string
          id: string
          is_archived: boolean
          is_deleted: boolean
          property_id: string
          status: string
          title: string
          updated_at: string
          view_count: number
          visibility: string
        }[]
      }
      secure_search_tasks: {
        Args: {
          p_assigned_to?: string
          p_created_by?: string
          p_department_id?: string
          p_limit?: number
          p_offset?: number
          p_priority?: string[]
          p_property_id?: string
          p_search_query?: string
          p_status?: string[]
        }
        Returns: {
          assigned_to_id: string
          created_at: string
          created_by_id: string
          department_id: string
          description: string
          due_date: string
          id: string
          is_deleted: boolean
          priority: string
          property_id: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      secure_search_users: {
        Args: {
          p_department_id?: string
          p_is_active?: boolean
          p_limit?: number
          p_property_id?: string
          p_role?: string
          p_search_query: string
        }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          job_title: string
          phone: string
          staff_id: string
        }[]
      }
      set_media_download_headers: {
        Args: { p_disposition?: string; p_media_asset_id: string }
        Returns: boolean
      }
      snapshot_training_module_version: {
        Args: { p_module_id: string }
        Returns: string
      }
      submit_promotion_request:
        | {
            Args: {
              p_effective_date: string
              p_employee_id: string
              p_new_department_id: string
              p_new_job_title: string
              p_new_role: Database["public"]["Enums"]["app_role"]
              p_notes: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_employee_id: string
              p_new_department_id: string
              p_new_job_title: string
              p_new_role: Database["public"]["Enums"]["app_role"]
              p_notes: string
            }
            Returns: Json
          }
      submit_training_module_for_review: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      submit_transfer_request: {
        Args: {
          p_effective_date: string
          p_employee_id: string
          p_notes: string
          p_to_department_id: string
          p_to_property_id: string
        }
        Returns: Json
      }
      suggest_system_role: {
        Args: { p_job_title: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      toggle_comment_pin: { Args: { p_comment_id: string }; Returns: boolean }
      toggle_kudos_like: { Args: { kudos_uuid: string }; Returns: boolean }
      track_related_article_click: {
        Args: {
          p_clicked_doc_id: string
          p_position?: number
          p_source_doc_id: string
          p_user_id?: string
        }
        Returns: undefined
      }
      track_related_article_impression: {
        Args: { p_related_doc_ids: string[]; p_source_doc_id: string }
        Returns: undefined
      }
      update_request_details: {
        Args: { p_request_id: string; p_updates: Json }
        Returns: Json
      }
      user_has_department_access: {
        Args: { auth_user_id: string; target_dept_id: string }
        Returns: boolean
      }
      users_share_property: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      validate_document_access: {
        Args: { p_document_id: string }
        Returns: boolean
      }
      validate_uuid_array: { Args: { p_input: string[] }; Returns: string[] }
      verify_certificate: {
        Args: { verification_code_param: string }
        Returns: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          expiry_date: string
          is_valid: boolean
          issued_at: string
          recipient_name: string
          status: string
          title: string
        }[]
      }
      verify_mfa_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      verify_report_signature: {
        Args: { p_export_id: string; p_report_data: Json; p_signature: string }
        Returns: boolean
      }
    }
    Enums: {
      achievement_type:
        | "training_master"
        | "perfect_completion"
        | "safety_champion"
        | "top_performer"
        | "zero_incident"
        | "fast_responder"
        | "knowledge_sharer"
        | "team_player"
        | "early_bird"
        | "streak_master"
      announcement_priority: "normal" | "important" | "critical"
      app_role:
        | "super_admin"
        | "corporate_admin"
        | "regional_admin"
        | "regional_hr"
        | "property_manager"
        | "property_hr"
        | "department_head"
        | "manager"
        | "staff"
      content_block_type:
        | "text"
        | "image"
        | "video"
        | "document_link"
        | "quiz"
        | "sop_reference"
        | "audio"
        | "interactive"
      document_category: "cv" | "certificate" | "contract" | "other"
      document_confidentiality:
        | "public"
        | "internal"
        | "confidential"
        | "restricted"
      document_status:
        | "DRAFT"
        | "PENDING_REVIEW"
        | "APPROVED"
        | "PUBLISHED"
        | "REJECTED"
      document_visibility:
        | "all_properties"
        | "property"
        | "department"
        | "role"
        | "group_department"
        | "specific_departments"
      entity_status:
        | "draft"
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "todo"
        | "open"
        | "in_progress"
        | "review"
        | "pending_parts"
        | "completed"
        | "cancelled"
        | "archived"
        | "published"
        | "closed"
        | "filled"
        | "on_hold"
        | "active"
        | "inactive"
      import_type: "csv" | "api" | "manual"
      knowledge_content_type:
        | "sop"
        | "policy"
        | "guide"
        | "checklist"
        | "reference"
        | "faq"
        | "video"
        | "visual"
      knowledge_visibility:
        | "global"
        | "property"
        | "department"
        | "role"
        | "property_department"
        | "custom"
      learning_assignment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "overdue"
        | "excused"
      learning_content_type:
        | "quiz"
        | "sop"
        | "video"
        | "external_link"
        | "module"
        | "microlearning"
      learning_target_type:
        | "user"
        | "department"
        | "role"
        | "property"
        | "everyone"
      leave_type:
        | "annual"
        | "sick"
        | "unpaid"
        | "maternity"
        | "paternity"
        | "personal"
        | "other"
      maintenance_category:
        | "plumbing"
        | "electrical"
        | "hvac"
        | "appliance"
        | "structural"
        | "cosmetic"
        | "safety"
        | "other"
      maintenance_priority: "low" | "medium" | "high" | "urgent" | "critical"
      media_category:
        | "training"
        | "knowledgebase"
        | "announcement"
        | "general"
        | "compliance"
        | "onboarding"
        | "marketing"
        | "other"
      media_type: "video" | "image" | "document" | "audio"
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
        | "training_completed"
        | "training_overdue"
        | "promotion_approved"
        | "transfer_approved"
        | "maintenance_updated"
        | "message_received"
        | "mention"
        | "task_assigned"
        | "task_due_soon"
        | "task_overdue"
        | "task_completed"
        | "document_approved"
        | "document_rejected"
        | "document_review_pending"
        | "trigger_notification"
        | "sop_assigned"
        | "sop_quiz_required"
        | "sop_quiz_passed"
        | "sop_quiz_failed"
        | "system"
        | "employee_of_the_month_winner"
      pms_type: "opera" | "cloudbeds" | "mews" | "local" | "other"
      question_difficulty: "easy" | "medium" | "hard" | "expert"
      question_status: "draft" | "pending_review" | "published" | "archived"
      question_type:
        | "mcq"
        | "mcq_multi"
        | "true_false"
        | "fill_blank"
        | "scenario"
        | "ordering"
        | "matching"
      question_usage_type:
        | "sop_inline"
        | "lesson"
        | "quiz"
        | "certification"
        | "assessment"
        | "daily_challenge"
      quiz_type: "mcq" | "true_false" | "fill_blank"
      sop_approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "changes_requested"
      sop_document_status: "draft" | "under_review" | "approved" | "obsolete"
      sync_status: "pending" | "syncing" | "completed" | "failed"
      task_priority: "low" | "medium" | "high" | "urgent"
      training_status: "not_started" | "in_progress" | "completed" | "expired"
      translation_status: "pending" | "automated" | "reviewed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_type: [
        "training_master",
        "perfect_completion",
        "safety_champion",
        "top_performer",
        "zero_incident",
        "fast_responder",
        "knowledge_sharer",
        "team_player",
        "early_bird",
        "streak_master",
      ],
      announcement_priority: ["normal", "important", "critical"],
      app_role: [
        "super_admin",
        "corporate_admin",
        "regional_admin",
        "regional_hr",
        "property_manager",
        "property_hr",
        "department_head",
        "manager",
        "staff",
      ],
      content_block_type: [
        "text",
        "image",
        "video",
        "document_link",
        "quiz",
        "sop_reference",
        "audio",
        "interactive",
      ],
      document_category: ["cv", "certificate", "contract", "other"],
      document_confidentiality: [
        "public",
        "internal",
        "confidential",
        "restricted",
      ],
      document_status: [
        "DRAFT",
        "PENDING_REVIEW",
        "APPROVED",
        "PUBLISHED",
        "REJECTED",
      ],
      document_visibility: [
        "all_properties",
        "property",
        "department",
        "role",
        "group_department",
        "specific_departments",
      ],
      entity_status: [
        "draft",
        "pending",
        "submitted",
        "approved",
        "rejected",
        "todo",
        "open",
        "in_progress",
        "review",
        "pending_parts",
        "completed",
        "cancelled",
        "archived",
        "published",
        "closed",
        "filled",
        "on_hold",
        "active",
        "inactive",
      ],
      import_type: ["csv", "api", "manual"],
      knowledge_content_type: [
        "sop",
        "policy",
        "guide",
        "checklist",
        "reference",
        "faq",
        "video",
        "visual",
      ],
      knowledge_visibility: [
        "global",
        "property",
        "department",
        "role",
        "property_department",
        "custom",
      ],
      learning_assignment_status: [
        "assigned",
        "in_progress",
        "completed",
        "overdue",
        "excused",
      ],
      learning_content_type: [
        "quiz",
        "sop",
        "video",
        "external_link",
        "module",
        "microlearning",
      ],
      learning_target_type: [
        "user",
        "department",
        "role",
        "property",
        "everyone",
      ],
      leave_type: [
        "annual",
        "sick",
        "unpaid",
        "maternity",
        "paternity",
        "personal",
        "other",
      ],
      maintenance_category: [
        "plumbing",
        "electrical",
        "hvac",
        "appliance",
        "structural",
        "cosmetic",
        "safety",
        "other",
      ],
      maintenance_priority: ["low", "medium", "high", "urgent", "critical"],
      media_category: [
        "training",
        "knowledgebase",
        "announcement",
        "general",
        "compliance",
        "onboarding",
        "marketing",
        "other",
      ],
      media_type: ["video", "image", "document", "audio"],
      notification_type: [
        "approval_required",
        "request_approved",
        "request_rejected",
        "training_assigned",
        "training_deadline",
        "document_published",
        "document_acknowledgment_required",
        "announcement_new",
        "escalation_alert",
        "referral_status_update",
        "maintenance_assigned",
        "maintenance_resolved",
        "request_submitted",
        "comment_added",
        "request_returned",
        "request_closed",
        "training_completed",
        "training_overdue",
        "promotion_approved",
        "transfer_approved",
        "maintenance_updated",
        "message_received",
        "mention",
        "task_assigned",
        "task_due_soon",
        "task_overdue",
        "task_completed",
        "document_approved",
        "document_rejected",
        "document_review_pending",
        "trigger_notification",
        "sop_assigned",
        "sop_quiz_required",
        "sop_quiz_passed",
        "sop_quiz_failed",
        "system",
        "employee_of_the_month_winner",
      ],
      pms_type: ["opera", "cloudbeds", "mews", "local", "other"],
      question_difficulty: ["easy", "medium", "hard", "expert"],
      question_status: ["draft", "pending_review", "published", "archived"],
      question_type: [
        "mcq",
        "mcq_multi",
        "true_false",
        "fill_blank",
        "scenario",
        "ordering",
        "matching",
      ],
      question_usage_type: [
        "sop_inline",
        "lesson",
        "quiz",
        "certification",
        "assessment",
        "daily_challenge",
      ],
      quiz_type: ["mcq", "true_false", "fill_blank"],
      sop_approval_status: [
        "pending",
        "approved",
        "rejected",
        "changes_requested",
      ],
      sop_document_status: ["draft", "under_review", "approved", "obsolete"],
      sync_status: ["pending", "syncing", "completed", "failed"],
      task_priority: ["low", "medium", "high", "urgent"],
      training_status: ["not_started", "in_progress", "completed", "expired"],
      translation_status: ["pending", "automated", "reviewed"],
    },
  },
} as const
