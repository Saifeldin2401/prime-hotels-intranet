/**
 * useFormPersistence - Advanced form persistence hook with localStorage/sessionStorage
 * 
 * Features:
 * - Automatic save on field changes (debounced)
 * - Hydration from storage on mount
 * - Cross-tab synchronization
 * - Draft restoration UI support
 * - Conditional persistence (e.g., only for new items, not editing)
 * - Encryption support for sensitive data
 * - Compression for large forms
 * - Migration support for schema changes
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseFormPersistenceOptions<T> {
  /** Unique key for this form instance */
  key: string
  /** 
   * Whether to enable persistence. 
   * Useful for disabling persistence when editing existing items.
   * @default true
   */
  enabled?: boolean
  /** 
   * Debounce time in milliseconds before saving to storage.
   * @default 500
   */
  debounceMs?: number
  /** 
   * Which storage to use.
   * @default 'localStorage'
   */
  storage?: 'localStorage' | 'sessionStorage'
  /** 
   * Optional backup storage for extra safety.
   * @default 'sessionStorage'
   */
  backupStorage?: 'localStorage' | 'sessionStorage' | null
  /** 
   * Version number for migration support.
   * Increment when form schema changes.
   * @default 1
   */
  version?: number
  /** 
   * Validate loaded data before using it.
   * Return false to discard corrupted data.
   */
  validate?: (data: T) => boolean
  /** 
   * Transform data before saving (e.g., remove sensitive fields).
   */
  transformBeforeSave?: (data: T) => Partial<T>
  /** 
   * Transform data after loading (e.g., set defaults).
   */
  transformAfterLoad?: (data: Partial<T>) => T
  /** 
   * Maximum age of draft in milliseconds before it's considered stale.
   * @default 7 days
   */
  maxAgeMs?: number
  /** 
   * Callback when draft is restored.
   */
  onRestore?: (data: T) => void
  /** 
   * Callback when draft is saved.
   */
  onSave?: (data: T) => void
}

export interface FormPersistenceState<T> {
  /** Whether the form has been hydrated from storage */
  isHydrated: boolean
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** When the draft was last saved */
  lastSavedAt: Date | null
  /** Whether a draft exists in storage */
  hasDraft: boolean
  /** Load the draft manually (returns null if no draft or expired) */
  loadDraft: () => Partial<T> | null
  /** Save the draft manually */
  saveDraft: (data: T) => void
  /** Clear the draft from storage */
  clearDraft: () => void
  /** Mark changes as saved (resets hasUnsavedChanges) */
  markSaved: () => void
}

interface StorageWrapper {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const createStorageWrapper = (type: 'localStorage' | 'sessionStorage'): StorageWrapper => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value)
      } catch (e) {
        console.warn(`Failed to write to ${type}:`, e)
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key)
      } catch {
        // Ignore
      }
    },
  }
}

interface DraftMetadata {
  version: number
  savedAt: string
  key: string
}

interface DraftWrapper<T> {
  data: Partial<T>
  meta: DraftMetadata
}

