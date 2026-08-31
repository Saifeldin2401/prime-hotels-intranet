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
      ai_agent_policies: {
        Row: {
          agent_role: string
          capability_override: string | null
          disabled_model_ids: string[]
          enabled: boolean
          force_model_id: string | null
          max_retries_override: number | null
          notes: string | null
          routing_mode_override: string | null
          temperature_override: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_role: string
          capability_override?: string | null
          disabled_model_ids?: string[]
          enabled?: boolean
          force_model_id?: string | null
          max_retries_override?: number | null
          notes?: string | null
          routing_mode_override?: string | null
          temperature_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_role?: string
          capability_override?: string | null
          disabled_model_ids?: string[]
          enabled?: boolean
          force_model_id?: string | null
          max_retries_override?: number | null
          notes?: string | null
          routing_mode_override?: string | null
          temperature_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_model_probes: {
        Row: {
          detail: string | null
          http_status: number | null
          id: string
          latency_ms: number | null
          model_id: string
          ok: boolean
          probe_type: string
          probed_at: string
        }
        Insert: {
          detail?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          model_id: string
          ok: boolean
          probe_type?: string
          probed_at?: string
        }
        Update: {
          detail?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          model_id?: string
          ok?: boolean
          probe_type?: string
          probed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_probes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          availability: string
          capabilities: string[]
          capability_checked_at: string | null
          cost_tier: string
          display_name: string
          enabled: boolean
          id: string
          image_editing: boolean
          image_generation: boolean
          is_free: boolean
          last_probe_at: string | null
          last_probe_ok: boolean | null
          max_context: number
          max_output: number
          modality: string
          price_input_per_mtok: number | null
          price_output_per_mtok: number | null
          pricing_last_verified: string | null
          pricing_source: string | null
          provider: string
          provider_model_id: string
          quality_score: number
          speed_score: number
          streaming: boolean
          supports_json_object: boolean
          supports_json_schema: boolean
          updated_at: string
          verified_at: string | null
          vision: boolean
        }
        Insert: {
          availability?: string
          capabilities?: string[]
          capability_checked_at?: string | null
          cost_tier?: string
          display_name: string
          enabled?: boolean
          id: string
          image_editing?: boolean
          image_generation?: boolean
          is_free?: boolean
          last_probe_at?: string | null
          last_probe_ok?: boolean | null
          max_context?: number
          max_output?: number
          modality?: string
          price_input_per_mtok?: number | null
          price_output_per_mtok?: number | null
          pricing_last_verified?: string | null
          pricing_source?: string | null
          provider: string
          provider_model_id: string
          quality_score?: number
          speed_score?: number
          streaming?: boolean
          supports_json_object?: boolean
          supports_json_schema?: boolean
          updated_at?: string
          verified_at?: string | null
          vision?: boolean
        }
        Update: {
          availability?: string
          capabilities?: string[]
          capability_checked_at?: string | null
          cost_tier?: string
          display_name?: string
          enabled?: boolean
          id?: string
          image_editing?: boolean
          image_generation?: boolean
          is_free?: boolean
          last_probe_at?: string | null
          last_probe_ok?: boolean | null
          max_context?: number
          max_output?: number
          modality?: string
          price_input_per_mtok?: number | null
          price_output_per_mtok?: number | null
          pricing_last_verified?: string | null
          pricing_source?: string | null
          provider?: string
          provider_model_id?: string
          quality_score?: number
          speed_score?: number
          streaming?: boolean
          supports_json_object?: boolean
          supports_json_schema?: boolean
          updated_at?: string
          verified_at?: string | null
          vision?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_platform_config: {
        Row: {
          allow_premium_images: boolean
          disabled_model_ids: string[]
          embedding_model_priority: string[]
          enabled_providers: string[]
          force_enabled_model_ids: string[]
          free_only_mode: boolean
          id: boolean
          image_model_priority: string[]
          max_concurrency: number
          max_retries: number
          per_course_usd_cap: number
          per_user_daily_generations: number
          premium_daily_usd_cap: number
          qa_min_acceptable: number
          qa_min_production_ready: number
          routing_mode: string
          text_model_priority: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_premium_images?: boolean
          disabled_model_ids?: string[]
          embedding_model_priority?: string[]
          enabled_providers?: string[]
          force_enabled_model_ids?: string[]
          free_only_mode?: boolean
          id?: boolean
          image_model_priority?: string[]
          max_concurrency?: number
          max_retries?: number
          per_course_usd_cap?: number
          per_user_daily_generations?: number
          premium_daily_usd_cap?: number
          qa_min_acceptable?: number
          qa_min_production_ready?: number
          routing_mode?: string
          text_model_priority?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_premium_images?: boolean
          disabled_model_ids?: string[]
          embedding_model_priority?: string[]
          enabled_providers?: string[]
          force_enabled_model_ids?: string[]
          free_only_mode?: boolean
          id?: boolean
          image_model_priority?: string[]
          max_concurrency?: number
          max_retries?: number
          per_course_usd_cap?: number
          per_user_daily_generations?: number
          premium_daily_usd_cap?: number
          qa_min_acceptable?: number
          qa_min_production_ready?: number
          routing_mode?: string
          text_model_priority?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          cooldown_until: string | null
          daily_budget_usd: number | null
          display_name: string
          enabled: boolean
          free_models_enabled: boolean
          health_status: string
          id: string
          key_status: string
          notes: string | null
          paid_models_enabled: boolean
          priority: number
          rate_limit_per_min: number | null
          updated_at: string
        }
        Insert: {
          cooldown_until?: string | null
          daily_budget_usd?: number | null
          display_name: string
          enabled?: boolean
          free_models_enabled?: boolean
          health_status?: string
          id: string
          key_status?: string
          notes?: string | null
          paid_models_enabled?: boolean
          priority?: number
          rate_limit_per_min?: number | null
          updated_at?: string
        }
        Update: {
          cooldown_until?: string | null
          daily_budget_usd?: number | null
          display_name?: string
          enabled?: boolean
          free_models_enabled?: boolean
          health_status?: string
          id?: string
          key_status?: string
          notes?: string | null
          paid_models_enabled?: boolean
          priority?: number
          rate_limit_per_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          agent_role: string
          completion_tokens: number
          cost_tier: string
          course_id: string | null
          created_at: string
          error_message: string | null
          error_type: string | null
          estimated_cost_usd: number
          fallback_count: number
          generation_id: string | null
          id: string
          latency_ms: number
          lesson_id: string | null
          metadata: Json
          model_used: string
          pipeline_run_id: string | null
          prompt_tokens: number
          provider: string
          retry_count: number
          routing_mode: string | null
          started_at: string | null
          success: boolean
          task_type: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          agent_role: string
          completion_tokens?: number
          cost_tier?: string
          course_id?: string | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          estimated_cost_usd?: number
          fallback_count?: number
          generation_id?: string | null
          id?: string
          latency_ms?: number
          lesson_id?: string | null
          metadata?: Json
          model_used: string
          pipeline_run_id?: string | null
          prompt_tokens?: number
          provider: string
          retry_count?: number
          routing_mode?: string | null
          started_at?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          agent_role?: string
          completion_tokens?: number
          cost_tier?: string
          course_id?: string | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          estimated_cost_usd?: number
          fallback_count?: number
          generation_id?: string | null
          id?: string
          latency_ms?: number
          lesson_id?: string | null
          metadata?: Json
          model_used?: string
          pipeline_run_id?: string | null
          prompt_tokens?: number
          provider?: string
          retry_count?: number
          routing_mode?: string | null
          started_at?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
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
          hotel_id: string | null
          id: string
          organization_id: string | null
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
          hotel_id?: string | null
          id?: string
          organization_id?: string | null
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
          hotel_id?: string | null
          id?: string
          organization_id?: string | null
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
            foreignKeyName: "announcements_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          organization_id: string | null
          revoked_at: string | null
          scopes: string[]
          service_account_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
          service_account_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
          service_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_service_account_id_fkey"
            columns: ["service_account_id"]
            isOneToOne: false
            referencedRelation: "service_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          points_override: number | null
          question_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          points_override?: number | null
          question_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          points_override?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          brand_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hotel_id: string | null
          id: string
          is_deleted: boolean
          is_master_template: boolean
          master_source_id: string | null
          max_attempts: number | null
          organization_id: string | null
          passing_score: number
          placement: Database["public"]["Enums"]["assessment_placement"]
          placement_ref_id: string | null
          pool_draw_count: number | null
          question_bank_id: string | null
          randomization: Json
          scope_type: string
          show_feedback: boolean
          source_quiz_id: string | null
          status: string
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          is_deleted?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          passing_score?: number
          placement?: Database["public"]["Enums"]["assessment_placement"]
          placement_ref_id?: string | null
          pool_draw_count?: number | null
          question_bank_id?: string | null
          randomization?: Json
          scope_type?: string
          show_feedback?: boolean
          source_quiz_id?: string | null
          status?: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          is_deleted?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          passing_score?: number
          placement?: Database["public"]["Enums"]["assessment_placement"]
          placement_ref_id?: string | null
          pool_draw_count?: number | null
          question_bank_id?: string | null
          randomization?: Json
          scope_type?: string
          show_feedback?: boolean
          source_quiz_id?: string | null
          status?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_source_quiz_id_fkey"
            columns: ["source_quiz_id"]
            isOneToOne: true
            referencedRelation: "learning_quizzes"
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
      brands: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          name_ar: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          signature_url?: string | null
          template_html?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          hotel_id: string | null
          id: string
          issued_by: string | null
          metadata: Json | null
          organization_id: string | null
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
          hotel_id?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          organization_id?: string | null
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
          hotel_id?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          organization_id?: string | null
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
            foreignKeyName: "certificates_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
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
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      competencies: {
        Row: {
          category: string
          code: string
          created_at: string | null
          department_id: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          code: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competencies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_levels: {
        Row: {
          behavioral_indicators: string[] | null
          competency_id: string | null
          created_at: string | null
          id: string
          level_number: number
          title: string
          title_ar: string | null
        }
        Insert: {
          behavioral_indicators?: string[] | null
          competency_id?: string | null
          created_at?: string | null
          id?: string
          level_number: number
          title: string
          title_ar?: string | null
        }
        Update: {
          behavioral_indicators?: string[] | null
          competency_id?: string | null
          created_at?: string | null
          id?: string
          level_number?: number
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_levels_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_change_log: {
        Row: {
          actor: string | null
          at: string
          change_summary: string
          content_id: string
          content_type: string
          id: string
        }
        Insert: {
          actor?: string | null
          at?: string
          change_summary: string
          content_id: string
          content_type: string
          id?: string
        }
        Update: {
          actor?: string | null
          at?: string
          change_summary?: string
          content_id?: string
          content_type?: string
          id?: string
        }
        Relationships: []
      }
      content_reviews: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["content_status"]
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string
          submitted_by?: string
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
      course_competencies: {
        Row: {
          competency_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
          target_level: number
          weight: number | null
        }
        Insert: {
          competency_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          target_level?: number
          weight?: number | null
        }
        Update: {
          competency_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          target_level?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_competencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_generation_jobs: {
        Row: {
          blueprint: Json | null
          config: Json
          course_id: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          metadata: Json
          mode: string
          models_used: string[] | null
          organization_id: string | null
          property_id: string | null
          qa_report: Json | null
          status: string
          tokens_used: number | null
          updated_at: string
        }
        Insert: {
          blueprint?: Json | null
          config?: Json
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          metadata?: Json
          mode: string
          models_used?: string[] | null
          organization_id?: string | null
          property_id?: string | null
          qa_report?: Json | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          blueprint?: Json | null
          config?: Json
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          metadata?: Json
          mode?: string
          models_used?: string[] | null
          organization_id?: string | null
          property_id?: string | null
          qa_report?: Json | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_generation_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_generation_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_generation_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_generation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_generation_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_system: boolean
          name: string
          name_ar: string | null
          preset_config: Json
          property_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean
          name: string
          name_ar?: string | null
          preset_config?: Json
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean
          name?: string
          name_ar?: string | null
          preset_config?: Json
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_generation_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_generation_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          legacy_section_key: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          legacy_section_key?: string | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          legacy_section_key?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_source_documents: {
        Row: {
          attached_at: string
          attached_by: string | null
          document_id: string
          file_size: number | null
          file_type: string | null
          generation_job_id: string | null
          id: string
          is_primary: boolean
          original_filename: string | null
          relationship: string
          section_ref: string | null
          training_module_id: string
        }
        Insert: {
          attached_at?: string
          attached_by?: string | null
          document_id: string
          file_size?: number | null
          file_type?: string | null
          generation_job_id?: string | null
          id?: string
          is_primary?: boolean
          original_filename?: string | null
          relationship?: string
          section_ref?: string | null
          training_module_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string | null
          document_id?: string
          file_size?: number | null
          file_type?: string | null
          generation_job_id?: string | null
          id?: string
          is_primary?: boolean
          original_filename?: string | null
          relationship?: string
          section_ref?: string | null
          training_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_source_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "course_source_documents_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_visual_assets: {
        Row: {
          alt_text: string
          alt_text_ar: string | null
          aspect_ratio: string
          caption: string | null
          caption_ar: string | null
          content_block_id: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          educational_purpose: string
          guidance: number | null
          height: number | null
          id: string
          image_url: string
          lesson_id: string
          metadata: Json
          model: string
          module_id: string
          negative_prompt: string | null
          order_index: number
          placement: string
          prompt: string
          provider: string
          seed: number | null
          status: string
          steps: number | null
          storage_bucket: string
          storage_path: string | null
          temp_course_id: string | null
          title: string
          title_ar: string | null
          updated_at: string
          visual_concept: string
          visual_style: string
          width: number | null
        }
        Insert: {
          alt_text: string
          alt_text_ar?: string | null
          aspect_ratio?: string
          caption?: string | null
          caption_ar?: string | null
          content_block_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          educational_purpose?: string
          guidance?: number | null
          height?: number | null
          id?: string
          image_url: string
          lesson_id: string
          metadata?: Json
          model?: string
          module_id: string
          negative_prompt?: string | null
          order_index?: number
          placement?: string
          prompt: string
          provider?: string
          seed?: number | null
          status?: string
          steps?: number | null
          storage_bucket?: string
          storage_path?: string | null
          temp_course_id?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
          visual_concept: string
          visual_style?: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          alt_text_ar?: string | null
          aspect_ratio?: string
          caption?: string | null
          caption_ar?: string | null
          content_block_id?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          educational_purpose?: string
          guidance?: number | null
          height?: number | null
          id?: string
          image_url?: string
          lesson_id?: string
          metadata?: Json
          model?: string
          module_id?: string
          negative_prompt?: string | null
          order_index?: number
          placement?: string
          prompt?: string
          provider?: string
          seed?: number | null
          status?: string
          steps?: number | null
          storage_bucket?: string
          storage_path?: string | null
          temp_course_id?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          visual_concept?: string
          visual_style?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_visual_assets_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "course_visual_assets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          allow_retake: boolean
          blueprint: Json | null
          brand_id: string | null
          category: string | null
          certificate_enabled: boolean
          content_language: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration_minutes: number | null
          hotel_id: string | null
          id: string
          is_deleted: boolean
          is_master_template: boolean
          master_source_id: string | null
          max_attempts: number | null
          organization_id: string | null
          passing_score_percentage: number
          property_id: string | null
          quality_score: number | null
          scope_type: string
          slug: string | null
          source_training_module_id: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_retake?: boolean
          blueprint?: Json | null
          brand_id?: string | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          hotel_id?: string | null
          id?: string
          is_deleted?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          passing_score_percentage?: number
          property_id?: string | null
          quality_score?: number | null
          scope_type?: string
          slug?: string | null
          source_training_module_id?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_retake?: boolean
          blueprint?: Json | null
          brand_id?: string | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          hotel_id?: string | null
          id?: string
          is_deleted?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          passing_score_percentage?: number
          property_id?: string | null
          quality_score?: number | null
          scope_type?: string
          slug?: string | null
          source_training_module_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_source_training_module_id_fkey"
            columns: ["source_training_module_id"]
            isOneToOne: true
            referencedRelation: "training_modules"
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
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          hotel_id: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          manager_id: string | null
          name: string
          name_ar: string | null
          organization_id: string | null
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          manager_id?: string | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          manager_id?: string | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_department_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
          ai_actionable_item: string | null
          ai_analysis_status: string | null
          ai_analyzed_at: string | null
          ai_sentiment: string | null
          ai_themes: string[] | null
          created_at: string | null
          document_id: string
          feedback_text: string | null
          helpful: boolean
          id: string
          user_id: string
        }
        Insert: {
          ai_actionable_item?: string | null
          ai_analysis_status?: string | null
          ai_analyzed_at?: string | null
          ai_sentiment?: string | null
          ai_themes?: string[] | null
          created_at?: string | null
          document_id: string
          feedback_text?: string | null
          helpful: boolean
          id?: string
          user_id: string
        }
        Update: {
          ai_actionable_item?: string | null
          ai_analysis_status?: string | null
          ai_analyzed_at?: string | null
          ai_sentiment?: string | null
          ai_themes?: string[] | null
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
          ai_category: string | null
          ai_generated: boolean | null
          ai_processed_at: string | null
          ai_source_content: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          archived_at: string | null
          archived_by: string | null
          block_order: number | null
          block_type: string | null
          brand_id: string | null
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
          expires_on: string | null
          faq_items: Json
          featured: boolean
          file_extension: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          folder_id: string | null
          hotel_id: string | null
          id: string
          images: Json
          is_active_kb_version: boolean | null
          is_archived: boolean | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          is_master_template: boolean
          knowledge_base_status: string | null
          last_downloaded_at: string | null
          last_published_by: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          last_translated_at: string | null
          lifecycle_status: Database["public"]["Enums"]["content_status"]
          linked_quiz_id: string | null
          linked_training_id: string | null
          master_source_id: string | null
          next_review_date: string | null
          organization_id: string | null
          owner_id: string | null
          passing_score: number | null
          points: number | null
          priority: string | null
          property_id: string | null
          published_at: string | null
          published_by: string | null
          quiz_enabled: boolean | null
          requires_acknowledgment: boolean | null
          requires_quiz: boolean | null
          review_due_on: string | null
          review_frequency_months: number | null
          review_reminder_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          scope_type: string
          search_vector: unknown
          sop_code: string | null
          status: Database["public"]["Enums"]["document_status"]
          subcategory_id: string | null
          summary: string | null
          summary_ar: string | null
          supersedes_document_id: string | null
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
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          brand_id?: string | null
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
          expires_on?: string | null
          faq_items?: Json
          featured?: boolean
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          hotel_id?: string | null
          id?: string
          images?: Json
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          is_master_template?: boolean
          knowledge_base_status?: string | null
          last_downloaded_at?: string | null
          last_published_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          last_translated_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          master_source_id?: string | null
          next_review_date?: string | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score?: number | null
          points?: number | null
          priority?: string | null
          property_id?: string | null
          published_at?: string | null
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_due_on?: string | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          scope_type?: string
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
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
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          brand_id?: string | null
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
          expires_on?: string | null
          faq_items?: Json
          featured?: boolean
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          hotel_id?: string | null
          id?: string
          images?: Json
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          is_master_template?: boolean
          knowledge_base_status?: string | null
          last_downloaded_at?: string | null
          last_published_by?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          last_translated_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          linked_quiz_id?: string | null
          linked_training_id?: string | null
          master_source_id?: string | null
          next_review_date?: string | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score?: number | null
          points?: number | null
          priority?: string | null
          property_id?: string | null
          published_at?: string | null
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_due_on?: string | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          scope_type?: string
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
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
            foreignKeyName: "documents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "documents_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
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
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      employee_transfer_logs: {
        Row: {
          assigned_delta_courses_count: number | null
          created_at: string | null
          from_department_id: string | null
          from_hotel_id: string | null
          from_role: string | null
          id: string
          new_department_id: string | null
          new_hotel_id: string | null
          new_role: string | null
          notes: string | null
          organization_id: string | null
          previous_department_id: string | null
          previous_hotel_id: string | null
          previous_role: string | null
          reason: string | null
          retained_certificates_count: number | null
          to_department_id: string | null
          to_hotel_id: string | null
          to_role: string | null
          transfer_effective_date: string
          transferred_by: string | null
          user_id: string | null
          waived_obsolete_courses_count: number | null
        }
        Insert: {
          assigned_delta_courses_count?: number | null
          created_at?: string | null
          from_department_id?: string | null
          from_hotel_id?: string | null
          from_role?: string | null
          id?: string
          new_department_id?: string | null
          new_hotel_id?: string | null
          new_role?: string | null
          notes?: string | null
          organization_id?: string | null
          previous_department_id?: string | null
          previous_hotel_id?: string | null
          previous_role?: string | null
          reason?: string | null
          retained_certificates_count?: number | null
          to_department_id?: string | null
          to_hotel_id?: string | null
          to_role?: string | null
          transfer_effective_date?: string
          transferred_by?: string | null
          user_id?: string | null
          waived_obsolete_courses_count?: number | null
        }
        Update: {
          assigned_delta_courses_count?: number | null
          created_at?: string | null
          from_department_id?: string | null
          from_hotel_id?: string | null
          from_role?: string | null
          id?: string
          new_department_id?: string | null
          new_hotel_id?: string | null
          new_role?: string | null
          notes?: string | null
          organization_id?: string | null
          previous_department_id?: string | null
          previous_hotel_id?: string | null
          previous_role?: string | null
          reason?: string | null
          retained_certificates_count?: number | null
          to_department_id?: string | null
          to_hotel_id?: string | null
          to_role?: string | null
          transfer_effective_date?: string
          transferred_by?: string | null
          user_id?: string | null
          waived_obsolete_courses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_transfer_logs_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_from_hotel_id_fkey"
            columns: ["from_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_new_department_id_fkey"
            columns: ["new_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_new_hotel_id_fkey"
            columns: ["new_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_previous_department_id_fkey"
            columns: ["previous_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_previous_hotel_id_fkey"
            columns: ["previous_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_to_hotel_id_fkey"
            columns: ["to_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfer_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enrollments: {
        Row: {
          acknowledged_at: string | null
          assignment_id: string | null
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          enrolled_at: string
          expires_at: string | null
          id: string
          is_deleted: boolean
          last_activity_at: string | null
          metadata: Json | null
          organization_id: string | null
          passed: boolean | null
          progress_percentage: number
          score_percentage: number | null
          source_training_progress_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          is_deleted?: boolean
          last_activity_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          passed?: boolean | null
          progress_percentage?: number
          score_percentage?: number | null
          source_training_progress_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assignment_id?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          is_deleted?: boolean
          last_activity_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          passed?: boolean | null
          progress_percentage?: number
          score_percentage?: number | null
          source_training_progress_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_source_training_progress_id_fkey"
            columns: ["source_training_progress_id"]
            isOneToOne: true
            referencedRelation: "learning_progress_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_source_training_progress_id_fkey"
            columns: ["source_training_progress_id"]
            isOneToOne: true
            referencedRelation: "training_progress"
            referencedColumns: ["id"]
          },
        ]
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
      hotels: {
        Row: {
          address: string | null
          brand_id: string | null
          city: string | null
          country: string | null
          created_at: string
          hotel_code: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          is_headquarters: boolean
          name: string
          name_ar: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          hotel_code?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_headquarters?: boolean
          name: string
          name_ar?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          hotel_code?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_headquarters?: boolean
          name?: string
          name_ar?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_providers: {
        Row: {
          config: Json
          created_at: string
          default_membership_role: string
          display_name: string
          email_domain: string | null
          id: string
          is_active: boolean
          jit_provisioning: boolean
          organization_id: string
          provider_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          default_membership_role?: string
          display_name: string
          email_domain?: string | null
          id?: string
          is_active?: boolean
          jit_provisioning?: boolean
          organization_id: string
          provider_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          default_membership_role?: string
          display_name?: string
          email_domain?: string | null
          id?: string
          is_active?: boolean
          jit_provisioning?: boolean
          organization_id?: string
          provider_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      knowledge_chunks: {
        Row: {
          article_id: string | null
          content: string
          created_at: string
          document_id: string | null
          embedding: string | null
          id: string
          organization_id: string | null
          section: string | null
          token_count: number
        }
        Insert: {
          article_id?: string | null
          content: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          organization_id?: string | null
          section?: string | null
          token_count?: number
        }
        Update: {
          article_id?: string | null
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          organization_id?: string | null
          section?: string | null
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_required_reading_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
      learning_assignments: {
        Row: {
          assigned_by: string | null
          course_id: string | null
          created_at: string
          department_id: string | null
          due_date: string | null
          hotel_id: string | null
          id: string
          is_global: boolean
          is_mandatory: boolean
          notes: string | null
          organization_id: string
          rule_id: string | null
          status: string
          training_module_id: string | null
          training_path_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          due_date?: string | null
          hotel_id?: string | null
          id?: string
          is_global?: boolean
          is_mandatory?: boolean
          notes?: string | null
          organization_id: string
          rule_id?: string | null
          status?: string
          training_module_id?: string | null
          training_path_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          due_date?: string | null
          hotel_id?: string | null
          id?: string
          is_global?: boolean
          is_mandatory?: boolean
          notes?: string | null
          organization_id?: string
          rule_id?: string | null
          status?: string
          training_module_id?: string | null
          training_path_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "training_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_training_path_id_fkey"
            columns: ["training_path_id"]
            isOneToOne: false
            referencedRelation: "training_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_events: {
        Row: {
          course_id: string | null
          created_at: string
          enrollment_id: string | null
          event_type: string
          id: string
          lesson_block_id: string | null
          lesson_id: string | null
          occurred_at: string
          payload: Json
          session_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          event_type: string
          id?: string
          lesson_block_id?: string | null
          lesson_id?: string | null
          occurred_at?: string
          payload?: Json
          session_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          event_type?: string
          id?: string
          lesson_block_id?: string | null
          lesson_id?: string | null
          occurred_at?: string
          payload?: Json
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_lesson_block_id_fkey"
            columns: ["lesson_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_objectives: {
        Row: {
          bloom_level: string | null
          code: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["objective_kind"]
          parent_objective_id: string | null
          position: number
          statement: string
          statement_ar: string | null
          updated_at: string
        }
        Insert: {
          bloom_level?: string | null
          code?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["objective_kind"]
          parent_objective_id?: string | null
          position?: number
          statement: string
          statement_ar?: string | null
          updated_at?: string
        }
        Update: {
          bloom_level?: string | null
          code?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["objective_kind"]
          parent_objective_id?: string | null
          position?: number
          statement?: string
          statement_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_objectives_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_quizzes: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_on: string | null
          id: string
          is_deleted: boolean | null
          last_reviewed_at: string | null
          lifecycle_status: Database["public"]["Enums"]["content_status"]
          linked_sop_id: string | null
          max_attempts: number | null
          organization_id: string | null
          owner_id: string | null
          passing_score_percentage: number | null
          randomize_answers: boolean
          randomize_questions: boolean | null
          review_due_on: string | null
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
          expires_on?: string | null
          id?: string
          is_deleted?: boolean | null
          last_reviewed_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          linked_sop_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score_percentage?: number | null
          randomize_answers?: boolean
          randomize_questions?: boolean | null
          review_due_on?: string | null
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
          expires_on?: string | null
          id?: string
          is_deleted?: boolean | null
          last_reviewed_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          linked_sop_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score_percentage?: number | null
          randomize_answers?: boolean
          randomize_questions?: boolean | null
          review_due_on?: string | null
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
            foreignKeyName: "learning_quizzes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_quizzes_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
      lesson_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["lesson_block_type"]
          created_at: string
          duration_seconds: number | null
          id: string
          is_mandatory: boolean
          lesson_id: string
          payload: Json
          points: number
          position: number
          source_document_id: string | null
          title: string | null
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          block_type?: Database["public"]["Enums"]["lesson_block_type"]
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_mandatory?: boolean
          lesson_id: string
          payload?: Json
          points?: number
          position?: number
          source_document_id?: string | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["lesson_block_type"]
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_mandatory?: boolean
          lesson_id?: string
          payload?: Json
          points?: number
          position?: number
          source_document_id?: string | null
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          last_activity_at: string | null
          last_block_id: string | null
          lesson_id: string
          progress_percentage: number
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          last_activity_at?: string | null
          last_block_id?: string | null
          lesson_id: string
          progress_percentage?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          last_activity_at?: string | null
          last_block_id?: string | null
          lesson_id?: string
          progress_percentage?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_last_block_id_fkey"
            columns: ["last_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_module_id: string
          created_at: string
          estimated_duration_seconds: number | null
          id: string
          is_mandatory: boolean
          legacy_lesson_key: string | null
          position: number
          summary: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          course_module_id: string
          created_at?: string
          estimated_duration_seconds?: number | null
          id?: string
          is_mandatory?: boolean
          legacy_lesson_key?: string | null
          position?: number
          summary?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          course_module_id?: string
          created_at?: string
          estimated_duration_seconds?: number | null
          id?: string
          is_mandatory?: boolean
          legacy_lesson_key?: string | null
          position?: number
          summary?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_module_id_fkey"
            columns: ["course_module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      master_content_deployments: {
        Row: {
          content_type: string
          current_master_version: number
          deployed_at: string
          deployed_by: string | null
          deployed_version: number
          has_update_available: boolean
          id: string
          last_synced_at: string
          master_content_id: string
          target_content_id: string
          target_organization_id: string
        }
        Insert: {
          content_type: string
          current_master_version?: number
          deployed_at?: string
          deployed_by?: string | null
          deployed_version?: number
          has_update_available?: boolean
          id?: string
          last_synced_at?: string
          master_content_id: string
          target_content_id: string
          target_organization_id: string
        }
        Update: {
          content_type?: string
          current_master_version?: number
          deployed_at?: string
          deployed_by?: string | null
          deployed_version?: number
          has_update_available?: boolean
          id?: string
          last_synced_at?: string
          master_content_id?: string
          target_content_id?: string
          target_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_content_deployments_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_content_deployments_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "master_content_deployments_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          organization_id: string | null
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
          file_size_bytes?: number
          filename: string
          height?: number | null
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json | null
          mime_type: string
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "hotels"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "media_collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_collections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "hotels"
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
      objective_links: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          link_type: Database["public"]["Enums"]["objective_link_type"]
          objective_id: string
          question_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          link_type: Database["public"]["Enums"]["objective_link_type"]
          objective_id: string
          question_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          link_type?: Database["public"]["Enums"]["objective_link_type"]
          objective_id?: string
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_links_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_overrides: {
        Row: {
          enabled: boolean
          key: string
          note: string | null
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled: boolean
          key: string
          note?: string | null
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          note?: string | null
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_overrides_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "platform_feature_flags"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          brand_id: string | null
          created_at: string
          department_id: string | null
          hotel_id: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          is_primary: boolean
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          department_id?: string | null
          hotel_id?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_primary?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          department_id?: string | null
          hotel_id?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_primary?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_notification_overrides: {
        Row: {
          channels: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          organization_id: string
          policy_key: string
          updated_at: string
        }
        Insert: {
          channels?: Json | null
          created_at?: string
          id?: string
          is_enabled: boolean
          organization_id: string
          policy_key: string
          updated_at?: string
        }
        Update: {
          channels?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          policy_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_notification_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_notification_overrides_policy_key_fkey"
            columns: ["policy_key"]
            isOneToOne: false
            referencedRelation: "platform_notification_policies"
            referencedColumns: ["key"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_credits_used_this_month: number | null
          billing_email: string | null
          brand_colors: Json | null
          created_at: string
          favicon_url: string | null
          id: string
          industry: string
          is_active: boolean
          is_deleted: boolean
          lifecycle_status:
            | Database["public"]["Enums"]["tenant_lifecycle_status"]
            | null
          logo_url: string | null
          max_ai_credits_monthly: number | null
          max_hotels: number | null
          max_learners: number | null
          max_storage_gb: number | null
          name: string
          name_ar: string | null
          slug: string
          storage_used_bytes: number | null
          suspension_reason: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          ai_credits_used_this_month?: number | null
          billing_email?: string | null
          brand_colors?: Json | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          is_deleted?: boolean
          lifecycle_status?:
            | Database["public"]["Enums"]["tenant_lifecycle_status"]
            | null
          logo_url?: string | null
          max_ai_credits_monthly?: number | null
          max_hotels?: number | null
          max_learners?: number | null
          max_storage_gb?: number | null
          name: string
          name_ar?: string | null
          slug: string
          storage_used_bytes?: number | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_credits_used_this_month?: number | null
          billing_email?: string | null
          brand_colors?: Json | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          is_deleted?: boolean
          lifecycle_status?:
            | Database["public"]["Enums"]["tenant_lifecycle_status"]
            | null
          logo_url?: string | null
          max_ai_credits_monthly?: number | null
          max_hotels?: number | null
          max_learners?: number | null
          max_storage_gb?: number | null
          name?: string
          name_ar?: string | null
          slug?: string
          storage_used_bytes?: number | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
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
      platform_access_sessions: {
        Row: {
          access_reason: string
          acting_role: string
          admin_user_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          target_organization_id: string
        }
        Insert: {
          access_reason: string
          acting_role?: string
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          target_organization_id: string
        }
        Update: {
          access_reason?: string
          acting_role?: string
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          target_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_access_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_access_sessions_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          target_organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          target_organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          target_organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "platform_access_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          default_session_ttl_minutes: number
          id: boolean
          legacy_role_fallback_enabled: boolean
          max_session_ttl_minutes: number
          min_session_reason_length: number
          require_session_reason: boolean
          updated_at: string
        }
        Insert: {
          default_session_ttl_minutes?: number
          id?: boolean
          legacy_role_fallback_enabled?: boolean
          max_session_ttl_minutes?: number
          min_session_reason_length?: number
          require_session_reason?: boolean
          updated_at?: string
        }
        Update: {
          default_session_ttl_minutes?: number
          id?: boolean
          legacy_role_fallback_enabled?: boolean
          max_session_ttl_minutes?: number
          min_session_reason_length?: number
          require_session_reason?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          organization_id: string | null
          payload: Json
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          category: string
          default_enabled: boolean
          description: string | null
          key: string
          label: string
          min_plan_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          default_enabled?: boolean
          description?: string | null
          key: string
          label: string
          min_plan_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          default_enabled?: boolean
          description?: string | null
          key?: string
          label?: string
          min_plan_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_notification_policies: {
        Row: {
          allow_tenant_override: boolean
          category: string
          channels: Json
          created_at: string
          default_enabled: boolean
          description: string | null
          description_ar: string | null
          key: string
          name: string
          name_ar: string | null
          updated_at: string
        }
        Insert: {
          allow_tenant_override?: boolean
          category?: string
          channels?: Json
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          description_ar?: string | null
          key: string
          name: string
          name_ar?: string | null
          updated_at?: string
        }
        Update: {
          allow_tenant_override?: boolean
          category?: string
          channels?: Json
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          description_ar?: string | null
          key?: string
          name?: string
          name_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_role_assignments: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          platform_user_id: string
          revoked_at: string | null
          revoked_by: string | null
          scope_org_ids: string[]
          scope_type: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          platform_user_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope_org_ids?: string[]
          scope_type?: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          platform_user_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          scope_org_ids?: string[]
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_assignments_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_role_map: {
        Row: {
          legacy_role: Database["public"]["Enums"]["app_role"]
          notes: string | null
          platform_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          legacy_role: Database["public"]["Enums"]["app_role"]
          notes?: string | null
          platform_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          legacy_role?: Database["public"]["Enums"]["app_role"]
          notes?: string | null
          platform_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      platform_role_map_extra: {
        Row: {
          legacy_role: Database["public"]["Enums"]["app_role"]
          platform_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          legacy_role: Database["public"]["Enums"]["app_role"]
          platform_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          legacy_role?: Database["public"]["Enums"]["app_role"]
          platform_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          employment_type: string
          is_active: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          employment_type?: string
          is_active?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          employment_type?: string
          is_active?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      practical_assessments: {
        Row: {
          course_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          passing_score_percentage: number | null
          rubric_criteria: Json | null
          title: string
          title_ar: string | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          passing_score_percentage?: number | null
          rubric_criteria?: Json | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          passing_score_percentage?: number | null
          rubric_criteria?: Json | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practical_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_assessments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      practical_submissions: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          evaluated_at: string | null
          evaluator_feedback: string | null
          evaluator_id: string | null
          hotel_id: string | null
          id: string
          is_passed: boolean
          learner_acknowledged_at: string | null
          learner_id: string | null
          rubric_evaluations: Json | null
          score_achieved: number
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluator_feedback?: string | null
          evaluator_id?: string | null
          hotel_id?: string | null
          id?: string
          is_passed?: boolean
          learner_acknowledged_at?: string | null
          learner_id?: string | null
          rubric_evaluations?: Json | null
          score_achieved?: number
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluator_feedback?: string | null
          evaluator_id?: string | null
          hotel_id?: string | null
          id?: string
          is_passed?: boolean
          learner_acknowledged_at?: string | null
          learner_id?: string | null
          rubric_evaluations?: Json | null
          score_achieved?: number
        }
        Relationships: [
          {
            foreignKeyName: "practical_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "practical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_submissions_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_submissions_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practical_submissions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_submissions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_submissions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
      question_banks: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          is_master_template: boolean
          master_source_id: string | null
          name: string
          name_ar: string | null
          organization_id: string | null
          property_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          property_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_master_template?: boolean
          master_source_id?: string | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          property_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "question_banks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_warning_logs: {
        Row: {
          billing_period: string
          id: string
          metadata: Json | null
          notified_at: string
          organization_id: string
          quota_type: string
          threshold_pct: number
        }
        Insert: {
          billing_period: string
          id?: string
          metadata?: Json | null
          notified_at?: string
          organization_id: string
          quota_type: string
          threshold_pct: number
        }
        Update: {
          billing_period?: string
          id?: string
          metadata?: Json | null
          notified_at?: string
          organization_id?: string
          quota_type?: string
          threshold_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "quota_warning_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
      role_competency_requirements: {
        Row: {
          competency_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_mandatory: boolean
          membership_role: string
          organization_id: string
          required_level: number
        }
        Insert: {
          competency_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_mandatory?: boolean
          membership_role: string
          organization_id: string
          required_level?: number
        }
        Update: {
          competency_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_mandatory?: boolean
          membership_role?: string
          organization_id?: string
          required_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_competency_requirements_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_competency_requirements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_competency_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      service_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
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
      source_change_flags: {
        Row: {
          course_last_reviewed_at: string | null
          document_id: string
          flagged_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          source_updated_at: string
          training_module_id: string
        }
        Insert: {
          course_last_reviewed_at?: string | null
          document_id: string
          flagged_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_updated_at: string
          training_module_id: string
        }
        Update: {
          course_last_reviewed_at?: string | null
          document_id?: string
          flagged_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_updated_at?: string
          training_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_change_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "source_change_flags_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
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
      subscription_plans: {
        Row: {
          ai_monthly_quota_usd: number
          code: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_hotels: number
          max_storage_gb: number
          max_users: number
          name: string
        }
        Insert: {
          ai_monthly_quota_usd?: number
          code: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_hotels?: number
          max_storage_gb?: number
          max_users?: number
          name: string
        }
        Update: {
          ai_monthly_quota_usd?: number
          code?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_hotels?: number
          max_storage_gb?: number
          max_users?: number
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
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
          organization_id: string | null
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      training_assignment_rules: {
        Row: {
          assigned_by: string | null
          brand_id: string | null
          content_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          due_date: string | null
          due_in_days: number | null
          expires_at: string | null
          hotel_id: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          notify_on_due: boolean | null
          organization_id: string | null
          priority: string | null
          recipient_count: number | null
          reminder_days_before: number[] | null
          requires_acknowledgement: boolean | null
          scope_id: string | null
          scope_type: string | null
          status: string | null
          target_department_id: string | null
          target_id: string | null
          target_role: string | null
          target_type: string | null
          target_user_ids: string[] | null
          training_module_id: string | null
          valid_from: string | null
        }
        Insert: {
          assigned_by?: string | null
          brand_id?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          due_date?: string | null
          due_in_days?: number | null
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          notify_on_due?: boolean | null
          organization_id?: string | null
          priority?: string | null
          recipient_count?: number | null
          reminder_days_before?: number[] | null
          requires_acknowledgement?: boolean | null
          scope_id?: string | null
          scope_type?: string | null
          status?: string | null
          target_department_id?: string | null
          target_id?: string | null
          target_role?: string | null
          target_type?: string | null
          target_user_ids?: string[] | null
          training_module_id?: string | null
          valid_from?: string | null
        }
        Update: {
          assigned_by?: string | null
          brand_id?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          due_date?: string | null
          due_in_days?: number | null
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          notify_on_due?: boolean | null
          organization_id?: string | null
          priority?: string | null
          recipient_count?: number | null
          reminder_days_before?: number[] | null
          requires_acknowledgement?: boolean | null
          scope_id?: string | null
          scope_type?: string | null
          status?: string | null
          target_department_id?: string | null
          target_id?: string | null
          target_role?: string | null
          target_type?: string | null
          target_user_ids?: string[] | null
          training_module_id?: string | null
          valid_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_assignment_rules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "training_assignment_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      training_assignment_submissions: {
        Row: {
          assignment_id: string | null
          attachment_urls: Json | null
          attempt_number: number
          block_id: string
          created_at: string
          id: string
          instructor_feedback: string | null
          is_deleted: boolean
          organization_id: string | null
          passed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          status: string
          submission_content: string | null
          submitted_at: string | null
          training_module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          attachment_urls?: Json | null
          attempt_number?: number
          block_id: string
          created_at?: string
          id?: string
          instructor_feedback?: string | null
          is_deleted?: boolean
          organization_id?: string | null
          passed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
          submission_content?: string | null
          submitted_at?: string | null
          training_module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          attachment_urls?: Json | null
          attempt_number?: number
          block_id?: string
          created_at?: string
          id?: string
          instructor_feedback?: string | null
          is_deleted?: boolean
          organization_id?: string | null
          passed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
          submission_content?: string | null
          submitted_at?: string | null
          training_module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_training_module_id_fkey"
            columns: ["training_module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignment_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
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
          blueprint: Json | null
          brand_id: string | null
          category: string | null
          certificate_enabled: boolean
          content_language: string | null
          course_type: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration_minutes: number | null
          experience_level: string | null
          expires_on: string | null
          generation_job_id: string | null
          generation_mode: string | null
          hotel_id: string | null
          id: string
          instructional_strategy: string | null
          is_deleted: boolean
          is_master_template: boolean
          last_reviewed_at: string | null
          lifecycle_status: Database["public"]["Enums"]["content_status"]
          master_source_id: string | null
          max_attempts: number | null
          organization_id: string | null
          owner_id: string | null
          passing_score_percentage: number | null
          prior_knowledge: string | null
          property_id: string | null
          qa_report: Json | null
          quality_score: number | null
          randomize_questions: boolean | null
          review_due_on: string | null
          scope_type: string
          show_answers: boolean | null
          show_feedback: boolean | null
          status: string
          target_audience: string | null
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
          blueprint?: Json | null
          brand_id?: string | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          experience_level?: string | null
          expires_on?: string | null
          generation_job_id?: string | null
          generation_mode?: string | null
          hotel_id?: string | null
          id?: string
          instructional_strategy?: string | null
          is_deleted?: boolean
          is_master_template?: boolean
          last_reviewed_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score_percentage?: number | null
          prior_knowledge?: string | null
          property_id?: string | null
          qa_report?: Json | null
          quality_score?: number | null
          randomize_questions?: boolean | null
          review_due_on?: string | null
          scope_type?: string
          show_answers?: boolean | null
          show_feedback?: boolean | null
          status?: string
          target_audience?: string | null
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
          blueprint?: Json | null
          brand_id?: string | null
          category?: string | null
          certificate_enabled?: boolean
          content_language?: string | null
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          experience_level?: string | null
          expires_on?: string | null
          generation_job_id?: string | null
          generation_mode?: string | null
          hotel_id?: string | null
          id?: string
          instructional_strategy?: string | null
          is_deleted?: boolean
          is_master_template?: boolean
          last_reviewed_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["content_status"]
          master_source_id?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          owner_id?: string | null
          passing_score_percentage?: number | null
          prior_knowledge?: string | null
          property_id?: string | null
          qa_report?: Json | null
          quality_score?: number | null
          randomize_questions?: boolean | null
          review_due_on?: string | null
          scope_type?: string
          show_answers?: boolean | null
          show_feedback?: boolean | null
          status?: string
          target_audience?: string | null
          template_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          validity_period_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "training_modules_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "course_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "training_paths_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_paths_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "training_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      training_session_attendees: {
        Row: {
          attendance_status:
            | Database["public"]["Enums"]["session_attendance_status"]
            | null
          created_at: string | null
          feedback_comments: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          score_percentage: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          attendance_status?:
            | Database["public"]["Enums"]["session_attendance_status"]
            | null
          created_at?: string | null
          feedback_comments?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          score_percentage?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_status?:
            | Database["public"]["Enums"]["session_attendance_status"]
            | null
          created_at?: string | null
          feedback_comments?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          score_percentage?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_attendees_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_attendees_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          course_id: string | null
          created_at: string | null
          delivery_mode:
            | Database["public"]["Enums"]["session_delivery_mode"]
            | null
          description: string | null
          end_time: string
          hotel_id: string | null
          id: string
          instructor_id: string | null
          location_venue: string | null
          max_capacity: number | null
          notes: string | null
          organization_id: string | null
          start_time: string
          status: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
          virtual_meeting_url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          delivery_mode?:
            | Database["public"]["Enums"]["session_delivery_mode"]
            | null
          description?: string | null
          end_time: string
          hotel_id?: string | null
          id?: string
          instructor_id?: string | null
          location_venue?: string | null
          max_capacity?: number | null
          notes?: string | null
          organization_id?: string | null
          start_time: string
          status?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
          virtual_meeting_url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          delivery_mode?:
            | Database["public"]["Enums"]["session_delivery_mode"]
            | null
          description?: string | null
          end_time?: string
          hotel_id?: string | null
          id?: string
          instructor_id?: string | null
          location_venue?: string | null
          max_capacity?: number | null
          notes?: string | null
          organization_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
          virtual_meeting_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "unified_question_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          bloom_level: string | null
          brand_id: string | null
          cognitive_domain: string | null
          correct_answer: string | null
          created_at: string | null
          created_by: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          distractor_rationales: Json | null
          estimated_time_seconds: number | null
          explanation: string | null
          explanation_ar: string | null
          hint: string | null
          hint_ar: string | null
          hotel_id: string | null
          id: string
          is_master_template: boolean
          linked_sop_id: string | null
          linked_sop_section: string | null
          master_source_id: string | null
          organization_id: string | null
          points: number | null
          question_bank_id: string | null
          question_text: string
          question_text_ar: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rubric: Json | null
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
          bloom_level?: string | null
          brand_id?: string | null
          cognitive_domain?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          distractor_rationales?: Json | null
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          hotel_id?: string | null
          id?: string
          is_master_template?: boolean
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          master_source_id?: string | null
          organization_id?: string | null
          points?: number | null
          question_bank_id?: string | null
          question_text: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric?: Json | null
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
          bloom_level?: string | null
          brand_id?: string | null
          cognitive_domain?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          distractor_rationales?: Json | null
          estimated_time_seconds?: number | null
          explanation?: string | null
          explanation_ar?: string | null
          hint?: string | null
          hint_ar?: string | null
          hotel_id?: string | null
          id?: string
          is_master_template?: boolean
          linked_sop_id?: string | null
          linked_sop_section?: string | null
          master_source_id?: string | null
          organization_id?: string | null
          points?: number | null
          question_bank_id?: string | null
          question_text?: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric?: Json | null
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
            foreignKeyName: "unified_questions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "unified_questions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "sop_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_master_source_id_fkey"
            columns: ["master_source_id"]
            isOneToOne: false
            referencedRelation: "unified_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_questions_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
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
          context_entity_id: string | null
          context_type: string | null
          correct_answers: number | null
          earned_points: number | null
          id: string
          organization_id: string | null
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
          context_entity_id?: string | null
          context_type?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string
          organization_id?: string | null
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
          context_entity_id?: string | null
          context_type?: string | null
          correct_answers?: number | null
          earned_points?: number | null
          id?: string
          organization_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "unified_quiz_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_competencies: {
        Row: {
          assessed_by: string | null
          assessed_score: number | null
          competency_id: string | null
          created_at: string | null
          current_level: number
          evidence_id: string | null
          evidence_type: string | null
          id: string
          last_assessed_at: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assessed_by?: string | null
          assessed_score?: number | null
          competency_id?: string | null
          created_at?: string | null
          current_level?: number
          evidence_id?: string | null
          evidence_type?: string | null
          id?: string
          last_assessed_at?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assessed_by?: string | null
          assessed_score?: number | null
          competency_id?: string | null
          created_at?: string | null
          current_level?: number
          evidence_id?: string | null
          evidence_type?: string | null
          id?: string
          last_assessed_at?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_competencies_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_competencies_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "user_message_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_competencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_competencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_competencies_user_id_fkey"
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
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          endpoint_id: string
          event_id: string | null
          id: string
          last_attempt_at: string | null
          response_code: number | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint_id: string
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          response_code?: number | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_id?: string
          event_id?: string | null
          id?: string
          last_attempt_at?: string | null
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "platform_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          is_active: boolean
          organization_id: string
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          organization_id: string
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          organization_id?: string
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      ai_generation_analytics: {
        Row: {
          agent_role: string | null
          avg_latency_ms: number | null
          cost_tier: string | null
          day: string | null
          failures: number | null
          max_latency_ms: number | null
          model_used: string | null
          provider: string | null
          requests: number | null
          successes: number | null
          total_cost_usd: number | null
          total_fallbacks: number | null
          total_retries: number | null
          total_tokens: number | null
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
      documents_article_v: {
        Row: {
          ai_category: string | null
          ai_generated: boolean | null
          ai_processed_at: string | null
          ai_source_content: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          archived_at: string | null
          archived_by: string | null
          block_order: number | null
          block_type: string | null
          category_id: string | null
          checklist_items: Json | null
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
          faq_items: Json | null
          featured: boolean | null
          file_extension: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          folder_id: string | null
          id: string | null
          images: Json | null
          is_active_kb_version: boolean | null
          is_archived: boolean | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          knowledge_base_status: string | null
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
          published_by: string | null
          quiz_enabled: boolean | null
          requires_acknowledgment: boolean | null
          requires_quiz: boolean | null
          review_frequency_months: number | null
          review_reminder_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          search_vector: unknown
          sop_code: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subcategory_id: string | null
          summary: string | null
          summary_ar: string | null
          supersedes_document_id: string | null
          title: string | null
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
          view_count: number | null
          visibility: Database["public"]["Enums"]["document_visibility"] | null
          visibility_scope:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text: string | null
        }
        Insert: {
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json | null
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
          faq_items?: Json | null
          featured?: boolean | null
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string | null
          images?: Json | null
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          knowledge_base_status?: string | null
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
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
          title?: string | null
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
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text?: string | null
        }
        Update: {
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json | null
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
          faq_items?: Json | null
          featured?: boolean | null
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string | null
          images?: Json | null
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          knowledge_base_status?: string | null
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
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
          title?: string | null
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
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
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
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      documents_sop_v: {
        Row: {
          ai_category: string | null
          ai_generated: boolean | null
          ai_processed_at: string | null
          ai_source_content: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          archived_at: string | null
          archived_by: string | null
          block_order: number | null
          block_type: string | null
          category_id: string | null
          checklist_items: Json | null
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
          faq_items: Json | null
          featured: boolean | null
          file_extension: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          folder_id: string | null
          id: string | null
          images: Json | null
          is_active_kb_version: boolean | null
          is_archived: boolean | null
          is_deleted: boolean | null
          is_mandatory: boolean | null
          knowledge_base_status: string | null
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
          published_by: string | null
          quiz_enabled: boolean | null
          requires_acknowledgment: boolean | null
          requires_quiz: boolean | null
          review_frequency_months: number | null
          review_reminder_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          search_vector: unknown
          sop_code: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subcategory_id: string | null
          summary: string | null
          summary_ar: string | null
          supersedes_document_id: string | null
          title: string | null
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
          view_count: number | null
          visibility: Database["public"]["Enums"]["document_visibility"] | null
          visibility_scope:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text: string | null
        }
        Insert: {
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json | null
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
          faq_items?: Json | null
          featured?: boolean | null
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string | null
          images?: Json | null
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          knowledge_base_status?: string | null
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
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
          title?: string | null
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
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
          visibility_scope?:
            | Database["public"]["Enums"]["knowledge_visibility"]
            | null
          watermark_text?: string | null
        }
        Update: {
          ai_category?: string | null
          ai_generated?: boolean | null
          ai_processed_at?: string | null
          ai_source_content?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          archived_at?: string | null
          archived_by?: string | null
          block_order?: number | null
          block_type?: string | null
          category_id?: string | null
          checklist_items?: Json | null
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
          faq_items?: Json | null
          featured?: boolean | null
          file_extension?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string | null
          images?: Json | null
          is_active_kb_version?: boolean | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_mandatory?: boolean | null
          knowledge_base_status?: string | null
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
          published_by?: string | null
          quiz_enabled?: boolean | null
          requires_acknowledgment?: boolean | null
          requires_quiz?: boolean | null
          review_frequency_months?: number | null
          review_reminder_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          search_vector?: unknown
          sop_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory_id?: string | null
          summary?: string | null
          summary_ar?: string | null
          supersedes_document_id?: string | null
          title?: string | null
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
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
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
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_article_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents_sop_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_content_blocks_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_documents_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "training_module_resources_v"
            referencedColumns: ["resource_id"]
          },
        ]
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
      _auto_assign_new_hire_impl: {
        Args: {
          new: Database["public"]["Tables"]["organization_memberships"]["Row"]
        }
        Returns: undefined
      }
      _grade_question_answer: {
        Args: {
          p_question_id: string
          p_selected_answer: string
          p_selected_options: string[]
        }
        Returns: boolean
      }
      _job_org: {
        Args: { p_created_by: string; p_org: string }
        Returns: string
      }
      _legacy_platform_fallback: {
        Args: { _user_id: string }
        Returns: boolean
      }
      _normalize_free_text: { Args: { p_value: string }; Returns: string }
      _plan_rank: { Args: { _code: string }; Returns: number }
      _safe_uuid: { Args: { p_value: string }; Returns: string }
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
      approve_pending_user: {
        Args: { p_approve?: boolean; p_user_id: string }
        Returns: Json
      }
      approve_training_module: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      archive_expired_documents: { Args: never; Returns: number }
      assign_platform_role: {
        Args: {
          p_role: string
          p_scope_org_ids?: string[]
          p_scope_type?: string
          p_user_id: string
        }
        Returns: string
      }
      auto_reactivate_suspended_accounts: { Args: never; Returns: undefined }
      award_module_skills: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: number
      }
      base32_decode: { Args: { input: string }; Returns: string }
      calculate_next_cron_run: {
        Args: { cron_expr: string; from_time?: string }
        Returns: string
      }
      calculate_next_task_run: {
        Args: { last_run: string; recurrence: string }
        Returns: string
      }
      can_manage_assignments: { Args: { user_id: string }; Returns: boolean }
      can_manage_employee_document: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_user_act_on_document_approval: {
        Args: { p_approval_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_document: { Args: { document_id: string }; Returns: boolean }
      can_view_employee_document: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_view_employee_public_profile: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_view_learning_analytics: { Args: never; Returns: boolean }
      can_view_report_definition: {
        Args: { _report_id: string }
        Returns: boolean
      }
      check_ai_credit: { Args: { p_org_id: string }; Returns: boolean }
      check_and_award_achievement: {
        Args: {
          p_achievement_type: Database["public"]["Enums"]["achievement_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      check_and_escalate_approvals: { Args: never; Returns: undefined }
      check_and_escalate_pending_actions: { Args: never; Returns: undefined }
      check_entitlement: {
        Args: { p_org_id: string; p_resource: string }
        Returns: boolean
      }
      check_expiring_documents: {
        Args: never
        Returns: {
          documents_expired: number
          documents_notified: number
        }[]
      }
      check_password_reuse: {
        Args: { plain_password: string }
        Returns: boolean
      }
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
      clear_org_feature_override: {
        Args: { p_key: string; p_org_id: string }
        Returns: undefined
      }
      complete_password_reset: { Args: never; Returns: undefined }
      complete_training_module: {
        Args: {
          p_assignment_id?: string
          p_completed_block_ids?: string[]
          p_last_block_id?: string
          p_last_block_index?: number
          p_module_id: string
          p_time_spent_seconds?: number
        }
        Returns: Json
      }
      consume_ai_credit: {
        Args: {
          p_cost?: number
          p_credits?: number
          p_org_id: string
          p_tokens?: number
        }
        Returns: undefined
      }
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
      create_scoped_training_assignment: {
        Args: {
          p_brand_id?: string
          p_course_id: string
          p_department_id?: string
          p_due_date?: string
          p_hotel_id?: string
          p_instructions?: string
          p_notify_on_due?: boolean
          p_organization_id: string
          p_priority?: string
          p_reminder_days_before?: number[]
          p_requires_acknowledgement?: boolean
          p_scope_type: string
          p_target_role?: string
          p_target_user_ids?: string[]
        }
        Returns: Json
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
      current_user_organization_ids: { Args: never; Returns: string[] }
      deploy_master_content: {
        Args: { p_content_type: string; p_master_id: string; p_org_id: string }
        Returns: string
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
      effective_entitlements: { Args: { p_org_id: string }; Returns: Json }
      emit_platform_event: {
        Args: {
          p_event_type: string
          p_organization_id: string
          p_payload?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      enable_mfa: {
        Args: { p_user_id: string; p_verification_code: string }
        Returns: boolean
      }
      end_platform_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      enforce_session_limit: {
        Args: { p_max_sessions?: number; p_user_id: string }
        Returns: boolean
      }
      evaluate_organization_quotas: {
        Args: { p_org_id: string }
        Returns: Json
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
      export_organization_archive: { Args: { p_org_id: string }; Returns: Json }
      feature_enabled: {
        Args: { p_key: string; p_org_id: string }
        Returns: boolean
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
      get_ai_agent_policies: { Args: never; Returns: Json }
      get_ai_daily_spend_usd: { Args: never; Returns: number }
      get_ai_model_registry: { Args: never; Returns: Json }
      get_ai_model_verification_status: { Args: never; Returns: Json }
      get_ai_routing_plan: {
        Args: {
          p_agent_role?: string
          p_allow_premium?: boolean
          p_capability: string
          p_free_only?: boolean
          p_limit?: number
        }
        Returns: Json
      }
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
      get_assessment_analytics_pass_rates: {
        Args: { p_days?: number }
        Returns: {
          avg_score: number
          completed_sessions: number
          distinct_learners: number
          failed: number
          pass_rate: number
          passed: number
          quiz_entity_id: string
          quiz_title: string
          quiz_type: string
        }[]
      }
      get_assessment_analytics_questions: {
        Args: { p_min_attempts?: number; p_module_id?: string }
        Returns: {
          attempts: number
          avg_time_seconds: number
          difficulty: string
          discrimination: number
          distinct_learners: number
          hint_used_rate: number
          module_title: string
          pct_correct: number
          question_id: string
          question_text: string
          question_type: string
          training_module_id: string
        }[]
      }
      get_assessment_analytics_wrong_answers: {
        Args: { p_question_id: string }
        Returns: {
          answer_label: string
          answer_value: string
          is_correct: boolean
          pct_of_attempts: number
          times_chosen: number
        }[]
      }
      get_assignable_learners: {
        Args: {
          p_brand_id?: string
          p_dept_id?: string
          p_hotel_id?: string
          p_limit?: number
          p_offset?: number
          p_org_id: string
          p_role?: string
          p_search?: string
        }
        Returns: {
          avatar_url: string
          brand_id: string
          brand_name: string
          department_id: string
          department_name: string
          email: string
          full_name: string
          hotel_id: string
          hotel_name: string
          id: string
          job_title: string
          role: string
        }[]
      }
      get_assignable_recipients_count: {
        Args: {
          p_brand_id?: string
          p_dept_id?: string
          p_hotel_id?: string
          p_individual_user_ids?: string[]
          p_org_id: string
          p_role?: string
          p_scope_type?: string
          p_search?: string
        }
        Returns: Json
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
      get_caller_assignment_scopes: {
        Args: { p_org_id?: string }
        Returns: Json
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
      get_course_analytics: {
        Args: never
        Returns: {
          avg_progress: number
          avg_score: number
          avg_time_seconds: number
          category: string
          completed_count: number
          completion_rate: number
          enrolled_count: number
          in_progress_count: number
          last_activity_at: string
          module_id: string
          quiz_pass_rate: number
          status: string
          title: string
        }[]
      }
      get_course_source_documents: {
        Args: { p_training_module_id: string }
        Returns: {
          attached_at: string
          attached_by: string
          caller_can_access: boolean
          doc_content_type: string
          doc_file_url: string
          doc_title: string
          doc_visibility: string
          document_id: string
          file_size: number
          file_type: string
          id: string
          is_primary: boolean
          original_filename: string
          relationship: string
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
      get_department_skill_matrix: {
        Args: { p_department_id: string }
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
      get_fifty_fifty_eliminations: {
        Args: { p_question_id: string }
        Returns: string[]
      }
      get_knowledge_analytics_search_terms: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          avg_result_count: number
          distinct_users: number
          last_searched_at: string
          searches: number
          term: string
          zero_result_searches: number
        }[]
      }
      get_knowledge_analytics_top_documents: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          content_type: string
          distinct_recent_viewers: number
          document_id: string
          last_viewed_at: string
          lifetime_views: number
          recent_views: number
          title: string
        }[]
      }
      get_knowledge_analytics_zero_result_searches: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          distinct_users: number
          last_searched_at: string
          searches: number
          term: string
        }[]
      }
      get_learner_analytics: {
        Args: { p_user_id?: string }
        Returns: {
          avg_progress: number
          avg_quiz_score: number
          completed_count: number
          enrolled_count: number
          full_name: string
          in_progress_count: number
          job_title: string
          last_activity_at: string
          not_started_count: number
          pass_rate: number
          quiz_sessions: number
          total_time_seconds: number
          user_id: string
        }[]
      }
      get_learner_topic_breakdown: {
        Args: { p_user_id: string }
        Returns: {
          accuracy: number
          attempts: number
          correct: number
          module_title: string
          training_module_id: string
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
      get_operator_impersonated_org: { Args: never; Returns: string }
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
      get_org_structure: { Args: { p_org_id: string }; Returns: Json }
      get_organization_profile: { Args: { p_org_id: string }; Returns: Json }
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
      get_platform_ai_operations: { Args: never; Returns: Json }
      get_platform_feature_matrix: { Args: never; Returns: Json }
      get_platform_global_search: { Args: { p_query: string }; Returns: Json }
      get_platform_operations_summary: { Args: never; Returns: Json }
      get_platform_usage_analytics: { Args: never; Returns: Json }
      get_platform_user_directory: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_org_id?: string
          p_role?: string
          p_search?: string
        }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_platform_user: boolean
          membership_count: number
          memberships: Json
          platform_role: string
          primary_organization_id: string
          primary_organization_name: string
        }[]
      }
      get_questions_for_attempt: {
        Args: { p_question_ids: string[] }
        Returns: Json
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
      get_quiz_for_player: { Args: { p_quiz_id: string }; Returns: Json }
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
      get_secure_report_run_url: { Args: { p_run_id: string }; Returns: string }
      get_security_summary: { Args: { p_user_id: string }; Returns: Json }
      get_setting: { Args: { p_key: string; p_org_id: string }; Returns: Json }
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
      get_user_organizations: { Args: never; Returns: string[] }
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
      get_user_skill_gaps: { Args: { p_user_id?: string }; Returns: Json }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      grade_question_attempt: {
        Args: {
          p_context_entity_id?: string
          p_context_type?: string
          p_hint_used?: boolean
          p_question_id: string
          p_selected_answer: string
          p_selected_options?: string[]
          p_session_id?: string
          p_time_spent_seconds?: number
        }
        Returns: Json
      }
      has_active_platform_session: {
        Args: { p_org_id: string }
        Returns: boolean
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
      has_tenant_access: { Args: { record_org_id: string }; Returns: boolean }
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
      is_content_author: { Args: { _user_id?: string }; Returns: boolean }
      is_content_manager: { Args: { _user_id: string }; Returns: boolean }
      is_guest_review_portfolio_admin: { Args: never; Returns: boolean }
      is_hr: { Args: { user_id: string }; Returns: boolean }
      is_hr_or_admin: { Args: { p_user_id?: string }; Returns: boolean }
      is_knowledge_manager: { Args: { _user_id?: string }; Returns: boolean }
      is_learning_editor: { Args: { p_user?: string }; Returns: boolean }
      is_mfa_enabled: { Args: { p_user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_platform_operator: { Args: { _user_id?: string }; Returns: boolean }
      is_platform_super_admin: { Args: never; Returns: boolean }
      is_platform_user: { Args: { target_user_id?: string }; Returns: boolean }
      is_regional_admin_or_higher: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_rls_enabled: { Args: { p_table_name: string }; Returns: boolean }
      is_task_creator: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      is_tenant_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_tenant_content_editor: { Args: { p_org_id: string }; Returns: boolean }
      is_tenant_people_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_training_manager: { Args: { _user_id?: string }; Returns: boolean }
      issue_training_certificate: {
        Args: { p_training_progress_id: string }
        Returns: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          created_at: string | null
          department_id: string | null
          description: string | null
          expiry_date: string | null
          hotel_id: string | null
          id: string
          issued_by: string | null
          metadata: Json | null
          organization_id: string | null
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
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
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
      log_content_change: {
        Args: {
          p_actor: string
          p_change_summary: string
          p_content_id: string
          p_content_type: string
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
      match_knowledge_chunks: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_query_text?: string
        }
        Returns: {
          article_id: string
          content: string
          document_id: string
          id: string
          keyword_rank: number
          section: string
          similarity: number
          title: string
        }[]
      }
      my_feature_enabled: {
        Args: { p_key: string; p_org_id?: string }
        Returns: boolean
      }
      notification_policy_enabled: {
        Args: { p_key: string; p_org_id: string }
        Returns: boolean
      }
      org_is_operational: { Args: { p_org_id: string }; Returns: boolean }
      org_visible: { Args: { p_org_id: string }; Returns: boolean }
      platform_operator_can: {
        Args: { _permission: string; _user_id?: string }
        Returns: boolean
      }
      platform_operator_has_role: {
        Args: { _role: string; _user_id?: string }
        Returns: boolean
      }
      platform_set_membership: {
        Args: {
          p_active?: boolean
          p_department_id?: string
          p_hotel_id?: string
          p_org_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_certificate_expirations: { Args: never; Returns: number }
      process_due_promotions: { Args: never; Returns: number }
      process_due_transfers: { Args: never; Returns: number }
      process_employee_transfer: {
        Args: {
          p_actor_id?: string
          p_reason: string
          p_target_dept_id: string
          p_target_hotel_id: string
          p_target_role: string
          p_user_id: string
        }
        Returns: Json
      }
      process_notification_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          processed: number
          remaining: number
        }[]
      }
      publish_document_to_kb: {
        Args: {
          p_category_id?: string
          p_department_id?: string
          p_document_id: string
          p_supersedes_id?: string
          p_user_id: string
          p_visibility?: string
        }
        Returns: Json
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
      reject_training_module: {
        Args: { p_module_id: string; p_reason?: string }
        Returns: undefined
      }
      remove_document_from_kb: {
        Args: { p_document_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      reorder_user_pins: {
        Args: { p_pin_orders: Json; p_user_id: string }
        Returns: boolean
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
      reset_monthly_ai_credits: { Args: never; Returns: undefined }
      resolve_account_context: { Args: never; Returns: Json }
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
      retry_course_generation_job: {
        Args: { p_job_id: string }
        Returns: boolean
      }
      retry_failed_job: { Args: { p_job_id: string }; Returns: boolean }
      revoke_all_other_sessions: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      revoke_platform_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      revoke_session: { Args: { p_session_id: string }; Returns: boolean }
      roles_satisfying: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      run_model_verification: {
        Args: { p_only_unverified?: boolean; p_provider?: string }
        Returns: Json
      }
      safe_notification_type: {
        Args: {
          p_default?: Database["public"]["Enums"]["notification_type"]
          p_value: string
        }
        Returns: Database["public"]["Enums"]["notification_type"]
      }
      sanitize_search_input: { Args: { p_input: string }; Returns: string }
      scan_source_change_flags: { Args: never; Returns: number }
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
      seed_default_scheduled_reports: { Args: never; Returns: undefined }
      set_ai_provider_health: {
        Args: {
          p_cooldown_seconds?: number
          p_provider: string
          p_status: string
        }
        Returns: undefined
      }
      set_document_internal: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: Json
      }
      set_feature_flag_default: {
        Args: { p_enabled: boolean; p_key: string }
        Returns: undefined
      }
      set_org_feature_override: {
        Args: {
          p_enabled: boolean
          p_key: string
          p_note?: string
          p_org_id: string
        }
        Returns: undefined
      }
      set_organization_status: {
        Args: { p_org_id: string; p_reason?: string; p_status: string }
        Returns: undefined
      }
      set_platform_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      snapshot_training_module_version: {
        Args: { p_module_id: string }
        Returns: string
      }
      start_platform_session: {
        Args: {
          p_acting_role?: string
          p_org_id: string
          p_reason: string
          p_ttl_minutes?: number
        }
        Returns: string
      }
      submit_quiz_attempt: {
        Args: {
          p_answers: Json
          p_assignment_id?: string
          p_context_entity_id?: string
          p_context_type?: string
          p_quiz_id: string
          p_time_spent_seconds?: number
        }
        Returns: Json
      }
      submit_training_module_for_review: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      suggest_system_role: {
        Args: { p_job_title: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      toggle_comment_pin: { Args: { p_comment_id: string }; Returns: boolean }
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
      user_has_department_access: {
        Args: { auth_user_id: string; target_dept_id: string }
        Returns: boolean
      }
      user_has_organization_access: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      users_share_active_org: {
        Args: { _a: string; _b: string }
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
      validate_module_quiz_integrity: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      validate_uuid_array: { Args: { p_input: string[] }; Returns: string[] }
      verify_certificate: {
        Args: { verification_code_param: string }
        Returns: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          department_name: string
          expiry_date: string
          is_valid: boolean
          issued_at: string
          property_name: string
          recipient_name: string
          status: string
          title: string
          verification_code: string
        }[]
      }
      verify_mfa_code: {
        Args: { p_code: string; p_user_id: string }
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
        | "learner"
        | "author"
        | "knowledge_manager"
        | "training_manager"
        | "administrator"
      assessment_placement:
        | "lesson"
        | "module"
        | "course"
        | "path"
        | "certification"
        | "standalone"
        | "sop_checkpoint"
      assessment_type:
        | "formative"
        | "summative"
        | "quiz"
        | "exam"
        | "diagnostic"
        | "certification"
      content_block_type:
        | "text"
        | "image"
        | "video"
        | "document_link"
        | "quiz"
        | "sop_reference"
        | "audio"
        | "interactive"
      content_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
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
      enrollment_status: "not_started" | "in_progress" | "completed" | "expired"
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
      lesson_block_type:
        | "text"
        | "video"
        | "image"
        | "embed"
        | "callout"
        | "activity"
        | "knowledge_check"
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
      membership_role:
        | "organization_owner"
        | "organization_admin"
        | "brand_admin"
        | "hotel_admin"
        | "department_manager"
        | "training_manager"
        | "knowledge_manager"
        | "author"
        | "instructor"
        | "learner"
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
      objective_kind: "terminal" | "enabling"
      objective_link_type: "lesson" | "assessment" | "question"
      platform_role:
        | "system_owner"
        | "platform_admin"
        | "platform_training_manager"
        | "platform_knowledge_manager"
        | "platform_support"
        | "platform_operations"
        | "platform_instructor"
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
        | "yes_no"
        | "short_answer"
        | "long_answer"
        | "ranking"
        | "case_based"
        | "numeric"
        | "code_technical"
        | "categorization"
        | "hotspot_image"
      question_usage_type:
        | "sop_inline"
        | "lesson"
        | "quiz"
        | "certification"
        | "assessment"
        | "daily_challenge"
      quiz_type: "mcq" | "true_false" | "fill_blank"
      session_attendance_status:
        | "registered"
        | "attended"
        | "excused"
        | "no_show"
        | "failed"
      session_delivery_mode: "in_person" | "virtual" | "hybrid"
      sop_approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "changes_requested"
      sop_document_status: "draft" | "under_review" | "approved" | "obsolete"
      sync_status: "pending" | "syncing" | "completed" | "failed"
      task_priority: "low" | "medium" | "high" | "urgent"
      tenant_lifecycle_status:
        | "prospect"
        | "trial"
        | "onboarding"
        | "active"
        | "suspended"
        | "renewal"
        | "archived"
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
        "learner",
        "author",
        "knowledge_manager",
        "training_manager",
        "administrator",
      ],
      assessment_placement: [
        "lesson",
        "module",
        "course",
        "path",
        "certification",
        "standalone",
        "sop_checkpoint",
      ],
      assessment_type: [
        "formative",
        "summative",
        "quiz",
        "exam",
        "diagnostic",
        "certification",
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
      content_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "archived",
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
      enrollment_status: ["not_started", "in_progress", "completed", "expired"],
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
      lesson_block_type: [
        "text",
        "video",
        "image",
        "embed",
        "callout",
        "activity",
        "knowledge_check",
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
      membership_role: [
        "organization_owner",
        "organization_admin",
        "brand_admin",
        "hotel_admin",
        "department_manager",
        "training_manager",
        "knowledge_manager",
        "author",
        "instructor",
        "learner",
      ],
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
      objective_kind: ["terminal", "enabling"],
      objective_link_type: ["lesson", "assessment", "question"],
      platform_role: [
        "system_owner",
        "platform_admin",
        "platform_training_manager",
        "platform_knowledge_manager",
        "platform_support",
        "platform_operations",
        "platform_instructor",
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
        "yes_no",
        "short_answer",
        "long_answer",
        "ranking",
        "case_based",
        "numeric",
        "code_technical",
        "categorization",
        "hotspot_image",
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
      session_attendance_status: [
        "registered",
        "attended",
        "excused",
        "no_show",
        "failed",
      ],
      session_delivery_mode: ["in_person", "virtual", "hybrid"],
      sop_approval_status: [
        "pending",
        "approved",
        "rejected",
        "changes_requested",
      ],
      sop_document_status: ["draft", "under_review", "approved", "obsolete"],
      sync_status: ["pending", "syncing", "completed", "failed"],
      task_priority: ["low", "medium", "high", "urgent"],
      tenant_lifecycle_status: [
        "prospect",
        "trial",
        "onboarding",
        "active",
        "suspended",
        "renewal",
        "archived",
      ],
      training_status: ["not_started", "in_progress", "completed", "expired"],
      translation_status: ["pending", "automated", "reviewed"],
    },
  },
} as const
