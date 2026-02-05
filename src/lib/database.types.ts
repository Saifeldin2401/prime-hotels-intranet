/**
 * Supabase Database Types
 * Re-exported from the canonical source @/types/supabase
 * 
 * For type generation, use:
 * npx supabase gen types typescript --project-id htsvjfrofcpkfzvjpwvx --schema public > src/types/supabase.ts
 */

export type { Database, Json } from '@/types/supabase'

// Re-export helper types for backwards compatibility
// These are derived from the Database type
import type { Database } from '@/types/supabase'

export type AppRole = Database['public']['Enums']['app_role']
export type ContentType = Database['public']['Enums']['content_type']
export type DocumentStatus = Database['public']['Enums']['document_status']
export type NotificationType = Database['public']['Enums']['notification_type']
export type TrainingStatus = Database['public']['Enums']['training_status']
export type QuestionType = Database['public']['Enums']['question_type']
export type QuestionDifficulty = Database['public']['Enums']['question_difficulty']
export type LeaveType = Database['public']['Enums']['leave_type']
export type LeaveRequestStatus = Database['public']['Enums']['leave_request_status']
