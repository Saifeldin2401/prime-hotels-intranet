-- Fix check_property_access function to use user_roles table instead of profiles.role
CREATE OR REPLACE FUNCTION check_property_access(required_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Corporate admins/regional can access everything
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Global items (property_id IS NULL) are accessible to everyone
  IF required_property_id IS NULL THEN
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
$$;;
