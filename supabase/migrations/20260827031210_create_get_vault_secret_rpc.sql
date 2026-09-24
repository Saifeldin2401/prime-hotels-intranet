-- Edge functions call rpc('get_vault_secret', {secret_name}) to pull provider
-- API keys from Vault. The function did not exist, so GEMINI_API_KEY etc. were
-- never reaching the AI edge functions (they only had env-var keys).
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;

COMMENT ON FUNCTION public.get_vault_secret(text) IS
  'Service-role only. Returns a Vault secret by name for edge-function key rotation.';
