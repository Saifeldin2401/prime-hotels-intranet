-- Phase 14b: SECURITY DEFINER pass-2 hardening.
-- cron / service-only
REVOKE EXECUTE ON FUNCTION public.check_expiring_documents()                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.expire_delegations()                     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_pending_actions()     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.scan_source_change_flags()               FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_scheduled_reports()         FROM anon, authenticated, public;
-- internal helpers / batch plumbing
REVOKE EXECUTE ON FUNCTION public._grade_question_answer(uuid,text,uuid[])              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_audit_export_hash(uuid,jsonb)                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.find_finance_approver(uuid)                           FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.find_hr_assignee(uuid)                                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_batch_processed(uuid)                       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_batch_failed(uuid)                          FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_batch_email_counters(uuid,integer,integer)  FROM anon, authenticated, public;
-- AI ops disclosure
REVOKE EXECUTE ON FUNCTION public.get_ai_daily_spend_usd()            FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_ai_agent_policies()             FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_ai_model_verification_status()  FROM anon, authenticated, public;
-- anon hygiene
REVOKE EXECUTE ON FUNCTION public.check_password_reuse(text)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_password_reset()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_module_quiz_integrity(uuid)   FROM anon;

CREATE OR REPLACE FUNCTION public.set_ai_provider_health(p_provider text, p_status text, p_cooldown_seconds integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (select auth.uid())
                       AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ai_providers SET health_status = p_status,
         cooldown_until = CASE WHEN p_cooldown_seconds IS NULL THEN NULL ELSE now() + make_interval(secs => p_cooldown_seconds) END,
         updated_at = now()
   WHERE id::text = p_provider OR name = p_provider;
END $fn$;
REVOKE EXECUTE ON FUNCTION public.set_ai_provider_health(text,text,integer) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.log_content_change(p_content_type text, p_content_id uuid, p_actor uuid, p_change_summary text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $fn$
  INSERT INTO public.content_change_log (content_type, content_id, actor, change_summary)
  VALUES (p_content_type, p_content_id, coalesce(auth.uid(), p_actor), p_change_summary);
$fn$;
