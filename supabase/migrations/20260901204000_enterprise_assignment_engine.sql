-- Migration: 20260901204000_enterprise_assignment_engine.sql
-- Description: Complete hierarchical organizational scoping engine for training assignments

-- 1. Extend training_assignment_rules with explicit multi-tier organizational columns
ALTER TABLE public.training_assignment_rules
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization',
  ADD COLUMN IF NOT EXISTS scope_id uuid,
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[],
  ADD COLUMN IF NOT EXISTS recipient_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_tar_org_brand_hotel ON public.training_assignment_rules (organization_id, brand_id, hotel_id);
CREATE INDEX IF NOT EXISTS idx_tar_dept_role ON public.training_assignment_rules (department_id, target_role);
CREATE INDEX IF NOT EXISTS idx_tar_scope_type ON public.training_assignment_rules (scope_type, scope_id);

-- 2. Helper function: Determine caller''s authorized assignment scopes
CREATE OR REPLACE FUNCTION public.get_caller_assignment_scopes(p_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_platform boolean := false;
  v_effective_org_id uuid := p_org_id;
  v_user_memberships record;
  v_can_org boolean := false;
  v_can_brand boolean := false;
  v_can_hotel boolean := false;
  v_can_dept boolean := false;
  v_brand_ids uuid[] := '{}';
  v_hotel_ids uuid[] := '{}';
  v_dept_ids uuid[] := '{}';
  v_primary_role text := 'learner';
  v_primary_hotel_id uuid := NULL;
  v_primary_dept_id uuid := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthenticated');
  END IF;

  v_is_platform := public.is_platform_super_admin() OR public.is_platform_user(v_user_id);

  IF v_effective_org_id IS NULL THEN
    v_effective_org_id := public.get_operator_impersonated_org();
    IF v_effective_org_id IS NULL THEN
      SELECT organization_id INTO v_effective_org_id
      FROM public.organization_memberships
      WHERE user_id = v_user_id AND is_active = true
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_is_platform THEN
    RETURN jsonb_build_object(
      'is_platform_admin', true,
      'effective_org_id', v_effective_org_id,
      'can_assign_org', true,
      'can_assign_brand', true,
      'can_assign_hotel', true,
      'can_assign_dept', true,
      'can_assign_role', true,
      'can_assign_individual', true,
      'authorized_brand_ids', NULL,
      'authorized_hotel_ids', NULL,
      'authorized_dept_ids', NULL,
      'primary_role', 'platform_admin'
    );
  END IF;

  FOR v_user_memberships IN
    SELECT role, brand_id, hotel_id, department_id, is_primary
    FROM public.organization_memberships
    WHERE user_id = v_user_id 
      AND (organization_id = v_effective_org_id OR v_effective_org_id IS NULL)
      AND is_active = true
  LOOP
    IF v_user_memberships.role IN ('organization_owner', 'organization_admin', 'training_manager') AND v_user_memberships.hotel_id IS NULL THEN
      v_can_org := true;
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      v_primary_role := v_user_memberships.role::text;
    ELSIF v_user_memberships.role IN ('brand_admin') AND v_user_memberships.brand_id IS NOT NULL THEN
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      IF NOT (v_user_memberships.brand_id = ANY(v_brand_ids)) THEN
        v_brand_ids := array_append(v_brand_ids, v_user_memberships.brand_id);
      END IF;
      v_primary_role := 'brand_admin';
    ELSIF v_user_memberships.role IN ('hotel_admin', 'property_manager', 'training_manager', 'instructor') AND v_user_memberships.hotel_id IS NOT NULL THEN
      v_can_hotel := true;
      v_can_dept := true;
      IF NOT (v_user_memberships.hotel_id = ANY(v_hotel_ids)) THEN
        v_hotel_ids := array_append(v_hotel_ids, v_user_memberships.hotel_id);
      END IF;
      IF v_primary_hotel_id IS NULL THEN
        v_primary_hotel_id := v_user_memberships.hotel_id;
      END IF;
      v_primary_role := v_user_memberships.role::text;
    ELSIF v_user_memberships.role IN ('department_manager', 'department_head') AND v_user_memberships.department_id IS NOT NULL THEN
      v_can_dept := true;
      IF NOT (v_user_memberships.department_id = ANY(v_dept_ids)) THEN
        v_dept_ids := array_append(v_dept_ids, v_user_memberships.department_id);
      END IF;
      IF v_primary_dept_id IS NULL THEN
        v_primary_dept_id := v_user_memberships.department_id;
      END IF;
      IF v_user_memberships.hotel_id IS NOT NULL AND NOT (v_user_memberships.hotel_id = ANY(v_hotel_ids)) THEN
        v_hotel_ids := array_append(v_hotel_ids, v_user_memberships.hotel_id);
      END IF;
      v_primary_role := 'department_manager';
    END IF;
  END LOOP;

  -- Also check app-level user_roles
  IF NOT v_can_org AND NOT v_can_hotel THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role IN ('corporate_admin', 'regional_admin', 'administrator', 'super_admin')) THEN
      v_can_org := true;
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      v_primary_role := 'corporate_admin';
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role IN ('training_manager')) THEN
      v_can_org := true;
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      v_primary_role := 'training_manager';
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role IN ('property_manager')) THEN
      v_can_hotel := true;
      v_can_dept := true;
      v_primary_role := 'property_manager';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_platform_admin', false,
    'effective_org_id', v_effective_org_id,
    'can_assign_org', v_can_org,
    'can_assign_brand', v_can_brand,
    'can_assign_hotel', v_can_hotel,
    'can_assign_dept', v_can_dept,
    'can_assign_role', (v_can_org OR v_can_brand OR v_can_hotel OR v_can_dept),
    'can_assign_individual', (v_can_org OR v_can_brand OR v_can_hotel OR v_can_dept),
    'authorized_brand_ids', CASE WHEN v_can_org THEN NULL ELSE v_brand_ids END,
    'authorized_hotel_ids', CASE WHEN v_can_org THEN NULL ELSE v_hotel_ids END,
    'authorized_dept_ids', CASE WHEN v_can_org THEN NULL ELSE v_dept_ids END,
    'primary_role', v_primary_role,
    'primary_hotel_id', v_primary_hotel_id,
    'primary_department_id', v_primary_dept_id
  );
