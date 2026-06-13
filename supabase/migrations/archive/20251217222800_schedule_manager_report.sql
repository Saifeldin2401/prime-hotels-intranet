-- Schedule Weekly Manager Report (Mondays at 8 AM)
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
);;
