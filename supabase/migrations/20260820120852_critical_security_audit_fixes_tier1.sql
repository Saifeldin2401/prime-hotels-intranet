-- Critical-tier fixes from a full-system security audit. Every item below was
-- independently re-verified against the live schema/policies before writing
-- this migration (not just taken from the audit report).

-- ============================================================================
-- 1. Secret disclosure: get_email_runtime_config leaks the Resend API key to
--    every authenticated user (verified live: a staff-role session could
--    retrieve the real key). Only edge functions (service_role) need this.
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_email_runtime_config() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_email_runtime_config() TO service_role;

-- ============================================================================
-- 2. profiles: USING(true) exposes national_id/iqama/DOB/salary_grade/
--    emergency contacts to every authenticated user. The employee directory
--    UI already goes through get_employee_directory/secure_search_users
--    (SECURITY DEFINER, unaffected by this), so tightening the raw table
--    does not break it. has_profile_access already correctly implements
--    self-or-authorized-viewer and is reused (not reinvented) here.
-- ============================================================================
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT
  USING (public.has_profile_access((SELECT auth.uid()), id));

-- profiles: any user could self-write account_status/locked_until/
-- suspended_*/force_password_reset/mfa_required/salary_grade/national_id/
-- iqama_*/staff_id via the self-update branch of consolidated_profiles_update
-- (has_profile_access returns true for self). Take these specific columns
-- away from the client entirely; every other self-editable field (avatar,
-- bio, phone, emergency contacts, language) is untouched.
REVOKE UPDATE (
  account_status, suspended_until, suspended_at, suspended_by, suspend_reason,
  locked_until, failed_login_attempts, force_password_reset, is_active,
  is_deleted, mfa_required, salary_grade, national_id, iqama_number,
  iqama_expiry, staff_id
) ON public.profiles FROM authenticated;

-- ============================================================================
-- 3. auth.role() = 'authenticated' is a tautology (true for every logged-in
--    user), used as an OR-branch ahead of the real scoping predicate on five
--    HR tables - verified live: a staff session could read another
--    employee's payslip. Delete the always-true branch, keep the real one.
-- ============================================================================
DROP POLICY IF EXISTS consolidated_payslips_select ON public.payslips;
CREATE POLICY consolidated_payslips_select ON public.payslips
  FOR SELECT USING (employee_id = (SELECT auth.uid()));

-- salary_components has no per-employee linkage at all (columns: id, name,
-- type, is_percentage, default_value) - it is a component-type definitions
-- table (e.g. "Housing Allowance"), not individual salary data. Still worth
-- scoping to HR/finance-ish roles rather than every employee, but this is
-- not the PII exposure the original finding assumed.
DROP POLICY IF EXISTS "Authenticated can view salary_components" ON public.salary_components;
CREATE POLICY "Authenticated can view salary_components" ON public.salary_components
  FOR SELECT USING (
    has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_manager','property_hr']::public.app_role[])
  );

