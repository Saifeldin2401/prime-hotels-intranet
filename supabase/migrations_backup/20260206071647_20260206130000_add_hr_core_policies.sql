-- HR core policies for admin/manager access (post app_role migration)
-- Created: 2026-02-06

-- Attendance admin policies
CREATE POLICY "attendance_select_admin" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "attendance_insert_admin" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "attendance_update_admin" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  )
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

-- Shifts admin policies
CREATE POLICY "shifts_admin_manage" ON public.shifts
  FOR ALL TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  )
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

-- Performance reviews admin policies
CREATE POLICY "performance_reviews_select_admin" ON public.performance_reviews
  FOR SELECT TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "performance_reviews_insert_admin" ON public.performance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "performance_reviews_update_admin" ON public.performance_reviews
  FOR UPDATE TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  )
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

-- Goals admin policies
CREATE POLICY "goals_select_admin" ON public.goals
  FOR SELECT TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "goals_insert_admin" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

CREATE POLICY "goals_update_admin" ON public.goals
  FOR UPDATE TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  )
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_manager'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role) OR
    has_role_optimized('department_head'::public.app_role) OR
    has_role_optimized('manager'::public.app_role)
  );

-- Payslips admin policies
CREATE POLICY "payslips_select_admin" ON public.payslips
  FOR SELECT TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role)
  );

CREATE POLICY "payslips_insert_admin" ON public.payslips
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role)
  );

CREATE POLICY "payslips_update_admin" ON public.payslips
  FOR UPDATE TO authenticated
  USING (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role)
  )
  WITH CHECK (
    has_role_optimized('corporate_admin'::public.app_role) OR
    has_role_optimized('regional_admin'::public.app_role) OR
    has_role_optimized('regional_hr'::public.app_role) OR
    has_role_optimized('property_hr'::public.app_role)
  );
;