END;
$$;

-- 3. Query Scoped Assignable Learners
CREATE OR REPLACE FUNCTION public.get_assignable_learners(
  p_org_id uuid,
  p_brand_id uuid DEFAULT NULL,
  p_hotel_id uuid DEFAULT NULL,
  p_dept_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  hotel_id uuid,
  hotel_name text,
  brand_id uuid,
  brand_name text,
  department_id uuid,
  department_name text,
  role text,
  job_title text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_hotels uuid[];
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_search_pattern text := NULL;
BEGIN
  v_scopes := public.get_caller_assignment_scopes(p_org_id);
  
  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE 
     AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
    RETURN;
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;
  
  IF NOT v_can_org THEN
    IF v_scopes->'authorized_hotel_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_hotel_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_hotel_ids')::uuid) INTO v_auth_hotels;
    END IF;
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;
  END IF;

  IF p_search IS NOT NULL AND trim(p_search) <> '' THEN
    v_search_pattern := '%' || trim(p_search) || '%';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    COALESCE(p.full_name, 'Learner') AS full_name,
    p.email,
    p.avatar_url,
    h.id AS hotel_id,
    h.name AS hotel_name,
    b.id AS brand_id,
    b.name AS brand_name,
    d.id AS department_id,
    d.name AS department_name,
    om.role::text AS role,
    p.job_title
  FROM public.organization_memberships om
  JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.hotels h ON h.id = om.hotel_id
  LEFT JOIN public.brands b ON b.id = COALESCE(om.brand_id, h.brand_id)
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.organization_id = p_org_id
    AND om.is_active = true
    AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
    AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
    AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands) OR h.brand_id = ANY(v_auth_brands))
    -- Requested filters
    AND (p_brand_id IS NULL OR b.id = p_brand_id OR om.brand_id = p_brand_id)
    AND (p_hotel_id IS NULL OR om.hotel_id = p_hotel_id)
    AND (p_dept_id IS NULL OR om.department_id = p_dept_id)
    AND (p_role IS NULL OR p_role = 'all' OR om.role::text = p_role)
    -- Search filter
    AND (
      v_search_pattern IS NULL
      OR p.full_name ILIKE v_search_pattern
      OR p.email ILIKE v_search_pattern
      OR p.job_title ILIKE v_search_pattern
    )
  ORDER BY full_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. Calculate Scoped Assignable Recipient Counts
