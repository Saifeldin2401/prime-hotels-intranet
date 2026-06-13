-- Row Level Security Policies

-- Profiles: Users can view their own profile and profiles in their properties
CREATE POLICY "profiles_select_own_and_property"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    EXISTS (
      SELECT 1 FROM user_properties up1
      JOIN user_properties up2 ON up1.property_id = up2.property_id
      WHERE up1.user_id = auth.uid()
      AND up2.user_id = profiles.id
    )
  );

-- Profiles: Only admins and HR can update profiles
CREATE POLICY "profiles_update_admin_hr"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr')
  );

-- Properties: All authenticated users can view active properties
CREATE POLICY "properties_select_all"
  ON properties FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_property_access(auth.uid(), id)
  );

-- Properties: Only regional admin can insert/update/delete
CREATE POLICY "properties_modify_admin"
  ON properties FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'regional_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'regional_admin'));

-- Departments: Users can view departments in their properties
CREATE POLICY "departments_select_property"
  ON departments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_property_access(auth.uid(), property_id)
  );

-- Departments: Only regional admin and property managers can modify
CREATE POLICY "departments_modify_admin_pm"
  ON departments FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     public.has_property_access(auth.uid(), property_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     public.has_property_access(auth.uid(), property_id))
  );

-- User Roles: Users can view roles for users in their properties
CREATE POLICY "user_roles_select_property"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    EXISTS (
      SELECT 1 FROM user_properties up1
      JOIN user_properties up2 ON up1.property_id = up2.property_id
      WHERE up1.user_id = auth.uid()
      AND up2.user_id = user_roles.user_id
    )
  );

-- User Roles: Only regional admin and regional HR can modify
CREATE POLICY "user_roles_modify_admin_hr"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

-- User Properties: Users can view property assignments in their scope
CREATE POLICY "user_properties_select_scope"
  ON user_properties FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    user_id = auth.uid() OR
    public.has_property_access(auth.uid(), property_id)
  );

-- User Properties: Only regional admin and regional HR can modify
CREATE POLICY "user_properties_modify_admin_hr"
  ON user_properties FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

-- User Departments: Users can view department assignments in their scope
CREATE POLICY "user_departments_select_scope"
  ON user_departments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM departments d
      JOIN user_properties up ON d.property_id = up.property_id
      WHERE d.id = user_departments.department_id
      AND up.user_id = auth.uid()
    )
  );

-- User Departments: Only regional admin, regional HR, and property managers can modify
CREATE POLICY "user_departments_modify_admin_hr_pm"
  ON user_departments FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     EXISTS (
       SELECT 1 FROM departments d
       JOIN user_properties up ON d.property_id = up.property_id
       WHERE d.id = user_departments.department_id
       AND up.user_id = auth.uid()
     ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     EXISTS (
       SELECT 1 FROM departments d
       JOIN user_properties up ON d.property_id = up.property_id
       WHERE d.id = user_departments.department_id
       AND up.user_id = auth.uid()
     ))
  );

