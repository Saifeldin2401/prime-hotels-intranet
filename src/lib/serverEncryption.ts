import { supabase } from './supabase';

/**
 * Encrypt sensitive text via Server Side Edge Function.
 * This completely isolates the encryption keys from the client memory.
 */
export async function encryptSensitiveField(text: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('encrypt-field', {
    body: { action: 'encrypt', payload: text },
  });

  if (error || !data?.result) {
    throw new Error(error?.message || 'Failed to encrypt data server-side');
  }

  // The edge function returns { iv: "...", ciphertext: "..." }
  // We stringify it so it can be stored easily
  return JSON.stringify(data.result);
}

/**
 * Decrypt sensitive payload via Server Side Edge Function.
 * Payload should be the JSON string returned by encryptSensitiveField
 */
export async function decryptSensitiveField(encryptedPayload: string): Promise<string> {
  // Validate it's JSON
  try {
    JSON.parse(encryptedPayload);
  } catch {
    throw new Error('Invalid encrypted payload format');
  }

  const { data, error } = await supabase.functions.invoke('encrypt-field', {
    body: { action: 'decrypt', payload: encryptedPayload },
  });

  if (error || !data?.result) {
    throw new Error(error?.message || 'Failed to decrypt data server-side');
  }

  return data.result;
}
