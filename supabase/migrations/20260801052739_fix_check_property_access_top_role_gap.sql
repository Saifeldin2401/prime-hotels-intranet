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
