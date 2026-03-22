import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

interface ErrorState {
  error: ApiError | null
  isLoading: boolean
}

export function useErrorHandler() {
  const { t } = useTranslation('errors')
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false
  })

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    console.error('API Error:', error)

    // Type guard for error object
    const isErrorWithCode = (e: unknown): e is { code: string; message?: string } =>
      typeof e === 'object' && e !== null && 'code' in e
    const isErrorWithName = (e: unknown): e is { name: string; message: string; details?: unknown } =>
      typeof e === 'object' && e !== null && 'name' in e && 'message' in e
    const isErrorWithMessage = (e: unknown): e is { message: string } =>
      typeof e === 'object' && e !== null && 'message' in e

    let apiError: ApiError = {
      message: customMessage || t('unknown_error'),
      code: 'UNKNOWN_ERROR'
    }

    // Handle Supabase errors
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case 'PGRST116':
          apiError = { message: t('resource_not_found'), code: 'NOT_FOUND' }
          break
        case 'PGRST301':
          apiError = { message: t('access_denied'), code: 'ACCESS_DENIED' }
          break
        case '23505':
          apiError = { message: t('duplicate_entry'), code: 'DUPLICATE_ENTRY' }
          break
        case '23503':
          apiError = { message: t('foreign_key'), code: 'FOREIGN_KEY' }
          break
        case '23514':
          apiError = { message: t('validation_error'), code: 'VALIDATION_ERROR' }
          break
        default:
          apiError = {
            message: error.message || t('database_error'),
            code: error.code
          }
      }
    }
    // Handle network errors
    else if (isErrorWithName(error) && error.name === 'TypeError' && error.message.includes('fetch')) {
      apiError = {
        message: t('network_connection'),
        code: 'NETWORK_ERROR'
      }
    }
    // Handle validation errors
    else if (isErrorWithName(error) && error.name === 'ValidationError') {
      apiError = {
        message: error.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details as Record<string, unknown> | undefined
      }
    }
    // Handle generic errors
    else if (isErrorWithMessage(error)) {
      apiError = {
        message: error.message,
        code: 'GENERIC_ERROR'
      }
    }

    setErrorState({ error: apiError, isLoading: false })

    // Show toast notification
    toast.error(apiError.message)

    return apiError
  }, [t])

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

// Error messages for common scenarios - Use i18n directly for non-hook contexts
import i18n from '@/i18n/i18n'

export const ERROR_MESSAGES = {
  get NETWORK() { return i18n.t('errors:network_connection') },
  get UNAUTHORIZED() { return i18n.t('errors:unauthorized') },
  get FORBIDDEN() { return i18n.t('errors:permission_denied') },
  get NOT_FOUND() { return i18n.t('errors:not_found') },
  get VALIDATION() { return i18n.t('errors:validation_error') },
  get SERVER() { return i18n.t('errors:server_error') },
  get UNKNOWN() { return i18n.t('errors:unknown_error') }
}

// Helper function to get user-friendly error messages
export function getErrorMessage(error: unknown): string {
  if (!error) return ERROR_MESSAGES.UNKNOWN

  // Type guards
  const hasCode = (e: unknown): e is { code: string; message?: string } =>
    typeof e === 'object' && e !== null && 'code' in e
  const hasStatus = (e: unknown): e is { status: number; message?: string } =>
    typeof e === 'object' && e !== null && 'status' in e
  const hasNameAndMessage = (e: unknown): e is { name: string; message: string } =>
    typeof e === 'object' && e !== null && 'name' in e && 'message' in e
  const hasMessage = (e: unknown): e is { message: string } =>
    typeof e === 'object' && e !== null && 'message' in e

  // Supabase specific errors
  if (hasCode(error)) {
    switch (error.code) {
      case 'PGRST116': return i18n.t('errors:resource_not_found')
      case 'PGRST301': return i18n.t('errors:access_denied')
      case '23505': return i18n.t('errors:duplicate_entry')
      case '23503': return i18n.t('errors:foreign_key')
      case '23514': return i18n.t('errors:validation_error')
      default: return error.message || i18n.t('errors:server_error')
    }
  }

  // HTTP status errors
  if (hasStatus(error)) {
    switch (error.status) {
      case 401: return i18n.t('errors:unauthorized')
      case 403: return i18n.t('errors:permission_denied')
      case 404: return i18n.t('errors:not_found')
      case 422: return i18n.t('errors:validation_error')
      case 500: return i18n.t('errors:server_error')
      default: return error.message || i18n.t('errors:unknown_error')
    }
  }

  // Network errors
  if (hasNameAndMessage(error) && error.name === 'TypeError' && error.message.includes('fetch')) {
    return i18n.t('errors:network_connection')
  }

  // Return the error message if available
  return hasMessage(error) ? error.message : i18n.t('errors:unknown_error')
}
