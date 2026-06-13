-- Final RLS Sweep Batch 6: HR & Training (Part 2 - Final Corrected Join v2)

-- training_progress
DROP POLICY IF EXISTS "training_progress_insert" ON training_progress;
CREATE POLICY "training_progress_insert" ON training_progress FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "training_progress_update" ON training_progress;
CREATE POLICY "training_progress_update" ON training_progress FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- training_certificates (Corrected Join)
DROP POLICY IF EXISTS "training_certificates_manage" ON training_certificates;
CREATE POLICY "training_certificates_manage" ON training_certificates FOR ALL TO authenticated USING (
  auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR 
  (auth_has_role((SELECT auth.uid()), 'property_manager'::text) AND EXISTS (
    SELECT 1 FROM training_progress tp 
    JOIN training_modules tm ON tm.id = tp.training_id 
    WHERE tp.id = training_certificates.training_progress_id AND check_property_access(tm.property_id)
  ))
);

-- training_quizzes
DROP POLICY IF EXISTS "training_quizzes_manage" ON training_quizzes;
CREATE POLICY "training_quizzes_manage" ON training_quizzes FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]));

-- shifts
DROP POLICY IF EXISTS "Admins and managers can view all shifts" ON shifts;
CREATE POLICY "Admins and managers can view all shifts" ON shifts FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

DROP POLICY IF EXISTS "Managers can create shifts" ON shifts;
CREATE POLICY "Managers can create shifts" ON shifts FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

DROP POLICY IF EXISTS "Managers can delete shifts" ON shifts;
CREATE POLICY "Managers can delete shifts" ON shifts FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

DROP POLICY IF EXISTS "Update own shifts" ON shifts;
CREATE POLICY "Update own shifts" ON shifts FOR UPDATE TO authenticated USING ((user_id = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))) WITH CHECK ((user_id = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));

DROP POLICY IF EXISTS "Users can view their own shifts" ON shifts;
CREATE POLICY "Users can view their own shifts" ON shifts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "shifts_all" ON shifts;
CREATE POLICY "shifts_all" ON shifts FOR ALL TO authenticated USING ((user_id = (SELECT auth.uid())) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'property_manager'::text]));

-- employee_documents
DROP POLICY IF EXISTS "Users can delete own documents" ON employee_documents;
CREATE POLICY "Users can delete own documents" ON employee_documents FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can upload own documents" ON employee_documents;
CREATE POLICY "Users can upload own documents" ON employee_documents FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- employee_promotions (Hardened)
DROP POLICY IF EXISTS "Users can view own promotions" ON employee_promotions;
CREATE POLICY "Users can view own promotions" ON employee_promotions FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Property HR can create property promotions" ON employee_promotions;
CREATE POLICY "Property HR can create property promotions" ON employee_promotions FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'property_hr'::app_role AND up_staff.user_id = employee_promotions.employee_id));

DROP POLICY IF EXISTS "Property HR can view property promotions" ON employee_promotions;
CREATE POLICY "Property HR can view property promotions" ON employee_promotions FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'property_hr'::app_role AND up_staff.user_id = employee_promotions.employee_id));

DROP POLICY IF EXISTS "Regional admin/HR can create promotions" ON employee_promotions;
CREATE POLICY "Regional admin/HR can create promotions" ON employee_promotions FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

DROP POLICY IF EXISTS "Regional admin/HR can view all promotions" ON employee_promotions;
CREATE POLICY "Regional admin/HR can view all promotions" ON employee_promotions FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- employee_transfers (Hardened)
DROP POLICY IF EXISTS "Property HR can view property transfers" ON employee_transfers;
CREATE POLICY "Property HR can view property transfers" ON employee_transfers FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'property_hr'::app_role AND up_staff.user_id = employee_transfers.employee_id));

DROP POLICY IF EXISTS "Regional admin/HR can create transfers" ON employee_transfers;
CREATE POLICY "Regional admin/HR can create transfers" ON employee_transfers FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

DROP POLICY IF EXISTS "Regional admin/HR can view all transfers" ON employee_transfers;
CREATE POLICY "Regional admin/HR can view all transfers" ON employee_transfers FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

DROP POLICY IF EXISTS "Users can view own transfers" ON employee_transfers;
CREATE POLICY "Users can view own transfers" ON employee_transfers FOR SELECT TO authenticated USING (employee_id = (SELECT auth.uid()));
;
