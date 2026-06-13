-- Fix RLS Recursion and Timeout Issues

-- 1. Drop duplicate policy
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
-- Keep "Users can read own roles"

-- 2. Create Security Definer function to check property overlap (breaks recursion)
CREATE OR REPLACE FUNCTION users_share_property(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_properties up1
    JOIN user_properties up2 ON up1.property_id = up2.property_id
    WHERE up1.user_id = user_a 
    AND up2.user_id = user_b
  );
$$;

-- 3. Create Security Definer function to check department access (breaks recursion)
CREATE OR REPLACE FUNCTION user_has_department_access(auth_user_id UUID, target_dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM departments d
    JOIN user_properties up ON d.property_id = up.property_id
    WHERE d.id = target_dept_id 
    AND up.user_id = auth_user_id
  );
$$;

-- 4. Update user_roles policy to use SD function
DROP POLICY IF EXISTS "user_roles_select_property" ON user_roles;
CREATE POLICY "user_roles_select_property" ON user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'regional_admin') OR 
  has_role(auth.uid(), 'regional_hr') OR 
  (
    -- Use SD function to avoid triggering user_properties RLS -> has_role -> user_roles loop
    users_share_property(auth.uid(), user_roles.user_id)
  )
);

-- 5. Update user_departments policy to use SD function
DROP POLICY IF EXISTS "user_departments_select_scope" ON user_departments;
CREATE POLICY "user_departments_select_scope" ON user_departments FOR SELECT
USING (
  has_role(auth.uid(), 'regional_admin') OR 
  has_role(auth.uid(), 'regional_hr') OR 
  user_id = auth.uid() OR 
  (
    -- Use SD function
    user_has_department_access(auth.uid(), department_id)
  )
);

DROP POLICY IF EXISTS "user_departments_modify_admin_hr_pm" ON user_departments;
CREATE POLICY "user_departments_modify_admin_hr_pm" ON user_departments FOR ALL
USING (
  has_role(auth.uid(), 'regional_admin') OR 
  has_role(auth.uid(), 'regional_hr') OR 
  (
    has_role(auth.uid(), 'property_manager') AND 
    user_has_department_access(auth.uid(), department_id)
  )
);

-- 6. Cleanup user_properties potential duplicates or dangerous policies
-- The existing policies seem 'okay' now that the Other tables don't recurse back to property RLS via the SD functions,
-- but let's optimize "user_properties_select_scope" just in case.

DROP POLICY IF EXISTS "user_properties_select_scope" ON user_properties;
CREATE POLICY "user_properties_select_scope" ON user_properties FOR SELECT
USING (
  has_role(auth.uid(), 'regional_admin') OR 
  has_role(auth.uid(), 'regional_hr') OR 
  user_id = auth.uid() OR 
  has_property_access(auth.uid(), property_id) 
);
