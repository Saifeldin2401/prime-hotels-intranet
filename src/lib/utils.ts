import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`

  return formatDate(d)
}

export function formatDistanceToNow(date: Date | string | null | undefined): string {
  return formatRelativeTime(date)
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * DEPRECATED: This function does NOT provide complete protection against SQL injection.
 * Use secureSearchParams() or database RPC functions instead.
 * 
 * Escape special characters in a search query for PostgreSQL ILIKE patterns.
 * WARNING: This only escapes SQL wildcards. PostgREST operators (comma, parentheses) 
 * can still be injected. Use with extreme caution.
 */
export function escapeSearchQuery(query: string): string {
  return query
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent sign
    .replace(/_/g, '\\_')    // Escape underscore
    .replace(/,/g, '\\,')    // Escape PostgREST OR separator
    .replace(/\(/g, '\\(')   // Escape PostgREST grouping
    .replace(/\)/g, '\\)')   // Escape PostgREST grouping
}

/**
 * SECURITY CRITICAL: Sanitize user input for use in database queries.
 * This is a defense-in-depth measure. Prefer using parameterized RPC functions.
 * Removes all potentially dangerous characters.
 * @param input - Raw user input
 * @returns Sanitized string safe for database queries
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/[^a-zA-Z0-9\s\-_@.]/g, '')  // Only allow safe characters
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim()
    .slice(0, 100)                        // Limit length
}

/**
 * SECURITY CRITICAL: Validate and sanitize UUID
 * @param id - Potential UUID string
 * @returns Valid UUID or null
 */
export function sanitizeUUID(id: string | null | undefined): string | null {
  if (!id) return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) ? id.toLowerCase() : null
}

/**
 * SECURITY CRITICAL: Validate array of UUIDs
 * @param ids - Array of potential UUID strings
 * @returns Array of valid UUIDs
 */
export function sanitizeUUIDArray(ids: string[] | null | undefined): string[] {
  if (!Array.isArray(ids)) return []
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return ids.filter(id => uuidRegex.test(id)).map(id => id.toLowerCase())
}

/**
 * Build a safe PostgREST filter object.
 * Returns null if input is unsafe.
 */
export function buildSafeFilter(
  field: string,
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike',
  value: string | number | boolean
): { field: string; operator: string; value: string | number | boolean } | null {
  // Validate field name (only allow alphanumeric and underscore)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    return null
  }
  
  // Validate operator
  const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike']
  if (!validOperators.includes(operator)) {
    return null
  }
  
  return { field, operator, value }
}
