-- 1. Enable pg_cron for automated maintenance
create extension if not exists pg_cron;

-- 2. Create STABLE helper functions for RLS optimization
-- These functions cache the result per-statement, avoiding repeated table lookups for every row in a query.

-- Helper: Get roles for current user
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), '{}')
  FROM user_roles
  WHERE user_id = auth.uid();
$$;

-- Helper: Get property IDs for current user
CREATE OR REPLACE FUNCTION public.get_my_property_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(property_id), '{}')
  FROM user_properties
  WHERE user_id = auth.uid();
$$;

-- Helper: Check if user has specific role (Optimized)
CREATE OR REPLACE FUNCTION public.has_role_optimized(check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT check_role = ANY(public.get_my_roles());
$$;

-- 3. Schedule Weekly Maintenance (Vacuum Analyze)
-- Runs every Sunday at 3:00 AM UTC
SELECT cron.schedule(
  'weekly-maintenance',
  '0 3 * * 0',
  $$VACUUM ANALYZE;$$
);

-- 4. Optimize specific heavy policies
-- Example: Optimize 'workflow_definitions' admin manage policy
BEGIN;
  DROP POLICY IF EXISTS "workflow_definitions_admin_manage" ON public.workflow_definitions;
  
  CREATE POLICY "workflow_definitions_admin_manage" 
  ON public.workflow_definitions 
  FOR ALL 
  TO authenticated 
  USING (
    'regional_admin'::app_role = ANY(public.get_my_roles())
  );
COMMIT;;
