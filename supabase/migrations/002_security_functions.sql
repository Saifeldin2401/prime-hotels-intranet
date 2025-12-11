-- Security helper functions

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user has access to a property
CREATE OR REPLACE FUNCTION public.has_property_access(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_properties
    WHERE user_id = _user_id AND property_id = _property_id
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('regional_admin', 'regional_hr')
  )
$$;

-- Get user's primary role (highest level role)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_roles 
  WHERE user_id = _user_id 
  ORDER BY CASE role
    WHEN 'regional_admin' THEN 1
    WHEN 'regional_hr' THEN 2
    WHEN 'property_manager' THEN 3
    WHEN 'property_hr' THEN 4
    WHEN 'department_head' THEN 5
    WHEN 'staff' THEN 6
  END
  LIMIT 1
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

