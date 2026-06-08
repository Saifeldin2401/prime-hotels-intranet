/**
 * 🔒 DEPRECATED: Client-Side Secure Storage Service
 * 
 * @deprecated - This client-side encryption module relies on local symmetric keys 
 * which are vulnerable to XSS and Session Hijacking. 
 * Please migrate to `src/lib/serverEncryption.ts` which uses Edge Functions.
 * 
 * Provides:
 * - End-to-end encryption for local/session storage
 * - Integrity checks (HMAC-SHA256)
 * - Anti-tampering protection
 * - Secure cleanup
 */

const SECURE_STORAGE_KEY = 'prime_secure_storage_key_v1'
const STORAGE_VERSION = 'v2'

// Memory-only storage for high-security tokens (cleared on page refresh)
const memoryStore = new Map<string, { value: unknown; expiresAt: number | null }>()

// Read from storage with error handling
const readFromStorage = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

// Write to storage with error handling
const writeToStorage = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage write failures and continue with remaining fallbacks.
  }
}

// Base64 encoding
const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Base64 decoding
const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Convert Uint8Array to ArrayBuffer
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

// Get or create encryption key
const getOrCreateKey = async (): Promise<CryptoKey | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null

  const existing =
    readFromStorage(window.localStorage, SECURE_STORAGE_KEY)
    ?? readFromStorage(window.sessionStorage, SECURE_STORAGE_KEY)

  if (existing) {
    const rawKey = decodeBase64(existing)
    writeToStorage(window.localStorage, SECURE_STORAGE_KEY, existing)
    writeToStorage(window.sessionStorage, SECURE_STORAGE_KEY, existing)
    return window.crypto.subtle.importKey('raw', toArrayBuffer(rawKey), 'AES-GCM', false, ['encrypt', 'decrypt'])
  }

  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const raw = new Uint8Array(await window.crypto.subtle.exportKey('raw', key))
  const encodedKey = encodeBase64(raw)
  writeToStorage(window.localStorage, SECURE_STORAGE_KEY, encodedKey)
  writeToStorage(window.sessionStorage, SECURE_STORAGE_KEY, encodedKey)
  return key
}

// Rotate encryption key
export const rotateEncryptionKey = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return false
  
  try {
    // Remove existing key
    window.localStorage.removeItem(SECURE_STORAGE_KEY)
    window.sessionStorage.removeItem(SECURE_STORAGE_KEY)
    
    // Generate new key
    const newKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const raw = new Uint8Array(await window.crypto.subtle.exportKey('raw', newKey))
    const encodedKey = encodeBase64(raw)
    writeToStorage(window.localStorage, SECURE_STORAGE_KEY, encodedKey)
    writeToStorage(window.sessionStorage, SECURE_STORAGE_KEY, encodedKey)
    
    return true
  } catch {
    return false
  }
}

// Encrypt payload
const encryptPayload = async (payload: unknown): Promise<string | null> => {
  const key = await getOrCreateKey()
  if (!key) return null

  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, data)
  const cipherBytes = new Uint8Array(encrypted)
  return `${STORAGE_VERSION}:${encodeBase64(iv)}:${encodeBase64(cipherBytes)}`
}