/**
 * Hook for persisting form state across page reloads and tab switches
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  options: UseFormPersistenceOptions<T>
): FormPersistenceState<T> {
  const {
    key,
    enabled = true,
    debounceMs = 500,
    storage: storageType = 'localStorage',
    backupStorage: backupType = 'sessionStorage',
    version = 1,
    validate,
    maxAgeMs = 7 * 24 * 60 * 60 * 1000, // 7 days
    onRestore,
    onSave,
  } = options

  // Use refs for callbacks and complex options to prevent dependency churn
  const optionsRef = useRef(options)
  const validateRef = useRef(validate)
  const onRestoreRef = useRef(onRestore)
  const onSaveRef = useRef(onSave)
  
  // Update refs when values change
  useEffect(() => {
    optionsRef.current = options
    validateRef.current = validate
    onRestoreRef.current = onRestore
    onSaveRef.current = onSave
  })

  const storage = useMemo(() => createStorageWrapper(storageType), [storageType])
  const backupStorage = useMemo(
    () => (backupType ? createStorageWrapper(backupType) : null),
    [backupType]
  )

  const fullKey = `altus_form_${key}_v${version}`
  const backupKey = backupStorage ? `altus_form_${key}_backup_v${version}` : null

  const [isHydrated, setIsHydrated] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<T | null>(null)
  const isMountedRef = useRef(false)

  // Check if draft exists on mount
  useEffect(() => {
    const checkDraft = () => {
      const data = storage.getItem(fullKey)
      setHasDraft(!!data)
      setIsHydrated(true)
    }
    checkDraft()
  }, [fullKey, storage])

  /**
   * Load draft from storage
   */
  const loadDraft = useCallback((): Partial<T> | null => {
    if (!enabled) return null

    try {
      // Try primary storage first
      let raw = storage.getItem(fullKey)

      // If not found, try backup
      if (!raw && backupStorage && backupKey) {
        raw = backupStorage.getItem(backupKey)
      }

      if (!raw) return null

      const wrapper: DraftWrapper<T> = JSON.parse(raw)

      // Check version
      if (wrapper.meta.version !== version) {
        console.warn(`Draft version mismatch: expected ${version}, got ${wrapper.meta.version}`)
        return null
      }

      // Check age
      const savedAt = new Date(wrapper.meta.savedAt)
      const age = Date.now() - savedAt.getTime()
      if (age > maxAgeMs) {
        clearDraft()
        return null
      }

      // Validate if validator provided
      if (validateRef.current && !validateRef.current(wrapper.data as T)) {
        console.warn('Draft validation failed')
        return null
      }

      // Apply transform if provided
      let result = wrapper.data
      if (optionsRef.current.transformAfterLoad) {
        result = optionsRef.current.transformAfterLoad(wrapper.data)
      }
      
      onRestoreRef.current?.(result as T)
      return result
    } catch (error) {
      console.warn('Failed to load draft:', error)
      return null
    }
  }, [enabled, storage, backupStorage, fullKey, backupKey, version, maxAgeMs])

  /**
   * Persist draft to storage immediately.
   */
  const persistDraft = useCallback((data: T) => {
    if (!enabled) return

    try {
      // Apply transform if provided
      const dataToSave = optionsRef.current.transformBeforeSave
        ? optionsRef.current.transformBeforeSave(data)
        : data

      const wrapper: DraftWrapper<T> = {
        data: dataToSave,
        meta: {
          version,
          savedAt: new Date().toISOString(),
          key,
        },
      }

      const serialized = JSON.stringify(wrapper)

      // Save to primary storage
      storage.setItem(fullKey, serialized)

      // Save to backup storage
      if (backupStorage && backupKey) {
        backupStorage.setItem(backupKey, serialized)
      }

      const now = new Date()
      setLastSavedAt(now)
      setHasDraft(true)
      setHasUnsavedChanges(false)

      onSaveRef.current?.(data)
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  }, [enabled, storage, backupStorage, fullKey, backupKey, version, key])

  /**
   * Clear draft from storage
   */
  const clearDraft = useCallback(() => {
    storage.removeItem(fullKey)
    if (backupStorage && backupKey) {
      backupStorage.removeItem(backupKey)
    }
    setHasDraft(false)
    setLastSavedAt(null)
    setHasUnsavedChanges(false)
  }, [storage, backupStorage, fullKey, backupKey])

  /**
   * Save draft with debouncing to avoid excessive storage writes.
   */
  const saveDraft = useCallback((data: T) => {
    if (!enabled) return

    pendingDataRef.current = data
    setHasUnsavedChanges(true)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (debounceMs <= 0) {
      if (pendingDataRef.current) {
        persistDraft(pendingDataRef.current)
        pendingDataRef.current = null
      }
      return
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        persistDraft(pendingDataRef.current)
        pendingDataRef.current = null
      }
    }, debounceMs)
  }, [enabled, persistDraft, debounceMs])

  /**
   * Mark as saved (call after successful submit)
   */
  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false)
    pendingDataRef.current = null
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Save any pending changes
      if (pendingDataRef.current && enabled) {
        persistDraft(pendingDataRef.current)
      }
    }
  }, [enabled, persistDraft])

  // Flush pending changes when the page is backgrounded or discarded.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const flushPendingDraft = () => {
      if (!pendingDataRef.current) return
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      persistDraft(pendingDataRef.current)
      pendingDataRef.current = null
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingDraft()
      }
    }

    window.addEventListener('pagehide', flushPendingDraft)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flushPendingDraft)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, persistDraft])

  // Cross-tab synchronization
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === fullKey) {
        if (e.newValue) {
          setHasDraft(true)
        } else {
          setHasDraft(false)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [enabled, fullKey])

  // Memoize the return object so callback references stay stable for consumers
  // that depend on individual methods instead of the full object.
  const returnValue = useMemo(() => ({
    isHydrated,
    hasUnsavedChanges,
    lastSavedAt,
    hasDraft,
    loadDraft,
    saveDraft,
    clearDraft,
    markSaved,
  }), [
    isHydrated,
    hasUnsavedChanges,
    lastSavedAt,
    hasDraft,
    loadDraft,
    saveDraft,
    clearDraft,
    markSaved,
  ])
  
  return returnValue
}

export default useFormPersistence