DROP POLICY IF EXISTS consolidated_performance_reviews_select ON public.performance_reviews;
CREATE POLICY consolidated_performance_reviews_select ON public.performance_reviews
  FOR SELECT USING ((employee_id = (SELECT auth.uid())) OR (reviewer_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS consolidated_attendance_select ON public.attendance;
CREATE POLICY consolidated_attendance_select ON public.attendance
  FOR SELECT USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS consolidated_goals_select ON public.goals;
CREATE POLICY consolidated_goals_select ON public.goals
  FOR SELECT USING (employee_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. requests: consolidated_requests_update's USING has an unconditional
--    can_view_request(auth.uid(), id) OR-branch (returns true for the
--    requester with no status restriction), and WITH CHECK is the literal
--    tautology `requester_id = requester_id`. Verified live: this lets the
--    requester write requests.status directly, skipping request_apply_action
--    entirely - including its own-request and promotion-priority guards.
-- ============================================================================
DROP POLICY IF EXISTS consolidated_requests_update ON public.requests;
CREATE POLICY consolidated_requests_update ON public.requests
  FOR UPDATE
  USING (
    ((requester_id = (SELECT auth.uid())) AND (status = ANY (ARRAY['draft'::text, 'returned_for_correction'::text])))
    OR (current_assignee_id = (SELECT auth.uid()))
    OR is_hr((SELECT auth.uid()))
    OR is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    ((requester_id = (SELECT auth.uid())) AND (status = ANY (ARRAY['draft'::text, 'returned_for_correction'::text])))
    OR (current_assignee_id = (SELECT auth.uid()))
    OR is_hr((SELECT auth.uid()))
    OR is_admin((SELECT auth.uid()))
  );

-- ============================================================================
-- 5. request_steps: same defect - both INSERT and UPDATE policies have an
--    EXISTS(...can_view_request(auth.uid(), r.id)...) branch that passes for
--    the requester (can_view_request grants read access to your own
--    request), letting them forge their own approval-step history. Every
--    legitimate step-creation path (submit_expense_claim,
--    create_request_for_leave_request, submit_transfer_request, etc.) is
--    SECURITY DEFINER and bypasses RLS entirely, so removing client INSERT
--    does not affect them.
-- ============================================================================
DROP POLICY IF EXISTS consolidated_request_steps_update ON public.request_steps;
CREATE POLICY consolidated_request_steps_update ON public.request_steps
  FOR UPDATE
  USING (can_view_request(request_id) AND ((assignee_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid()))))
  WITH CHECK (can_view_request(request_id) AND ((assignee_id = (SELECT auth.uid())) OR is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));

DROP POLICY IF EXISTS consolidated_request_steps_insert ON public.request_steps;
CREATE POLICY consolidated_request_steps_insert ON public.request_steps
  FOR INSERT
  WITH CHECK (is_hr((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- ============================================================================
-- 6. employee_transfers / employee_promotions apply themselves instantly on
--    INSERT (auto_apply_transfer / auto_apply_promotion, AFTER INSERT, no
--    authorization or approval check at all), completely bypassing the
--    approval-gated path that already exists and is correctly guarded
--    (process_due_transfers/process_due_promotions, both require a linked
--    requests row with status='approved'). Chained with #4, this was a path
--    from a property_hr account to a self-approved super_admin promotion.
--    Dropping the auto-apply triggers leaves the approval-gated path as the
--    sole way either table's changes take effect.
-- ============================================================================
DROP TRIGGER IF EXISTS auto_apply_transfer ON public.employee_transfers;
DROP TRIGGER IF EXISTS auto_apply_promotion ON public.employee_promotions;

-- Defense in depth: even if requests.status is ever set to 'approved' by
-- some path other than request_apply_action (which already checks the
-- approver's role priority before allowing a promotion approval), re-verify
-- the actual approving actor's priority before granting the role.
CREATE OR REPLACE FUNCTION public.process_due_promotions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_promo record;
  v_count integer := 0;
  v_valid_role boolean;
  v_approver_id uuid;
begin
  for v_promo in
    select ep.*, r.id as request_id
    from public.employee_promotions ep
    join public.requests r
      on r.entity_id = ep.id and r.entity_type = 'promotion'
    where r.status = 'approved'
      and ep.applied_at is null
      and coalesce(ep.is_deleted, false) = false
      and ep.effective_date <= current_date
  loop
    v_valid_role := v_promo.to_role IS NOT NULL
                    AND v_promo.to_role = ANY (enum_range(NULL::public.app_role)::text[]);

    if v_valid_role then
      select actor_id into v_approver_id
        from public.request_events
       where request_id = v_promo.request_id and event_type = 'approved'
       order by created_at desc limit 1;

      if v_approver_id is null or public.get_role_priority(v_promo.to_role::public.app_role) <= public.get_user_role_priority(v_approver_id) then
        -- No legitimate approval on record with sufficient priority for this
        -- role grant - skip applying it rather than escalate silently.
        continue;
      end if;
    end if;

    if v_promo.to_title is not null and length(trim(v_promo.to_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(v_promo.to_title),
        coalesce((select d.name from public.departments d where d.id = v_promo.to_department_id), 'General'),
        case when v_valid_role then v_promo.to_role::public.app_role else 'staff'::public.app_role end,
        v_promo.to_department_id
      )
      on conflict (title) do nothing;
    end if;

    update public.profiles
    set job_title = coalesce(v_promo.to_title, job_title), updated_at = now()
    where id = v_promo.employee_id;

    if v_valid_role then
      delete from public.user_roles where user_id = v_promo.employee_id;
      insert into public.user_roles (user_id, role)
      values (v_promo.employee_id, v_promo.to_role::public.app_role)
      on conflict (user_id, role) do nothing;
    end if;

    if v_promo.to_department_id is not null then
      delete from public.user_departments where user_id = v_promo.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (v_promo.employee_id, v_promo.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;

    update public.employee_promotions
    set applied_at = now(), updated_at = now()
    where id = v_promo.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;
