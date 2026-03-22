/**
 * User-friendly error message mapping utility
 * Maps technical errors to user-friendly messages
 */

import i18n from '@/i18n/i18n'

export interface ErrorDetails {
  message: string
  code?: string
  retryable?: boolean
  action?: string
}

/**
 * Maps Supabase/API error codes to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): ErrorDetails {
  // Handle Error objects
  if (error instanceof Error) {
    return mapErrorToUserMessage(error.message, error.name)
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>
    
    // Check for Supabase error format
    if (errorObj.code && errorObj.message) {
      return mapSupabaseError(errorObj.code as string, errorObj.message as string)
    }
    
    if (errorObj.message) {
      return mapErrorToUserMessage(errorObj.message as string, errorObj.name as string)
    }
  }

  // Fallback for unknown errors
  return {
    message: i18n.t('errors:unknown_error'),
    retryable: true,
    action: 'retry'
  }
}

/**
 * Maps Supabase-specific error codes
 */
function mapSupabaseError(code: string, message: string): ErrorDetails {
  const codeMap: Record<string, ErrorDetails> = {
    'PGRST116': {
      message: 'The item you are looking for could not be found.',
      code,
      retryable: false,
      action: 'refresh'
    },
    'PGRST301': {
      message: 'You do not have permission to perform this action.',
      code,
      retryable: false,
      action: 'contact_admin'
    },
    '23505': {
      message: 'This item already exists. Please check for duplicates.',
      code,
      retryable: false,
      action: 'check_duplicates'
    },
    '23503': {
      message: 'This item is linked to other data and cannot be deleted.',
      code,
      retryable: false,
      action: 'check_dependencies'
    },
    '23514': {
      message: 'The information you entered is invalid. Please check your input.',
      code,
      retryable: true,
      action: 'fix_input'
    },
    '42501': {
      message: 'You do not have permission to access this resource.',
      code,
      retryable: false,
      action: 'contact_admin'
    },
    '42P01': {
      message: 'A database error occurred. Please try again later.',
      code,
      retryable: true,
      action: 'retry'
    }
  }

  if (codeMap[code]) {
    return codeMap[code]
  }

  // Check for common error patterns in message
  if (message.includes('JWT')) {
    return {
      message: i18n.t('errors:unauthorized'),
      code,
      retryable: false,
      action: 'login'
    }
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      message: i18n.t('errors:network_connection'),
      code,
      retryable: true,
      action: 'retry'
    }
  }

  if (message.includes('timeout')) {
    return {
      message: i18n.t('errors:timeout'),
      code,
      retryable: true,
      action: 'retry'
    }
  }

  return {
    message: message || i18n.t('errors:unknown_error'),
    code,
    retryable: true,
    action: 'retry'
  }
}

/**
 * Maps generic error messages to user-friendly versions
 */
function mapErrorToUserMessage(message: string, _name?: string): ErrorDetails {
  const lowerMessage = message.toLowerCase()

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return {
      message: i18n.t('errors:network_connection'),
      retryable: true,
      action: 'retry'
    }
  }

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication') || lowerMessage.includes('login')) {
    return {
      message: i18n.t('errors:unauthorized'),
      retryable: false,
      action: 'login'
    }
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
    return {
      message: i18n.t('errors:permission_denied'),
      retryable: false,
      action: 'contact_admin'
    }
  }

  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return {
      message: i18n.t('errors:not_found'),
      retryable: false,
      action: 'refresh'
    }
  }

  // Validation errors
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return {
      message: i18n.t('errors:validation_error'),
      retryable: true,
      action: 'fix_input'
    }
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      message: i18n.t('errors:timeout'),
      retryable: true,
      action: 'retry'
    }
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      message: i18n.t('errors:rate_limit'),
      retryable: true,
      action: 'wait_and_retry'
    }
  }

  // File upload errors
  if (lowerMessage.includes('file') || lowerMessage.includes('upload')) {
    if (lowerMessage.includes('size') || lowerMessage.includes('too large')) {
      return {
        message: 'The file is too large. Please choose a smaller file.',
        retryable: true,
        action: 'choose_smaller_file'
      }
    }
    if (lowerMessage.includes('type') || lowerMessage.includes('format')) {
      return {
        message: 'This file type is not supported. Please choose a different file.',
        retryable: true,
        action: 'choose_different_file'
      }
    }
    return {
      message: 'There was a problem uploading the file. Please try again.',
      retryable: true,
      action: 'retry'
    }
  }

  // Return original message if no pattern matches, but make it more user-friendly
  return {
    message: message || i18n.t('errors:unknown_error'),
    retryable: true,
    action: 'retry'
  }
}

/**
 * Gets a user-friendly error message with retry capability
 */
export function getErrorMessage(error: unknown): string {
  return getUserFriendlyError(error).message
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return getUserFriendlyError(error).retryable ?? true
}

/**
 * Gets suggested action for an error
 */
export function getErrorAction(error: unknown): string | undefined {
  return getUserFriendlyError(error).action
}


