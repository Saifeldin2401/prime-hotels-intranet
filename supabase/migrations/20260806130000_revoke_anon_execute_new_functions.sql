-- get_advisors (security) flagged every SECURITY DEFINER function added this session as
-- callable by the `anon` role. `REVOKE EXECUTE ... FROM PUBLIC` alone doesn't remove this --
-- Supabase's default privileges separately grant EXECUTE on new public-schema functions to
-- anon/authenticated/service_role at creation time, independent of the PUBLIC pseudo-role.
-- None of these functions are meant to be callable without a session (each either checks
-- auth.uid() directly or delegates to a role/property-scoped helper that does), so anon
-- couldn't actually do anything with them -- but exposing them at all is unnecessary surface
-- area. The correct pattern, already used by pre-existing functions like can_approve_leave,
-- is to revoke from anon explicitly, not just PUBLIC.

REVOKE EXECUTE ON FUNCTION public.approve_training_module(p_module_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_approve_purchase_request(_approver_id uuid, _property_id uuid, _department_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_purchase_request(p_id uuid, p_status text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duplicate_training_module(p_module_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_certificates(p_within_days integer, p_department_id uuid, p_property_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_managed_department_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_skills_matrix(p_department_id uuid, p_property_id uuid, p_my_team_only boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_training_analytics_summary(p_start_date timestamp with time zone, p_department_id uuid, p_property_id uuid, p_my_team_only boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_training_completion_trend(p_weeks integer, p_department_id uuid, p_property_id uuid, p_my_team_only boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_training_module_funnel(p_module_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_training_module_performance(p_department_id uuid, p_property_id uuid, p_limit integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_training_module(p_module_id uuid, p_reason text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_training_module_version(p_module_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_training_module_for_review(p_module_id uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_training_module(p_module_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_purchase_request(_approver_id uuid, _property_id uuid, _department_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_purchase_request(p_id uuid, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_training_module(p_module_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expiring_certificates(p_within_days integer, p_department_id uuid, p_property_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_managed_department_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_skills_matrix(p_department_id uuid, p_property_id uuid, p_my_team_only boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_analytics_summary(p_start_date timestamp with time zone, p_department_id uuid, p_property_id uuid, p_my_team_only boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_completion_trend(p_weeks integer, p_department_id uuid, p_property_id uuid, p_my_team_only boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_module_funnel(p_module_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_module_performance(p_department_id uuid, p_property_id uuid, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_training_module(p_module_id uuid, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_training_module_version(p_module_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_training_module_for_review(p_module_id uuid) TO authenticated;
