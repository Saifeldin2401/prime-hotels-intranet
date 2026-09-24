-- ============================================================================
-- Migration: 20260901244000_new_hire_and_transfer_automation.sql
-- Step 2: New-Hire Onboarding Automation & Employee Transfer Delta Handler
-- 1. Create learning_assignments table with multi-tenant RLS policies and indexes
-- 2. Trigger trg_auto_assign_new_hire on organization_memberships (AFTER INSERT)
-- 3. RPC function process_employee_transfer with validation, logging, waiving and delta assignment
-- ============================================================================

BEGIN;

-- 1. Create learning_assignments table if not exists
CREATE TABLE IF NOT EXISTS public.learning_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  training_module_id uuid REFERENCES public.training_modules(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  training_path_id uuid REFERENCES public.training_paths(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.training_assignment_rules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'waived', 'overdue', 'cancelled', 'assigned', 'excused')),
  due_date timestamptz,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_global boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_assignments_user ON public.learning_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_org ON public.learning_assignments (organization_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_hotel ON public.learning_assignments (hotel_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_dept ON public.learning_assignments (department_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_status ON public.learning_assignments (status);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_module ON public.learning_assignments (training_module_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_course ON public.learning_assignments (course_id);

-- Columns on training_assignment_rules, memberships, transfer logs
ALTER TABLE public.training_assignment_rules
  ADD COLUMN IF NOT EXISTS due_in_days integer DEFAULT 14;

ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.employee_transfer_logs
  ADD COLUMN IF NOT EXISTS from_hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_role text,
  ADD COLUMN IF NOT EXISTS to_role text,
  ADD COLUMN IF NOT EXISTS reason text;

-- Enable RLS
ALTER TABLE public.learning_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS  learning_assignments_select ON public.learning_assignments;
CREATE POLICY learning_assignments_select ON public.learning_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_platform_operator((SELECT auth.uid()))
    OR (
      organization_id = ANY(public.current_user_organization_ids())
      AND public.is_tenant_admin(organization_id)
    )
    OR (
      organization_id = ANY(public.current_user_organization_ids())
      AND EXISTS (
        SELECT 1 FROM public.organization_memberships om
        WHERE om.user_id = (SELECT auth.uid())
          AND om.organization_id = learning_assignments.organization_id
          AND om.role IN ('organization_owner', 'organization_admin', 'hotel_admin', 'department_manager', 'training_manager')
          AND (om.hotel_id IS NULL OR om.hotel_id = learning_assignments.hotel_id)
      )
    )
  );

DROP POLICY IF EXISTS learning_assignments_manage ON public.learning_assignments;
CREATE POLICY learning_assignments_manage ON public.learning_assignments
  FOR ALL TO authenticated
  USING (
    public.is_platform_operator((SELECT auth.uid()))
    OR (
      organization_id = ANY(public.current_user_organization_ids())
      AND (
        public.is_tenant_admin(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid())
            AND om.organization_id = learning_assignments.organization_id
            AND om.role IN ('organization_owner', 'organization_admin', 'hotel_admin', 'department_manager', 'training_manager')
        )
      )
    )
  )
  WITH CHECK (
    public.is_platform_operator((SELECT auth.uid()))
    OR (
      organization_id = ANY(public.current_user_organization_ids())
      AND (
        public.is_tenant_admin(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid())
            AND om.organization_id = learning_assignments.organization_id
            AND om.role IN ('organization_owner', 'organization_admin', 'hotel_admin', 'department_manager', 'training_manager')
        )
      )
    )
  );

-- Trigger function: trigger_auto_assign_new_hire
CREATE OR REPLACE FUNCTION public.trigger_auto_assign_new_hire()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS 
DECLARE
  v_rule record;
  v_path record;
  v_path_module record;
  v_due_days integer;
  v_due_date timestamptz;
  v_module_id uuid;
  v_is_global boolean;
  v_assigned_by uuid;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_assigned_by := NEW.invited_by;

  -- 1. Match active training_assignment_rules
  FOR v_rule IN
    SELECT 
      tar.id AS rule_id,
      tar.training_module_id,
      tar.content_id,
      tar.hotel_id,
      tar.department_id,
      tar.target_role,
      tar.is_mandatory,
      COALESCE(tar.due_in_days, 14) AS due_in_days,
      tar.scope_type,
      tar.scope_id
    FROM public.training_assignment_rules tar
    WHERE tar.is_active = true
      AND (tar.is_deleted IS NOT TRUE)
      AND (tar.organization_id IS NULL OR tar.organization_id = NEW.organization_id)
      -- Hotel filter
      AND (tar.hotel_id IS NULL OR tar.hotel_id = NEW.hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = NEW.hotel_id) OR tar.scope_type = 'organization')
      -- Department filter
      AND (tar.department_id IS NULL OR tar.department_id = NEW.department_id OR (tar.scope_type = 'department' AND tar.scope_id = NEW.department_id))
      -- Role filter
      AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = NEW.role::text)
  LOOP
    v_due_days := COALESCE(v_rule.due_in_days, 14);
    v_due_date := now() + (v_due_days || ' days')::interval;
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    v_is_global := (v_rule.hotel_id IS NULL AND (v_rule.scope_type IS NULL OR v_rule.scope_type = 'organization'));

    IF v_module_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.learning_assignments
      WHERE user_id = NEW.user_id 
        AND (training_module_id = v_module_id OR course_id = v_module_id)
        AND status IN ('pending', 'in_progress', 'completed')
    ) THEN
      INSERT INTO public.learning_assignments (
        user_id,
        organization_id,
        hotel_id,
        department_id,
        training_module_id,
        course_id,
        rule_id,
        status,
        due_date,
        assigned_by,
        is_mandatory,
        is_global,
        notes,
        created_at,
        updated_at
      ) VALUES (
        NEW.user_id,
        NEW.organization_id,
        NEW.hotel_id,
        NEW.department_id,
        v_module_id,
        v_module_id,
        v_rule.rule_id,
        'pending',
        v_due_date,
        v_assigned_by,
        COALESCE(v_rule.is_mandatory, false),
        v_is_global,
        'Auto-assigned upon new hire onboarding',
        now(),
        now()
      );

      -- Maintain training_progress for LMS compatibility
      INSERT INTO public.training_progress (
        user_id,
        training_id,
        assignment_id,
        organization_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        NEW.user_id,
        v_module_id,
        v_rule.rule_id,
        NEW.organization_id,
        'not_started'::training_status,
        now(),
        now()
      ) ON CONFLICT (user_id, training_id) DO NOTHING;
    END IF;
  END LOOP;

  -- 2. Match active onboarding training_paths
  FOR v_path IN
    SELECT tp.id AS path_id, tp.is_mandatory
    FROM public.training_paths tp
    WHERE tp.is_active = true
      AND (tp.organization_id IS NULL OR tp.organization_id = NEW.organization_id)
      AND (tp.target_property_id IS NULL OR tp.target_property_id = NEW.hotel_id)
      AND (tp.target_department_id IS NULL OR tp.target_department_id = NEW.department_id)
      AND (tp.target_role IS NULL OR tp.target_role::text = NEW.role::text)
  LOOP
    -- Enroll in path
    INSERT INTO public.user_path_enrollments (
      user_id,
      path_id,
      status,
      enrolled_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      v_path.path_id,
      'enrolled',
      now(),
      now(),
      now()
    ) ON CONFLICT (user_id, path_id) DO NOTHING;

    -- Assign modules within path
    FOR v_path_module IN
      SELECT tpm.module_id, tpm.course_id
      FROM public.training_path_modules tpm
      WHERE tpm.path_id = v_path.path_id
    LOOP
      v_module_id := COALESCE(v_path_module.module_id, v_path_module.course_id);
      IF v_module_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.learning_assignments
        WHERE user_id = NEW.user_id 
          AND (training_module_id = v_module_id OR course_id = v_module_id)
          AND status IN ('pending', 'in_progress', 'completed')
      ) THEN
        INSERT INTO public.learning_assignments (
          user_id,
          organization_id,
          hotel_id,
          department_id,
          training_module_id,
          course_id,
          training_path_id,
          status,
          due_date,
          assigned_by,
          is_mandatory,
          is_global,
          notes,
          created_at,
          updated_at
        ) VALUES (
          NEW.user_id,
          NEW.organization_id,
          NEW.hotel_id,
          NEW.department_id,
          v_module_id,
          v_module_id,
          v_path.path_id,
          'pending',
          now() + interval '14 days',
          v_assigned_by,
          COALESCE(v_path.is_mandatory, false),
          false,
          'Auto-assigned via onboarding path',
          now(),
          now()
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
;

DROP TRIGGER IF EXISTS trg_auto_assign_new_hire ON public.organization_memberships;
CREATE TRIGGER trg_auto_assign_new_hire
  AFTER INSERT ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_assign_new_hire();

-- RPC Function: process_employee_transfer
CREATE OR REPLACE FUNCTION public.process_employee_transfer(
  p_user_id uuid,
  p_target_hotel_id uuid,
  p_target_dept_id uuid,
  p_target_role text,
  p_reason text,
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS 
DECLARE
  v_caller_id uuid := COALESCE(p_actor_id, auth.uid());
  v_is_platform boolean := false;
  v_is_authorized boolean := false;
  v_org_id uuid;
  v_old_hotel_id uuid;
  v_old_dept_id uuid;
  v_old_role text;
  v_target_role_enum public.membership_role;
  v_waived_count integer := 0;
  v_assigned_count integer := 0;
  v_rule record;
  v_module_id uuid;
  v_is_global boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  -- 1. Fetch existing membership
  SELECT organization_id, hotel_id, department_id, role::text
  INTO v_org_id, v_old_hotel_id, v_old_dept_id, v_old_role
  FROM public.organization_memberships
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Active organization membership not found for user %', p_user_id;
  END IF;

  -- 2. Validate caller authorization
  v_is_platform := public.is_platform_operator(v_caller_id) OR public.is_platform_super_admin() OR public.is_platform_user(v_caller_id);

  IF v_is_platform THEN
    v_is_authorized := true;
  ELSE
    IF public.is_tenant_admin(v_org_id, v_caller_id) THEN
      v_is_authorized := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = v_caller_id
        AND organization_id = v_org_id
        AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'hotel_admin', 'training_manager')
    ) THEN
      v_is_authorized := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller_id
        AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'administrator', 'super_admin')
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: Caller is not authorized to transfer employees for organization %', v_org_id USING ERRCODE = '42501';
  END IF;

  -- Validate target role
  BEGIN
    v_target_role_enum := p_target_role::public.membership_role;
  EXCEPTION WHEN OTHERS THEN
    v_target_role_enum := 'learner'::public.membership_role;
  END;

  -- 3. Insert transfer log into employee_transfer_logs
  INSERT INTO public.employee_transfer_logs (
    user_id,
    organization_id,
    previous_hotel_id,
    new_hotel_id,
    from_hotel_id,
    to_hotel_id,
    previous_department_id,
    new_department_id,
    from_department_id,
    to_department_id,
    previous_role,
    new_role,
    from_role,
    to_role,
    notes,
    reason,
    transferred_by,
    transfer_effective_date,
    created_at
  ) VALUES (
    p_user_id,
    v_org_id,
    v_old_hotel_id,
    p_target_hotel_id,
    v_old_hotel_id,
    p_target_hotel_id,
    v_old_dept_id,
    p_target_dept_id,
    v_old_dept_id,
    p_target_dept_id,
    v_old_role,
    p_target_role,
    v_old_role,
    p_target_role,
    p_reason,
    p_reason,
    v_caller_id,
    CURRENT_DATE,
    now()
  );

  -- 4. Update organization_memberships and profiles
  UPDATE public.organization_memberships
  SET
    hotel_id = p_target_hotel_id,
    department_id = p_target_dept_id,
    role = v_target_role_enum,
    updated_at = now()
  WHERE user_id = p_user_id AND organization_id = v_org_id;

  UPDATE public.profiles
  SET updated_at = now()
  WHERE id = p_user_id;

  -- 5. Waive uncompleted hotel-specific learning assignments from old hotel (not global/mandatory)
  WITH waived_rows AS (
    UPDATE public.learning_assignments
    SET
      status = 'waived',
      notes = COALESCE(notes || ' | ', '') || 'Waived due to transfer to new hotel',
      updated_at = now()
    WHERE user_id = p_user_id
      AND status IN ('pending', 'in_progress', 'assigned')
      AND is_mandatory IS NOT TRUE
      AND is_global IS NOT TRUE
      AND (
        (hotel_id IS NOT NULL AND hotel_id = v_old_hotel_id AND v_old_hotel_id IS DISTINCT FROM p_target_hotel_id)
        OR (hotel_id IS NOT NULL AND hotel_id <> p_target_hotel_id)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_waived_count FROM waived_rows;

  -- Update training_progress
  UPDATE public.training_progress tp
  SET 
    status = 'cancelled'::training_status,
    updated_at = now()
  FROM public.training_modules tm
  WHERE tp.training_id = tm.id
    AND tp.user_id = p_user_id
    AND tp.status IN ('not_started', 'in_progress')
    AND tm.property_id IS NOT NULL
    AND tm.property_id = v_old_hotel_id
    AND tm.property_id <> p_target_hotel_id;

  -- 6. Auto-evaluate delta assignment rules for new target hotel/dept/role
  FOR v_rule IN
    SELECT 
      tar.id AS rule_id,
      tar.training_module_id,
      tar.content_id,
      tar.hotel_id,
      tar.department_id,
      tar.target_role,
      tar.is_mandatory,
      COALESCE(tar.due_in_days, 14) AS due_in_days,
      tar.scope_type,
      tar.scope_id
    FROM public.training_assignment_rules tar
    WHERE tar.is_active = true
      AND (tar.is_deleted IS NOT TRUE)
      AND (tar.organization_id IS NULL OR tar.organization_id = v_org_id)
      -- Hotel filter
      AND (tar.hotel_id IS NULL OR tar.hotel_id = p_target_hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = p_target_hotel_id) OR tar.scope_type = 'organization')
      -- Department filter
      AND (tar.department_id IS NULL OR tar.department_id = p_target_dept_id OR (tar.scope_type = 'department' AND tar.scope_id = p_target_dept_id))
      -- Role filter
      AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = p_target_role OR tar.target_role = v_target_role_enum::text)
  LOOP
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    v_is_global := (v_rule.hotel_id IS NULL AND (v_rule.scope_type IS NULL OR v_rule.scope_type = 'organization'));

    IF v_module_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.learning_assignments
      WHERE user_id = p_user_id 
        AND (training_module_id = v_module_id OR course_id = v_module_id)
        AND status IN ('pending', 'in_progress', 'completed')
    ) THEN
      INSERT INTO public.learning_assignments (
        user_id,
        organization_id,
        hotel_id,
        department_id,
        training_module_id,
        course_id,
        rule_id,
        status,
        due_date,
        assigned_by,
        is_mandatory,
        is_global,
        notes,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_org_id,
        p_target_hotel_id,
        p_target_dept_id,
        v_module_id,
        v_module_id,
        v_rule.rule_id,
        'pending',
        now() + (v_rule.due_in_days || ' days')::interval,
        v_caller_id,
        COALESCE(v_rule.is_mandatory, false),
        v_is_global,
        'Assigned via transfer delta evaluation',
        now(),
        now()
      );

      -- Progress sync
      INSERT INTO public.training_progress (
        user_id,
        training_id,
        assignment_id,
        organization_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_module_id,
        v_rule.rule_id,
        v_org_id,
        'not_started'::training_status,
        now(),
        now()
      ) ON CONFLICT (user_id, training_id) DO UPDATE SET
        assignment_id = EXCLUDED.assignment_id,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();

      v_assigned_count := v_assigned_count + 1;
    END IF;
  END LOOP;

  -- 7. Update transfer log stats
  UPDATE public.employee_transfer_logs
  SET
    waived_obsolete_courses_count = v_waived_count,
    assigned_delta_courses_count = v_assigned_count
  WHERE user_id = p_user_id 
    AND organization_id = v_org_id
    AND transfer_effective_date = CURRENT_DATE
    AND (to_hotel_id = p_target_hotel_id OR new_hotel_id = p_target_hotel_id);

  -- 8. Return result
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'from_hotel_id', v_old_hotel_id,
    'to_hotel_id', p_target_hotel_id,
    'waived_count', v_waived_count,
    'assigned_count', v_assigned_count
  );
END;
;

GRANT EXECUTE ON FUNCTION public.process_employee_transfer(uuid, uuid, uuid, text, text, uuid) TO authenticated;

-- Record migration in supabase_migrations.schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260901244000', 'new_hire_and_transfer_automation')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;

COMMIT;
