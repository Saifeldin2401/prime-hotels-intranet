/**
 * usePersistentState - A hook that persists state to localStorage with safeguards
 * 
 * Features:
 * - Saves state to localStorage on changes
 * - Restores state on mount
 * - Handles tab switching gracefully
 * - Prevents data loss on page refresh
 * - Optional sessionStorage backup for extra safety
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePersistentStateOptions {
  /** Storage key prefix */
  key: string
  /** Optional sessionStorage backup key */
  backupKey?: string
  /** Debounce time in ms before saving */
  debounceMs?: number
  /** Enable debug logging */
  debug?: boolean
}

interface PersistentState<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => void
  clearValue: () => void
  isHydrated: boolean
  lastSaved: number | null
}

/**
 * Safely parse JSON from storage
 */
function safeParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

/**
 * Safely stringify to JSON
 */
function safeStringify<T>(value: T): string | null {
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

/**
 * Hook to persist state across page reloads and tab switches
 */
export function usePersistentState<T>(
  initialValue: T,
  options: UsePersistentStateOptions
): PersistentState<T> {
  const { key, backupKey, debounceMs = 300, debug = false } = options
  
  const fullKey = `prime_persist_${key}`
  const fullBackupKey = backupKey ? `prime_persist_${backupKey}` : null
  
  const [state, setState] = useState<T>(initialValue)
  const [isHydrated, setIsHydrated] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHydratingRef = useRef(false)

  // Debug logging
  const log = useCallback((...args: unknown[]) => {
    if (debug || import.meta.env.DEV) {
      console.log(`[usePersistentState:${key}]`, ...args)
    }
  }, [key, debug])

  // Hydrate from storage on mount
  useEffect(() => {
    if (isHydratingRef.current) return
    isHydratingRef.current = true

    try {
      // Try localStorage first
      const stored = localStorage.getItem(fullKey)
      
      // If not in localStorage, try sessionStorage backup
      const backupStored = fullBackupKey ? sessionStorage.getItem(fullBackupKey) : null
      
      const valueToRestore = stored ?? backupStored
      
      if (valueToRestore !== null) {
        const parsed = safeParse<T>(valueToRestore, initialValue)
        setState(parsed)
        log('Hydrated from storage', parsed)
      } else {
        log('No stored value found, using initial')
      }
    } catch (error) {
      log('Error hydrating from storage:', error)
    } finally {
      setIsHydrated(true)
      isHydratingRef.current = false
    }
  }, [fullKey, fullBackupKey, initialValue, log])

  // Save to storage when state changes
  useEffect(() => {
    // Don't save during hydration
    if (!isHydrated) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const serialized = safeStringify(state)
        if (serialized === null) {
          log('Failed to serialize state')
          return
        }

        // Save to localStorage
        localStorage.setItem(fullKey, serialized)
        
        // Save to sessionStorage backup if configured
        if (fullBackupKey) {
          sessionStorage.setItem(fullBackupKey, serialized)
        }
        
        setLastSaved(Date.now())
        log('Saved to storage')
      } catch (error) {
        log('Error saving to storage:', error)
        
        // If quota exceeded, try to clear old data
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          try {
            localStorage.removeItem(fullKey)
            if (fullBackupKey) {
              sessionStorage.removeItem(fullBackupKey)
            }
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }, debounceMs)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state, fullKey, fullBackupKey, debounceMs, isHydrated, log])

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === fullKey && e.newValue !== null) {
        const parsed = safeParse<T>(e.newValue, state)
        setState(parsed)
        log('Updated from other tab')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fullKey, state, log])

  // Enhanced setValue that accepts function or value
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev) 
        : value
      return newValue
    })
  }, [])

  // Clear stored value
  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(fullKey)
      if (fullBackupKey) {
        sessionStorage.removeItem(fullBackupKey)
      }
      setState(initialValue)
      setLastSaved(null)
      log('Cleared storage')
    } catch (error) {
      log('Error clearing storage:', error)
    }
  }, [fullKey, fullBackupKey, initialValue, log])

  return {
    value: state,
    setValue,
    clearValue,
    isHydrated,
    lastSaved,
  }
}

export default usePersistentState
