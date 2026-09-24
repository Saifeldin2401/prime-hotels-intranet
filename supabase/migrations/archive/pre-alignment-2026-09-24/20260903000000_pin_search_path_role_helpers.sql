-- Pin search_path on the 5 role-helper functions flagged
-- `function_search_path_mutable` by the Supabase security advisor.
-- Low-risk: all already schema-qualify public.user_roles; this just removes the
-- linter warning and closes the theoretical search-path-injection vector when
-- these are called from a SECURITY DEFINER context.
--
-- Applied live 2026-09-03; this file is the repo record.

ALTER FUNCTION public.is_admin(uuid)              SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role(uuid)         SET search_path = public, pg_temp;
ALTER FUNCTION public.get_role_priority(app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_content_manager(uuid)    SET search_path = public, pg_temp;
ALTER FUNCTION public.is_hr_or_admin(uuid)        SET search_path = public, pg_temp;
