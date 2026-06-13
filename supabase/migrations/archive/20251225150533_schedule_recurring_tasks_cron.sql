-- Schedule the Recurring Tasks Generation Job
SELECT cron.schedule(
    'recurring-tasks-job',
    '0 0 * * *',
    $$
    SELECT
        net.http_post(
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/generate-template-tasks',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $$
);
;
