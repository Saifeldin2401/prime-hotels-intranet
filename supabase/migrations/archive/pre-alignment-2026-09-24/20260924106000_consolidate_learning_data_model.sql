-- One representation per learning concept.
--
--   modules      training_modules (+ blocks in documents)   <- courses was a trigger-kept mirror
--   quizzes      learning_quizzes + unified_* questions      <- quizzes (empty), assessments (shadow rows)
--   assignments  training_assignment_rules                   <- learning_assignments (second model)
--   certificates certificates                                <- training_certificates (empty)
--
-- The parallel "learning domain" tables created during the pivot (course_modules,
-- lessons, learning_objectives, enrollments, assessment_questions) never received
-- data. Also fixed on the way:
--   * process_employee_transfer trusted a caller-supplied p_actor_id for its
--     authorization check, so any user could promote themselves (e.g. to
--     organization_owner) by passing an admin's id.
--   * new-hire auto-assignment copied every active rule of the org - including other
--     users' individual assignments - onto each new hire.
--   * learning_assignment_exemptions / _user_overrides were writable across tenants
--     (global is_hr_or_admin check, no organization scope).
--   * unified_question_attempts.session_id had no FK, so PostgREST could not embed
--     attempts under sessions (training history screens failed).

-- ---------------------------------------------------------------------------
-- 1. Assignments: learning_assignments -> training_assignment_rules
-- ---------------------------------------------------------------------------

