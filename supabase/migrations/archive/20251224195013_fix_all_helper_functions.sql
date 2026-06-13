-- ============================================
-- FIX ALL HELPER FUNCTIONS TO USE SECURITY DEFINER
-- This prevents RLS recursion on any table
-- ============================================

-- 1. Fix has_role() function
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;
CREATE OR REPLACE FUNCTION has_role(uid uuid, check_role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role = check_role
  );
$$;

-- 2. Fix has_any_role() function (if exists)
DROP FUNCTION IF EXISTS has_any_role(uuid, app_role[]) CASCADE;
CREATE OR REPLACE FUNCTION has_any_role(uid uuid, check_roles app_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role = ANY(check_roles)
  );
$$;

-- 3. Fix has_property_access() function
DROP FUNCTION IF EXISTS has_property_access(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION has_property_access(uid uuid, prop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_properties 
    WHERE user_id = uid AND property_id = prop_id
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role IN ('regional_admin', 'regional_hr')
  );
$$;

-- 4. Fix check_property_access() function
DROP FUNCTION IF EXISTS check_property_access(uuid) CASCADE;
CREATE OR REPLACE FUNCTION check_property_access(prop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    prop_id IS NULL  -- NULL property = no restriction
    OR EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() AND property_id = prop_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr')
    );
$$;;
