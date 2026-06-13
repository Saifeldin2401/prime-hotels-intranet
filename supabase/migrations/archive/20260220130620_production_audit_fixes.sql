-- 1. Index Fixes
CREATE INDEX IF NOT EXISTS activity_log_department_id_idx ON public.activity_log(department_id);
CREATE INDEX IF NOT EXISTS activity_log_property_id_idx ON public.activity_log(property_id);
CREATE INDEX IF NOT EXISTS document_department_access_department_id_idx ON public.document_department_access(department_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON public.events(created_by);
CREATE INDEX IF NOT EXISTS events_department_id_idx ON public.events(department_id);
CREATE INDEX IF NOT EXISTS events_property_id_idx ON public.events(property_id);
CREATE INDEX IF NOT EXISTS expense_claims_approved_by_id_idx ON public.expense_claims(approved_by_id);
CREATE INDEX IF NOT EXISTS expense_claims_department_id_idx ON public.expense_claims(department_id);
CREATE INDEX IF NOT EXISTS expense_claims_rejected_by_id_idx ON public.expense_claims(rejected_by_id);
CREATE INDEX IF NOT EXISTS kudos_giver_id_idx ON public.kudos(giver_id);
CREATE INDEX IF NOT EXISTS kudos_likes_user_id_idx ON public.kudos_likes(user_id);
CREATE INDEX IF NOT EXISTS notification_delivery_events_queue_id_idx ON public.notification_delivery_events(queue_id);
CREATE INDEX IF NOT EXISTS training_progress_assignment_id_idx ON public.training_progress(assignment_id);
CREATE INDEX IF NOT EXISTS user_shifts_created_by_idx ON public.user_shifts(created_by);
CREATE INDEX IF NOT EXISTS user_shifts_department_id_idx ON public.user_shifts(department_id);
CREATE INDEX IF NOT EXISTS user_shifts_property_id_idx ON public.user_shifts(property_id);

-- 2. Auth RLS Optimization Fixes
DROP POLICY IF EXISTS "documents_select_by_visibility" ON public.documents;
CREATE POLICY "documents_select_by_visibility" ON public.documents
FOR SELECT USING (
  (has_role((SELECT auth.uid()), 'regional_admin'::text) 
  OR has_role((SELECT auth.uid()), 'regional_hr'::text) 
  OR ((visibility = 'all_properties'::document_visibility) AND (status = 'PUBLISHED'::document_status)) 
  OR ((visibility = 'property'::document_visibility) AND (property_id IS NOT NULL) AND has_property_access((SELECT auth.uid()), property_id) AND (status = 'PUBLISHED'::document_status)) 
  OR ((visibility = 'department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM user_departments ud WHERE ((ud.user_id = (SELECT auth.uid())) AND (ud.department_id = documents.department_id)))) AND (status = 'PUBLISHED'::document_status)) 
  OR ((visibility = 'group_department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM ((user_departments ud JOIN departments ud_dept ON ((ud.department_id = ud_dept.id))) JOIN departments doc_dept ON ((documents.department_id = doc_dept.id))) WHERE ((ud.user_id = (SELECT auth.uid())) AND (lower(ud_dept.name) = lower(doc_dept.name))))) AND (status = 'PUBLISHED'::document_status)) 
  OR ((visibility = 'specific_departments'::document_visibility) AND (EXISTS ( SELECT 1 FROM (document_department_access dda JOIN user_departments ud ON ((dda.department_id = ud.department_id))) WHERE ((dda.document_id = documents.id) AND (ud.user_id = (SELECT auth.uid()))))) AND (status = 'PUBLISHED'::document_status)) 
  OR ((visibility = 'role'::document_visibility) AND (role IS NOT NULL) AND (EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = documents.role)))) AND (status = 'PUBLISHED'::document_status)) 
  OR (created_by = (SELECT auth.uid())))
);

DROP POLICY IF EXISTS "file_security_scans_insert" ON public.file_security_scans;
CREATE POLICY "file_security_scans_insert" ON public.file_security_scans
FOR INSERT WITH CHECK (((user_id = (SELECT auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));

DROP POLICY IF EXISTS "file_security_scans_select" ON public.file_security_scans;
CREATE POLICY "file_security_scans_select" ON public.file_security_scans
FOR SELECT USING (((user_id = (SELECT auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role)));

DROP POLICY IF EXISTS "expense_claims_insert" ON public.expense_claims;
CREATE POLICY "expense_claims_insert" ON public.expense_claims
FOR INSERT WITH CHECK (((requester_id = (SELECT auth.uid())) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('corporate_admin'::app_role)));

DROP POLICY IF EXISTS "expense_claims_select" ON public.expense_claims;
CREATE POLICY "expense_claims_select" ON public.expense_claims
FOR SELECT USING (((requester_id = (SELECT auth.uid())) OR ((workflow_request_id IS NOT NULL) AND can_view_request(workflow_request_id)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('department_head'::app_role)));

DROP POLICY IF EXISTS "expense_claims_update" ON public.expense_claims;
CREATE POLICY "expense_claims_update" ON public.expense_claims
FOR UPDATE USING (((requester_id = (SELECT auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('property_manager'::app_role)))
WITH CHECK (((requester_id = (SELECT auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('property_manager'::app_role)));

DROP POLICY IF EXISTS "admins_read_notification_email_templates" ON public.notification_email_templates;
CREATE POLICY "admins_read_notification_email_templates" ON public.notification_email_templates
FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_roles ur WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));

DROP POLICY IF EXISTS "service_role_full_access_notification_email_templates" ON public.notification_email_templates;
CREATE POLICY "service_role_full_access_notification_email_templates" ON public.notification_email_templates
FOR ALL USING (((SELECT auth.role()) = 'service_role'::text)) WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "service_role_full_access_notification_delivery_events" ON public.notification_delivery_events;
CREATE POLICY "service_role_full_access_notification_delivery_events" ON public.notification_delivery_events
FOR ALL USING (((SELECT auth.role()) = 'service_role'::text)) WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "users_view_own_notification_delivery_events" ON public.notification_delivery_events;
CREATE POLICY "users_view_own_notification_delivery_events" ON public.notification_delivery_events
FOR SELECT USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Manage department access delete" ON public.document_department_access;
CREATE POLICY "Manage department access delete" ON public.document_department_access
FOR DELETE USING ((EXISTS ( SELECT 1 FROM documents WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text))))));

DROP POLICY IF EXISTS "Manage department access insert" ON public.document_department_access;
CREATE POLICY "Manage department access insert" ON public.document_department_access
FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM documents WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text))))));

