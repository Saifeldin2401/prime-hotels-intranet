const SECURE_STORAGE_KEY = 'prime_secure_storage_key_v1'

const readFromStorage = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const writeToStorage = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage write failures and continue with remaining fallbacks.
  }
}

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const getOrCreateKey = async (): Promise<CryptoKey | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null

  const existing =
    readFromStorage(window.localStorage, SECURE_STORAGE_KEY)
    ?? readFromStorage(window.sessionStorage, SECURE_STORAGE_KEY)

  if (existing) {
    const rawKey = decodeBase64(existing)
    writeToStorage(window.localStorage, SECURE_STORAGE_KEY, existing)
    writeToStorage(window.sessionStorage, SECURE_STORAGE_KEY, existing)
    return window.crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt'])
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

const encryptPayload = async (payload: unknown): Promise<string | null> => {
  const key = await getOrCreateKey()
  if (!key) return null

  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const cipherBytes = new Uint8Array(encrypted)
  return `v1:${encodeBase64(iv)}:${encodeBase64(cipherBytes)}`
}

const decryptPayload = async <T>(value: string): Promise<T | null> => {
  if (!value.startsWith('v1:')) return null
  const parts = value.split(':')
  if (parts.length < 3) return null

  const iv = decodeBase64(parts[1])
  const cipher = decodeBase64(parts[2])
  const key = await getOrCreateKey()
  if (!key) return null

  try {
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    const text = new TextDecoder().decode(new Uint8Array(decrypted))
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const setEncryptedLocalStorage = async (key: string, value: unknown): Promise<void> => {
  try {
    const encrypted = await encryptPayload(value)
    if (encrypted) {
      localStorage.setItem(key, encrypted)
      return
    }
  } catch {
    // Fall through to plaintext storage
  }

  localStorage.setItem(key, JSON.stringify(value))
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
