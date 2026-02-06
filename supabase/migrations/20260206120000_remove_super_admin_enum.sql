-- Migration to remove 'super_admin' from app_role enum and re-bind all dependent objects
-- Created: 2026-02-06
-- Rationale: Consolidate top-level roles into corporate_admin

BEGIN;

-- 1. Drop all dependent policies using a dynamic block
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE qual LIKE '%::app_role%' OR with_check LIKE '%::app_role%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Drop dependent functions (including overloads)
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_role_optimized(public.app_role);
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);
DROP FUNCTION IF EXISTS public.promote_employee(uuid, uuid, public.app_role, text, uuid, date, text);
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, public.app_role, text, uuid, text);

-- 3. Rename old type
ALTER TYPE public.app_role RENAME TO app_role_old;

-- 4. Create new type without 'super_admin'
CREATE TYPE public.app_role AS ENUM (
    'corporate_admin',
    'regional_admin',
    'regional_hr',
    'property_manager',
    'property_hr',
    'department_head',
    'manager',
    'staff'
);

-- 5. Update columns to use new type
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.documents ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.escalation_rules ALTER COLUMN next_role TYPE public.app_role USING next_role::text::public.app_role;
ALTER TABLE public.job_title_role_mappings ALTER COLUMN system_role TYPE public.app_role USING system_role::text::public.app_role;
ALTER TABLE public.document_approvals ALTER COLUMN approver_role TYPE public.app_role USING approver_role::text::public.app_role;
ALTER TABLE public.request_steps ALTER COLUMN assignee_role TYPE public.app_role USING assignee_role::text::public.app_role;
ALTER TABLE public.training_paths ALTER COLUMN target_role TYPE public.app_role USING target_role::text::public.app_role;
ALTER TABLE public.onboarding_templates ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.promotions ALTER COLUMN old_role TYPE public.app_role USING old_role::text::public.app_role;
ALTER TABLE public.promotions ALTER COLUMN new_role TYPE public.app_role USING new_role::text::public.app_role;
ALTER TABLE public.job_titles ALTER COLUMN default_role TYPE public.app_role USING default_role::text::public.app_role;

-- 6. Recreate functions
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid uuid)
 RETURNS TABLE(id uuid, user_id uuid, role public.app_role)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT ur.id, ur.user_id, ur.role
  FROM user_roles ur
  WHERE ur.user_id = user_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, check_role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = check_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT public.has_role(uid, role_name::public.app_role);
$function$;

CREATE OR REPLACE FUNCTION public.has_role_optimized(check_role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT check_role = ANY(public.get_my_roles());
$function$;

CREATE OR REPLACE FUNCTION public.promote_employee(p_employee_id uuid, p_promoter_id uuid, p_new_role public.app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_promotion_id UUID;
    v_old_role public.app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
BEGIN
    v_current_date := CURRENT_DATE;
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    INSERT INTO public.promotions (
        employee_id, promoted_by, old_role, new_role, old_job_title, new_job_title,
        old_department_id, new_department_id, effective_date, notes, status
    ) VALUES (
        p_employee_id, p_promoter_id, v_old_role, p_new_role, v_old_job_title, p_new_job_title,
        v_old_department_id, p_new_department_id, p_effective_date, p_notes,
        CASE WHEN p_effective_date <= v_current_date THEN 'completed' ELSE 'pending' END
    ) RETURNING id INTO v_promotion_id;

    IF p_effective_date <= v_current_date THEN
        UPDATE public.profiles SET job_title = p_new_job_title, updated_at = NOW() WHERE id = p_employee_id;
        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);
        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id) VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;
    RETURN v_promotion_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role public.app_role, p_new_job_title text, p_new_department_id uuid, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_promotion_id UUID;
    v_request_id UUID;
    v_request_no BIGINT;
    v_requester_id UUID := auth.uid();
    v_old_role public.app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_property_id UUID;
    v_hr_assignee UUID;
    v_effective_date DATE := CURRENT_DATE;
