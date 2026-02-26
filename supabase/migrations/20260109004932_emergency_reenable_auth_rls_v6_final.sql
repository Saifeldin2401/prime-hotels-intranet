-- Emergency Fix: Re-enable RLS on Auth Tables with Proper Security (v6_final)
-- Date: 2026-01-09
-- Purpose: Fix critical security vulnerability where RLS was disabled on auth tables
-- Changes in v6: Exclusively using SECURITY DEFINER functions to prevent infinite recursion

-- ============================================================================
-- STEP 1: Create/Update SECURITY DEFINER helper functions
-- ============================================================================

-- Function to check if user has a specific role (SECURITY DEFINER prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, check_role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = check_role
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Overload for has_role that takes text to support RLS policies
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.has_role(uid, role_name::app_role);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user has access to a property (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_property_access(uid UUID, prop_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_properties
    WHERE user_id = uid AND property_id = prop_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('regional_admin'::app_role, 'regional_hr'::app_role)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user's primary role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'regional_admin'::app_role THEN 1
    WHEN 'regional_hr'::app_role THEN 2
    WHEN 'property_manager'::app_role THEN 10
    WHEN 'property_hr'::app_role THEN 11
    WHEN 'department_head'::app_role THEN 20
    WHEN 'staff'::app_role THEN 30
  END
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Re-enable RLS on auth tables
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create safe RLS policies using SECURITY DEFINER functions EXCLUSIVELY
-- ============================================================================

-- user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
  );

-- user_properties policies
DROP POLICY IF EXISTS "Users can view own properties" ON public.user_properties;
DROP POLICY IF EXISTS "Admins can manage properties" ON public.user_properties;

CREATE POLICY "Users can view own properties"
  ON public.user_properties
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
  );

CREATE POLICY "Admins can manage properties"
  ON public.user_properties
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
  );

-- user_departments policies
DROP POLICY IF EXISTS "Users can view own departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.user_departments;

CREATE POLICY "Users can view own departments"
  ON public.user_departments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
    OR public.has_role(auth.uid(), 'property_manager')
  );

CREATE POLICY "Admins can manage departments"
  ON public.user_departments
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
    OR public.has_role(auth.uid(), 'property_manager')
  );

-- profiles policies
DROP POLICY IF EXISTS "Users can view profiles in scope" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in scope"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
    -- Check shared property access via the SEC DEF function
    OR EXISTS (
      SELECT 1 FROM public.user_properties up
      WHERE up.user_id = profiles.id
      AND public.has_property_access(auth.uid(), up.property_id)
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON public.profiles
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'regional_hr')
    OR public.has_role(auth.uid(), 'property_hr')
  );

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_property_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- ============================================================================
-- STEP 5: Verify and log
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS has been re-enabled on all auth tables (v6_final)';
  RAISE NOTICE 'Recursion protection active via exclusive use of SECURITY DEFINER functions';
END
$$;;
