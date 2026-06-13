-- Schedule Weekly Manager Report (Mondays at 8 AM)
-- SECURITY NOTE: Uses vault secret for service-role access.
-- Ensure 'service_role_key' is set in Supabase Vault before running.

select cron.schedule(
    'weekly-manager-report-job',
    '0 8 * * 1',
    $$
    select
        net.http_post(
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/weekly-manager-report',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $$
);