DROP POLICY IF EXISTS "Manage department access update" ON public.document_department_access;
CREATE POLICY "Manage department access update" ON public.document_department_access
FOR UPDATE USING ((EXISTS ( SELECT 1 FROM documents WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text))))))
WITH CHECK ((EXISTS ( SELECT 1 FROM documents WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'regional_admin'::text) OR has_role((SELECT auth.uid()), 'property_manager'::text))))));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (
  (user_id = (SELECT auth.uid())) 
  OR ((SELECT auth.role()) = 'service_role'::text)
  OR has_role_optimized('corporate_admin'::app_role)
  OR has_role_optimized('regional_admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can create kudos" ON public.kudos;
CREATE POLICY "Authenticated users can create kudos" ON public.kudos
FOR INSERT WITH CHECK ((giver_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can like kudos" ON public.kudos_likes;
CREATE POLICY "Users can like kudos" ON public.kudos_likes
FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own shifts" ON public.user_shifts;
CREATE POLICY "Users can view own shifts" ON public.user_shifts
FOR SELECT USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own vacation balance" ON public.user_vacation_balance;
CREATE POLICY "Users can view own vacation balance" ON public.user_vacation_balance
FOR SELECT USING ((user_id = (SELECT auth.uid())));

-- 3. Function Security Mutable Fixes
ALTER FUNCTION public.mark_notification_as_read(notification_id uuid) SET search_path = public;
ALTER FUNCTION public.mark_all_notifications_as_read() SET search_path = public;
ALTER FUNCTION public.toggle_kudos_like(kudos_uuid uuid) SET search_path = public;
ALTER FUNCTION public.get_next_shift(user_uuid uuid) SET search_path = public;
ALTER FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer) SET search_path = public;
ALTER FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats(user_uuid uuid) SET search_path = public;
ALTER FUNCTION public.get_events_for_range(start_date text, end_date text, property_filter uuid) SET search_path = public;;