CREATE OR REPLACE FUNCTION public.get_assignable_recipients_count(
  p_org_id uuid,
  p_brand_id uuid DEFAULT NULL,
  p_hotel_id uuid DEFAULT NULL,
  p_dept_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_individual_user_ids uuid[] DEFAULT NULL,
  p_scope_type text DEFAULT 'organization'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_hotels uuid[];
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_total_count integer := 0;
  v_hotel_count integer := 0;
  v_dept_count integer := 0;
BEGIN
  v_scopes := public.get_caller_assignment_scopes(p_org_id);
  
  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE 
     AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('recipient_count', 0, 'hotel_count', 0, 'dept_count', 0);
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;
  
  IF NOT v_can_org THEN
    IF v_scopes->'authorized_hotel_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_hotel_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_hotel_ids')::uuid) INTO v_auth_hotels;
    END IF;
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;
  END IF;

  IF p_scope_type = 'individual' AND p_individual_user_ids IS NOT NULL THEN
    SELECT 
      COUNT(DISTINCT om.user_id),
      COUNT(DISTINCT om.hotel_id),
      COUNT(DISTINCT om.department_id)
    INTO v_total_count, v_hotel_count, v_dept_count
    FROM public.organization_memberships om
    WHERE om.organization_id = p_org_id
      AND om.is_active = true
      AND om.user_id = ANY(p_individual_user_ids)
      AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
      AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts));
  ELSE
    SELECT 
      COUNT(DISTINCT om.user_id),
      COUNT(DISTINCT om.hotel_id),
      COUNT(DISTINCT om.department_id)
    INTO v_total_count, v_hotel_count, v_dept_count
    FROM public.organization_memberships om
    LEFT JOIN public.hotels h ON h.id = om.hotel_id
    WHERE om.organization_id = p_org_id
      AND om.is_active = true
      AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
      AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
      AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands) OR h.brand_id = ANY(v_auth_brands))
      AND (p_brand_id IS NULL OR om.brand_id = p_brand_id OR h.brand_id = p_brand_id)
      AND (p_hotel_id IS NULL OR om.hotel_id = p_hotel_id)
      AND (p_dept_id IS NULL OR om.department_id = p_dept_id)
      AND (p_role IS NULL OR p_role = 'all' OR om.role::text = p_role);
  END IF;

  RETURN jsonb_build_object(
    'recipient_count', COALESCE(v_total_count, 0),
    'hotel_count', COALESCE(v_hotel_count, 0),
    'dept_count', COALESCE(v_dept_count, 0)
  );
END;
$$;

