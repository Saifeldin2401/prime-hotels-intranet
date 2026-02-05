-- Schedule Preventive Maintenance (Daily at Midnight)
-- SECURITY NOTE: This cron job requires service-role access.
-- The token should be stored in Supabase Vault, not hardcoded.
-- To set up:
-- 1. Go to Supabase Dashboard > Project Settings > Vault
-- 2. Create a secret named 'service_role_key' with your service role JWT
-- 3. Run: SELECT vault.create_secret('your-service-role-jwt', 'service_role_key');

select cron.schedule(
    'preventive-maintenance-job',
    '0 0 * * *',
    $$
    select
        net.http_post(
            url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/preventive-maintenance',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $$
);

-- Schedule Training Notifications (Daily at 8 AM)
select cron.schedule(
    'training-notifications-job',
    '0 8 * * *',
    $$
    select
        net.http_post(
            url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/training-notifications',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $$
);
