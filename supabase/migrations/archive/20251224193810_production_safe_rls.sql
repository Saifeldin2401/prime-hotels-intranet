-- ============================================
-- PRODUCTION-SAFE RLS SETUP
-- Uses SECURITY DEFINER functions to avoid recursion
-- ============================================

-- 1. Create SECURITY DEFINER helper functions (bypass RLS)
CREATE OR REPLACE FUNCTION auth_get_user_roles(uid uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(array_agg(role::text), ARRAY[]::text[])
  FROM user_roles 
  WHERE user_id = uid;
$$;

CREATE OR REPLACE FUNCTION auth_has_role(uid uuid, check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role::text = check_role
  );
$$;

CREATE OR REPLACE FUNCTION auth_has_any_role(uid uuid, check_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role::text = ANY(check_roles)
  );
$$;

-- 2. Re-enable RLS on all auth tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;

DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_self" ON user_roles;

DROP POLICY IF EXISTS "user_properties_select" ON user_properties;
DROP POLICY IF EXISTS "user_properties_manage" ON user_properties;
DROP POLICY IF EXISTS "user_properties_select_self" ON user_properties;

DROP POLICY IF EXISTS "user_departments_select" ON user_departments;
DROP POLICY IF EXISTS "user_departments_manage" ON user_departments;
DROP POLICY IF EXISTS "user_departments_select_self" ON user_departments;

DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_manage" ON properties;
DROP POLICY IF EXISTS "Properties viewable by all" ON properties;
DROP POLICY IF EXISTS "properties_select_public" ON properties;
DROP POLICY IF EXISTS "properties_view_all_authenticated" ON properties;

DROP POLICY IF EXISTS "departments_select" ON departments;
DROP POLICY IF EXISTS "departments_manage" ON departments;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON departments;
DROP POLICY IF EXISTS "Authenticated can view departments" ON departments;
DROP POLICY IF EXISTS "Departments viewable by all" ON departments;

-- 4. Create SIMPLE, SAFE policies

-- PROFILES: Everyone can read all profiles, users can update their own
CREATE POLICY "profiles_select" ON profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_manage_admin" ON profiles
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']));

-- USER_ROLES: Users read own, admins manage all
CREATE POLICY "user_roles_select" ON user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_manage" ON user_roles
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr']));

-- USER_PROPERTIES: Users read own, admins manage all
CREATE POLICY "user_properties_select" ON user_properties
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_properties_manage" ON user_properties
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']));

-- USER_DEPARTMENTS: Users read own, admins manage all
CREATE POLICY "user_departments_select" ON user_departments
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_departments_manage" ON user_departments
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr', 'property_manager']));

-- PROPERTIES: All authenticated can read, admins can manage
CREATE POLICY "properties_select" ON properties
FOR SELECT USING (true);

CREATE POLICY "properties_manage" ON properties
FOR ALL USING (auth_has_role(auth.uid(), 'regional_admin'));

-- DEPARTMENTS: All authenticated can read, admins/managers can manage
CREATE POLICY "departments_select" ON departments
FOR SELECT USING (true);

CREATE POLICY "departments_manage" ON departments
FOR ALL USING (auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'property_manager']));;
