-- Batch 4: HR & Employee Management Tables RLS Optimization (v3 Final)

-- employee_referrals
DROP POLICY IF EXISTS "HR can view all referrals for their property" ON employee_referrals;
CREATE POLICY "HR can view all referrals for their property" ON employee_referrals FOR SELECT TO authenticated USING (((SELECT auth.uid()) IN (SELECT user_roles.user_id FROM user_roles WHERE (user_roles.role = ANY (ARRAY['regional_hr'::app_role, 'property_hr'::app_role])))) AND (property_id IN (SELECT user_properties.property_id FROM user_properties WHERE (user_properties.user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS "Users can create referrals" ON employee_referrals;
CREATE POLICY "Users can create referrals" ON employee_referrals FOR INSERT TO authenticated WITH CHECK (referred_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own referrals" ON employee_referrals;
CREATE POLICY "Users can update their own referrals" ON employee_referrals FOR UPDATE TO authenticated USING (referred_by = (SELECT auth.uid())) WITH CHECK (referred_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view referrals they made" ON employee_referrals;
CREATE POLICY "Users can view referrals they made" ON employee_referrals FOR SELECT TO authenticated USING (referred_by = (SELECT auth.uid()));

-- employee_documents
DROP POLICY IF EXISTS "employee_documents_insert" ON employee_documents;
CREATE POLICY "employee_documents_insert" ON employee_documents FOR INSERT TO authenticated WITH CHECK ((user_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "employee_documents_select" ON employee_documents;
CREATE POLICY "employee_documents_select" ON employee_documents FOR SELECT TO authenticated USING ((user_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- shifts
DROP POLICY IF EXISTS "shifts_all" ON shifts;
CREATE POLICY "shifts_all" ON shifts FOR ALL TO authenticated USING ((user_id = (SELECT auth.uid())) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'property_manager'::text]));

-- job_postings
DROP POLICY IF EXISTS "job_postings_manage" ON job_postings;
CREATE POLICY "job_postings_manage" ON job_postings FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text]));

-- job_applications
DROP POLICY IF EXISTS "Property HR can update property applications" ON job_applications;
CREATE POLICY "Property HR can update property applications" ON job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM ((user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) JOIN job_postings jp ON ((jp.property_id = up.property_id))) WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = ANY (ARRAY['regional_hr'::app_role, 'property_hr'::app_role])) AND (jp.id = job_applications.job_posting_id))));

DROP POLICY IF EXISTS "Users can view their own applications" ON job_applications;
CREATE POLICY "Users can view their own applications" ON job_applications FOR SELECT TO authenticated USING ((referred_by = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- employee_promotions
DROP POLICY IF EXISTS "Users can view promotions" ON employee_promotions;
CREATE POLICY "Users can view promotions" ON employee_promotions FOR SELECT TO authenticated USING ((employee_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- employee_transfers
DROP POLICY IF EXISTS "employee_transfers_select" ON employee_transfers;
CREATE POLICY "employee_transfers_select" ON employee_transfers FOR SELECT TO authenticated USING ((employee_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- designations
DROP POLICY IF EXISTS "Authenticated can view designations" ON designations;
CREATE POLICY "Authenticated can view designations" ON designations FOR SELECT TO authenticated USING (true);
;