-- Creates (or reuses) an individual assignment of a module to one learner.
CREATE OR REPLACE FUNCTION public._assign_module_to_user(
  p_org_id uuid, p_user_id uuid, p_module_id uuid, p_due_date timestamptz,
  p_is_mandatory boolean, p_assigned_by uuid, p_hotel_id uuid, p_department_id uuid, p_note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule_id uuid;
BEGIN
  SELECT r.id INTO v_rule_id
    FROM public.training_assignment_rules r
   WHERE r.organization_id = p_org_id
     AND r.target_type = 'user' AND r.target_id = p_user_id::text
     AND r.content_type = 'module' AND r.content_id = p_module_id
     AND r.is_active AND NOT COALESCE(r.is_deleted, false)
   LIMIT 1;
  IF v_rule_id IS NOT NULL THEN
    RETURN NULL;  -- already assigned
  END IF;

  INSERT INTO public.training_assignment_rules (
    organization_id, target_type, target_id, content_type, content_id, training_module_id,
    hotel_id, department_id, scope_type, due_date, is_mandatory, priority,
    assigned_by, created_by, is_active, status, instructions
  ) VALUES (
    p_org_id, 'user', p_user_id::text, 'module', p_module_id, p_module_id,
    p_hotel_id, p_department_id, 'individual', p_due_date, COALESCE(p_is_mandatory, false),
    CASE WHEN p_is_mandatory THEN 'high' ELSE 'normal' END,
    p_assigned_by, p_assigned_by, true, 'active', p_note
  ) RETURNING id INTO v_rule_id;

  INSERT INTO public.training_progress (user_id, training_id, lp_content_type, assignment_id, organization_id, status)
  VALUES (p_user_id, p_module_id, 'module', v_rule_id, p_org_id, 'not_started'::training_status)
  ON CONFLICT (user_id, training_id) DO UPDATE
    SET assignment_id = COALESCE(public.training_progress.assignment_id, EXCLUDED.assignment_id),
        updated_at = now();

  RETURN v_rule_id;
END;
$function$;

REVOKE ALL ON FUNCTION public._assign_module_to_user(uuid, uuid, uuid, timestamptz, boolean, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Carry the existing direct assignments over.
INSERT INTO public.training_assignment_rules (
  organization_id, target_type, target_id, content_type, content_id, training_module_id,
  hotel_id, department_id, scope_type, due_date, is_mandatory, priority,
  assigned_by, created_by, is_active, status, instructions, created_at
)
SELECT la.organization_id, 'user', la.user_id::text, 'module',
       COALESCE(la.training_module_id, la.course_id), COALESCE(la.training_module_id, la.course_id),
       la.hotel_id, la.department_id, 'individual', la.due_date, COALESCE(la.is_mandatory, false),
       CASE WHEN la.is_mandatory THEN 'high' ELSE 'normal' END,
       la.assigned_by, la.assigned_by,
       la.status NOT IN ('cancelled', 'waived', 'excused'),
       CASE WHEN la.status IN ('cancelled', 'waived', 'excused') THEN la.status ELSE 'active' END,
       la.notes, la.created_at
  FROM public.learning_assignments la
 WHERE COALESCE(la.training_module_id, la.course_id) IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.training_modules m WHERE m.id = COALESCE(la.training_module_id, la.course_id))
   AND NOT EXISTS (
     SELECT 1 FROM public.training_assignment_rules r
      WHERE r.target_type = 'user' AND r.target_id = la.user_id::text
        AND r.content_id = COALESCE(la.training_module_id, la.course_id)
        AND NOT COALESCE(r.is_deleted, false));

-- Standing (audience) rules apply to people who join later; individual
-- assignments and recipient snapshots do not.
CREATE OR REPLACE FUNCTION public._is_standing_assignment_rule(p_target_type text, p_target_user_ids uuid[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT COALESCE(p_target_type, '') NOT IN ('user', 'individual')
     AND (p_target_user_ids IS NULL OR cardinality(p_target_user_ids) = 0);
$function$;

CREATE OR REPLACE FUNCTION public._auto_assign_new_hire_impl(new organization_memberships)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule record;
  v_path record;
  v_path_module record;
  v_module_id uuid;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN RETURN; END IF;

  FOR v_rule IN
    SELECT tar.training_module_id, tar.content_id, tar.is_mandatory, COALESCE(tar.due_in_days, 14) AS due_in_days
      FROM public.training_assignment_rules tar
     WHERE tar.is_active AND NOT COALESCE(tar.is_deleted, false)
       AND tar.organization_id = NEW.organization_id
       AND public._is_standing_assignment_rule(tar.target_type, tar.target_user_ids)
       AND (tar.hotel_id IS NULL OR tar.hotel_id = NEW.hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = NEW.hotel_id))
       AND (tar.department_id IS NULL OR tar.department_id = NEW.department_id OR (tar.scope_type = 'department' AND tar.scope_id = NEW.department_id))
       AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = NEW.role::text)
  LOOP
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    IF v_module_id IS NOT NULL THEN
      PERFORM public._assign_module_to_user(
        NEW.organization_id, NEW.user_id, v_module_id, now() + make_interval(days => v_rule.due_in_days),
        v_rule.is_mandatory, NEW.invited_by, NEW.hotel_id, NEW.department_id,
        'Auto-assigned upon new hire onboarding');
    END IF;
  END LOOP;

  FOR v_path IN
    SELECT tp.id AS path_id, tp.is_mandatory
      FROM public.training_paths tp
     WHERE tp.is_active = true
       AND tp.organization_id = NEW.organization_id
       AND (tp.target_property_id IS NULL OR tp.target_property_id = NEW.hotel_id)
       AND (tp.target_department_id IS NULL OR tp.target_department_id = NEW.department_id)
       AND (tp.target_role IS NULL OR tp.target_role::text = NEW.role::text)
  LOOP
    INSERT INTO public.user_path_enrollments (user_id, path_id, status, enrolled_at, created_at, updated_at)
    VALUES (NEW.user_id, v_path.path_id, 'enrolled', now(), now(), now())
    ON CONFLICT (user_id, path_id) DO NOTHING;

    FOR v_path_module IN SELECT tpm.module_id FROM public.training_path_modules tpm WHERE tpm.path_id = v_path.path_id
    LOOP
      IF v_path_module.module_id IS NOT NULL THEN
        PERFORM public._assign_module_to_user(
          NEW.organization_id, NEW.user_id, v_path_module.module_id, now() + interval '14 days',
          v_path.is_mandatory, NEW.invited_by, NEW.hotel_id, NEW.department_id,
          'Auto-assigned via onboarding path');
      END IF;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_employee_transfer(p_user_id uuid, p_target_hotel_id uuid, p_target_dept_id uuid, p_target_role text, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Authority always comes from the session; p_actor_id is honoured only for
  -- trusted server-side (service_role) callers acting on someone's behalf.
  v_caller_id uuid := CASE WHEN COALESCE(auth.role(), '') = 'service_role'
                           THEN COALESCE(p_actor_id, auth.uid()) ELSE auth.uid() END;
  v_is_platform boolean;
  v_org_id uuid;
  v_old_hotel_id uuid;
  v_old_dept_id uuid;
  v_old_role text;
  v_target_role_enum public.membership_role;
  v_waived_count integer := 0;
  v_assigned_count integer := 0;
  v_rule record;
  v_module_id uuid;
BEGIN
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id, hotel_id, department_id, role::text
    INTO v_org_id, v_old_hotel_id, v_old_dept_id, v_old_role
    FROM public.organization_memberships
   WHERE user_id = p_user_id AND is_active = true
   ORDER BY is_primary DESC, created_at ASC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Active organization membership not found for user %', p_user_id;
  END IF;

  v_is_platform := COALESCE(auth.role(), '') = 'service_role' OR public.is_platform_super_admin();

  IF NOT v_is_platform AND NOT public.is_tenant_people_admin(v_org_id) THEN
    RAISE EXCEPTION 'Access denied: not authorized to transfer employees in this organization' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_target_role_enum := p_target_role::public.membership_role;
  EXCEPTION WHEN OTHERS THEN
    v_target_role_enum := 'learner'::public.membership_role;
  END;

  -- Tenant people-admins cannot mint owners, and only tenant admins grant admin.
  IF NOT v_is_platform THEN
    IF v_target_role_enum = 'organization_owner' AND v_old_role IS DISTINCT FROM 'organization_owner' THEN
      RAISE EXCEPTION 'Only the platform can transfer organization ownership' USING ERRCODE = '42501';
    END IF;
    IF v_target_role_enum IN ('organization_admin', 'brand_admin') AND NOT public.is_tenant_admin(v_org_id) THEN
      RAISE EXCEPTION 'Only organization admins can grant admin roles' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = v_caller_id AND v_target_role_enum::text IS DISTINCT FROM v_old_role THEN
      RAISE EXCEPTION 'You cannot change your own role' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.employee_transfer_logs (
    user_id, organization_id,
    previous_hotel_id, new_hotel_id, from_hotel_id, to_hotel_id,
    previous_department_id, new_department_id, from_department_id, to_department_id,
    previous_role, new_role, from_role, to_role,
    notes, reason, transferred_by, transfer_effective_date, created_at
  ) VALUES (
    p_user_id, v_org_id,
    v_old_hotel_id, p_target_hotel_id, v_old_hotel_id, p_target_hotel_id,
    v_old_dept_id, p_target_dept_id, v_old_dept_id, p_target_dept_id,
    v_old_role, v_target_role_enum::text, v_old_role, v_target_role_enum::text,
    p_reason, p_reason, v_caller_id, CURRENT_DATE, now()
  );

  UPDATE public.organization_memberships
     SET hotel_id = p_target_hotel_id,
         department_id = p_target_dept_id,
         role = v_target_role_enum,
         updated_at = now()
   WHERE user_id = p_user_id AND organization_id = v_org_id;

  UPDATE public.profiles SET updated_at = now() WHERE id = p_user_id;

  -- Waive optional, hotel-specific individual assignments from the old hotel.
  WITH waived_rows AS (
    UPDATE public.training_assignment_rules r
       SET is_active = false,
           status = 'waived',
           instructions = COALESCE(r.instructions || ' | ', '') || 'Waived due to transfer to new hotel'
     WHERE r.organization_id = v_org_id
       AND r.target_type = 'user' AND r.target_id = p_user_id::text
       AND r.is_active AND NOT COALESCE(r.is_deleted, false)
       AND r.is_mandatory IS NOT TRUE
       AND r.hotel_id IS NOT NULL
       AND r.hotel_id IS DISTINCT FROM p_target_hotel_id
    RETURNING r.id
  )
  SELECT count(*) INTO v_waived_count FROM waived_rows;

  UPDATE public.training_progress tp
     SET status = 'cancelled'::training_status,
         updated_at = now()
    FROM public.training_modules tm
   WHERE tp.training_id = tm.id
     AND tp.user_id = p_user_id
     AND tp.status IN ('not_started', 'in_progress')
     AND tm.property_id IS NOT NULL
     AND tm.property_id = v_old_hotel_id
     AND tm.property_id IS DISTINCT FROM p_target_hotel_id;

  -- Standing rules for the new hotel / department / role.
  FOR v_rule IN
    SELECT tar.training_module_id, tar.content_id, tar.is_mandatory, COALESCE(tar.due_in_days, 14) AS due_in_days
      FROM public.training_assignment_rules tar
     WHERE tar.is_active AND NOT COALESCE(tar.is_deleted, false)
       AND tar.organization_id = v_org_id
       AND public._is_standing_assignment_rule(tar.target_type, tar.target_user_ids)
       AND (tar.hotel_id IS NULL OR tar.hotel_id = p_target_hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = p_target_hotel_id))
       AND (tar.department_id IS NULL OR tar.department_id = p_target_dept_id OR (tar.scope_type = 'department' AND tar.scope_id = p_target_dept_id))
       AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = v_target_role_enum::text)
  LOOP
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    IF v_module_id IS NOT NULL
       AND public._assign_module_to_user(
             v_org_id, p_user_id, v_module_id, now() + make_interval(days => v_rule.due_in_days),
             v_rule.is_mandatory, v_caller_id, p_target_hotel_id, p_target_dept_id,
             'Assigned via transfer delta evaluation') IS NOT NULL THEN
      v_assigned_count := v_assigned_count + 1;
    END IF;
  END LOOP;

  UPDATE public.employee_transfer_logs
     SET waived_obsolete_courses_count = v_waived_count,
         assigned_delta_courses_count = v_assigned_count
   WHERE user_id = p_user_id
     AND organization_id = v_org_id
     AND transfer_effective_date = CURRENT_DATE
     AND (to_hotel_id = p_target_hotel_id OR new_hotel_id = p_target_hotel_id);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'from_hotel_id', v_old_hotel_id,
    'to_hotel_id', p_target_hotel_id,
    'waived_count', v_waived_count,
    'assigned_count', v_assigned_count
  );
