-- Schedule Preventive Maintenance (Daily at Midnight)
select cron.schedule(
    'preventive-maintenance-job',
    '0 0 * * *',
    $$
    select
        net.http_post(
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/preventive-maintenance',
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
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/training-notifications',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $$
);;
