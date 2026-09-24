-- ============================================================================
-- MIGRATION: fix_promote_employee_and_bulk_reporting_auth_gaps
-- (this file also incorporates the immediately-following live migration
-- fix_promote_employee_wrong_table_and_columns, applied 2026-08-02 14:03:06 --
-- both are folded into the promote_employee body below since the second was
-- discovered while functionally testing the first)
--
-- promote_employee(p_employee_id, p_new_role, ...) had NO authorization check
-- whatsoever -- any authenticated user could call it with p_employee_id =
-- their own auth.uid() and p_new_role = 'super_admin' for instant
-- self-promotion (deletes/replaces user_roles unconditionally when
-- p_effective_date <= current_date). p_promoter_id was also fully trusted
-- from the caller, allowing promotion records to be falsely attributed.
--
-- Fix: require is_hr_or_admin(auth.uid()) (matches the frontend
-- PromotionWorkflow.tsx route gate: regional_admin/regional_hr/property_hr,
-- plus corporate_admin). Additionally, granting a top-tier admin role
-- (super_admin/corporate_admin/regional_admin/regional_hr) requires the
-- caller to specifically be corporate_admin or regional_admin -- a
-- property-level HR user should not be able to grant system-admin access
-- via this path even though they can promote within lower roles. Also force
-- v_caller (auth.uid()) as the recorded actor rather than trusting the
-- p_promoter_id parameter.
--
-- bulk_update_reporting_lines(p_updates) had no authorization check at all
-- -- any authenticated user could rewrite profiles.reporting_to for
-- arbitrary employee/manager pairs. Since reporting_to feeds into other
-- authorization logic (can_view_request grants visibility when
-- req.reporting_to = auth.uid()), this was chainable into an access-control
-- bypass beyond just org-chart sabotage. Fix: require is_hr_or_admin().
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promotion_id UUID;
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
    v_caller UUID := auth.uid();
BEGIN
    IF NOT is_hr_or_admin(v_caller) THEN
        RAISE EXCEPTION 'Unauthorized: only HR or admin roles may promote employees';
    END IF;

    IF p_new_role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
       AND NOT (has_role(v_caller, 'corporate_admin'::app_role) OR has_role(v_caller, 'regional_admin'::app_role)) THEN
        RAISE EXCEPTION 'Unauthorized: only corporate_admin or regional_admin may grant top-tier admin roles';
    END IF;

    v_current_date := CURRENT_DATE;

    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    INSERT INTO public.employee_promotions (
        employee_id,
        from_role,
        to_role,
        from_title,
        to_title,
        from_department_id,
        to_department_id,
        effective_date,
        approved_by,
        notes
    ) VALUES (
        p_employee_id,
        v_old_role::text,
        p_new_role::text,
        v_old_job_title,
        p_new_job_title,
        v_old_department_id,
        p_new_department_id,
        p_effective_date,
        v_caller,
        p_notes
    ) RETURNING id INTO v_promotion_id;

    -- Apply changes IMMEDIATELY if date is today or present
    IF p_effective_date <= v_current_date THEN
        UPDATE public.profiles
        SET job_title = p_new_job_title, updated_at = NOW()
        WHERE id = p_employee_id;

        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);

        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;

    RETURN v_promotion_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_update_reporting_lines(p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_update RECORD;
  v_success_count INTEGER := 0;
  v_employee_id UUID;
  v_new_manager_id UUID;
BEGIN
  IF NOT is_hr_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: only HR or admin roles may bulk-update reporting lines';
  END IF;

  IF jsonb_typeof(p_updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be a JSON array';
  END IF;

  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_employee_id := (v_update.value->>'employee_id')::UUID;
    v_new_manager_id := CASE
      WHEN v_update.value->>'new_manager_id' IS NULL OR v_update.value->>'new_manager_id' = ''
      THEN NULL
      ELSE (v_update.value->>'new_manager_id')::UUID
    END;

    IF v_new_manager_id IS NOT NULL THEN
      IF EXISTS (
        WITH RECURSIVE chain AS (
          SELECT reporting_to FROM profiles WHERE id = v_new_manager_id
          UNION ALL
          SELECT p.reporting_to FROM profiles p JOIN chain c ON p.id = c.reporting_to
        )
        SELECT 1 FROM chain WHERE reporting_to = v_employee_id LIMIT 1
      ) THEN
        RAISE EXCEPTION 'Cannot assign manager %: would create circular reporting chain for employee %',
          v_new_manager_id, v_employee_id;
      END IF;
    END IF;

    UPDATE profiles
    SET reporting_to = v_new_manager_id, updated_at = NOW()
    WHERE id = v_employee_id;

    v_success_count := v_success_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_success_count
  );
END;
$function$;
