
-- ============================================================================
-- §4/§27/§28 review outcome: migration 244000's `learning_assignments` is NOT a
-- duplication regression — it is the per-user *materialized* assignment that the
-- frontend already expects (useTraining/MyLearning/complianceEngineService),
-- fed by the canonical `training_assignment_rules` engine + onboarding
-- `training_paths` via trigger_auto_assign_new_hire(). KEEP it.
--
-- This migration:
--  (1) makes trigger_auto_assign_new_hire() fail-soft — a bad rule/path config
--      must never block a new-hire membership insert.
--  (2) adds the org-operational gate to learning_assignments RLS (part of the
--      §2 suspension sweep — this table gates on current_user_organization_ids()
--      directly).
-- ============================================================================

-- (1) fail-soft new-hire automation
CREATE OR REPLACE FUNCTION public.trigger_auto_assign_new_hire()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM public._auto_assign_new_hire_impl(NEW);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_assign_new_hire skipped for user % (org %): %', NEW.user_id, NEW.organization_id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public._auto_assign_new_hire_impl(NEW public.organization_memberships)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_rule record; v_path record; v_path_module record;
  v_due_days integer; v_due_date timestamptz; v_module_id uuid; v_is_global boolean; v_assigned_by uuid;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN RETURN; END IF;
  v_assigned_by := NEW.invited_by;

  FOR v_rule IN
    SELECT tar.id AS rule_id, tar.training_module_id, tar.content_id, tar.hotel_id, tar.department_id,
           tar.target_role, tar.is_mandatory, COALESCE(tar.due_in_days, 14) AS due_in_days, tar.scope_type, tar.scope_id
    FROM public.training_assignment_rules tar
    WHERE tar.is_active = true AND (tar.is_deleted IS NOT TRUE)
      AND (tar.organization_id IS NULL OR tar.organization_id = NEW.organization_id)
      AND (tar.hotel_id IS NULL OR tar.hotel_id = NEW.hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = NEW.hotel_id) OR tar.scope_type = 'organization')
      AND (tar.department_id IS NULL OR tar.department_id = NEW.department_id OR (tar.scope_type = 'department' AND tar.scope_id = NEW.department_id))
      AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = NEW.role::text)
  LOOP
    v_due_days := COALESCE(v_rule.due_in_days, 14);
    v_due_date := now() + (v_due_days || ' days')::interval;
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    v_is_global := (v_rule.hotel_id IS NULL AND (v_rule.scope_type IS NULL OR v_rule.scope_type = 'organization'));

    IF v_module_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.learning_assignments
      WHERE user_id = NEW.user_id AND (training_module_id = v_module_id OR course_id = v_module_id)
        AND status IN ('pending','in_progress','completed')
    ) THEN
      INSERT INTO public.learning_assignments (
        user_id, organization_id, hotel_id, department_id, training_module_id, course_id, rule_id,
        status, due_date, assigned_by, is_mandatory, is_global, notes, created_at, updated_at)
      VALUES (NEW.user_id, NEW.organization_id, NEW.hotel_id, NEW.department_id, v_module_id, v_module_id, v_rule.rule_id,
        'pending', v_due_date, v_assigned_by, COALESCE(v_rule.is_mandatory,false), v_is_global,
        'Auto-assigned upon new hire onboarding', now(), now());

      INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, status, created_at, updated_at)
      VALUES (NEW.user_id, v_module_id, v_rule.rule_id, NEW.organization_id, 'not_started'::training_status, now(), now())
      ON CONFLICT (user_id, training_id) DO NOTHING;
    END IF;
  END LOOP;

  FOR v_path IN
    SELECT tp.id AS path_id, tp.is_mandatory
    FROM public.training_paths tp
    WHERE tp.is_active = true
      AND (tp.organization_id IS NULL OR tp.organization_id = NEW.organization_id)
      AND (tp.target_property_id IS NULL OR tp.target_property_id = NEW.hotel_id)
      AND (tp.target_department_id IS NULL OR tp.target_department_id = NEW.department_id)
      AND (tp.target_role IS NULL OR tp.target_role::text = NEW.role::text)
  LOOP
    INSERT INTO public.user_path_enrollments (user_id, path_id, status, enrolled_at, created_at, updated_at)
    VALUES (NEW.user_id, v_path.path_id, 'enrolled', now(), now(), now())
    ON CONFLICT (user_id, path_id) DO NOTHING;

    FOR v_path_module IN SELECT tpm.module_id, tpm.course_id FROM public.training_path_modules tpm WHERE tpm.path_id = v_path.path_id
    LOOP
      v_module_id := COALESCE(v_path_module.module_id, v_path_module.course_id);
      IF v_module_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.learning_assignments
        WHERE user_id = NEW.user_id AND (training_module_id = v_module_id OR course_id = v_module_id)
          AND status IN ('pending','in_progress','completed')
      ) THEN
        INSERT INTO public.learning_assignments (
          user_id, organization_id, hotel_id, department_id, training_module_id, course_id, training_path_id,
          status, due_date, assigned_by, is_mandatory, is_global, notes, created_at, updated_at)
        VALUES (NEW.user_id, NEW.organization_id, NEW.hotel_id, NEW.department_id, v_module_id, v_module_id, v_path.path_id,
          'pending', now() + interval '14 days', v_assigned_by, COALESCE(v_path.is_mandatory,false), false,
          'Auto-assigned via onboarding path', now(), now());
      END IF;
    END LOOP;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public._auto_assign_new_hire_impl(public.organization_memberships) FROM anon, public, authenticated;

