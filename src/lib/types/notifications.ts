import type { Profile } from './profile'

export interface Notification {
  id: string
  user_id: string
  type: 'approval_required' | 'request_approved' | 'request_rejected' | 'request_submitted' | 'comment_added' | 'request_returned' | 'request_closed' | 'training_assigned' | 'training_deadline' | 'document_published' | 'document_acknowledgment_required' | 'announcement_new' | 'escalation_alert' | 'referral_status_update' | 'maintenance_assigned' | 'maintenance_resolved' | 'message_received' | 'mention' | 'task_assigned' | 'system'
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  link?: string | null
  is_read: boolean
  read_at: string | null
  created_at: string

  // Relations
  user?: Profile
}

export interface NotificationPreference {
  id: string
  user_id: string
  email_enabled: boolean
  approval_email: boolean
  training_email: boolean
  announcement_email: boolean
  maintenance_email: boolean
  browser_push_enabled: boolean
  approval_push: boolean
  training_push: boolean
  announcement_push: boolean
  maintenance_push: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  daily_digest_enabled: boolean
  notification_sounds_enabled: boolean
  created_at?: string
  updated_at?: string
}