BEGIN
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;
    SELECT property_id INTO v_property_id FROM public.user_properties WHERE user_id = p_employee_id LIMIT 1;

    INSERT INTO public.promotions (
        employee_id, promoted_by, old_role, new_role, 
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) VALUES (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        v_effective_date, p_notes, 'pending'
    ) RETURNING id INTO v_promotion_id;

    SELECT user_id INTO v_hr_assignee FROM public.user_roles WHERE role = 'regional_hr' LIMIT 1;

    INSERT INTO public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata
    ) VALUES (
        'promotion', v_promotion_id, v_requester_id, v_hr_assignee, 'pending_hr_review',
        jsonb_build_object('employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id), 'new_role', p_new_role, 'effective_date', v_effective_date)
    ) RETURNING id, request_no INTO v_request_id, v_request_no;

    INSERT INTO public.request_steps (request_id, step_order, assignee_id, assignee_role, status
    ) VALUES (v_request_id, 1, v_hr_assignee, 'regional_hr', 'pending');
    
    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END;
$function$;

-- 7. Recreate all policies (Manually verified and reconstructed from DB)
-- Note: Casts to public.app_role are used for clarity
CREATE POLICY "pii_access_logs_manage" ON public.pii_access_logs FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role));
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT TO public USING ((assigned_to_id = auth.uid()) OR (created_by_id = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role));
CREATE POLICY "notifications_create_admin" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role_optimized('regional_admin'::public.app_role) OR has_role_optimized('property_manager'::public.app_role) OR has_role_optimized('regional_hr'::public.app_role) OR has_role_optimized('property_hr'::public.app_role) OR has_role_optimized('department_head'::public.app_role) OR (auth.uid() = user_id));
CREATE POLICY "notifications_manage_admin" ON public.notifications FOR ALL TO authenticated USING (has_role_optimized('regional_admin'::public.app_role) OR has_role_optimized('property_manager'::public.app_role) OR has_role_optimized('regional_hr'::public.app_role) OR has_role_optimized('property_hr'::public.app_role) OR has_role_optimized('department_head'::public.app_role));
CREATE POLICY "workflow_definitions_admin_manage" ON public.workflow_definitions FOR ALL TO authenticated USING ('regional_admin'::public.app_role = ANY (get_my_roles()));
CREATE POLICY "Admins and managers can view all attendance" ON public.attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Managers can view/edit their staff's process" ON public.onboarding_process FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = onboarding_process.user_id AND (reporting_to = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])))));
CREATE POLICY "Users can view maintenance comments" ON public.maintenance_comments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM maintenance_tickets mt WHERE mt.id = maintenance_comments.ticket_id AND (EXISTS (SELECT 1 FROM user_properties WHERE user_id = auth.uid() AND property_id = mt.property_id) OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])))));
CREATE POLICY "Users can create maintenance comments" ON public.maintenance_comments FOR INSERT TO public WITH CHECK ((auth.uid() = author_id) AND EXISTS (SELECT 1 FROM maintenance_tickets mt WHERE mt.id = maintenance_comments.ticket_id AND (EXISTS (SELECT 1 FROM user_properties WHERE user_id = auth.uid() AND property_id = mt.property_id) OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])))));
CREATE POLICY "Admins can view all user skills" ON public.user_skills FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Users can view maintenance attachments" ON public.maintenance_attachments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM maintenance_tickets mt WHERE mt.id = maintenance_attachments.ticket_id AND (EXISTS (SELECT 1 FROM user_properties WHERE user_id = auth.uid() AND property_id = mt.property_id) OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])))));
CREATE POLICY "Users can upload maintenance attachments" ON public.maintenance_attachments FOR INSERT TO public WITH CHECK ((auth.uid() = uploaded_by_id) AND EXISTS (SELECT 1 FROM maintenance_tickets mt WHERE mt.id = maintenance_attachments.ticket_id AND (EXISTS (SELECT 1 FROM user_properties WHERE user_id = auth.uid() AND property_id = mt.property_id) OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])))));
CREATE POLICY "Users see assignments targeting them" ON public.learning_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (target_type = 'everyone' OR (target_type = 'property' AND EXISTS (SELECT 1 FROM user_properties up WHERE up.user_id = p.id AND up.property_id::text = target_id)) OR (target_type = 'department' AND EXISTS (SELECT 1 FROM user_departments ud WHERE ud.user_id = p.id AND ud.department_id::text = target_id)) OR (target_type = 'role' AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = target_id::public.app_role)))));
CREATE POLICY "Regional admin/HR can view all applications" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Regional admin/HR can update all applications" ON public.job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Property HR can view property applications" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN job_postings jp ON jp.property_id = up.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND jp.id = job_applications.job_posting_id));
CREATE POLICY "Property managers can view routed applications" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'property_manager'::public.app_role AND auth.uid() = ANY (job_applications.routed_to)));
CREATE POLICY "Property managers can update routed applications" ON public.job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'property_manager'::public.app_role AND auth.uid() = ANY (job_applications.routed_to)));
CREATE POLICY "Regional admin/HR can manage all SOPs" ON public.sop_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Property HR can manage property assignments" ON public.sop_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN sop_documents sd ON sd.property_id = up.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND sd.id = sop_assignments.sop_document_id));
CREATE POLICY "Admins and HR can manage all leaves" ON public.leaves FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Managers can view property certificates" ON public.certificates FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])) AND EXISTS (SELECT 1 FROM user_properties up WHERE up.user_id = auth.uid() AND up.property_id = certificates.property_id));
CREATE POLICY "Regional admins can view all certificates" ON public.certificates FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Admins can view all certificate history" ON public.certificate_history FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "Microlearning manageable by admins and managers" ON public.microlearning_content FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Admins can manage related articles" ON public.knowledge_related_articles FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])));
CREATE POLICY "transfers_insert_policy" ON public.transfers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role]) AND up.property_id = transfers.from_property_id));
CREATE POLICY "HR can manage job title mappings" ON public.job_title_role_mappings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "transfers_update_policy" ON public.transfers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "promotions_insert_strict" ON public.promotions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_admin ON up_admin.user_id = ur.user_id JOIN user_properties up_emp ON up_emp.user_id = promotions.employee_id WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role]) AND up_admin.property_id = up_emp.property_id));
CREATE POLICY "Admins can manage categories" ON public.document_categories FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "Admins can manage required reading" ON public.knowledge_required_reading FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "Admins can manage trigger rules" ON public.trigger_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "promotions_select_global" ON public.promotions FOR SELECT TO authenticated USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)) OR EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_admin ON up_admin.user_id = ur.user_id JOIN user_properties up_emp ON up_emp.user_id = promotions.employee_id WHERE ur.user_id = auth.uid() AND (role = 'property_manager'::public.app_role OR role = 'property_hr'::public.app_role) AND up_admin.property_id = up_emp.property_id));
CREATE POLICY "transfers_select_global" ON public.transfers FOR SELECT TO authenticated USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)) OR EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND (role = 'property_manager'::public.app_role OR role = 'property_hr'::public.app_role) AND (up.property_id = transfers.from_property_id OR up.property_id = transfers.to_property_id)));
CREATE POLICY "Admins can view workflow executions" ON public.workflow_executions FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'regional_admin'::public.app_role));
CREATE POLICY "Admins can view schedules" ON public.workflow_schedules FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'regional_admin'::public.app_role));
CREATE POLICY "Managers can view leave requests for their department" ON public.leave_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['department_head'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'regional_admin'::public.app_role])) AND (department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid()) OR property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Managers can update leave requests" ON public.leave_requests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['department_head'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'regional_admin'::public.app_role])));
CREATE POLICY "HR can manage job postings" ON public.job_postings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_hr'::public.app_role, 'property_hr'::public.app_role, 'regional_admin'::public.app_role])));
CREATE POLICY "Admins can view analytics" ON public.analytics_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])));
CREATE POLICY "Admins can view search logs" ON public.search_analytics FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])));
CREATE POLICY "Managers can manage task templates" ON public.task_templates FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Maintenance schedules viewable by authorized roles" ON public.maintenance_schedules FOR SELECT TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role) OR has_role(auth.uid(), 'department_head'::public.app_role));
CREATE POLICY "Maintenance schedules manageable by admins/managers" ON public.maintenance_schedules FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role));
CREATE POLICY "Staff can view templates" ON public.task_templates FOR SELECT TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_property_access(auth.uid(), property_id));
CREATE POLICY "training_paths_manage" ON public.training_paths FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role));
CREATE POLICY "Admins can manage automation config" ON public.system_automations_config FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role));
CREATE POLICY "training_path_modules_manage" ON public.training_path_modules FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role));
CREATE POLICY "user_path_enrollments_manage" ON public.user_path_enrollments FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role));
CREATE POLICY "training_quiz_attempts_manage" ON public.training_quiz_attempts FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role));
CREATE POLICY "Training rules viewable by admins" ON public.training_assignment_rules FOR SELECT TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role));
CREATE POLICY "Training rules manageable by admins" ON public.training_assignment_rules FOR ALL TO public USING (has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'regional_hr'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role));
CREATE POLICY "Draft quizzes viewable by creators and HR" ON public.learning_quizzes FOR ALL TO public USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "HR can manage quiz questions" ON public.learning_quiz_questions FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Regional admin/HR can manage all assignments" ON public.sop_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Regional admin/HR can view all reading logs" ON public.sop_reading_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])));
CREATE POLICY "Admins and managers can view all shifts" ON public.shifts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Managers can create shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Managers can delete shifts" ON public.shifts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Update own shifts" ON public.shifts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "tasks_manage_own" ON public.tasks FOR ALL TO public USING (created_by_id = auth.uid() OR has_role(auth.uid(), 'regional_admin'::public.app_role) OR has_role(auth.uid(), 'property_manager'::public.app_role));
CREATE POLICY "Property HR can create property promotions" ON public.employee_promotions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND up_staff.user_id = employee_promotions.employee_id));
CREATE POLICY "Property HR can view property promotions" ON public.employee_promotions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND up_staff.user_id = employee_promotions.employee_id));
CREATE POLICY "Regional admin/HR can create promotions" ON public.employee_promotions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Regional admin/HR can view all promotions" ON public.employee_promotions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Property HR can view property transfers" ON public.employee_transfers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND up_staff.user_id = employee_transfers.employee_id));
CREATE POLICY "Regional admin/HR can create transfers" ON public.employee_transfers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Regional admin/HR can view all transfers" ON public.employee_transfers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "announcement_reads_manage" ON public.announcement_reads FOR ALL TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'regional_admin'::public.app_role));
CREATE POLICY "HR can view all referrals for their property" ON public.employee_referrals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_hr'::public.app_role OR role = 'property_hr'::public.app_role)) AND property_id IN (SELECT property_id FROM user_properties WHERE user_id = auth.uid()));
CREATE POLICY "Property HR can update property applications" ON public.job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN job_postings jp ON jp.property_id = up.property_id WHERE ur.user_id = auth.uid() AND (ur.role = 'property_hr'::public.app_role OR ur.role = 'regional_hr'::public.app_role) AND jp.id = job_applications.job_posting_id));
CREATE POLICY "Templates editable by admins" ON public.onboarding_templates FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Allow manage access for admins" ON public.job_titles FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Property HR can manage property SOPs" ON public.sop_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND (up.property_id = sop_documents.property_id OR sop_documents.property_id IS NULL)));
CREATE POLICY "Property HR can manage property quiz questions" ON public.sop_quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN sop_documents sd ON sd.property_id = up.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND sd.id = sop_quiz_questions.sop_document_id));
CREATE POLICY "Regional admin/HR can manage quiz questions" ON public.sop_quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Department heads can view department quiz attempts" ON public.sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_departments ud_head ON ud_head.user_id = ur.user_id JOIN user_departments ud_staff ON ud_staff.department_id = ud_head.department_id WHERE ur.user_id = auth.uid() AND ur.role = 'department_head'::public.app_role AND ud_staff.user_id = sop_quiz_attempts.user_id));
CREATE POLICY "Property HR can view property quiz attempts" ON public.sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr'::public.app_role AND up_staff.user_id = sop_quiz_attempts.user_id));
CREATE POLICY "Regional admin/HR can view all quiz attempts" ON public.sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Creators can update own questions" ON public.knowledge_questions FOR UPDATE TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role OR role = 'property_hr'::public.app_role)));
CREATE POLICY "Full access to question options" ON public.knowledge_question_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role OR role = 'property_hr'::public.app_role)));
CREATE POLICY "HR can manage usages" ON public.knowledge_question_usages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role OR role = 'property_hr'::public.app_role)));
CREATE POLICY "HR can view versions" ON public.knowledge_question_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role OR role = 'property_hr'::public.app_role)));
CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])));
CREATE POLICY "Admins can manage user skills" ON public.user_skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Admins and HR can manage skills" ON public.skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Admins can manage module skills" ON public.module_skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "Admins can view all PII logs" ON public.pii_access_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (role = 'regional_admin'::public.app_role OR role = 'regional_hr'::public.app_role)));
CREATE POLICY "announcements_manage_policy" ON public.announcements FOR ALL TO authenticated USING (has_role_optimized('regional_admin'::public.app_role) OR has_role_optimized('property_manager'::public.app_role) OR has_role_optimized('regional_hr'::public.app_role) OR has_role_optimized('property_hr'::public.app_role) OR has_role_optimized('department_head'::public.app_role)) WITH CHECK (has_role_optimized('regional_admin'::public.app_role) OR has_role_optimized('property_manager'::public.app_role) OR has_role_optimized('regional_hr'::public.app_role) OR has_role_optimized('property_hr'::public.app_role) OR has_role_optimized('department_head'::public.app_role));
CREATE POLICY "Users can update relevant onboarding tasks" ON public.onboarding_tasks FOR UPDATE TO public USING (assigned_to_id = auth.uid() OR EXISTS (SELECT 1 FROM onboarding_process p WHERE p.id = onboarding_tasks.process_id AND p.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = auth.uid() AND role = ANY (ARRAY['regional_admin'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])));
CREATE POLICY "audit_logs_strict_select" ON public.audit_logs FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role])));
CREATE POLICY "pii_access_logs_strict_select" ON public.pii_access_logs FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role, 'regional_hr'::public.app_role])));

-- 8. Final Cleanup: Drop the old type
DROP TYPE public.app_role_old;

-- Explicitly handle anyone who might have been a super_admin (should be 0 based on counts)
-- But as a safeguard:
UPDATE public.user_roles SET role = 'corporate_admin' WHERE role::text = 'super_admin';

COMMIT;
