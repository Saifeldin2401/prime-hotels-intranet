import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getVaultSecret(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data?.decrypted_secret ?? null
}
