-- Final RLS Sweep Batch 6: HR & Training (Part 1 - Refined Joins)

-- onboarding_process
DROP POLICY IF EXISTS "Managers can view/edit their staff's process" ON onboarding_process;
CREATE POLICY "Managers can view/edit their staff's process" ON onboarding_process FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = onboarding_process.user_id) AND ((profiles.reporting_to = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))))));

DROP POLICY IF EXISTS "Users can view their own process" ON onboarding_process;
CREATE POLICY "Users can view their own process" ON onboarding_process FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- learning_assignments
DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;
CREATE POLICY "HR can manage assignments" ON learning_assignments FOR ALL TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'regional_hr'::text) OR ((has_role((SELECT auth.uid()), 'property_manager'::text) OR has_role((SELECT auth.uid()), 'property_hr'::text) OR has_role((SELECT auth.uid()), 'department_manager'::text)) AND ((assigned_by = (SELECT auth.uid())) OR ((target_type = 'property'::learning_target_type) AND has_property_access((SELECT auth.uid()), (target_id)::uuid)) OR ((target_type = 'department'::learning_target_type) AND (EXISTS ( SELECT 1 FROM user_departments ud WHERE ((ud.user_id = (SELECT auth.uid())) AND (ud.department_id = (target_id)::uuid))))))));

DROP POLICY IF EXISTS "Users see assignments targeting them" ON learning_assignments;
CREATE POLICY "Users see assignments targeting them" ON learning_assignments FOR SELECT TO authenticated USING (
  EXISTS ( 
    SELECT 1 FROM profiles p 
    WHERE (p.id = (SELECT auth.uid())) 
    AND (
      ((target_type = 'everyone'::learning_target_type)) OR 
      ((target_type = 'property'::learning_target_type) AND EXISTS (SELECT 1 FROM user_properties up WHERE up.user_id = p.id AND (up.property_id)::text = target_id)) OR 
      ((target_type = 'department'::learning_target_type) AND EXISTS (SELECT 1 FROM user_departments ud WHERE ud.user_id = p.id AND (ud.department_id)::text = target_id)) OR 
      ((target_type = 'role'::learning_target_type) AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND (ur.role = (target_id)::app_role)))
    )
  )
);

-- learning_progress
DROP POLICY IF EXISTS "Admins can manage all progress" ON learning_progress;
CREATE POLICY "Admins can manage all progress" ON learning_progress FOR ALL TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'regional_hr'::text));

DROP POLICY IF EXISTS "Users can view own progress" ON learning_progress;
CREATE POLICY "Users can view own progress" ON learning_progress FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- training_modules
DROP POLICY IF EXISTS "training_modules_manage" ON training_modules;
CREATE POLICY "training_modules_manage" ON training_modules FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR (auth_has_role((SELECT auth.uid()), 'property_manager'::text) AND check_property_access(property_id)));
;