-- (2) suspension gate on learning_assignments
DROP POLICY IF EXISTS learning_assignments_select ON public.learning_assignments;
CREATE POLICY learning_assignments_select ON public.learning_assignments FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_platform_operator((SELECT auth.uid()))
  OR (
    organization_id = ANY (public.current_user_organization_ids())
    AND public.org_is_operational(organization_id)
    AND (
      public.is_tenant_admin(organization_id)
      OR EXISTS (SELECT 1 FROM public.organization_memberships om
        WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = learning_assignments.organization_id
          AND om.role = ANY (ARRAY['organization_owner','organization_admin','hotel_admin','department_manager','training_manager']::membership_role[])
          AND (om.hotel_id IS NULL OR om.hotel_id = learning_assignments.hotel_id))
    )
  )
);

DROP POLICY IF EXISTS learning_assignments_manage ON public.learning_assignments;
CREATE POLICY learning_assignments_manage ON public.learning_assignments FOR ALL TO authenticated
USING (
  public.is_platform_operator((SELECT auth.uid()))
  OR (
    organization_id = ANY (public.current_user_organization_ids())
    AND public.org_is_operational(organization_id)
    AND (
      public.is_tenant_admin(organization_id)
      OR EXISTS (SELECT 1 FROM public.organization_memberships om
        WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = learning_assignments.organization_id
          AND om.role = ANY (ARRAY['organization_owner','organization_admin','hotel_admin','department_manager','training_manager']::membership_role[]))
    )
  )
)
WITH CHECK (
  public.is_platform_operator((SELECT auth.uid()))
  OR (
    organization_id = ANY (public.current_user_organization_ids())
    AND public.org_is_operational(organization_id)
    AND (
      public.is_tenant_admin(organization_id)
      OR EXISTS (SELECT 1 FROM public.organization_memberships om
        WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = learning_assignments.organization_id
          AND om.role = ANY (ARRAY['organization_owner','organization_admin','hotel_admin','department_manager','training_manager']::membership_role[]))
    )
  )
);

COMMENT ON COLUMN public.employee_transfer_logs.from_hotel_id IS 'Duplicate of previous_hotel_id (migration 220000). Consolidate in dead-code sweep — keep one pair.';
