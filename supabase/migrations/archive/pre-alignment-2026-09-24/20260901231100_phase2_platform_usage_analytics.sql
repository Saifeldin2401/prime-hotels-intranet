-- ============================================================================
-- Phase 2 — real cross-tenant usage analytics for the Platform Analytics page
-- (replaces the hard-coded 42%/28%/100% quota bars).
-- NOTE: training_status enum = {not_started,in_progress,completed,expired};
--       "passed" is a separate boolean column, not an enum value.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_usage_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.read')) THEN
    RAISE EXCEPTION 'Platform operators only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'totals', jsonb_build_object(
      'organizations',   (SELECT count(*) FROM public.organizations WHERE is_deleted = false),
      'hotels',          (SELECT count(*) FROM public.hotels WHERE is_deleted = false),
      'members',         (SELECT count(*) FROM public.organization_memberships WHERE is_active = true),
      'courses',         (SELECT count(*) FROM public.courses WHERE is_deleted = false),
      'documents',       (SELECT count(*) FROM public.documents WHERE is_deleted = false),
      'ai_jobs_total',   (SELECT count(*) FROM public.course_generation_jobs),
      'ai_jobs_failed',  (SELECT count(*) FROM public.course_generation_jobs WHERE status IN ('failed','error')),
      'deployments',     (SELECT count(*) FROM public.master_content_deployments),
      'training_records',(SELECT count(*) FROM public.training_progress WHERE is_deleted = false),
      'training_completed',(SELECT count(*) FROM public.training_progress WHERE is_deleted = false AND (status = 'completed' OR passed = true))
    ),
    'ai_credits', jsonb_build_object(
      'used',  COALESCE((SELECT sum(ai_credits_used_this_month) FROM public.organizations WHERE is_deleted = false), 0),
      'limit', COALESCE((SELECT sum(max_ai_credits_monthly)    FROM public.organizations WHERE is_deleted = false), 0)
    ),
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'lifecycle_status', o.lifecycle_status,
        'plan', (SELECT sp.name FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
                 WHERE s.organization_id = o.id AND s.status = 'active'
                 ORDER BY s.current_period_end DESC NULLS LAST LIMIT 1),
        'hotels', (SELECT count(*) FROM public.hotels h WHERE h.organization_id = o.id AND h.is_deleted = false),
        'members', (SELECT count(*) FROM public.organization_memberships om WHERE om.organization_id = o.id AND om.is_active = true),
        'courses', (SELECT count(*) FROM public.courses c WHERE c.organization_id = o.id AND c.is_deleted = false),
        'documents', (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.is_deleted = false),
        'ai_credits_used', o.ai_credits_used_this_month,
        'ai_credits_limit', o.max_ai_credits_monthly,
        'max_hotels', o.max_hotels,
        'max_learners', o.max_learners,
        'training_completion_pct', (
          SELECT CASE WHEN count(*) = 0 THEN NULL
                 ELSE round(100.0 * count(*) FILTER (WHERE tp.status = 'completed' OR tp.passed = true) / count(*), 1) END
          FROM public.training_progress tp
          WHERE tp.organization_id = o.id AND tp.is_deleted = false
        )
      ) ORDER BY o.name)
      FROM public.organizations o WHERE o.is_deleted = false
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_platform_usage_analytics() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_analytics() TO authenticated;
