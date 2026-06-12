const ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL Error Codes
  'PGRST116': 'You do not have permission to perform this action',
  '42501': 'You do not have permission to perform this action',
  '23505': 'This item already exists',
  '23503': 'This item is referenced by other records and cannot be modified',
  '23502': 'A required field is missing',
  'P0001': 'Invalid data provided',
  'P0002': 'The requested item was not found',
  '22001': 'Input is too long',
  '22003': 'Numeric value is out of range',
  '22P02': 'Invalid input format',
  '40001': 'Transaction failed due to concurrent update. Please try again',
  '40P01': 'Deadlock detected. Please try again',
  '28P01': 'Authentication failed',
  '3D000': 'Database does not exist',
  '3F000': 'Schema does not exist',
  '42P01': 'Table does not exist',
  '42P02': 'Parameter not found',
  '57014': 'Query was cancelled due to timeout',
  // HTTP Status Codes (from Supabase)
  '401': 'You are not authorized to perform this action',
  '403': 'Access denied',
  '404': 'The requested item was not found',
  '409': 'This item conflicts with an existing record',
  '422': 'Invalid data provided',
  '429': 'Too many requests. Please try again later',
  '500': 'Server error. Please try again later',
  '503': 'Service temporarily unavailable',
  // Custom Application Errors
  'VALIDATION_ERROR': 'Please check your input and try again',
  'NETWORK_ERROR': 'Network error. Please check your connection',
  'TIMEOUT_ERROR': 'Request timed out. Please try again',
  'STORAGE_ERROR': 'File storage error. Please try again',
  'FILE_TOO_LARGE': 'File is too large. Maximum size is 50MB',
  'INVALID_FILE_TYPE': 'Invalid file type. Please upload a supported file',
}

function getErrorCode(error: unknown): string | null {
  if (!error) return null

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>
    if (err.code) return String(err.code)
    if (err.error && typeof err.error === 'object' && err.error.code) return String(err.error.code)
    if (err.status) return String(err.status)
    if (err.statusCode) return String(err.statusCode)

    const message = err.message || (err.error && typeof err.error === 'object' ? err.error.message : undefined) || err.error_description
    if (typeof message === 'string') {
      if (message.includes('violates unique constraint')) return '23505'
      if (message.includes('violates foreign key constraint')) return '23503'
      if (message.includes('violates not-null constraint')) return '23502'
      if (message.includes('permission denied')) return '42501'
      if (message.includes('row-level security')) return 'PGRST116'
      if (message.includes('JWT')) return '401'
      if (message.includes('timeout')) return 'TIMEOUT_ERROR'
      if (message.includes('network')) return 'NETWORK_ERROR'
    }
  }

  return null
}

export function getUserFriendlyErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  const code = getErrorCode(error)
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code]
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>
    const message = err.message || (err.error && typeof err.error === 'object' ? err.error.message : undefined) || err.error_description
    if (typeof message === 'string' && message.length > 0 && message.length < 200) {
      return message
    }
  }

  return defaultMessage
}
