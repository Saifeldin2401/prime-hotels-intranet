-- =============================================================================
-- Migration: 20260815020000_audit_fixes_and_security_hardening.sql
-- Purpose: Implement missing RPCs, harden search paths, add indexes, secure functions
-- =============================================================================

-- 1. Create submit_expense_claim RPC
CREATE OR REPLACE FUNCTION public.submit_expense_claim(
  p_category text,
  p_amount numeric,
  p_currency text DEFAULT 'SAR',
  p_expense_date date DEFAULT CURRENT_DATE,
  p_vendor_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
  v_request_id uuid;
  v_request_no bigint;
  v_supervisor_id uuid;
  v_finance_assignee_id uuid;
  v_supervisor_role public.app_role;
  v_finance_role public.app_role;
  v_initial_status text;
  v_property_id uuid := p_property_id;
  v_department_id uuid := p_department_id;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  -- Fallback property/department from user profile if not provided
  IF v_property_id IS NULL OR v_department_id IS NULL THEN
    SELECT property_id, department_id, reporting_to
    INTO v_property_id, v_department_id, v_supervisor_id
    FROM public.profiles
    WHERE id = v_user_id;
  ELSE
    SELECT reporting_to INTO v_supervisor_id
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  -- Find Finance / HR assignee for property
  SELECT ur.user_id, ur.role INTO v_finance_assignee_id, v_finance_role
  FROM public.user_roles ur
  WHERE ur.role IN ('corporate_admin', 'regional_admin', 'property_manager', 'property_hr')
  ORDER BY CASE ur.role
    WHEN 'property_manager' THEN 1
    WHEN 'property_hr' THEN 2
    WHEN 'regional_admin' THEN 3
    WHEN 'corporate_admin' THEN 4
    ELSE 100
  END
  LIMIT 1;

  IF v_finance_role IS NULL THEN
    v_finance_role := 'corporate_admin';
  END IF;

  -- Determine supervisor role
  IF v_supervisor_id IS NOT NULL THEN
    SELECT ur.role INTO v_supervisor_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_supervisor_id
    LIMIT 1;

    IF v_supervisor_role IS NULL THEN
      v_supervisor_role := 'manager';
    END IF;
  END IF;

  v_initial_status := CASE
    WHEN v_supervisor_id IS NULL THEN 'pending_hr_review'
    ELSE 'pending_supervisor_approval'
  END;

  -- Insert expense claim record
  INSERT INTO public.expense_claims (
    requester_id,
    property_id,
    department_id,
    category,
    amount,
    currency,
    expense_date,
    vendor_name,
    description,
    status
  )
  VALUES (
    v_user_id,
    v_property_id,
    v_department_id,
    p_category,
    p_amount,
    COALESCE(p_currency, 'SAR'),
    p_expense_date,
    p_vendor_name,
    p_description,
    'pending'
  )
  RETURNING id INTO v_claim_id;

  -- Insert unified request entry
  INSERT INTO public.requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    property_id,
    department_id,
    priority,
    metadata
  )
  VALUES (
    'expense_claim',
    v_claim_id,
    v_user_id,
    v_supervisor_id,
    COALESCE(v_supervisor_id, v_finance_assignee_id),
    v_initial_status,
    NOW(),
    v_property_id,
    v_department_id,
    'normal',
    jsonb_build_object(
      'category', p_category,
      'amount', p_amount,
      'currency', COALESCE(p_currency, 'SAR'),
      'vendor_name', p_vendor_name,
      'expense_date', p_expense_date
    )
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;

  -- Link workflow request ID to expense claim
  UPDATE public.expense_claims
  SET workflow_request_id = v_request_id
  WHERE id = v_claim_id;

  -- Insert request steps
  IF v_supervisor_id IS NOT NULL THEN
    INSERT INTO public.request_steps (
      request_id, step_order, assignee_id, assignee_role, status, created_by
    )
    VALUES (
      v_request_id, 1, v_supervisor_id, v_supervisor_role, 'pending', v_user_id
    );

    IF v_finance_assignee_id IS NOT NULL THEN
      INSERT INTO public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status, created_by
      )
      VALUES (
        v_request_id, 2, v_finance_assignee_id, v_finance_role, 'waiting', v_user_id
      );
    END IF;
  ELSIF v_finance_assignee_id IS NOT NULL THEN
    INSERT INTO public.request_steps (
      request_id, step_order, assignee_id, assignee_role, status, created_by
    )
    VALUES (
      v_request_id, 1, v_finance_assignee_id, v_finance_role, 'pending', v_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'claim_id', v_claim_id,
    'request_id', v_request_id,
    'request_no', v_request_no
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_expense_claim TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_expense_claim FROM anon;


-- 2. Create seed_default_scheduled_reports RPC
CREATE OR REPLACE FUNCTION public.seed_default_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
BEGIN
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
  END IF;

  -- Default 1: Monthly Saudization Report
  IF NOT EXISTS (SELECT 1 FROM public.scheduled_compliance_reports WHERE report_name = 'Monthly Saudization Compliance Report') THEN
    INSERT INTO public.scheduled_compliance_reports (
      report_name,
      description,
      report_type,
      schedule_cron,
      schedule_timezone,
      report_scope,
      format,
      template_name,
      delivery_config,
      created_by,
      recipient_roles,
      is_active
    ) VALUES (
      'Monthly Saudization Compliance Report',
      'Automated Nitaqat and Saudization metrics by property and department.',
      'saudization',
      '0 8 1 * *',
      'Asia/Riyadh',
      jsonb_build_object('scope_type', 'all_properties'),
      'pdf',
      'standard_saudization',
      jsonb_build_object('include_attachment', true, 'email_subject', 'Monthly Saudization Compliance Report'),
      v_admin_id,
      ARRAY['corporate_admin', 'regional_admin', 'regional_hr'],
      true
    );
  END IF;

  -- Default 2: Quarterly Training Compliance
  IF NOT EXISTS (SELECT 1 FROM public.scheduled_compliance_reports WHERE report_name = 'Quarterly Training Compliance Audit') THEN
    INSERT INTO public.scheduled_compliance_reports (
      report_name,
      description,
      report_type,
      schedule_cron,
      schedule_timezone,
      report_scope,
      format,
      template_name,
      delivery_config,
      created_by,
      recipient_roles,
      is_active
    ) VALUES (
      'Quarterly Training Compliance Audit',
      'Quarterly overview of mandatory training module completions and expiring certifications.',
      'training_compliance',
      '0 8 1 1,4,7,10 *',
      'Asia/Riyadh',
      jsonb_build_object('scope_type', 'all_properties'),
      'xlsx',
      'standard_training',
      jsonb_build_object('include_attachment', true, 'email_subject', 'Quarterly Training Compliance Report'),
      v_admin_id,
      ARRAY['corporate_admin', 'regional_admin', 'department_head'],
      true
    );
  END IF;

  -- Default 3: Security & Access Audit Export
  IF NOT EXISTS (SELECT 1 FROM public.scheduled_compliance_reports WHERE report_name = 'Monthly Security & Access Audit Export') THEN
    INSERT INTO public.scheduled_compliance_reports (
      report_name,
      description,
      report_type,
      schedule_cron,
      schedule_timezone,
      report_scope,
      format,
      template_name,
      delivery_config,
      created_by,
      recipient_roles,
      is_active
    ) VALUES (
      'Monthly Security & Access Audit Export',
      'Comprehensive security event, PII access, and role change audit trail.',
      'security_audit',
      '0 6 1 * *',
      'Asia/Riyadh',
      jsonb_build_object('scope_type', 'all_properties'),
      'json',
      'standard_security',
      jsonb_build_object('include_attachment', true, 'email_subject', 'Monthly Security Audit Log'),
      v_admin_id,
      ARRAY['corporate_admin'],
      true
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_scheduled_reports TO authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_scheduled_reports FROM anon;


-- 3. Set explicit search_path on mutable functions
ALTER FUNCTION public.update_maintenance_tickets_updated_at() SET search_path = public;
ALTER FUNCTION public._safe_uuid(text) SET search_path = public;
ALTER FUNCTION public._normalize_free_text(text) SET search_path = public;
ALTER FUNCTION public.apply_maintenance_sla() SET search_path = public;
ALTER FUNCTION public.get_role_priority(public.app_role) SET search_path = public;


-- 4. Create missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_search_logs_department_id ON public.search_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_property_id ON public.search_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_module_versions_published_by ON public.training_module_versions(published_by);


-- 5. Revoke EXECUTE from anon on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.apply_promotion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_transfer() FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_document_atomic(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_leave_request(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_pending_user(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_training_module(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_expired_documents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_maintenance_ticket(uuid, uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.attendance_check_in(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.attendance_check_out(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_delete_media_storage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_reactivate_suspended_accounts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_module_skills(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_update_reporting_lines(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_onboarding_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_report_definition(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_training_module(uuid, uuid, uuid[], uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_training_progress_integrity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_questions_for_attempt(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_questions_pass_rates(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_quiz_for_player(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grade_question_attempt(uuid, text, uuid[], uuid, text, uuid, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_article_view_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, text, uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_department_training_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_everyone_training_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_property_training_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_related_article_click(uuid, uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_related_article_impression(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_training_progress_training_id() FROM anon;