-- 5. Create Scoped Training Assignment (Atomic Server-Side Execution with RLS Guard)
CREATE OR REPLACE FUNCTION public.create_scoped_training_assignment(
  p_course_id uuid,
  p_scope_type text,                     -- 'organization', 'brand', 'hotel', 'department', 'role', 'individual'
  p_organization_id uuid,
  p_brand_id uuid DEFAULT NULL,
  p_hotel_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_target_role text DEFAULT NULL,
  p_target_user_ids uuid[] DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_instructions text DEFAULT NULL,
  p_requires_acknowledgement boolean DEFAULT false,
  p_notify_on_due boolean DEFAULT true,
  p_reminder_days_before integer[] DEFAULT '{7,3,1}'::integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_hotels uuid[];
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_rule_id uuid;
  v_eligible_users uuid[] := '{}';
  v_user_id uuid;
  v_inserted_progress int := 0;
  v_updated_progress int := 0;
  v_course_title text := 'Training Module';
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to assign training.';
  END IF;

  -- 1. Validate Course
  SELECT title INTO v_course_title 
  FROM public.training_modules 
  WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  
  IF v_course_title IS NULL THEN
    SELECT title INTO v_course_title 
    FROM public.courses 
    WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  END IF;

  IF v_course_title IS NULL THEN
    RAISE EXCEPTION 'Selected course does not exist or has been deleted.';
  END IF;

  -- 2. Verify Caller Scope Authority
  v_scopes := public.get_caller_assignment_scopes(p_organization_id);
  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF v_scopes->'authorized_hotel_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_hotel_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_hotel_ids')::uuid) INTO v_auth_hotels;
    END IF;
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;

    -- Strict Scope Enforcement
    IF p_scope_type = 'organization' THEN
      RAISE EXCEPTION 'Access denied: You do not have organization-wide assignment authority.';
    ELSIF p_scope_type = 'brand' AND (v_auth_brands IS NULL OR NOT (p_brand_id = ANY(v_auth_brands))) THEN
      RAISE EXCEPTION 'Access denied: You are not authorized to assign training to this brand.';
    ELSIF p_scope_type = 'hotel' AND (v_auth_hotels IS NULL OR NOT (p_hotel_id = ANY(v_auth_hotels))) THEN
      RAISE EXCEPTION 'Access denied: You are not authorized to assign training to this hotel.';
    ELSIF p_scope_type = 'department' AND (v_auth_depts IS NULL OR NOT (p_department_id = ANY(v_auth_depts))) THEN
      RAISE EXCEPTION 'Access denied: You are not authorized to assign training to this department.';
    END IF;
  END IF;

  -- 3. Resolve Eligible Target Users
  IF p_scope_type = 'individual' AND p_target_user_ids IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT om.user_id
      FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id
        AND om.is_active = true
        AND om.user_id = ANY(p_target_user_ids)
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
    ) INTO v_eligible_users;
  ELSE
    SELECT ARRAY(
      SELECT DISTINCT om.user_id
      FROM public.organization_memberships om
      LEFT JOIN public.hotels h ON h.id = om.hotel_id
      WHERE om.organization_id = p_organization_id
        AND om.is_active = true
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
        AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands) OR h.brand_id = ANY(v_auth_brands))
        AND (p_brand_id IS NULL OR om.brand_id = p_brand_id OR h.brand_id = p_brand_id)
        AND (p_hotel_id IS NULL OR om.hotel_id = p_hotel_id)
        AND (p_department_id IS NULL OR om.department_id = p_department_id)
        AND (p_target_role IS NULL OR p_target_role = 'all' OR om.role::text = p_target_role)
    ) INTO v_eligible_users;
  END IF;

  IF array_length(v_eligible_users, 1) IS NULL OR array_length(v_eligible_users, 1) = 0 THEN
    RAISE EXCEPTION 'No eligible active learners found in the selected assignment scope.';
  END IF;

  -- 4. Create Rule Snapshot in training_assignment_rules
  INSERT INTO public.training_assignment_rules (
    training_module_id,
    content_id,
    content_type,
    organization_id,
    brand_id,
    hotel_id,
    department_id,
    target_role,
    target_type,
    target_id,
    scope_type,
    scope_id,
    target_user_ids,
    recipient_count,
    due_date,
    priority,
    instructions,
    requires_acknowledgement,
    notify_on_due,
    reminder_days_before,
    assigned_by,
    created_by,
    is_active,
    status
  ) VALUES (
    p_course_id,
    p_course_id,
    'module',
    p_organization_id,
    p_brand_id,
    p_hotel_id,
    p_department_id,
    p_target_role,
    p_scope_type,
    COALESCE(p_hotel_id::text, p_department_id::text, p_brand_id::text, p_organization_id::text),
    p_scope_type,
    COALESCE(p_hotel_id, p_department_id, p_brand_id, p_organization_id),
    p_eligible_users,
    array_length(v_eligible_users, 1),
    p_due_date,
    p_priority,
    p_instructions,
    p_requires_acknowledgement,
    p_notify_on_due,
    p_reminder_days_before,
    v_caller_id,
    v_caller_id,
    true,
    'active'
  )
  RETURNING id INTO v_rule_id;

  -- 5. Instantiate Scoped Progress & Enrollments Records
  FOREACH v_user_id IN ARRAY v_eligible_users LOOP
    INSERT INTO public.training_progress (
      user_id,
      training_id,
      assignment_id,
      organization_id,
      lp_content_type,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_course_id,
      v_rule_id,
      p_organization_id,
      'module',
      'not_started'::training_status,
      now(),
      now()
    )
    ON CONFLICT (user_id, training_id) DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      organization_id = EXCLUDED.organization_id,
      updated_at = now();

    -- Also maintain canonical enrollments table
    INSERT INTO public.enrollments (
      user_id,
      course_id,
      assignment_id,
      organization_id,
      status,
      enrolled_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_course_id,
      v_rule_id,
      p_organization_id,
      'enrolled'::enrollment_status,
      now(),
      now(),
      now()
    )
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      organization_id = EXCLUDED.organization_id,
      updated_at = now();

    -- Create in-app notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      is_read,
      created_at
    ) VALUES (
      v_user_id,
      'New Training Assigned: ' || v_course_title,
      COALESCE(p_instructions, 'You have been assigned to complete "' || v_course_title || '".'),
      'training_assigned',
      '/training/player/' || p_course_id,
      false,
      now()
    );
  END LOOP;

  -- 6. Log Platform Audit Trail if Operator
  IF (v_scopes->>'is_platform_admin')::boolean IS TRUE THEN
    INSERT INTO public.platform_audit_logs (
      actor_id,
      action,
      resource_type,
      resource_id,
      target_organization_id,
      metadata
    ) VALUES (
      v_caller_id,
      'create_training_assignment',
      'training_assignment_rules',
      v_rule_id,
      p_organization_id,
      jsonb_build_object(
        'course_id', p_course_id,
        'course_title', v_course_title,
        'scope_type', p_scope_type,
        'recipient_count', array_length(v_eligible_users, 1),
        'due_date', p_due_date
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', v_rule_id,
    'course_id', p_course_id,
    'recipient_count', array_length(v_eligible_users, 1),
    'scope_type', p_scope_type
  );
END;
$$;

-- 6. Replace Legacy Unsafe Trigger
DROP TRIGGER IF EXISTS trg_generate_assignment_progress ON public.training_assignment_rules;
DROP FUNCTION IF EXISTS public.generate_assignment_progress();

-- 7. Hardened Multi-Tenant RLS Policies on training_assignment_rules
ALTER TABLE public.training_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "multitenant_tar_select" ON public.training_assignment_rules;
CREATE POLICY multitenant_tar_select ON public.training_assignment_rules
  FOR SELECT TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      organization_id IN (SELECT unnest(current_user_organization_ids()))
      OR has_active_platform_session(organization_id)
    )
  );

DROP POLICY IF EXISTS "multitenant_tar_insert" ON public.training_assignment_rules;
CREATE POLICY multitenant_tar_insert ON public.training_assignment_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    is_platform_super_admin()
    OR (
      (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))
      AND is_tenant_content_editor(organization_id)
    )
  );

DROP POLICY IF EXISTS "multitenant_tar_update" ON public.training_assignment_rules;
CREATE POLICY multitenant_tar_update ON public.training_assignment_rules
  FOR UPDATE TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))
      AND (created_by = auth.uid() OR is_tenant_admin(organization_id))
    )
  )
  WITH CHECK (
    is_platform_super_admin()
    OR (
      (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))
      AND (created_by = auth.uid() OR is_tenant_admin(organization_id))
    )
  );

DROP POLICY IF EXISTS "multitenant_tar_delete" ON public.training_assignment_rules;
CREATE POLICY multitenant_tar_delete ON public.training_assignment_rules
  FOR DELETE TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))
      AND (created_by = auth.uid() OR is_tenant_admin(organization_id))
    )
  );