END;
$function$;

-- Resolve every rule shape the app writes (scoped snapshot, audience, individual).
CREATE OR REPLACE FUNCTION public._module_assignment_targets(p_org_ids uuid[])
RETURNS TABLE(user_id uuid, training_id uuid, due_date timestamptz, organization_id uuid, rule_created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH rules AS (
    SELECT r.target_type, r.target_id, r.target_user_ids, r.target_role,
           r.hotel_id, r.department_id, r.brand_id,
           COALESCE(r.training_module_id, r.content_id) AS content_id,
           r.due_date, r.organization_id, r.created_at
      FROM public.training_assignment_rules r
     WHERE r.is_active AND NOT COALESCE(r.is_deleted, false)
       AND r.content_type = 'module'
       AND r.organization_id = ANY (p_org_ids)
  )
  SELECT m.user_id, r.content_id, r.due_date, r.organization_id, r.created_at
    FROM rules r
    JOIN public.organization_memberships m ON m.organization_id = r.organization_id AND m.is_active
    LEFT JOIN public.hotels h ON h.id = m.hotel_id
   WHERE CASE
     WHEN r.target_user_ids IS NOT NULL AND cardinality(r.target_user_ids) > 0
       THEN m.user_id = ANY (r.target_user_ids)
     WHEN r.target_type IN ('user', 'individual')
       THEN m.user_id = public._safe_uuid(r.target_id)
     WHEN r.target_type IN ('everyone', 'organization')
       THEN (r.target_role IS NULL OR r.target_role = 'all' OR m.role::text = r.target_role)
     WHEN r.target_type = 'brand'
       THEN (m.brand_id = COALESCE(r.brand_id, public._safe_uuid(r.target_id)) OR h.brand_id = COALESCE(r.brand_id, public._safe_uuid(r.target_id)))
     WHEN r.target_type IN ('property', 'hotel')
       THEN m.hotel_id = COALESCE(r.hotel_id, public._safe_uuid(r.target_id))
     WHEN r.target_type = 'department'
       THEN m.department_id = COALESCE(r.department_id, public._safe_uuid(r.target_id))
     WHEN r.target_type = 'role'
       THEN m.role::text = r.target_id
     ELSE false
   END;
$function$;

REVOKE ALL ON FUNCTION public._module_assignment_targets(uuid[]) FROM PUBLIC, anon, authenticated;

-- Exemptions / overrides: tenant-scoped management.
DROP POLICY IF EXISTS learning_assignment_exemptions_manage_delete ON public.learning_assignment_exemptions;
DROP POLICY IF EXISTS learning_assignment_exemptions_manage_insert ON public.learning_assignment_exemptions;
DROP POLICY IF EXISTS learning_assignment_exemptions_manage_update ON public.learning_assignment_exemptions;
DROP POLICY IF EXISTS learning_assignment_exemptions_select_policy ON public.learning_assignment_exemptions;
DROP POLICY IF EXISTS learning_assignment_user_overrides_manage_delete ON public.learning_assignment_user_overrides;
DROP POLICY IF EXISTS learning_assignment_user_overrides_manage_insert ON public.learning_assignment_user_overrides;
DROP POLICY IF EXISTS learning_assignment_user_overrides_manage_update ON public.learning_assignment_user_overrides;
DROP POLICY IF EXISTS learning_assignment_user_overrides_select_policy ON public.learning_assignment_user_overrides;

CREATE POLICY learning_assignment_exemptions_select_policy ON public.learning_assignment_exemptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_exemptions_manage_insert ON public.learning_assignment_exemptions
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_exemptions_manage_update ON public.learning_assignment_exemptions
  FOR UPDATE TO authenticated
  USING (public.can_manage_learning_assignment(organization_id, NULL))
  WITH CHECK (public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_exemptions_manage_delete ON public.learning_assignment_exemptions
  FOR DELETE TO authenticated USING (public.can_manage_learning_assignment(organization_id, NULL));

CREATE POLICY learning_assignment_user_overrides_select_policy ON public.learning_assignment_user_overrides
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_user_overrides_manage_insert ON public.learning_assignment_user_overrides
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_user_overrides_manage_update ON public.learning_assignment_user_overrides
  FOR UPDATE TO authenticated
  USING (public.can_manage_learning_assignment(organization_id, NULL))
  WITH CHECK (public.can_manage_learning_assignment(organization_id, NULL));
CREATE POLICY learning_assignment_user_overrides_manage_delete ON public.learning_assignment_user_overrides
  FOR DELETE TO authenticated USING (public.can_manage_learning_assignment(organization_id, NULL));

-- ---------------------------------------------------------------------------
-- 2. Modules: courses -> training_modules
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_competencies DROP CONSTRAINT IF EXISTS course_competencies_course_id_fkey;
ALTER TABLE public.course_competencies
  ADD CONSTRAINT course_competencies_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_modules(id) ON DELETE CASCADE;
ALTER TABLE public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_course_id_fkey;
ALTER TABLE public.training_sessions
  ADD CONSTRAINT training_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_modules(id) ON DELETE SET NULL;
ALTER TABLE public.practical_assessments DROP CONSTRAINT IF EXISTS practical_assessments_course_id_fkey;
ALTER TABLE public.practical_assessments
  ADD CONSTRAINT practical_assessments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_modules(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.course_competencies.course_id IS 'training_modules.id';
COMMENT ON COLUMN public.training_sessions.course_id IS 'training_modules.id';
COMMENT ON COLUMN public.practical_assessments.course_id IS 'training_modules.id';

DROP POLICY IF EXISTS course_competencies_sel ON public.course_competencies;
DROP POLICY IF EXISTS course_competencies_write_delete ON public.course_competencies;
DROP POLICY IF EXISTS course_competencies_write_insert ON public.course_competencies;
DROP POLICY IF EXISTS course_competencies_write_update ON public.course_competencies;
CREATE POLICY course_competencies_sel ON public.course_competencies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_modules m
                  WHERE m.id = course_competencies.course_id AND public.org_visible(m.organization_id)));
CREATE POLICY course_competencies_write_insert ON public.course_competencies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_modules m
                       WHERE m.id = course_competencies.course_id AND public.org_visible(m.organization_id)
                         AND public.is_tenant_content_editor(m.organization_id)));
