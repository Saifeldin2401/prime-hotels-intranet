/**
 * SECURE SEARCH UTILITIES
 * 
 * This module provides SQL injection-safe alternatives to vulnerable search patterns.
 * 
 * VULNERABLE PATTERN (DO NOT USE):
 *   const escaped = escapeSearchQuery(userInput)
 *   query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
 * 
 * SECURE REPLACEMENT:
 *   Use the secure search functions below which call database RPC functions
 *   with proper parameterization.
 */

import { supabase } from './supabase'
import { sanitizeSearchInput, sanitizeUUID } from './utils'

// ============================================================================
// Types
// ============================================================================

interface SecureDocumentFilters {
  search?: string
  status?: string
  visibility?: string
  property_id?: string
  department_id?: string
  folder_id?: string | null
  file_type?: string | string[]
  date_from?: string
  date_to?: string
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted'
  include_deleted?: boolean
  include_archived?: boolean
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'view_count'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

interface SecureUserFilters {
  search?: string
  property_id?: string
  department_id?: string
  role?: string
  is_active?: boolean
  limit?: number
}

// ============================================================================
// Secure Document Search
// ============================================================================

/**
 * SECURE: Search documents using parameterized database function.
 * This prevents SQL injection by using proper parameterization on the server side.
 */
export async function secureSearchDocuments(filters: SecureDocumentFilters = {}) {
  const {
    search,
    status,
    visibility,
    property_id,
    department_id,
    folder_id,
    file_type,
    date_from,
    date_to,
    confidentiality_level,
    include_deleted = false,
    include_archived = false,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 100,
    offset = 0
  } = filters

  // Sanitize all inputs
  const sanitizedSearch = search ? sanitizeSearchInput(search) : null
  const sanitizedPropertyId = sanitizeUUID(property_id)
  const sanitizedDepartmentId = sanitizeUUID(department_id)
  const sanitizedFolderId = folder_id === null ? null : sanitizeUUID(folder_id)
  const sanitizedFileType = Array.isArray(file_type) 
    ? file_type.filter(t => /^[a-zA-Z0-9_-]+$/.test(t))
    : file_type && /^[a-zA-Z0-9_-]+$/.test(file_type) ? [file_type] : null

  // Validate status and visibility against allowed values
  const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED']
  const validVisibilities = ['all_properties', 'property', 'department', 'role', 'specific_departments']
  const validConfidentiality = ['public', 'internal', 'confidential', 'restricted']

  const sanitizedStatus = status && validStatuses.includes(status.toUpperCase()) 
    ? status.toUpperCase() 
    : null
  const sanitizedVisibility = visibility && validVisibilities.includes(visibility) 
    ? visibility 
    : null
  const sanitizedConfidentiality = confidentiality_level && validConfidentiality.includes(confidentiality_level)
    ? confidentiality_level
    : null

  // Validate sort parameters
  const validSortColumns = ['created_at', 'updated_at', 'title', 'file_size', 'view_count']
  const sanitizedSortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at'
  const sanitizedSortOrder = sort_order === 'asc' ? 'asc' : 'desc'

  // Call secure database function
  const { data, error } = await supabase.rpc('secure_search_documents', {
    p_search_query: sanitizedSearch,
    p_property_id: sanitizedPropertyId,
    p_folder_id: sanitizedFolderId,
    p_status: sanitizedStatus,
    p_visibility: sanitizedVisibility,
    p_department_id: sanitizedDepartmentId,
    p_file_type: sanitizedFileType,
    p_date_from: date_from || null,
    p_date_to: date_to || null,
    p_confidentiality_level: sanitizedConfidentiality,
    p_include_deleted: include_deleted,
    p_include_archived: include_archived,
    p_sort_by: sanitizedSortBy,
    p_sort_order: sanitizedSortOrder,
    p_limit: Math.min(limit, 500),
    p_offset: Math.max(offset, 0)
  })

  if (error) {
    console.error('secureSearchDocuments error:', error)
    throw new Error('Failed to search documents securely')
  }

  return data || []
}

// ============================================================================
// Secure User Search
// ============================================================================

/**
 * SECURE: Search users using parameterized database function.
 */
export async function secureSearchUsers(filters: SecureUserFilters = {}) {
  const {
    search,
    property_id,
    department_id,
    role,
    is_active = true,
    limit = 50
  } = filters

  const sanitizedSearch = search ? sanitizeSearchInput(search) : null
  const sanitizedPropertyId = sanitizeUUID(property_id)
  const sanitizedDepartmentId = sanitizeUUID(department_id)

  // Validate role against allowed values
  const validRoles = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager', 'staff']
  const sanitizedRole = role && validRoles.includes(role) ? role : null

  const { data, error } = await supabase.rpc('secure_search_users', {
    p_search_query: sanitizedSearch,
    p_property_id: sanitizedPropertyId,
    p_department_id: sanitizedDepartmentId,
    p_role: sanitizedRole,
    p_is_active: is_active,
    p_limit: Math.min(limit, 200)
  })

  if (error) {
    console.error('secureSearchUsers error:', error)
    throw new Error('Failed to search users securely')
  }

  return data || []
}

// ============================================================================
// Safe Query Builder Helpers
// ============================================================================
// ============================================================================
// Rate Limiting
// ============================================================================
