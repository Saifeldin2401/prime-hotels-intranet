import type { AppRole, DocumentStatus, DocumentVisibility } from '../constants'
import type { Profile } from './profile'

export interface Document {
  id: string
  title: string
  description: string | null
  content?: string | null
  file_url: string
  storage_bucket?: string | null
  storage_path?: string | null
  visibility: DocumentVisibility
  property_id: string | null
  department_id: string | null
  role: AppRole | null
  status: DocumentStatus
  requires_acknowledgment: boolean
  created_by: string
  updated_by?: string | null
  current_version: number
  published_version_number?: number | null
  last_published_at?: string | null
  last_published_by?: string | null
  created_at: string
  updated_at: string
  view_count: number
  estimated_read_time?: number | null
  content_type: string
  expires_at?: string | null
  review_reminder_date?: string | null
  document_number?: string | null
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted' | null
  owner_id?: string | null
  folder_id?: string | null
  file_extension?: string | null
  download_count?: number | null
  last_downloaded_at?: string | null
  watermark_text?: string | null
  is_archived?: boolean | null
  deleted_at?: string | null
  tags?: Array<{ id: string; name: string; color?: string | null }> | null
  departments?: { id: string; name: string } | null
  properties?: { id: string; name: string } | null
  profiles?: { id: string; full_name: string | null } | null
}

export interface SystemWikiSubtopic {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
}

export interface SystemWikiArticle {
  id: string
  slug: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  subtopics: SystemWikiSubtopic[]
  allowed_roles: AppRole[]
  order_index: number
  is_active: boolean
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  change_summary: string | null
  created_by: string | null
  created_at: string
  title?: string | null
  description?: string | null
  content?: string | null
  status?: DocumentStatus | null
  metadata?: Record<string, unknown> | null
}

export interface DocumentApproval {
  id: string
  document_id: string
  approver_id: string
  status: 'pending' | 'approved' | 'rejected'
  feedback: string | null
  approved_at: string | null
  created_at: string
}

export interface DocumentAcknowledgment {
  id: string
  document_id: string
  user_id: string
  acknowledged_at: string
}
