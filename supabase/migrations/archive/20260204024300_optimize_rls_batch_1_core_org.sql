-- Batch 1: Core Organizational Tables RLS Optimization

-- properties
DROP POLICY IF EXISTS "properties_manage" ON properties;
CREATE POLICY "properties_manage" ON properties FOR ALL TO authenticated USING (auth_has_role((SELECT auth.uid()), 'regional_admin'::text));

-- departments
DROP POLICY IF EXISTS "departments_manage" ON departments;
CREATE POLICY "departments_manage" ON departments FOR ALL TO authenticated USING (auth_has_role((SELECT auth.uid()), 'regional_admin'::text));

-- profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view profiles in scope" ON profiles;
CREATE POLICY "Users can view profiles in scope" ON profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id OR is_admin((SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR EXISTS (SELECT 1 FROM user_properties WHERE user_id = (SELECT auth.uid()) AND property_id IN (SELECT property_id FROM user_properties WHERE user_id = profiles.id)));

DROP POLICY IF EXISTS "profiles_manage_admin" ON profiles;
CREATE POLICY "profiles_manage_admin" ON profiles FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'property_manager'::text]));

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT TO authenticated USING (true); -- Simplified if it was just fixed to true or authenticated

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;
CREATE POLICY "user_roles_manage" ON user_roles FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]));

DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT TO authenticated USING (true);

-- user_properties
DROP POLICY IF EXISTS "Admins can manage properties" ON user_properties;
CREATE POLICY "Admins can manage properties" ON user_properties FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own properties" ON user_properties;
CREATE POLICY "Users can view own properties" ON user_properties FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_properties_manage" ON user_properties;
CREATE POLICY "user_properties_manage" ON user_properties FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text]));

DROP POLICY IF EXISTS "user_properties_select" ON user_properties;
CREATE POLICY "user_properties_select" ON user_properties FOR SELECT TO authenticated USING (true);

-- user_departments
DROP POLICY IF EXISTS "Admins can manage departments" ON user_departments;
CREATE POLICY "Admins can manage departments" ON user_departments FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own departments" ON user_departments;
CREATE POLICY "Users can view own departments" ON user_departments FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_departments_manage" ON user_departments;
CREATE POLICY "user_departments_manage" ON user_departments FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text]));

DROP POLICY IF EXISTS "user_departments_select" ON user_departments;
CREATE POLICY "user_departments_select" ON user_departments FOR SELECT TO authenticated USING (true);
;
