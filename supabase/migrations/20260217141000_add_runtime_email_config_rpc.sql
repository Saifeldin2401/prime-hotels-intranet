-- Expose only required runtime email config to service_role via a secure RPC.
CREATE OR REPLACE FUNCTION public.get_email_runtime_config()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT jsonb_build_object(
    'resend_api_key', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'RESEND_API_KEY'
      LIMIT 1
    ),
    'app_base_url', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'APP_BASE_URL'
      LIMIT 1
    ),
    'email_from_name', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'EMAIL_FROM_NAME'
      LIMIT 1
    ),
    'email_from_address', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'EMAIL_FROM_ADDRESS'
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_email_runtime_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_runtime_config() TO service_role;
