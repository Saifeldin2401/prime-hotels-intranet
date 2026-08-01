-- check_property_access() was never updated by the corporate_admin/super_admin
-- universal-access migration (20260616120000_grant_corporate_super_admin_universal_access.sql)
-- because it does a raw role lookup instead of routing through has_role()/has_property_access().
-- It backs property_isolation_* policies on training_modules, announcements, departments,
-- and shifts, so corporate_admin/super_admin could create property-scoped training modules
-- (via the has_role-based insert/update policies) but then couldn't see or delete them.
-- Bring it in line with has_property_access(): top roles always pass, everything else unchanged.

CREATE OR REPLACE FUNCTION public.check_property_access(required_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Global items (property_id IS NULL) are accessible to everyone
  IF required_property_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Top-level and regional admins/HR can access everything
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is assigned to this property
  IF EXISTS (
    SELECT 1 FROM user_properties
    WHERE user_id = auth.uid()
    AND property_id = required_property_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;
