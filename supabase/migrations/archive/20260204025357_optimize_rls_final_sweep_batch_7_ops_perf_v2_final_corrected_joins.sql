-- Final RLS Sweep Batch 7: Operational & Performance (v2 Final Corrected)

-- maintenance_comments
DROP POLICY IF EXISTS "maintenance_comments_delete" ON maintenance_comments;
CREATE POLICY "maintenance_comments_delete" ON maintenance_comments FOR DELETE TO authenticated USING (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_comments_insert" ON maintenance_comments;
CREATE POLICY "maintenance_comments_insert" ON maintenance_comments FOR INSERT TO authenticated WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_comments_update" ON maintenance_comments;
CREATE POLICY "maintenance_comments_update" ON maintenance_comments FOR UPDATE TO authenticated USING (author_id = (SELECT auth.uid())) WITH CHECK (author_id = (SELECT auth.uid()));

-- maintenance_attachments
DROP POLICY IF EXISTS "maintenance_attachments_delete" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_delete" ON maintenance_attachments FOR DELETE TO authenticated USING (uploaded_by_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_attachments_insert" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_insert" ON maintenance_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by_id = (SELECT auth.uid()));

-- approval_requests
DROP POLICY IF EXISTS "approval_requests_manage" ON approval_requests;
CREATE POLICY "approval_requests_manage" ON approval_requests FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR (current_approver_id = (SELECT auth.uid())));

-- daily_revenue
DROP POLICY IF EXISTS "Managers can insert revenue data" ON daily_revenue;
CREATE POLICY "Managers can insert revenue data" ON daily_revenue FOR INSERT TO authenticated WITH CHECK ((has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text)) AND has_property_access((SELECT auth.uid()), property_id));

DROP POLICY IF EXISTS "Managers can update revenue data" ON daily_revenue;
CREATE POLICY "Managers can update revenue data" ON daily_revenue FOR UPDATE TO authenticated USING ((has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text)) AND has_property_access((SELECT auth.uid()), property_id));

-- pms_systems
DROP POLICY IF EXISTS "Admins can manage PMS config" ON pms_systems;
CREATE POLICY "Admins can manage PMS config" ON pms_systems FOR ALL TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::text) AND has_property_access((SELECT auth.uid()), property_id));

-- pms_field_mappings
DROP POLICY IF EXISTS "Admins can manage field mappings" ON pms_field_mappings;
CREATE POLICY "Admins can manage field mappings" ON pms_field_mappings FOR ALL TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::text));

-- attendance
DROP POLICY IF EXISTS "Admins and managers can view all attendance" ON attendance;
CREATE POLICY "Admins and managers can view all attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "attendance_all" ON attendance;
CREATE POLICY "attendance_all" ON attendance FOR ALL TO authenticated USING ((employee_id = (SELECT auth.uid())) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'property_manager'::text]));

-- leaves
DROP POLICY IF EXISTS "Admins and HR can manage all leaves" ON leaves;
CREATE POLICY "Admins and HR can manage all leaves" ON leaves FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

DROP POLICY IF EXISTS "Users can view own leaves" ON leaves;
CREATE POLICY "Users can view own leaves" ON leaves FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));

-- payslips
DROP POLICY IF EXISTS "payslips_select_own" ON payslips;
CREATE POLICY "payslips_select_own" ON payslips FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));

-- performance_reviews
DROP POLICY IF EXISTS "employee_reviews_view_own" ON performance_reviews;
CREATE POLICY "employee_reviews_view_own" ON performance_reviews FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));

-- goals
DROP POLICY IF EXISTS "goals_select_own" ON goals;
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));
;
