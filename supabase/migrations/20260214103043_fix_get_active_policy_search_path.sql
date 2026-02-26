-- Harden function search_path for security lint compliance.
CREATE OR REPLACE FUNCTION public.get_active_policy(p_domain text)
RETURNS TABLE(policy_set_id uuid, version_id uuid, version text, policy_json jsonb)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT s.id, v.id, v.version, v.policy_json
  FROM public.ai_policy_sets s
  JOIN public.ai_policy_versions v ON v.id = s.active_version_id
  WHERE s.domain = p_domain
  ORDER BY s.created_at DESC
  LIMIT 1;
$function$;;
