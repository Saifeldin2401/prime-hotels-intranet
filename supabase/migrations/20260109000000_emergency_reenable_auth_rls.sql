-- Emergency Fix: Re-enable RLS on Auth Tables with Proper Security
-- Date: 2026-01-09
-- Purpose: Fix critical security vulnerability where RLS was disabled on auth tables
-- This migration addresses the issue from 20251224000006_disable_auth_rls_temp.sql

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER helper functions to avoid circular dependencies
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
    WHERE user_id = uid AND role IN ('regional_admin', 'regional_hr'::app_role)
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
    WHEN 'property_manager'::app_role THEN 3
    WHEN 'property_hr'::app_role THEN 4
    WHEN 'department_head'::app_role THEN 5
    WHEN 'staff'::app_role THEN 6
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
-- STEP 3: Create safe RLS policies using SECURITY DEFINER functions
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role full access" ON public.user_roles;

-- user_roles policies
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

-- profiles policies (allow self-update per previous migration)
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
    -- We still need a way to check shared properties without direct subquery recursion
    -- has_property_access is safe to use here
    -- But we need to check if the *target profile* is in a property that the *current user* has access to
    OR (
      EXISTS (
        SELECT 1 FROM public.user_properties up
        WHERE up.user_id = profiles.id
        AND public.has_property_access(auth.uid(), up.property_id)
      )
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

-- Grant execute on security definer functions to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_property_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- ============================================================================
-- STEP 5: Verify and log
-- ============================================================================

-- Notify that RLS is now re-enabled
DO $$
BEGIN
  RAISE NOTICE 'RLS has been re-enabled on all auth tables with SECURITY DEFINER functions';
  RAISE NOTICE 'Tables secured: user_roles, user_properties, user_departments, profiles';
END
$$;
