-- Schedule Preventive Maintenance (Daily at Midnight)
select cron.schedule(
    'preventive-maintenance-job',
    '0 0 * * *',
    $$
    select
        net.http_post(
            url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/preventive-maintenance',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c3ZqZnJvZmNwa2Z6dmpwd3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3OTUxNCwiZXhwIjoyMDgwOTU1NTE0fQ.7Mm34jjj4jWdp4AK2ABTn9r4H3qcPC3uKgkKdUnBKsI"}'::jsonb
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
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c3ZqZnJvZmNwa2Z6dmpwd3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3OTUxNCwiZXhwIjoyMDgwOTU1NTE0fQ.7Mm34jjj4jWdp4AK2ABTn9r4H3qcPC3uKgkKdUnBKsI"}'::jsonb
        ) as request_id;
    $$
);
