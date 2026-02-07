/**
 * Retry utility for failed API calls
 * Implements exponential backoff retry strategy
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryable?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryable'>> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
}

/**
 * Checks if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return true
    }
    
    // Timeout errors are retryable
    if (message.includes('timeout') || message.includes('timed out')) {
      return true
    }
    
    // Rate limiting is retryable
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true
    }
  }
  
  // Check for Supabase error codes
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>
    const code = errorObj.code as string | undefined
    
    // Retryable Supabase error codes
    const retryableCodes = ['42P01', '08000', '08003', '08006', '08001']
    if (code && retryableCodes.includes(code)) {
      return true
    }
  }
  
  return false
}

/**
 * Calculates delay for next retry attempt
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'retryable'>>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  return Math.min(delay, options.maxDelay)
}

/**
 * Waits for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retries a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise that resolves with the function result
 * @throws Last error if all retries fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    retryable: options.retryable || isRetryableError
  }
  
  let lastError: unknown
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      if (!opts.retryable(error)) {
        throw error
      }
      
      // Don't wait after last attempt
      if (attempt < opts.maxAttempts) {
        const delay = calculateDelay(attempt, opts)
        await wait(delay)
      }
    }
  }
  
  // All retries failed
  throw lastError
}

/**
 * Creates a retry wrapper for async functions
 */
export function withRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: RetryOptions
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return retry(() => fn(...args), options)
  }
}

/**
 * Retry configuration for different operation types
 */
export const retryConfigs = {
  // Quick operations (queries, reads)
  quick: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000
  },
  
  // Standard operations (mutations, writes)
  standard: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000
  },
  
  // Critical operations (important writes)
  critical: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 10000
  },
  
  // File uploads (longer timeout)
  upload: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 15000
  }
}