CREATE POLICY course_competencies_write_update ON public.course_competencies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_modules m
                  WHERE m.id = course_competencies.course_id AND public.org_visible(m.organization_id)
                    AND public.is_tenant_content_editor(m.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_modules m
                       WHERE m.id = course_competencies.course_id AND public.org_visible(m.organization_id)
                         AND public.is_tenant_content_editor(m.organization_id)));
CREATE POLICY course_competencies_write_delete ON public.course_competencies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_modules m
                  WHERE m.id = course_competencies.course_id AND public.org_visible(m.organization_id)
                    AND public.is_tenant_content_editor(m.organization_id)));

DROP TRIGGER IF EXISTS trg_sync_training_module_to_course ON public.training_modules;
DROP FUNCTION IF EXISTS public.sync_training_module_to_course();

CREATE OR REPLACE FUNCTION public.create_scoped_training_assignment(p_course_id uuid, p_scope_type text, p_organization_id uuid, p_brand_id uuid DEFAULT NULL::uuid, p_hotel_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_target_role text DEFAULT NULL::text, p_target_user_ids uuid[] DEFAULT NULL::uuid[], p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_priority text DEFAULT 'normal'::text, p_instructions text DEFAULT NULL::text, p_requires_acknowledgement boolean DEFAULT false, p_notify_on_due boolean DEFAULT true, p_reminder_days_before integer[] DEFAULT '{7,3,1}'::integer[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scopes jsonb; v_can_org boolean;
  v_auth_hotels uuid[]; v_auth_depts uuid[]; v_auth_brands uuid[];
  v_rule_id uuid; v_eligible_users uuid[] := '{}'; v_user_id uuid;
  v_course_title text;
  v_module_org uuid;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required to assign training.'; END IF;

  SELECT title, organization_id INTO v_course_title, v_module_org
    FROM public.training_modules WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  IF v_course_title IS NULL THEN RAISE EXCEPTION 'Selected training module does not exist or has been deleted.'; END IF;
  IF v_module_org IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Training module belongs to a different organization; deploy it to this organization first.';
  END IF;

  v_scopes := public.get_caller_assignment_scopes(p_organization_id);
  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF v_scopes->'authorized_hotel_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_hotel_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_hotel_ids')::uuid) INTO v_auth_hotels; END IF;
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts; END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands; END IF;
    IF NOT ((v_scopes->>'can_assign_role')::boolean IS TRUE) THEN
      RAISE EXCEPTION 'Access denied: you cannot assign training in this organization.';
    ELSIF p_scope_type = 'organization' THEN RAISE EXCEPTION 'Access denied: You do not have organization-wide assignment authority.';
    ELSIF p_scope_type = 'brand' AND (v_auth_brands IS NULL OR NOT (p_brand_id = ANY(v_auth_brands))) THEN RAISE EXCEPTION 'Access denied: not authorized for this brand.';
    ELSIF p_scope_type = 'hotel' AND (v_auth_hotels IS NULL OR NOT (p_hotel_id = ANY(v_auth_hotels))) THEN RAISE EXCEPTION 'Access denied: not authorized for this hotel.';
    ELSIF p_scope_type = 'department' AND (v_auth_depts IS NULL OR NOT (p_department_id = ANY(v_auth_depts))) THEN RAISE EXCEPTION 'Access denied: not authorized for this department.';
    END IF;
  END IF;

  IF p_scope_type = 'individual' AND p_target_user_ids IS NOT NULL THEN
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true AND om.user_id = ANY(p_target_user_ids)
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))) INTO v_eligible_users;
  ELSE
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      LEFT JOIN public.hotels h ON h.id = om.hotel_id
      WHERE om.organization_id = p_organization_id AND om.is_active = true
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
        AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands) OR h.brand_id = ANY(v_auth_brands))
        AND (p_brand_id IS NULL OR om.brand_id = p_brand_id OR h.brand_id = p_brand_id)
        AND (p_hotel_id IS NULL OR om.hotel_id = p_hotel_id)
        AND (p_department_id IS NULL OR om.department_id = p_department_id)
        AND (p_target_role IS NULL OR p_target_role = 'all' OR om.role::text = p_target_role)) INTO v_eligible_users;
  END IF;

  IF array_length(v_eligible_users, 1) IS NULL OR array_length(v_eligible_users, 1) = 0 THEN
    RAISE EXCEPTION 'No eligible active learners found in the selected assignment scope.';
  END IF;

  INSERT INTO public.training_assignment_rules (
    training_module_id, content_id, content_type, organization_id, brand_id, hotel_id, department_id,
    target_role, target_type, target_id, scope_type, scope_id, target_user_ids, recipient_count,
    due_date, priority, instructions, requires_acknowledgement, notify_on_due, reminder_days_before,
    assigned_by, created_by, is_active, status
  ) VALUES (
    p_course_id, p_course_id, 'module', p_organization_id, p_brand_id, p_hotel_id, p_department_id,
    p_target_role, p_scope_type,
    COALESCE(p_hotel_id::text, p_department_id::text, p_brand_id::text, p_organization_id::text),
    p_scope_type, COALESCE(p_hotel_id, p_department_id, p_brand_id, p_organization_id),
    v_eligible_users, array_length(v_eligible_users, 1), p_due_date, p_priority, p_instructions,
    p_requires_acknowledgement, p_notify_on_due, p_reminder_days_before, v_caller_id, v_caller_id, true, 'active'
  ) RETURNING id INTO v_rule_id;

  FOREACH v_user_id IN ARRAY v_eligible_users LOOP
    INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, lp_content_type, status, created_at, updated_at)
    VALUES (v_user_id, p_course_id, v_rule_id, p_organization_id, 'module', 'not_started'::training_status, now(), now())
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, organization_id = EXCLUDED.organization_id, updated_at = now();

    INSERT INTO public.notifications (user_id, organization_id, title, message, type, link, created_at)
    VALUES (v_user_id, p_organization_id, 'New Training Assigned: ' || v_course_title,
      COALESCE(p_instructions, 'You have been assigned to complete "' || v_course_title || '".'),
      'training_assigned', '/training/player/' || p_course_id, now());
  END LOOP;

  IF (v_scopes->>'is_platform_admin')::boolean IS TRUE THEN
    INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, target_organization_id, metadata)
    VALUES (v_caller_id, 'create_training_assignment', 'training_assignment_rules', v_rule_id, p_organization_id,
      jsonb_build_object('course_id', p_course_id, 'course_title', v_course_title, 'scope_type', p_scope_type,
                         'recipient_count', array_length(v_eligible_users, 1), 'due_date', p_due_date));
  END IF;

  RETURN jsonb_build_object('success', true, 'rule_id', v_rule_id, 'course_id', p_course_id,
                            'recipient_count', array_length(v_eligible_users, 1), 'scope_type', p_scope_type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.export_organization_archive(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (public.is_platform_operator() OR public.is_tenant_admin(p_org_id)) THEN
    RAISE EXCEPTION 'Access Denied: Tenant admin privileges required to export organization archive.'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'organization', (SELECT row_to_json(o) FROM public.organizations o WHERE o.id = p_org_id),
    'hotels', (SELECT jsonb_agg(row_to_json(h)) FROM public.hotels h WHERE h.organization_id = p_org_id AND h.is_deleted = false),
    'departments', (SELECT jsonb_agg(row_to_json(d)) FROM public.departments d WHERE d.organization_id = p_org_id AND d.is_active = true),
    'memberships', (SELECT jsonb_agg(row_to_json(om)) FROM public.organization_memberships om WHERE om.organization_id = p_org_id AND om.is_active = true),
    'training_modules', (SELECT jsonb_agg(row_to_json(m)) FROM public.training_modules m WHERE m.organization_id = p_org_id AND m.is_deleted = false),
    'quizzes', (SELECT jsonb_agg(row_to_json(q)) FROM public.learning_quizzes q WHERE q.organization_id = p_org_id AND NOT COALESCE(q.is_deleted, false)),
    'assignments', (SELECT jsonb_agg(row_to_json(r)) FROM public.training_assignment_rules r WHERE r.organization_id = p_org_id AND NOT COALESCE(r.is_deleted, false)),
    'training_progress', (SELECT jsonb_agg(row_to_json(tp)) FROM public.training_progress tp WHERE tp.organization_id = p_org_id AND tp.is_deleted = false),
    'completion_history', (SELECT jsonb_agg(row_to_json(h)) FROM public.training_completion_history h WHERE h.organization_id = p_org_id),
    'certificates', (SELECT jsonb_agg(row_to_json(cert)) FROM public.certificates cert WHERE cert.organization_id = p_org_id),
    'documents', (SELECT jsonb_agg(row_to_json(doc)) FROM public.documents doc WHERE doc.organization_id = p_org_id AND doc.status = 'PUBLISHED')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_organization_profile(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT (public.org_visible(p_org_id) OR public.is_platform_operator()) THEN
    RAISE EXCEPTION 'Not authorized for this organization' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'organization', (SELECT to_jsonb(o) FROM public.organizations o WHERE o.id = p_org_id),
    'entitlements', public.effective_entitlements(p_org_id),
    'counts', jsonb_build_object(
      'brands', (SELECT count(*) FROM public.brands WHERE organization_id = p_org_id AND is_deleted = false),
      'hotels', (SELECT count(*) FROM public.hotels WHERE organization_id = p_org_id AND is_deleted = false),
      'departments', (SELECT count(*) FROM public.departments WHERE organization_id = p_org_id AND is_active = true),
      'members', (SELECT count(*) FROM public.organization_memberships WHERE organization_id = p_org_id AND is_active = true),
      'courses', (SELECT count(*) FROM public.training_modules WHERE organization_id = p_org_id AND is_deleted = false),
      'documents', (SELECT count(*) FROM public.documents WHERE organization_id = p_org_id AND is_deleted = false)
    ),
    'primary_contacts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', om.user_id, 'name', p.full_name, 'email', p.email, 'role', om.role::text)), '[]'::jsonb)
        FROM public.organization_memberships om JOIN public.profiles p ON p.id = om.user_id
       WHERE om.organization_id = p_org_id AND om.is_active = true AND om.role IN ('organization_owner', 'organization_admin')
    ),
    'lifecycle_history', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('action', action, 'metadata', metadata, 'at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
        FROM public.platform_audit_logs WHERE target_organization_id = p_org_id AND action = 'set_organization_status'
    )
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_platform_usage_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.read')) THEN
    RAISE EXCEPTION 'Platform operators only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'totals', jsonb_build_object(
      'organizations',   (SELECT count(*) FROM public.organizations WHERE is_deleted = false),
      'hotels',          (SELECT count(*) FROM public.hotels WHERE is_deleted = false),
      'members',         (SELECT count(*) FROM public.organization_memberships WHERE is_active = true),
      'courses',         (SELECT count(*) FROM public.training_modules WHERE is_deleted = false),
      'documents',       (SELECT count(*) FROM public.documents WHERE is_deleted = false),
      'ai_jobs_total',   (SELECT count(*) FROM public.course_generation_jobs),
      'ai_jobs_failed',  (SELECT count(*) FROM public.course_generation_jobs WHERE status IN ('failed', 'error')),
      'deployments',     (SELECT count(*) FROM public.master_content_deployments),
      'training_records',(SELECT count(*) FROM public.training_progress WHERE is_deleted = false),
      'training_completed',(SELECT count(*) FROM public.training_progress WHERE is_deleted = false AND (status = 'completed' OR passed = true))
    ),
    'ai_credits', jsonb_build_object(
      'used',  COALESCE((SELECT sum(ai_credits_used_this_month) FROM public.organizations WHERE is_deleted = false), 0),
      'limit', COALESCE((SELECT sum(max_ai_credits_monthly)    FROM public.organizations WHERE is_deleted = false), 0)
    ),
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'lifecycle_status', o.lifecycle_status,
        'plan', (SELECT sp.name FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
                 WHERE s.organization_id = o.id AND s.status = 'active'
                 ORDER BY s.current_period_end DESC NULLS LAST LIMIT 1),
        'hotels', (SELECT count(*) FROM public.hotels h WHERE h.organization_id = o.id AND h.is_deleted = false),
        'members', (SELECT count(*) FROM public.organization_memberships om WHERE om.organization_id = o.id AND om.is_active = true),
        'courses', (SELECT count(*) FROM public.training_modules m WHERE m.organization_id = o.id AND m.is_deleted = false),
        'documents', (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.is_deleted = false),
        'ai_credits_used', o.ai_credits_used_this_month,
        'ai_credits_limit', o.max_ai_credits_monthly,
        'max_hotels', o.max_hotels,
        'max_learners', o.max_learners,
        'training_completion_pct', (
          SELECT CASE WHEN count(*) = 0 THEN NULL
                 ELSE round(100.0 * count(*) FILTER (WHERE tp.status = 'completed' OR tp.passed = true) / count(*), 1) END
            FROM public.training_progress tp
           WHERE tp.organization_id = o.id AND tp.is_deleted = false
        )
      ) ORDER BY o.name)
      FROM public.organizations o WHERE o.is_deleted = false
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_skill_gaps(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  IF p_user_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_memberships me
         JOIN public.organization_memberships them ON them.organization_id = me.organization_id
        WHERE me.user_id = auth.uid() AND them.user_id = p_user_id AND me.is_active
          AND public.is_tenant_content_editor(me.organization_id))
     AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Not authorized to view this learner''s skill profile' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_agg(g ORDER BY (g->>'gap')::int DESC) INTO v FROM (
    SELECT jsonb_build_object(
      'competency_id', c.id, 'competency', c.name, 'category', c.category,
      'organization_id', c.organization_id,
      'required_level', r.required_level,
      'current_level', COALESCE(uc.current_level, 0),
      'gap', GREATEST(r.required_level - COALESCE(uc.current_level, 0), 0),
      'is_mandatory', r.is_mandatory,
      'recommended_courses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('course_id', tm.id, 'title', tm.title, 'target_level', cc.target_level)), '[]'::jsonb)
          FROM public.course_competencies cc
          JOIN public.training_modules tm ON tm.id = cc.course_id AND tm.is_deleted = false
         WHERE cc.competency_id = c.id AND tm.organization_id = m.organization_id
      )
    ) AS g
      FROM public.organization_memberships m
      JOIN public.role_competency_requirements r
        ON r.organization_id = m.organization_id
       AND r.membership_role = m.role::text
       AND (r.department_id IS NULL OR r.department_id = m.department_id)
      JOIN public.competencies c ON c.id = r.competency_id AND c.is_active
      LEFT JOIN public.user_competencies uc ON uc.competency_id = c.id AND uc.user_id = p_user_id
     WHERE m.user_id = p_user_id AND m.is_active = true
  ) sub;

  RETURN COALESCE(v, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_master_content_adoption(p_master_id uuid, p_content_type text DEFAULT 'course'::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.read')) THEN
    RAISE EXCEPTION 'Permission denied: platform operator with tenant.read required'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.organization_name), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      d.target_organization_id AS organization_id,
      o.name AS organization_name,
      o.lifecycle_status,
      d.target_content_id AS deployed_content_id,
      d.deployed_at,
      d.has_update_available,
      (SELECT count(*) FROM public.training_assignment_rules ar
         WHERE ar.training_module_id = d.target_content_id AND ar.is_active = true) AS assignment_rules,
      (SELECT count(*) FROM public.training_progress tp
         WHERE tp.training_id = d.target_content_id) AS learners,
      (SELECT count(*) FROM public.training_progress tp
         WHERE tp.training_id = d.target_content_id AND tp.status = 'in_progress') AS in_progress,
      (SELECT count(*) FROM public.training_progress tp
         WHERE tp.training_id = d.target_content_id AND tp.status = 'completed') AS completed,
      (SELECT round(avg(tp.score_percentage)::numeric, 1) FROM public.training_progress tp
         WHERE tp.training_id = d.target_content_id AND tp.status = 'completed'
           AND tp.score_percentage IS NOT NULL) AS avg_score,
      (SELECT count(*) FROM public.certificates c
         WHERE c.training_module_id = d.target_content_id AND c.certificate_type = 'training') AS certificates_issued
    FROM public.master_content_deployments d
    JOIN public.organizations o ON o.id = d.target_organization_id
    WHERE d.master_content_id = p_master_id AND d.content_type = p_content_type
  ) r;

  RETURN jsonb_build_object('master_id', p_master_id, 'tenants', v_rows);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Quizzes: learning_quizzes is the only quiz table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_global_search(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orgs jsonb;
  v_hotels jsonb;
  v_depts jsonb;
  v_users jsonb;
  v_master_sops jsonb;
  v_master_courses jsonb;
  v_tenant_sops jsonb;
  v_tenant_courses jsonb;
  v_assessments jsonb;
  v_question_banks jsonb;
BEGIN
  IF NOT (public.is_platform_operator(auth.uid()) OR public.is_platform_user(auth.uid())) THEN
    RAISE EXCEPTION 'Access Denied: Platform global search requires platform operator privileges.';
  END IF;

  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    RETURN jsonb_build_object(
      'organizations', '[]'::jsonb, 'hotels', '[]'::jsonb, 'departments', '[]'::jsonb, 'users', '[]'::jsonb,
      'master_sops', '[]'::jsonb, 'master_courses', '[]'::jsonb, 'tenant_sops', '[]'::jsonb,
      'tenant_courses', '[]'::jsonb, 'assessments', '[]'::jsonb, 'question_banks', '[]'::jsonb);
  END IF;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', o.id, 'name', o.name, 'slug', o.slug, 'lifecycle_status', o.lifecycle_status, 'is_active', o.is_active,
    'hotel_count', (SELECT COUNT(*) FROM public.hotels h WHERE h.organization_id = o.id AND h.is_deleted = false)
  )), '[]'::jsonb) INTO v_orgs
  FROM (SELECT * FROM public.organizations o
         WHERE (o.name ILIKE '%' || p_query || '%' OR o.slug ILIKE '%' || p_query || '%') AND o.is_deleted = false
         LIMIT 10) o;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', h.id, 'name', h.name, 'city', h.city, 'organization_id', h.organization_id,
    'organization_name', o.name, 'brand_id', h.brand_id, 'brand_name', b.name
  )), '[]'::jsonb) INTO v_hotels
  FROM (SELECT * FROM public.hotels h
         WHERE (h.name ILIKE '%' || p_query || '%' OR h.city ILIKE '%' || p_query || '%') AND h.is_deleted = false
         LIMIT 10) h
  JOIN public.organizations o ON o.id = h.organization_id
  LEFT JOIN public.brands b ON b.id = h.brand_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', d.id, 'name', d.name, 'hotel_id', d.hotel_id, 'hotel_name', h.name,
    'organization_id', d.organization_id, 'organization_name', o.name
  )), '[]'::jsonb) INTO v_depts
  FROM (SELECT * FROM public.departments d WHERE d.name ILIKE '%' || p_query || '%' AND d.is_deleted = false LIMIT 10) d
  JOIN public.organizations o ON o.id = d.organization_id
  LEFT JOIN public.hotels h ON h.id = d.hotel_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', p.id, 'full_name', p.full_name, 'email', p.email, 'role', p.role,
    'organization_id', om.organization_id, 'organization_name', o.name,
    'hotel_id', om.hotel_id, 'hotel_name', h.name,
    'department_id', om.department_id, 'department_name', dep.name
  )), '[]'::jsonb) INTO v_users
  FROM (SELECT * FROM public.profiles p
         WHERE (p.full_name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%')
         LIMIT 10) p
  LEFT JOIN LATERAL (
    SELECT om1.organization_id, om1.hotel_id, om1.department_id
      FROM public.organization_memberships om1
     WHERE om1.user_id = p.id AND om1.is_deleted = false
     ORDER BY om1.created_at ASC
     LIMIT 1
  ) om ON true
  LEFT JOIN public.organizations o ON o.id = om.organization_id
  LEFT JOIN public.hotels h ON h.id = om.hotel_id
  LEFT JOIN public.departments dep ON dep.id = om.department_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', doc.id, 'title', doc.title, 'document_number', doc.document_number,
    'category', doc.category, 'version', doc.current_version
  )), '[]'::jsonb) INTO v_master_sops
  FROM (SELECT * FROM public.documents doc
         WHERE doc.is_master_template = true AND doc.is_deleted = false
           AND (doc.title ILIKE '%' || p_query || '%' OR doc.description ILIKE '%' || p_query || '%')
         LIMIT 10) doc;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', tm.id, 'title', tm.title, 'category', tm.category, 'difficulty_level', tm.difficulty_level
  )), '[]'::jsonb) INTO v_master_courses
  FROM (SELECT * FROM public.training_modules tm
         WHERE tm.is_master_template = true AND tm.is_deleted = false
           AND (tm.title ILIKE '%' || p_query || '%' OR tm.description ILIKE '%' || p_query || '%')
         LIMIT 10) tm;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', doc.id, 'title', doc.title, 'document_number', doc.document_number,
    'organization_id', doc.organization_id, 'organization_name', o.name
  )), '[]'::jsonb) INTO v_tenant_sops
  FROM (SELECT * FROM public.documents doc
         WHERE (doc.is_master_template = false OR doc.is_master_template IS NULL) AND doc.is_deleted = false
           AND (doc.title ILIKE '%' || p_query || '%' OR doc.description ILIKE '%' || p_query || '%')
         LIMIT 10) doc
  JOIN public.organizations o ON o.id = doc.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', tm.id, 'title', tm.title, 'category', tm.category,
    'organization_id', tm.organization_id, 'organization_name', o.name
  )), '[]'::jsonb) INTO v_tenant_courses
  FROM (SELECT * FROM public.training_modules tm
         WHERE (tm.is_master_template = false OR tm.is_master_template IS NULL) AND tm.is_deleted = false
           AND (tm.title ILIKE '%' || p_query || '%' OR tm.description ILIKE '%' || p_query || '%')
         LIMIT 10) tm
  JOIN public.organizations o ON o.id = tm.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', q.id, 'title', q.title, 'passing_score', q.passing_score_percentage,
    'organization_id', q.organization_id, 'organization_name', o.name
  )), '[]'::jsonb) INTO v_assessments
  FROM (SELECT * FROM public.learning_quizzes q
         WHERE NOT COALESCE(q.is_deleted, false)
           AND (q.title ILIKE '%' || p_query || '%' OR q.description ILIKE '%' || p_query || '%')
         LIMIT 10) q
  LEFT JOIN public.organizations o ON o.id = q.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', qb.id, 'name', qb.name, 'organization_id', qb.organization_id, 'organization_name', o.name
  )), '[]'::jsonb) INTO v_question_banks
  FROM (SELECT * FROM public.question_banks qb
         WHERE (qb.name ILIKE '%' || p_query || '%' OR qb.description ILIKE '%' || p_query || '%')
         LIMIT 10) qb
  LEFT JOIN public.organizations o ON o.id = qb.organization_id;

  RETURN JSONB_BUILD_OBJECT(
    'organizations', v_orgs, 'hotels', v_hotels, 'departments', v_depts, 'users', v_users,
    'master_sops', v_master_sops, 'master_courses', v_master_courses,
    'tenant_sops', v_tenant_sops, 'tenant_courses', v_tenant_courses,
    'assessments', v_assessments, 'question_banks', v_question_banks
  );
