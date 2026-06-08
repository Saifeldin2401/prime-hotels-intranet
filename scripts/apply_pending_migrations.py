#!/usr/bin/env python3
"""
Execute pending guest review migrations using Supabase REST API
Run: python apply_migrations.py
"""

import urllib.request
import json
import ssl

PROJECT_REF = "htsvjfrofcpkfzvjpwvx"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c3ZqZnJvZmNwa2Z6dmpwd3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3OTUxNCwiZXhwIjoyMDgwOTU1NTE0fQ.7Mm34jjj4jWdp4AK2ABTn9r4H3qcPC3uKgkKdUnBKsI"

def execute_sql(query):
    """Execute SQL via Supabase REST API using pg_net or direct query"""
    url = f"https://{PROJECT_REF}.supabase.co/rest/v1/rpc/execute_sql"
    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY
    }
    data = json.dumps({"sql": query}).encode()
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    ctx = ssl.create_default_context()
    
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return True, resp.read().decode()
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()}"

def main():
    print("=" * 60)
    print("APPLYING PENDING GUEST REVIEW MIGRATIONS")
    print("=" * 60)
    
    # Migration 1: Analysis State Guard
    migration_1 = """
CREATE OR REPLACE FUNCTION public.preserve_guest_review_analysis_state_on_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_fingerprint jsonb;
  new_fingerprint jsonb;
BEGIN
  old_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(OLD.review_url), ''),
    'reviewer_name', coalesce(trim(OLD.reviewer_name), ''),
    'review_title', coalesce(trim(OLD.review_title), ''),
    'review_text', coalesce(trim(OLD.review_text), ''),
    'review_text_normalized', coalesce(trim(OLD.review_text_normalized), ''),
    'review_language', coalesce(trim(OLD.review_language), ''),
    'rating_normalized_10', OLD.rating_normalized_10,
    'published_at', OLD.published_at
  );

  new_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(NEW.review_url), ''),
    'reviewer_name', coalesce(trim(NEW.reviewer_name), ''),
    'review_title', coalesce(trim(NEW.review_title), ''),
    'review_text', coalesce(trim(NEW.review_text), ''),
    'review_text_normalized', coalesce(trim(NEW.review_text_normalized), ''),
    'review_language', coalesce(trim(NEW.review_language), ''),
    'rating_normalized_10', NEW.rating_normalized_10,
    'published_at', NEW.published_at
  );

  IF NEW.ai_analysis_status = 'pending'
    AND old_fingerprint = new_fingerprint
    AND coalesce(OLD.ai_analysis_status, '') <> ''
  THEN
    NEW.ai_analysis_status := OLD.ai_analysis_status;
    NEW.status := coalesce(OLD.status, NEW.status, 'collected');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_preserve_guest_review_analysis_state_on_refresh ON public.guest_reviews;

CREATE TRIGGER trigger_preserve_guest_review_analysis_state_on_refresh
BEFORE UPDATE ON public.guest_reviews
FOR EACH ROW
EXECUTE FUNCTION public.preserve_guest_review_analysis_state_on_refresh();
"""
    
    print("\n[1/2] Applying Migration 1: Analysis State Guard...")
    print("-" * 60)
    success, result = execute_sql(migration_1)
    if success:
        print("✅ Migration 1 applied successfully")
    else:
        print(f"❌ Migration 1 failed: {result}")
        print("\n⚠️  Please apply manually via SQL Editor:")
        print(migration_1)
    
    # Migration 2: Notifier Cron Hardening
    migration_2 = """
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'guest-review-notifier-retry';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'guest-review-notifier-retry',
  '*/10 * * * *',
  $cmd$
  select net.http_post(
    url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/guest-review-notifier',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
    ),
    body:='{"batch_size":50}'::jsonb,
    timeout_milliseconds:=45000
  ) as request_id;
  $cmd$
);
"""
    
    print("\n[2/2] Applying Migration 2: Notifier Cron Hardening...")
    print("-" * 60)
    success, result = execute_sql(migration_2)
    if success:
        print("✅ Migration 2 applied successfully")
    else:
        print(f"❌ Migration 2 failed: {result}")
        print("\n⚠️  Please apply manually via SQL Editor:")
        print(migration_2)
    
    print("\n" + "=" * 60)
    print("MIGRATION ATTEMPT COMPLETE")
    print("=" * 60)
    print("\nVerification queries:")
    print("  SELECT * FROM pg_trigger WHERE tgname = 'trigger_preserve_guest_review_analysis_state_on_refresh';")
    print("  SELECT * FROM cron.job WHERE jobname = 'guest-review-notifier-retry';")

if __name__ == "__main__":
    main()
