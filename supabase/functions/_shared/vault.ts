import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getVaultSecret(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    // We use a qualified filter to prevent the "ambiguous column secret" error
    // that sometimes occurs on system-level joins in older Postgres versions
    .filter("name", "eq", name)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Vault error for ${name}:`, error.message);
    return null;
  }
  return data?.decrypted_secret ?? null;
}