END;
$function$;

-- Deploying a master module now also clones the quizzes (and their questions)
-- its quiz blocks link, so the tenant copy is self-contained and passes the
-- tenant checks in get_quiz_for_player / submit_quiz_attempt.
CREATE OR REPLACE FUNCTION public.deploy_master_content(p_master_id uuid, p_content_type text, p_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id uuid := gen_random_uuid();
  v_quiz record;
  v_question record;
  v_new_quiz_id uuid;
  v_new_question_id uuid;
  v_quiz_map jsonb := '{}'::jsonb;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'Permission denied: caller must be a platform operator with tenant.manage capability'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id AND is_active = true) THEN
    RAISE EXCEPTION 'Target organization % does not exist or is inactive', p_org_id;
  END IF;

  IF p_content_type IN ('course', 'training_module') THEN
    IF NOT EXISTS (SELECT 1 FROM public.training_modules WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master training module % not found', p_master_id;
    END IF;

    INSERT INTO public.training_modules (
      id, title, description, category, difficulty_level, estimated_duration_minutes, validity_period_days,
      certificate_enabled, passing_score_percentage, allow_retake, max_attempts, auto_advance, show_feedback,
      randomize_questions, show_answers, time_limit_minutes, audience, content_language, template_id, status,
      organization_id, scope_type, is_master_template, master_source_id, blueprint, created_by, created_at, updated_at, is_deleted
    )
    SELECT
      v_new_id, title, description, category, difficulty_level, estimated_duration_minutes, validity_period_days,
      certificate_enabled, passing_score_percentage, allow_retake, max_attempts, auto_advance, show_feedback,
      randomize_questions, show_answers, time_limit_minutes, audience, content_language, template_id, status,
      p_org_id, 'organization', false, p_master_id, blueprint, auth.uid(), now(), now(), false
    FROM public.training_modules WHERE id = p_master_id;

    FOR v_quiz IN
      SELECT DISTINCT q.*
        FROM public.documents d
        JOIN public.learning_quizzes q ON q.id = public._safe_uuid(d.content_data ->> 'quiz_id')
       WHERE d.content_type = 'training_block' AND d.training_module_id = p_master_id
         AND d.block_type = 'quiz' AND NOT COALESCE(d.is_deleted, false)
    LOOP
      v_new_quiz_id := gen_random_uuid();
      INSERT INTO public.learning_quizzes
      SELECT (jsonb_populate_record(NULL::public.learning_quizzes,
               to_jsonb(v_quiz) || jsonb_build_object(
                 'id', v_new_quiz_id, 'organization_id', p_org_id, 'training_module_id', v_new_id,
                 'category_id', NULL, 'linked_sop_id', NULL, 'source_document_id', NULL,
                 'created_by', auth.uid(), 'owner_id', NULL, 'created_at', now(), 'updated_at', now()))).*;

      FOR v_question IN
        SELECT uqq.display_order, uqq.points_override, q.*
          FROM public.unified_quiz_questions uqq
          JOIN public.unified_questions q ON q.id = uqq.question_id
         WHERE uqq.quiz_id = v_quiz.id
      LOOP
        v_new_question_id := gen_random_uuid();
        INSERT INTO public.unified_questions
        SELECT (jsonb_populate_record(NULL::public.unified_questions,
                 to_jsonb(v_question) || jsonb_build_object(
                   'id', v_new_question_id, 'organization_id', p_org_id, 'is_master_template', false,
                   'master_source_id', v_question.id, 'training_module_id', v_new_id,
                   'question_bank_id', NULL, 'linked_sop_id', NULL, 'source_document_id', NULL,
                   'reviewed_by', NULL, 'created_by', auth.uid(), 'created_at', now(), 'updated_at', now()))).*;

        INSERT INTO public.unified_question_options
        SELECT (jsonb_populate_record(NULL::public.unified_question_options,
                 to_jsonb(o) || jsonb_build_object(
                   'id', gen_random_uuid(), 'question_id', v_new_question_id,
                   'organization_id', p_org_id, 'created_at', now()))).*
          FROM public.unified_question_options o
         WHERE o.question_id = v_question.id;

        INSERT INTO public.unified_quiz_questions (quiz_id, question_id, display_order, points_override, organization_id)
        VALUES (v_new_quiz_id, v_new_question_id, v_question.display_order, v_question.points_override, p_org_id);
      END LOOP;

      v_quiz_map := v_quiz_map || jsonb_build_object(v_quiz.id::text, v_new_quiz_id::text);
    END LOOP;

    INSERT INTO public.documents (
      id, training_module_id, content_type, block_type, block_order, title, content, content_ar, content_url,
      content_data, is_mandatory, duration_seconds, points, organization_id, scope_type, is_master_template,
      master_source_id, created_by, created_at, updated_at, is_deleted
    )
    SELECT
      gen_random_uuid(), v_new_id, 'training_block', block_type, block_order, title, content, content_ar, content_url,
      CASE WHEN block_type = 'quiz' AND v_quiz_map ? (content_data ->> 'quiz_id')
           THEN jsonb_set(content_data, '{quiz_id}', to_jsonb(v_quiz_map ->> (content_data ->> 'quiz_id')))
           ELSE content_data END,
      is_mandatory, duration_seconds, points, p_org_id, 'organization', false,
      id, auth.uid(), now(), now(), false
    FROM public.documents
    WHERE content_type = 'training_block' AND training_module_id = p_master_id AND COALESCE(is_deleted, false) = false;

  ELSIF p_content_type = 'document' THEN
    IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master document % not found', p_master_id;
    END IF;

    INSERT INTO public.documents (
      id, title, description, file_url, visibility, role, status, requires_acknowledgment,
      created_by, current_version, created_at, updated_at, summary, summary_ar, is_deleted,
      file_size, category_id, content, content_type, checklist_items, faq_items, video_url,
      images, featured, estimated_read_time, title_ar, description_ar, content_ar,
      confidentiality_level, file_extension, watermark_text, file_type, sop_code,
      review_frequency_months, requires_quiz, passing_score, quiz_enabled, priority,
      compliance_level, lifecycle_status, organization_id, scope_type, is_master_template, master_source_id
    )
    SELECT
      v_new_id, title, description, file_url, visibility, role, status, requires_acknowledgment,
      auth.uid(), current_version, now(), now(), summary, summary_ar, false,
      file_size, category_id, content, content_type, checklist_items, faq_items, video_url,
      images, featured, estimated_read_time, title_ar, description_ar, content_ar,
      confidentiality_level, file_extension, watermark_text, file_type, sop_code,
      review_frequency_months, requires_quiz, passing_score, quiz_enabled, priority,
      compliance_level, lifecycle_status, p_org_id, 'organization', false, p_master_id
    FROM public.documents WHERE id = p_master_id;

  ELSIF p_content_type = 'question_bank' THEN
    IF NOT EXISTS (SELECT 1 FROM public.question_banks WHERE id = p_master_id AND is_master_template = true) THEN
      RAISE EXCEPTION 'Master question bank % not found', p_master_id;
    END IF;

    INSERT INTO public.question_banks (
      id, name, name_ar, description, tags, is_active, created_by, created_at, updated_at,
      organization_id, is_master_template, master_source_id
    )
    SELECT
      v_new_id, name, name_ar, description, tags, is_active, auth.uid(), now(), now(),
      p_org_id, false, p_master_id
    FROM public.question_banks WHERE id = p_master_id;

  ELSE
    RAISE EXCEPTION 'Unsupported content type %', p_content_type;
  END IF;

  INSERT INTO public.master_content_deployments (
    content_type, master_content_id, target_organization_id, target_content_id,
    deployed_version, current_master_version, has_update_available, deployed_by, deployed_at, last_synced_at
  ) VALUES (
    p_content_type, p_master_id, p_org_id, v_new_id,
    1, 1, false, auth.uid(), now(), now()
  )
  ON CONFLICT (content_type, master_content_id, target_organization_id)
  DO UPDATE SET
    target_content_id = EXCLUDED.target_content_id,
    deployed_version = EXCLUDED.deployed_version,
    current_master_version = EXCLUDED.current_master_version,
    has_update_available = false,
    deployed_by = EXCLUDED.deployed_by,
    deployed_at = now(),
    last_synced_at = now();

  INSERT INTO public.platform_audit_logs (
    actor_id, target_organization_id, action, resource_type, resource_id, metadata, created_at
  ) VALUES (
    auth.uid(), p_org_id, 'master_content.deployed', p_content_type, v_new_id::text,
    jsonb_build_object('master_content_id', p_master_id, 'target_content_id', v_new_id,
                       'content_type', p_content_type, 'cloned_quizzes', v_quiz_map),
    now()
  );

  RETURN v_new_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Attempts belong to sessions (enables PostgREST embedding).
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_question_attempts
  ADD CONSTRAINT unified_question_attempts_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.unified_quiz_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_unified_question_attempts_session_id
  ON public.unified_question_attempts (session_id);

-- ---------------------------------------------------------------------------
-- 5. Drop the duplicate / never-used representations.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.training_quizzes;
DROP VIEW IF EXISTS public.learning_quiz_questions;
DROP VIEW IF EXISTS public.sop_quiz_questions;
DROP VIEW IF EXISTS public.knowledge_quiz_sessions;

DROP TABLE public.learning_assignments;
DROP TABLE public.training_certificates;
DROP TABLE public.quizzes;
DROP TABLE public.assessment_questions;
DROP TABLE public.assessments;
DROP TABLE public.lessons;
DROP TABLE public.course_modules;
DROP TABLE public.learning_objectives;
DROP TABLE public.enrollments;
DROP TABLE public.courses;

DROP FUNCTION IF EXISTS public.p6_set_org_from_course();
DROP FUNCTION IF EXISTS public.p6_set_org_from_course_module();
DROP FUNCTION IF EXISTS public.p6_set_org_from_lesson();
DROP FUNCTION IF EXISTS public.p6_set_org_from_objective();
DROP FUNCTION IF EXISTS public.p6_set_org_from_enrollment();
DROP FUNCTION IF EXISTS public.p6_set_org_learning_events();
