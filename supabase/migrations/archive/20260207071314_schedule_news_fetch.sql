-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the fetch-news function to run every 6 hours
SELECT cron.schedule(
    'fetch-news-every-6-hours',
    '0 */6 * * *', 
    $$
    SELECT
        net.http_post(
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/fetch-news',
            headers:='{"Content-Type": "application/json"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain the schedule
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for news fetching';
;
