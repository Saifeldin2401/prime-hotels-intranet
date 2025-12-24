-- Fix Request Workflow Helper Functions
-- This migration corrects the is_hr, is_admin, and find_hr_assignee functions
-- to use the existing user_roles.role (app_role enum) instead of a non-existent "roles" table.

-- Recreate is_hr function using app_role enum
CREATE OR REPLACE FUNCTION public.is_hr(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT public.has_role(user_id, 'regional_admin') OR
         public.has_role(user_id, 'regional_hr') OR
         public.has_role(user_id, 'property_hr');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate is_admin function using app_role enum
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT public.has_role(user_id, 'regional_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate find_hr_assignee function using app_role enum
-- Note: Using p_property_id to match existing DB signature and avoid "cannot change name of input parameter" error
CREATE OR REPLACE FUNCTION public.find_hr_assignee(p_property_id UUID) RETURNS UUID AS $$
  DECLARE
    v_hr_user_id UUID;
  BEGIN
    -- Find property HR first (joined via user_properties)
    SELECT up.user_id INTO v_hr_user_id
    FROM user_properties up
    JOIN user_roles ur ON up.user_id = ur.user_id
    WHERE up.property_id = p_property_id
    AND ur.role = 'property_hr'
    LIMIT 1;
    
    -- If no property HR, find regional HR
    IF v_hr_user_id IS NULL THEN
      SELECT ur.user_id INTO v_hr_user_id
      FROM user_roles ur
      WHERE ur.role = 'regional_hr'
      LIMIT 1;
    END IF;

    -- If still no HR, fall back to regional admin
    IF v_hr_user_id IS NULL THEN
      SELECT ur.user_id INTO v_hr_user_id
      FROM user_roles ur
      WHERE ur.role = 'regional_admin'
      LIMIT 1;
    END IF;
    
    RETURN v_hr_user_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_hr(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_hr_assignee(UUID) TO authenticated;
