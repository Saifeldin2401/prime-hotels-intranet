import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface ApiError {
  message: string
  code?: string
  details?: any
}

interface ErrorState {
  error: ApiError | null
  isLoading: boolean
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false
  })

  const handleError = useCallback((error: any, customMessage?: string) => {
    console.error('API Error:', error)
    
    let apiError: ApiError = {
      message: customMessage || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }

    // Handle Supabase errors
    if (error?.code) {
      switch (error.code) {
        case 'PGRST116':
          apiError = { message: 'Resource not found', code: 'NOT_FOUND' }
          break
        case 'PGRST301':
          apiError = { message: 'Access denied', code: 'ACCESS_DENIED' }
          break
        case '23505':
          apiError = { message: 'Resource already exists', code: 'DUPLICATE_ENTRY' }
          break
        case '23503':
          apiError = { message: 'Referenced resource does not exist', code: 'FOREIGN_KEY' }
          break
        case '23514':
          apiError = { message: 'Invalid data provided', code: 'VALIDATION_ERROR' }
          break
        default:
          apiError = { 
            message: error.message || 'Database error occurred', 
            code: error.code 
          }
      }
    }
    // Handle network errors
    else if (error?.name === 'TypeError' && error.message.includes('fetch')) {
      apiError = { 
        message: 'Network error. Please check your connection.', 
        code: 'NETWORK_ERROR' 
      }
    }
    // Handle validation errors
    else if (error?.name === 'ValidationError') {
      apiError = { 
        message: error.message || 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: error.details
      }
    }
    // Handle generic errors
    else if (error?.message) {
      apiError = { 
        message: error.message, 
        code: 'GENERIC_ERROR' 
      }
    }

    setErrorState({ error: apiError, isLoading: false })
    
    // Show toast notification
    toast.error(apiError.message)
    
    return apiError
  }, [])

  const clearError = useCallback(() => {
    setErrorState({ error: null, isLoading: false })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const executeWithErrorHandling = useCallback(async <T,>(
    asyncFunction: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    setLoading(true)
    clearError()

    try {
      const result = await asyncFunction()
      setLoading(false)
      return result
    } catch (error) {
      handleError(error, errorMessage)
      return null
    }
  }, [handleError, setLoading, clearError])

  return {
    error: errorState.error,
    isLoading: errorState.isLoading,
    handleError,
    clearError,
    setLoading,
    executeWithErrorHandling
  }
}

// Error messages for common scenarios
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission for this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
}

// Helper function to get user-friendly error messages
export function getErrorMessage(error: any): string {
  if (!error) return ERROR_MESSAGES.UNKNOWN

  // Supabase specific errors
  if (error.code) {
    switch (error.code) {
      case 'PGRST116': return 'The requested resource was not found.'
      case 'PGRST301': return 'You are not authorized to access this resource.'
      case '23505': return 'This resource already exists.'
      case '23503': return 'Referenced data not found.'
      case '23514': return 'Invalid data provided.'
      default: return error.message || ERROR_MESSAGES.SERVER
    }
  }

  // HTTP status errors
  if (error.status) {
    switch (error.status) {
      case 401: return ERROR_MESSAGES.UNAUTHORIZED
      case 403: return ERROR_MESSAGES.FORBIDDEN
      case 404: return ERROR_MESSAGES.NOT_FOUND
      case 422: return ERROR_MESSAGES.VALIDATION
      case 500: return ERROR_MESSAGES.SERVER
      default: return error.message || ERROR_MESSAGES.UNKNOWN
    }
  }

  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK
  }

  // Return the error message if available
  return error.message || ERROR_MESSAGES.UNKNOWN
}