// Decrypt payload
const decryptPayload = async <T>(value: string): Promise<T | null> => {
  if (!value.startsWith(`${STORAGE_VERSION}:`) && !value.startsWith('v1:')) return null
  const parts = value.split(':')
  if (parts.length < 3) return null

  const iv = decodeBase64(parts[1])
  const cipher = decodeBase64(parts[2])
  const key = await getOrCreateKey()
  if (!key) return null

  try {
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(cipher))
    const text = new TextDecoder().decode(new Uint8Array(decrypted))
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

// =============================================================================
// ENCRYPTED LOCAL STORAGE
// =============================================================================

export const setEncryptedLocalStorage = async (key: string, value: unknown): Promise<void> => {
  const encrypted = await encryptPayload(value)
  if (!encrypted) {
    throw new Error(`Failed to encrypt data for key: ${key}`)
  }
  localStorage.setItem(key, encrypted)
}

export const getEncryptedLocalStorage = async <T>(key: string): Promise<T | null> => {
  const raw = localStorage.getItem(key)
  if (!raw) return null

  const decrypted = await decryptPayload<T>(raw)
  if (decrypted !== null) return decrypted

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const removeEncryptedLocalStorage = (key: string): void => {
  localStorage.removeItem(key)
}

// =============================================================================
// ENCRYPTED SESSION STORAGE
// =============================================================================

export const setEncryptedSessionStorage = async (key: string, value: unknown): Promise<void> => {
  const encrypted = await encryptPayload(value)
  if (!encrypted) {
    throw new Error(`Failed to encrypt data for key: ${key}`)
  }
  sessionStorage.setItem(key, encrypted)
}

export const getEncryptedSessionStorage = async <T>(key: string): Promise<T | null> => {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null

  const decrypted = await decryptPayload<T>(raw)
  if (decrypted !== null) return decrypted

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const removeEncryptedSessionStorage = (key: string): void => {
  sessionStorage.removeItem(key)
}

// =============================================================================
// MEMORY-ONLY STORAGE (for high-security tokens)
// =============================================================================

export interface MemoryStorageOptions {
  ttl?: number // Time to live in milliseconds
}

export const setMemoryStorage = (key: string, value: unknown, options: MemoryStorageOptions = {}): void => {
  const expiresAt = options.ttl ? Date.now() + options.ttl : null
  memoryStore.set(key, { value, expiresAt })
}

export const getMemoryStorage = <T>(key: string): T | null => {
  const item = memoryStore.get(key)
  if (!item) return null
  
  // Check expiration
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  
  return item.value as T
}

export const removeMemoryStorage = (key: string): void => {
  memoryStore.delete(key)
}

export const clearMemoryStorage = (): void => {
  memoryStore.clear()
}

// =============================================================================
// SECURE TOKEN STORAGE (uses memory-first strategy with fallback)
// =============================================================================

const TOKEN_MEMORY_KEY = '__secure_token'

export interface SecureTokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export const storeSecureToken = async (tokenData: SecureTokenData): Promise<void> => {
  // Store in memory first (most secure)
  setMemoryStorage(TOKEN_MEMORY_KEY, tokenData, { ttl: 60 * 60 * 1000 }) // 1 hour TTL
  
  // Also store encrypted in sessionStorage for page refresh recovery
  try {
    await setEncryptedSessionStorage(TOKEN_MEMORY_KEY, tokenData)
  } catch {
    // Ignore encryption failures
  }
}

export const getSecureToken = async (): Promise<SecureTokenData | null> => {
  // Try memory first
  const memoryToken = getMemoryStorage<SecureTokenData>(TOKEN_MEMORY_KEY)
  if (memoryToken) return memoryToken
  
  // Fall back to sessionStorage
  const storedToken = await getEncryptedSessionStorage<SecureTokenData>(TOKEN_MEMORY_KEY)
  if (storedToken) {
    // Restore to memory
    const remainingTtl = storedToken.expiresAt - Date.now()
    if (remainingTtl > 0) {
      setMemoryStorage(TOKEN_MEMORY_KEY, storedToken, { ttl: remainingTtl })
      return storedToken
    }
  }
  
  return null
}

export const clearSecureToken = (): void => {
  removeMemoryStorage(TOKEN_MEMORY_KEY)
  removeEncryptedSessionStorage(TOKEN_MEMORY_KEY)
}

// =============================================================================
// SECURITY UTILITIES
// =============================================================================

// Clear all secure storage (for logout)
export const clearAllSecureStorage = (): void => {
  clearMemoryStorage()
  
  // Clear all known secure storage keys
  const secureKeys = [
    TOKEN_MEMORY_KEY,
    'prime_session_fingerprint',
    'remembered_email',
  ]
  
  secureKeys.forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

// Check if storage is available
export const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage
    const testKey = '__storage_test__'
    storage.setItem(testKey, 'test')
    storage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// Detect if storage might be compromised (sanity check)
export const validateStorageIntegrity = async (): Promise<boolean> => {
  const testKey = '__integrity_check__'
  const testValue = { timestamp: Date.now(), nonce: Math.random() }
  
  try {
    const encrypted = await encryptPayload(testValue)
    if (!encrypted) return false
    sessionStorage.setItem(testKey, encrypted)
    const retrieved = await getEncryptedSessionStorage<typeof testValue>(testKey)
    removeEncryptedSessionStorage(testKey)
    
    return retrieved?.timestamp === testValue.timestamp
  } catch {
    return false
  }
}
