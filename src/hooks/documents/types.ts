export interface DocumentFilters {
  status?: string
  visibility?: string
  property_id?: string
  department_id?: string
  search?: string
  /**
   * Filter by content type.
   * Use 'document' for file uploads only.
   * Use undefined to get all types (including knowledge base articles).
   * @default 'document'
   */
  contentType?: string | null
  // Enhanced document system filters
  folder_id?: string | null
  tags?: string[]
  file_type?: string | string[] // pdf, doc, xls, etc.
  date_from?: string // ISO date string
  date_to?: string // ISO date string
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted'
  include_deleted?: boolean // for trash view
  include_archived?: boolean
  has_expiry?: boolean
  expiry_before?: string
  expiry_after?: string
  created_by?: string
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'view_count'
  sort_order?: 'asc' | 'desc'
}

export interface DocumentFolder {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  property_id: string | null
  department_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  document_count?: number
  children?: DocumentFolder[]
}

export interface DocumentTag {
  id: string
  name: string
  color: string | null
  description: string | null
  usage_count?: number
  created_at: string
}

export interface DocumentComment {
  id: string
  document_id: string
  user_id: string
  content: string
  parent_id: string | null
  is_resolved: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
  author?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  replies?: DocumentComment[]
}

export interface DocumentAnalytics {
  document_id: string
  view_count: number
  download_count: number
  unique_viewers: number
  acknowledgment_count: number
  views_over_time: Array<{
    date: string
    count: number
  }>
  downloads_over_time: Array<{
    date: string
    count: number
  }>
  viewers_by_department: Array<{
    department_id: string
    department_name: string
    count: number
  }>
}

export interface AISuggestion {
  value: string
  confidence: 'high' | 'medium' | 'low'
  reason?: string
}

export interface BulkOperationResult {
  success: string[]
  failed: Array<{ id: string; error: string }>
  total: number
}

export interface DocumentExpiryInfo {
  id: string
  title: string
  expires_at: string
  days_until_expiry: number
  status: 'expired' | 'expiring_soon' | 'active'
  folder_id: string | null
}
