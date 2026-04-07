/**
 * Safe Storage Utility
 * 
 * Provides safe access to localStorage with try-catch wrappers to prevent crashes
 * in browsers that block storage access (e.g., Safari Private Mode, Incognito Mode).
 * 
 * Features:
 * - Graceful handling of storage unavailability
 * - Type-safe storage operations
 * - Support for JSON serialization/deserialization
 * - Session storage variant included
 */

export interface SafeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  getObject: <T>(key: string) => T | null;
  setObject: <T>(key: string, value: T) => void;
  hasItem: (key: string) => boolean;
}

function createSafeStorage(storage: Storage | null): SafeStorage {
  const getItem = (key: string): string | null => {
    if (typeof window === 'undefined' || !storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };

  const setItem = (key: string, value: string): void => {
    if (typeof window === 'undefined' || !storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // Ignore storage errors (e.g., quota exceeded, private mode)
    }
  };

  const removeItem = (key: string): void => {
    if (typeof window === 'undefined' || !storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  };

  const clear = (): void => {
    if (typeof window === 'undefined' || !storage) return;
    try {
      storage.clear();
    } catch {
      // Ignore storage errors
    }
  };

  const getObject = <T>(key: string): T | null => {
    const item = getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  };

  const setObject = <T>(key: string, value: T): void => {
    try {
      setItem(key, JSON.stringify(value));
    } catch {
      // Ignore serialization/storage errors
    }
  };

  const hasItem = (key: string): boolean => {
    return getItem(key) !== null;
  };

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    getObject,
    setObject,
    hasItem,
  };
}

// Safe localStorage - falls back gracefully in private mode
const localStorageInstance = typeof window !== 'undefined' ? window.localStorage : null;
export const safeLocalStorage: SafeStorage = createSafeStorage(localStorageInstance);

// Safe sessionStorage - falls back gracefully in private mode
const sessionStorageInstance = typeof window !== 'undefined' ? window.sessionStorage : null;
export const safeSessionStorage: SafeStorage = createSafeStorage(sessionStorageInstance);

// Utility to check if storage is actually available (not in private mode)
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Utility to get storage quota information
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  usageDetails?: Record<string, number>;
} | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null;
  
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usageDetails: (estimate as any).usageDetails as Record<string, number> | undefined,
    };
  } catch {
    return null;
  }
}
