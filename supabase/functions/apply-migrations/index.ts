import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SERVICE_ROLE_KEY");

  if (authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Migration 1: Analysis State Guard
    const migration1 = `
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
    `;

    const { error: error1 } = await supabase.rpc("pg_execute", {
      command: migration1,
    });

    // If pg_execute doesn't exist, use a workaround through pg_net or direct query
    if (error1 && error1.message.includes("pg_execute")) {
      // Try using the SQL API directly
      const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: migration1 }),
      });

      if (!response.ok) {
        throw new Error(`Migration 1 failed: ${await response.text()}`);
      }
    }

    // Migration 2: Notifier Cron Hardening
    const migration2 = `
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
        \$cmd\$
        select net.http_post(
          url:='${Deno.env.get("SUPABASE_URL")}/functions/v1/guest-review-notifier',
          headers:=jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
          ),
          body:='{"batch_size":50}'::jsonb,
          timeout_milliseconds:=45000
        ) as request_id;
        \$cmd\$
      );
    `;

    // Execute migration 2 using direct SQL
    const response2 = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: migration2 }),
    });

    if (!response2.ok) {
      throw new Error(`Migration 2 failed: ${await response2.text()}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migrations applied successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
