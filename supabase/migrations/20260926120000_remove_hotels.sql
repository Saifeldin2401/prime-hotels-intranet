-- =============================================================================
-- Remove hotels ("properties") from the data model.
--
-- Altus Connect no longer models hotels/properties under an organization:
-- people, departments, content and training belong to the organization
-- directly. This migration
--   1. archives every hotel/property value into schema hotel_archive,
--   2. merges per-hotel duplicate departments into one per organization,
--   3. maps the hotel_admin membership role to department_manager,
--   4. turns 'property' document visibility into organization-wide,
--   5. rewrites every function, view, policy and trigger that read hotels,
--   6. drops the hotel/property columns, the hotels table and the
--      hotel-only functions.
--
-- Deploy order: edge functions -> frontend -> this migration -> regenerate
-- src/types/database.generated.ts (npm run db:types).
--
-- Kept on purpose:
--   * the enum label membership_role 'hotel_admin' (Postgres cannot drop an
--     enum label without rebuilding the type); a CHECK constraint forbids it.
--   * the document_visibility labels 'all_properties' (= whole organization)
--     and 'property' (unused after step 4) for the same reason.
--   * brands (0 rows) - out of scope for this change.
-- =============================================================================

BEGIN;

-- WORK IN PROGRESS: part 2 (remaining ~40 functions, views, fill triggers,
-- column/table drops, unique index, ACLs) is not written yet. Do not apply.
-- [WIP guard removed]

-- -----------------------------------------------------------------------------
-- 1. Archive
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS hotel_archive;
REVOKE ALL ON SCHEMA hotel_archive FROM PUBLIC, anon, authenticated;

CREATE TABLE hotel_archive.hotels AS SELECT * FROM public.hotels;
CREATE TABLE hotel_archive.departments AS SELECT * FROM public.departments;
CREATE TABLE hotel_archive.employee_transfer_logs AS SELECT * FROM public.employee_transfer_logs;
CREATE TABLE hotel_archive.hotel_admin_memberships AS
  SELECT * FROM public.organization_memberships WHERE role = 'hotel_admin';
CREATE TABLE hotel_archive.property_documents AS
  SELECT id, visibility, property_id, hotel_id FROM public.documents WHERE visibility = 'property';

-- Every non-null hotel/property value, one row per (table, column, row id).
CREATE TABLE hotel_archive.column_values (
  table_name  text NOT NULL,
  column_name text NOT NULL,
  row_id      text NOT NULL,
  value       uuid NOT NULL
);

DO $archive$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND t.table_type = 'BASE TABLE'
       AND c.table_name NOT IN ('hotels', 'employee_transfer_logs')
       AND c.column_name IN ('hotel_id', 'property_id', 'target_property_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns k
                    WHERE k.table_schema = 'public' AND k.table_name = c.table_name AND k.column_name = 'id')
  LOOP
    EXECUTE format(
      'INSERT INTO hotel_archive.column_values SELECT %L, %L, id::text, %I FROM public.%I WHERE %I IS NOT NULL',
      r.table_name, r.column_name, r.column_name, r.table_name, r.column_name);
  END LOOP;
END
$archive$;

-- -----------------------------------------------------------------------------
-- 2. Merge per-hotel duplicate departments (60 -> 12 today)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _dept_map ON COMMIT DROP AS
SELECT id AS old_id, canon AS new_id
  FROM (
    SELECT id,
           first_value(id) OVER (
             PARTITION BY organization_id, lower(btrim(name))
             ORDER BY is_active DESC, (hotel_id IS NULL) DESC, created_at, id) AS canon
      FROM public.departments
  ) d
 WHERE id <> canon;

DO $repoint$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND c.confrelid = 'public.departments'::regclass
  LOOP
    -- Rows that would collide with an existing row on a unique key are
    -- dropped from the merged department (they are duplicates by then).
    BEGIN
      EXECUTE format(
        'UPDATE %s t SET %I = m.new_id FROM _dept_map m WHERE t.%I = m.old_id',
        r.tbl, r.col, r.col);
    EXCEPTION WHEN unique_violation THEN
      EXECUTE format(
        'DELETE FROM %s t USING _dept_map m WHERE t.%I = m.old_id',
        r.tbl, r.col);
    END;
  END LOOP;
END
$repoint$;

-- Free-text / array references that are not foreign keys.
UPDATE public.assignments a
   SET target_id = m.new_id::text
  FROM _dept_map m
 WHERE a.target_type = 'department' AND a.target_id = m.old_id::text;
UPDATE public.assignments a
   SET scope_id = m.new_id
  FROM _dept_map m
 WHERE a.scope_id = m.old_id;

DELETE FROM public.departments d USING _dept_map m WHERE d.id = m.old_id;

-- -----------------------------------------------------------------------------
-- 3. Roles and visibility
-- -----------------------------------------------------------------------------
-- hotel_admin -> department_manager (least privilege; an org admin can raise it).
UPDATE public.organization_memberships
   SET role = 'department_manager', updated_at = now()
 WHERE role = 'hotel_admin';

-- 'property' documents were visible to one hotel; with hotels gone they are
-- organization-wide.
UPDATE public.documents SET visibility = 'all_properties' WHERE visibility = 'property';
UPDATE public.report_definitions SET scope_type = 'global' WHERE scope_type = 'property';
UPDATE public.assignments SET scope_type = 'organization' WHERE scope_type = 'hotel';
UPDATE public.assignments
   SET target_type = 'organization', target_id = organization_id::text
 WHERE target_type IN ('hotel', 'property');

-- Hotel-only table.
DROP TABLE public.employee_transfer_logs;

-- =============================================================================
-- 4. Functions
-- =============================================================================

-- Hotel-only functions.
DROP FUNCTION IF EXISTS public.process_employee_transfer(uuid, uuid, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.generate_eom_auto_selection(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.announce_eom_from_selection(uuid);
DROP FUNCTION IF EXISTS public.get_user_properties(uuid);
DROP FUNCTION IF EXISTS public.sync_property_training_progress() CASCADE;
DROP FUNCTION IF EXISTS public.set_org_from_hotel_property() CASCADE;
DROP FUNCTION IF EXISTS public.request_knowledge_content(text, text, uuid, uuid);

-- ---- role helpers -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_app_roles(p_role membership_role)
 RETURNS app_role[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE p_role
    WHEN 'organization_owner' THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'organization_admin' THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'brand_admin'        THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'training_manager'   THEN ARRAY['training_manager', 'learner']::public.app_role[]
    WHEN 'knowledge_manager'  THEN ARRAY['knowledge_manager', 'learner']::public.app_role[]
    WHEN 'department_manager' THEN ARRAY['author', 'learner']::public.app_role[]
    WHEN 'author'             THEN ARRAY['author', 'learner']::public.app_role[]
    WHEN 'instructor'         THEN ARRAY['author', 'learner']::public.app_role[]
    ELSE ARRAY['learner']::public.app_role[]
  END;
$function$;

CREATE OR REPLACE FUNCTION public.learning_manager_org_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN '{}'::uuid[]
    WHEN public.is_platform_super_admin() THEN
      ARRAY(SELECT o.id FROM public.organizations o WHERE NOT COALESCE(o.is_deleted, false))
    ELSE ARRAY(
      SELECT om.organization_id
        FROM public.organization_memberships om
       WHERE om.user_id = auth.uid()
         AND om.is_active
         AND om.role IN ('organization_owner', 'organization_admin', 'brand_admin',
                         'department_manager', 'training_manager')
         AND public.org_is_operational(om.organization_id)
      UNION
      SELECT o.id FROM public.organizations o WHERE public.has_active_platform_session(o.id))
  END;
$function$;

CREATE OR REPLACE FUNCTION public.can_author_question(p_org_id uuid, p_created_by uuid, p_is_master boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_super_admin()
    OR p_created_by = auth.uid()
    OR (p_org_id IS NOT NULL AND public.org_visible(p_org_id) AND public.is_tenant_content_editor(p_org_id))
    OR (COALESCE(p_is_master, false) AND EXISTS (
          SELECT 1 FROM public.organization_memberships m
           WHERE m.user_id = auth.uid()
             AND m.is_active
             AND m.role IN ('organization_owner', 'organization_admin', 'brand_admin',
                            'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
             AND public.org_is_operational(m.organization_id)));
$function$;

CREATE OR REPLACE FUNCTION public.has_profile_access(_admin_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _admin_id = _target_user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _admin_id AND role = 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships ma
      JOIN public.organization_memberships mt ON mt.organization_id = ma.organization_id
      WHERE ma.user_id = _admin_id AND mt.user_id = _target_user_id
        AND ma.is_active = true AND mt.is_active = true
        AND ma.role IN ('organization_owner','organization_admin')
    );
$function$;

-- can_manage_learning_assignment(org, hotel) -> can_manage_learning_assignment(org)
CREATE OR REPLACE FUNCTION public.can_manage_learning_assignment(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_operator(auth.uid())
    OR (p_org_id = ANY (public.current_user_organization_ids())
        AND public.org_is_operational(p_org_id)
        AND (public.is_tenant_admin(p_org_id)
             OR EXISTS (
               SELECT 1 FROM public.organization_memberships om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active
                  AND om.role IN ('organization_owner', 'organization_admin',
                                  'department_manager', 'training_manager'))));
$function$;

DO $policies$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['learning_assignment_exemptions', 'learning_assignment_user_overrides'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_manage_delete', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_manage_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_manage_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_policy', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_manage_learning_assignment(organization_id))', t || '_manage_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_learning_assignment(organization_id))', t || '_manage_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_learning_assignment(organization_id)) WITH CHECK (public.can_manage_learning_assignment(organization_id))', t || '_manage_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((user_id = (SELECT auth.uid())) OR public.can_manage_learning_assignment(organization_id))', t || '_select_policy', t);
  END LOOP;
END
$policies$;

DROP FUNCTION public.can_manage_learning_assignment(uuid, uuid);

CREATE OR REPLACE FUNCTION public.start_recertification(p_user_id uuid, p_training_module_id uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_module public.courses%ROWTYPE;
  v_progress public.training_progress%ROWTYPE;
  v_history_id uuid;
  v_rule_id uuid;
  v_due timestamptz := COALESCE(p_due_date, now() + interval '14 days');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_module FROM public.courses WHERE id = p_training_module_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  IF NOT (public.is_platform_super_admin()
          OR (public.org_visible(v_module.organization_id)
              AND (public.is_tenant_content_editor(v_module.organization_id)
                   OR public.can_manage_learning_assignment(v_module.organization_id)))) THEN
    RAISE EXCEPTION 'Not authorized to recertify learners for this training';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships om
     WHERE om.user_id = p_user_id AND om.organization_id = v_module.organization_id AND om.is_active
  ) THEN
    RAISE EXCEPTION 'Learner is not an active member of this organization';
  END IF;

  IF v_due <= now() THEN
    RAISE EXCEPTION 'Due date must be in the future';
  END IF;

  SELECT * INTO v_progress FROM public.training_progress
   WHERE user_id = p_user_id AND training_id = p_training_module_id
   FOR UPDATE;

  IF v_progress.id IS NOT NULL AND v_progress.completed_at IS NOT NULL THEN
    v_history_id := public._reset_training_cycle(v_progress.id, 'manual_recertification', v_actor);
  END IF;

  v_rule_id := public._issue_recertification_assignment(
    v_module.organization_id, p_user_id, v_module.id, v_module.title,
    v_progress.id, v_due, v_actor,
    'Recertification required for "' || v_module.title || '". Please complete it by '
      || to_char(v_due, 'YYYY-MM-DD') || '.');

  RETURN jsonb_build_object(
    'assignment_id', v_rule_id,
    'history_id', v_history_id,
    'due_date', v_due
  );
END;
$function$;

-- ---- documents & reports ----------------------------------------------------
-- Replaces has_property_access(): content is visible to members of its
-- organization. The four policies that called it are rewritten below.
CREATE OR REPLACE FUNCTION public.validate_document_access(p_document_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_doc RECORD;
BEGIN
    SELECT * INTO v_doc
    FROM documents
    WHERE id = p_document_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF public.is_platform_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Everything below is limited to the document's own organization
    -- (the old version returned TRUE for 'all_properties' across tenants).
    IF v_doc.organization_id IS NULL OR NOT public.org_visible(v_doc.organization_id) THEN
        RETURN FALSE;
    END IF;

    IF public.is_tenant_content_editor(v_doc.organization_id) THEN
        RETURN TRUE;
    END IF;

    IF v_doc.created_by = v_user_id OR v_doc.owner_id = v_user_id THEN
        RETURN TRUE;
    END IF;

    IF v_doc.status = 'PUBLISHED' THEN
        CASE v_doc.visibility
            WHEN 'all_properties', 'property' THEN
                RETURN TRUE;
            WHEN 'department' THEN
                RETURN EXISTS (
                    SELECT 1 FROM organization_memberships
                    WHERE user_id = v_user_id AND is_active = true
                      AND organization_id = v_doc.organization_id
                      AND department_id = v_doc.department_id
                );
            WHEN 'specific_departments' THEN
                RETURN EXISTS (
                    SELECT 1 FROM organization_memberships om
                    JOIN document_department_access dda ON dda.department_id = om.department_id
                    WHERE om.user_id = v_user_id AND om.is_active = true
                      AND om.organization_id = v_doc.organization_id
                      AND dda.document_id = v_doc.id
                );
            WHEN 'role' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_roles
                    WHERE user_id = v_user_id AND role::TEXT = v_doc.role::TEXT
                );
            ELSE
                RETURN FALSE;
        END CASE;
    END IF;

    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_report_definition(_report_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rpt record;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT rd.id, rd.scope_type, rd.department_id, rd.created_by
  INTO rpt
  FROM public.report_definitions rd
  WHERE rd.id = _report_id
  LIMIT 1;

  IF rpt IS NULL THEN
    RETURN false;
  END IF;

  IF rpt.created_by IS NOT NULL AND rpt.created_by = (select auth.uid()) THEN
    RETURN true;
  END IF;

  IF public.is_hr_or_admin((select auth.uid())) THEN
    RETURN true;
  END IF;

  IF rpt.scope_type = 'global' THEN
    RETURN true;
  ELSIF rpt.scope_type = 'department' THEN
    RETURN rpt.department_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_memberships om
        WHERE om.user_id = (select auth.uid())
          AND om.is_active = true
          AND om.department_id = rpt.department_id
      );
  END IF;

  RETURN false;
END;
$function$;

DROP POLICY IF EXISTS document_versions_select ON public.document_versions;
CREATE POLICY document_versions_select ON public.document_versions FOR SELECT
  USING ((org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR (EXISTS (
    SELECT 1 FROM documents d
     WHERE d.id = document_versions.document_id
       AND (d.created_by = (SELECT auth.uid()) OR d.status = 'PUBLISHED'::document_status)))))
    OR is_platform_super_admin());

DROP POLICY IF EXISTS document_tag_assignments_select ON public.document_tag_assignments;
CREATE POLICY document_tag_assignments_select ON public.document_tag_assignments FOR SELECT
  USING ((org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR (EXISTS (
    SELECT 1 FROM documents d
     WHERE d.id = document_tag_assignments.document_id
       AND (d.created_by = (SELECT auth.uid()) OR d.status = 'PUBLISHED'::document_status)))))
    OR is_platform_super_admin());

DROP POLICY IF EXISTS document_folders_delete ON public.document_folders;
CREATE POLICY document_folders_delete ON public.document_folders FOR DELETE
  USING (org_visible(organization_id) AND (is_system = false)
    AND (has_role((SELECT auth.uid()), 'regional_admin'::app_role)
         OR is_tenant_content_editor(organization_id)
         OR (created_by = (SELECT auth.uid()))
         OR is_platform_super_admin()));

DROP POLICY IF EXISTS document_notification_rules_insert_own ON public.document_notification_rules;
CREATE POLICY document_notification_rules_insert_own ON public.document_notification_rules FOR INSERT
  WITH CHECK ((user_id = (SELECT auth.uid())) AND (organization_id IS NOT NULL) AND org_visible(organization_id)
    AND ((folder_id IS NULL) OR (EXISTS (
      SELECT 1 FROM document_folders df
       WHERE df.id = document_notification_rules.folder_id
         AND (df.is_system = true OR df.created_by = (SELECT auth.uid()) OR df.organization_id = document_notification_rules.organization_id)))));

DROP FUNCTION public.has_property_access(uuid, uuid);

-- ---- entitlements -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_entitlements(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_org public.organizations; v_plan public.subscription_plans;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  SELECT sp.* INTO v_plan FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = p_org_id AND s.status = 'active'
  ORDER BY s.current_period_end DESC NULLS LAST LIMIT 1;
  RETURN jsonb_build_object(
    'plan', COALESCE(v_plan.name, 'None'), 'plan_code', v_plan.code,
    'max_learners', COALESCE(v_org.max_learners, v_plan.max_users, 100),
    'max_storage_gb', COALESCE(v_org.max_storage_gb, v_plan.max_storage_gb, 50),
    'ai_credits_monthly', COALESCE(v_org.max_ai_credits_monthly, 0),
    'ai_credits_used', COALESCE(v_org.ai_credits_used_this_month, 0),
    'plan_features', COALESCE(v_plan.features, '{}'::jsonb),
    'usage', jsonb_build_object(
      'learners', (SELECT count(*) FROM public.organization_memberships WHERE organization_id = p_org_id AND is_active = true)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_entitlement(p_org_id uuid, p_resource text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  v := public.effective_entitlements(p_org_id);
  RETURN CASE p_resource
    WHEN 'learner' THEN (v->'usage'->>'learners')::int < (v->>'max_learners')::int
    ELSE true END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_protect_organization_control_plane()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    IF (NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status)
       OR (NEW.is_active IS DISTINCT FROM OLD.is_active)
       OR (NEW.is_deleted IS DISTINCT FROM OLD.is_deleted)
       OR (NEW.max_learners IS DISTINCT FROM OLD.max_learners)
       OR (NEW.max_storage_gb IS DISTINCT FROM OLD.max_storage_gb)
       OR (NEW.max_ai_credits_monthly IS DISTINCT FROM OLD.max_ai_credits_monthly)
    THEN
      RAISE EXCEPTION 'Restricted organization control-plane modification: requires platform operator with tenant.manage privilege'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date_of_birth date;
  v_org_id uuid := NULL;
  v_role_str text := NULL;
  v_membership_role public.membership_role := 'learner'::public.membership_role;
BEGIN
  IF NEW.raw_user_meta_data ? 'date_of_birth'
     AND COALESCE(NEW.raw_user_meta_data->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::date;
  ELSE
    v_date_of_birth := CURRENT_DATE;
  END IF;

  -- Extract organization_id from user metadata if provided
  IF NEW.raw_user_meta_data ? 'organization_id'
     AND COALESCE(NEW.raw_user_meta_data->>'organization_id', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  -- Extract role from metadata if provided
  IF NEW.raw_user_meta_data ? 'role' THEN
    v_role_str := NEW.raw_user_meta_data->>'role';
    IF v_role_str IN ('organization_owner','organization_admin','brand_admin','department_manager','training_manager','knowledge_manager','author','instructor','learner') THEN
      v_membership_role := v_role_str::public.membership_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, date_of_birth, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_date_of_birth,
    v_org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);

  -- If an organization_id was specified, ensure a membership record exists
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role, is_active, is_primary)
    VALUES (v_org_id, NEW.id, v_membership_role, true, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---- assignment engine ------------------------------------------------------
DROP FUNCTION public._assign_module_to_user(uuid, uuid, uuid, timestamptz, boolean, uuid, uuid, uuid, text);
CREATE FUNCTION public._assign_module_to_user(p_org_id uuid, p_user_id uuid, p_module_id uuid, p_due_date timestamp with time zone, p_is_mandatory boolean, p_assigned_by uuid, p_department_id uuid, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rule_id uuid;
BEGIN
  SELECT r.id INTO v_rule_id
    FROM public.assignments r
   WHERE r.organization_id = p_org_id
     AND r.target_type = 'user' AND r.target_id = p_user_id::text
     AND r.content_type = 'module' AND r.content_id = p_module_id
     AND r.is_active AND NOT COALESCE(r.is_deleted, false)
   LIMIT 1;
  IF v_rule_id IS NOT NULL THEN
    RETURN NULL;  -- already assigned
  END IF;

  INSERT INTO public.assignments (
    organization_id, target_type, target_id, content_type, content_id, training_module_id,
    department_id, scope_type, due_date, is_mandatory, priority,
    assigned_by, created_by, is_active, status, instructions
  ) VALUES (
    p_org_id, 'user', p_user_id::text, 'module', p_module_id, p_module_id,
    p_department_id, 'individual', p_due_date, COALESCE(p_is_mandatory, false),
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
REVOKE ALL ON FUNCTION public._assign_module_to_user(uuid, uuid, uuid, timestamptz, boolean, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

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
      FROM public.assignments tar
     WHERE tar.is_active AND NOT COALESCE(tar.is_deleted, false)
       AND tar.organization_id = NEW.organization_id
       AND public._is_standing_assignment_rule(tar.target_type, tar.target_user_ids)
       AND (tar.department_id IS NULL OR tar.department_id = NEW.department_id OR (tar.scope_type = 'department' AND tar.scope_id = NEW.department_id))
       AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = NEW.role::text)
  LOOP
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    IF v_module_id IS NOT NULL THEN
      PERFORM public._assign_module_to_user(
        NEW.organization_id, NEW.user_id, v_module_id, now() + make_interval(days => v_rule.due_in_days),
        v_rule.is_mandatory, NEW.invited_by, NEW.department_id,
        'Auto-assigned upon new hire onboarding');
    END IF;
  END LOOP;

  FOR v_path IN
    SELECT tp.id AS path_id, tp.is_mandatory
      FROM public.training_paths tp
     WHERE tp.is_active = true
       AND tp.organization_id = NEW.organization_id
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
          v_path.is_mandatory, NEW.invited_by, NEW.department_id,
          'Auto-assigned via onboarding path');
      END IF;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public._module_assignment_targets(p_org_ids uuid[])
 RETURNS TABLE(user_id uuid, training_id uuid, due_date timestamp with time zone, organization_id uuid, rule_created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH rules AS (
    SELECT r.target_type, r.target_id, r.target_user_ids, r.target_role,
           r.department_id, r.brand_id,
           COALESCE(r.training_module_id, r.content_id) AS content_id,
           r.due_date, r.organization_id, r.created_at
      FROM public.assignments r
     WHERE r.is_active AND NOT COALESCE(r.is_deleted, false)
       AND r.content_type = 'module'
       AND r.organization_id = ANY (p_org_ids)
  )
  SELECT m.user_id, r.content_id, r.due_date, r.organization_id, r.created_at
    FROM rules r
    JOIN public.organization_memberships m ON m.organization_id = r.organization_id AND m.is_active
   WHERE CASE
     WHEN r.target_user_ids IS NOT NULL AND cardinality(r.target_user_ids) > 0
       THEN m.user_id = ANY (r.target_user_ids)
     WHEN r.target_type IN ('user', 'individual')
       THEN m.user_id = public._safe_uuid(r.target_id)
     WHEN r.target_type IN ('everyone', 'organization')
       THEN (r.target_role IS NULL OR r.target_role = 'all' OR m.role::text = r.target_role)
     WHEN r.target_type = 'brand'
       THEN m.brand_id = COALESCE(r.brand_id, public._safe_uuid(r.target_id))
     WHEN r.target_type = 'department'
       THEN m.department_id = COALESCE(r.department_id, public._safe_uuid(r.target_id))
     WHEN r.target_type = 'role'
       THEN m.role::text = r.target_id
     ELSE false
   END;
$function$;

-- _learner_matches_filters loses p_property_id; its callers are rewritten below.
DROP FUNCTION public._learner_matches_filters(uuid, uuid, uuid, uuid, boolean);
CREATE FUNCTION public._learner_matches_filters(p_user_id uuid, p_org_id uuid, p_department_id uuid, p_my_team_only boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships m
             WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.is_active
               AND m.department_id = p_department_id))
     AND (NOT COALESCE(p_my_team_only, false) OR EXISTS (
            SELECT 1 FROM public.organization_memberships m
              JOIN public.departments d ON d.id = m.department_id
             WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.is_active
               AND d.manager_id = auth.uid()));
$function$;
REVOKE ALL ON FUNCTION public._learner_matches_filters(uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.get_expiring_certificates(integer, uuid, uuid);
CREATE FUNCTION public.get_expiring_certificates(p_within_days integer DEFAULT 90, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(certificate_id uuid, user_id uuid, recipient_name text, title text, training_module_id uuid, expiry_date timestamp with time zone, days_until_expiry integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        c.id, c.user_id, c.recipient_name::text, c.title::text, c.training_module_id, c.expiry_date,
        (extract(day FROM c.expiry_date - now()))::integer
      FROM public.certificates c
     WHERE c.organization_id = ANY (public.learning_manager_org_ids())
       AND c.status = 'active'
       AND c.expiry_date IS NOT NULL
       AND c.expiry_date <= now() + make_interval(days => p_within_days)
       AND public._learner_matches_filters(c.user_id, c.organization_id, p_department_id, false)
     ORDER BY c.expiry_date ASC;
$function$;

DROP FUNCTION public.get_skills_matrix(uuid, uuid, boolean);
CREATE FUNCTION public.get_skills_matrix(p_department_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
 RETURNS TABLE(user_id uuid, user_name text, department_name text, skill_id uuid, skill_name text, skill_category text, proficiency_level integer, verified boolean, has_skill boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    scoped_users AS (
        SELECT DISTINCT ON (p.id)
            p.id, p.full_name, d.name AS department_name
          FROM public.profiles p
          JOIN public.organization_memberships ud ON ud.user_id = p.id AND ud.is_active = true
          CROSS JOIN scope
          LEFT JOIN public.departments d ON d.id = ud.department_id
         WHERE p.is_active = true
           AND ud.organization_id = ANY (scope.orgs)
           AND public._learner_matches_filters(p.id, ud.organization_id, p_department_id, p_my_team_only)
         ORDER BY p.id, ud.department_id NULLS LAST
    )
    SELECT
        su.id, su.full_name, su.department_name, s.id, s.name, s.category,
        us.proficiency_level, us.verified, (us.id IS NOT NULL) AS has_skill
      FROM scoped_users su
      CROSS JOIN public.skills s
      CROSS JOIN scope
      LEFT JOIN public.user_skills us
        ON us.user_id = su.id AND us.skill_id = s.id AND us.organization_id = ANY (scope.orgs)
     ORDER BY su.full_name, s.category, s.name;
$function$;

-- =============================================================================
-- PART 2: Views, Triggers, Rewritten Functions, Table/Column Drops, Unique Index
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4. Views (recreated without property_id / hotel_id)
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.activity_log_v CASCADE;
CREATE VIEW public.activity_log_v AS
 SELECT id,
    actor_id AS user_id,
    (metadata ->> 'action_type'::text) AS action_type,
    entity_type AS target_type,
    entity_id AS target_id,
    (metadata ->> 'target_name'::text) AS target_name,
    (metadata -> 'extra'::text) AS metadata,
    department_id,
    created_at
   FROM public.system_events
  WHERE (event_type = 'activity'::text);

DROP VIEW IF EXISTS public.documents_article_v CASCADE;
CREATE VIEW public.documents_article_v AS
 SELECT id,
    title,
    description,
    file_url,
    visibility,
    department_id,
    role,
    status,
    requires_acknowledgment,
    created_by,
    current_version,
    created_at,
    updated_at,
    summary,
    summary_ar,
    is_deleted,
    file_size,
    category_id,
    content,
    content_type,
    checklist_items,
    faq_items,
    video_url,
    images,
    featured,
    view_count,
    estimated_read_time,
    last_reviewed_at,
    last_reviewed_by,
    valid_from,
    valid_until,
    title_ar,
    description_ar,
    content_ar,
    translation_status,
    last_translated_at,
    expires_at,
    review_reminder_date,
    document_number,
    confidentiality_level,
    owner_id,
    folder_id,
    file_extension,
    download_count,
    last_downloaded_at,
    watermark_text,
    is_archived,
    search_vector,
    deleted_at,
    file_type,
    linked_training_id,
    last_published_by,
    sop_code,
    subcategory_id,
    review_frequency_months,
    next_review_date,
    requires_quiz,
    passing_score,
    quiz_enabled,
    priority,
    compliance_level,
    linked_quiz_id,
    updated_by,
    published_at,
    archived_at,
    archived_by,
    visibility_scope,
    training_module_id,
    block_type,
    block_order,
    content_data,
    is_mandatory,
    duration_seconds,
    points,
    ai_generated,
    ai_source_content,
    content_url,
    ai_tags,
    ai_category,
    ai_summary,
    ai_processed_at,
    knowledge_base_status,
    is_active_kb_version,
    supersedes_document_id,
    reviewed_by,
    reviewed_at,
    published_by
   FROM public.documents
  WHERE (content_type = 'document'::text);

DROP VIEW IF EXISTS public.documents_sop_v CASCADE;
CREATE VIEW public.documents_sop_v AS
 SELECT id,
    title,
    description,
    file_url,
    visibility,
    department_id,
    role,
    status,
    requires_acknowledgment,
    created_by,
    current_version,
    created_at,
    updated_at,
    summary,
    summary_ar,
    is_deleted,
    file_size,
    category_id,
    content,
    content_type,
    checklist_items,
    faq_items,
    video_url,
    images,
    featured,
    view_count,
    estimated_read_time,
    last_reviewed_at,
    last_reviewed_by,
    valid_from,
    valid_until,
    title_ar,
    description_ar,
    content_ar,
    translation_status,
    last_translated_at,
    expires_at,
    review_reminder_date,
    document_number,
    confidentiality_level,
    owner_id,
    folder_id,
    file_extension,
    download_count,
    last_downloaded_at,
    watermark_text,
    is_archived,
    search_vector,
    deleted_at,
    file_type,
    linked_training_id,
    last_published_by,
    sop_code,
    subcategory_id,
    review_frequency_months,
    next_review_date,
    requires_quiz,
    passing_score,
    quiz_enabled,
    priority,
    compliance_level,
    linked_quiz_id,
    updated_by,
    published_at,
    archived_at,
    archived_by,
    visibility_scope,
    training_module_id,
    block_type,
    block_order,
    content_data,
    is_mandatory,
    duration_seconds,
    points,
    ai_generated,
    ai_source_content,
    content_url,
    ai_tags,
    ai_category,
    ai_summary,
    ai_processed_at,
    knowledge_base_status,
    is_active_kb_version,
    supersedes_document_id,
    reviewed_by,
    reviewed_at,
    published_by
   FROM public.documents
  WHERE (content_type = 'sop'::text);

DROP VIEW IF EXISTS public.sop_documents_v CASCADE;
CREATE VIEW public.sop_documents_v AS
 SELECT id,
    title,
    COALESCE(title_ar, ''::text) AS title_ar,
    sop_code AS code,
    description,
    COALESCE(description_ar, ''::text) AS description_ar,
    department_id,
    category_id,
    subcategory_id,
        CASE (status)::text
            WHEN 'DRAFT'::text THEN 'draft'::text
            WHEN 'PENDING_REVIEW'::text THEN 'under_review'::text
            WHEN 'APPROVED'::text THEN 'approved'::text
            WHEN 'REJECTED'::text THEN 'obsolete'::text
            ELSE 'draft'::text
        END AS status,
    COALESCE(current_version, 1) AS version,
    NULL::uuid AS current_version_id,
    COALESCE(review_frequency_months, 12) AS review_frequency_months,
    next_review_date,
    false AS is_template,
    NULL::uuid AS template_id,
    created_by,
    updated_by,
    created_at,
    updated_at,
    published_at,
    last_published_by AS published_by,
    archived_at,
    archived_by,
    visibility_scope,
    content_type,
    COALESCE(requires_acknowledgment, false) AS requires_acknowledgment,
    COALESCE(view_count, 0) AS view_count,
    featured,
    estimated_read_time,
    last_reviewed_at,
    last_reviewed_by,
    content,
    COALESCE(requires_quiz, false) AS requires_quiz,
    COALESCE(passing_score, 70) AS passing_score,
    COALESCE(quiz_enabled, false) AS quiz_enabled,
    COALESCE(priority, 'medium'::text) AS priority,
    COALESCE(compliance_level, 'standard'::text) AS compliance_level,
    video_url,
    COALESCE(checklist_items, '[]'::jsonb) AS checklist_items,
    COALESCE(faq_items, '[]'::jsonb) AS faq_items,
    linked_quiz_id,
    linked_training_id,
    COALESCE(images, '[]'::jsonb) AS images,
    COALESCE(is_deleted, false) AS is_deleted,
    COALESCE(file_size, (0)::bigint) AS file_size
   FROM public.documents
  WHERE (content_type = 'sop'::text);

-- -----------------------------------------------------------------------------
-- 5. Fill Triggers (recreated without hotels)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.media_assets;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('member:uploaded_by');

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.media_collections;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.media_collections
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('member:created_by');

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.assignments;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('departments:department_id', 'departments:target_department_id', 'brands:brand_id', 'member:created_by');

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.training_sessions;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('courses:course_id', 'member:instructor_id');

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.unified_questions;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT ON public.unified_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id('question_banks:question_bank_id', 'brands:brand_id', 'member:created_by');

-- -----------------------------------------------------------------------------
-- 6. Rewritten Functions
-- -----------------------------------------------------------------------------

-- can_view_employee_public_profile
CREATE OR REPLACE FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_roles public.app_role[];
  v_org_ids uuid[];
  v_department_ids uuid[];
BEGIN
  IF v_uid IS NULL OR p_target_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  IF public.is_platform_operator(v_uid) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(ur.role), ARRAY[]::public.app_role[])
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_uid;

  IF (
    'administrator'::public.app_role = ANY(v_roles) OR
    'corporate_admin'::public.app_role = ANY(v_roles) OR
    'regional_admin'::public.app_role = ANY(v_roles) OR
    'regional_hr'::public.app_role = ANY(v_roles) OR
    'super_admin'::public.app_role = ANY(v_roles)
  ) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(om.organization_id), ARRAY[]::uuid[])
  INTO v_org_ids
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid AND om.is_active = true;

  SELECT COALESCE(array_agg(om.department_id), ARRAY[]::uuid[])
  INTO v_department_ids
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid AND om.is_active = true AND om.department_id IS NOT NULL;

  IF 'department_head'::public.app_role = ANY(v_roles) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.user_id = p_target_user_id AND om.is_active = true
        AND om.department_id = ANY(v_department_ids)
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = p_target_user_id AND om.is_active = true
      AND om.organization_id = ANY(v_org_ids)
  );
END;
$function$;

-- get_employee_directory
CREATE OR REPLACE FUNCTION public.get_employee_directory(
  p_search text DEFAULT NULL::text,
  p_property_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid,
  p_role app_role DEFAULT NULL::app_role,
  p_management_level text DEFAULT 'all'::text,
  p_sort text DEFAULT 'name_asc'::text,
  p_include_inactive boolean DEFAULT false
)
 RETURNS TABLE(
  id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text,
  bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text,
  manager_title text, primary_property_id uuid, primary_property_name text, primary_department_id uuid,
  primary_department_name text, property_ids uuid[], property_names text[], department_ids uuid[],
  department_names text[], roles app_role[], management_level text, updated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH scoped_profiles AS (
  SELECT
    p.id, p.full_name, p.avatar_url, p.job_title, p.email, p.phone_extension, p.bio,
    p.hire_date, p.is_active, p.staff_id, p.reporting_to, p.updated_at
  FROM public.profiles p
  WHERE COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
    AND (p_include_inactive OR p.is_active = true)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      COALESCE(p.job_title, '') ILIKE '%' || p_search || '%' OR
      COALESCE(p.staff_id, '') ILIKE '%' || p_search || '%'
    )
),
scope_data AS (
  SELECT
    sp.*,
    ARRAY[]::uuid[] AS property_ids,
    ARRAY[]::text[] AS property_names,
    NULL::uuid AS primary_property_id,
    NULL::text AS primary_property_name,
    COALESCE(dept.department_ids, ARRAY[]::uuid[]) AS department_ids,
    COALESCE(dept.department_names, ARRAY[]::text[]) AS department_names,
    dept.primary_department_id,
    dept.primary_department_name,
    COALESCE(rl.roles, ARRAY[]::public.app_role[]) AS roles
  FROM scoped_profiles sp
  LEFT JOIN LATERAL (
    SELECT
      array_agg(om.department_id ORDER BY d.name NULLS LAST, om.department_id) AS department_ids,
      array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, om.department_id) AS department_names,
      (array_agg(om.department_id ORDER BY d.name NULLS LAST, om.department_id))[1] AS primary_department_id,
      (array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, om.department_id))[1] AS primary_department_name
    FROM public.organization_memberships om
    LEFT JOIN public.departments d ON d.id = om.department_id
    WHERE om.user_id = sp.id AND om.is_active = true AND om.department_id IS NOT NULL
  ) dept ON true
  LEFT JOIN LATERAL (
    SELECT array_agg(ur.role ORDER BY ur.role) AS roles
    FROM public.user_roles ur
    WHERE ur.user_id = sp.id
  ) rl ON true
),
enriched AS (
  SELECT
    sd.id, sd.full_name, sd.avatar_url, sd.job_title, sd.email::text AS work_email,
    sd.phone_extension, sd.bio, sd.hire_date AS joining_date, sd.is_active, sd.staff_id,
    sd.reporting_to AS manager_id, mgr.full_name AS manager_name, mgr.job_title AS manager_title,
    sd.primary_property_id, sd.primary_property_name, sd.primary_department_id, sd.primary_department_name,
    sd.property_ids, sd.property_names, sd.department_ids, sd.department_names, sd.roles,
    CASE
      WHEN (
        'corporate_admin'::public.app_role = ANY(sd.roles) OR
        'regional_admin'::public.app_role = ANY(sd.roles) OR
        'regional_hr'::public.app_role = ANY(sd.roles)
      ) THEN 'executive'
      WHEN (
        'property_manager'::public.app_role = ANY(sd.roles) OR
        'property_hr'::public.app_role = ANY(sd.roles) OR
        'department_head'::public.app_role = ANY(sd.roles) OR
        'manager'::public.app_role = ANY(sd.roles)
      ) THEN 'management'
      ELSE 'staff'
    END AS management_level,
    sd.updated_at
  FROM scope_data sd
  LEFT JOIN public.profiles mgr ON mgr.id = sd.reporting_to
)
SELECT
  e.id, e.full_name, e.avatar_url, e.job_title, e.work_email, e.phone_extension,
  e.bio, e.joining_date, e.is_active, e.staff_id, e.manager_id, e.manager_name, e.manager_title,
  e.primary_property_id, e.primary_property_name, e.primary_department_id, e.primary_department_name,
  e.property_ids, e.property_names, e.department_ids, e.department_names, e.roles, e.management_level, e.updated_at
FROM enriched e
WHERE (p_department_id IS NULL OR p_department_id = ANY(e.department_ids))
  AND (p_role IS NULL OR p_role = ANY(e.roles))
  AND (
    p_management_level IS NULL OR lower(p_management_level) = 'all' OR
    lower(p_management_level) = lower(e.management_level)
  )
ORDER BY
  CASE WHEN p_sort = 'name_desc' THEN e.full_name END DESC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_asc' THEN e.joining_date END ASC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_desc' THEN e.joining_date END DESC NULLS LAST,
  CASE WHEN p_sort = 'name_asc' OR p_sort IS NULL THEN e.full_name END ASC NULLS LAST,
  e.full_name ASC;
$function$;

-- get_employee_public_profile
CREATE OR REPLACE FUNCTION public.get_employee_public_profile(p_profile_id uuid)
 RETURNS TABLE(
  id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text,
  bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text,
  manager_title text, property_names text[], department_names text[], roles app_role[], skills text[],
  certifications text[], direct_reports jsonb, updated_at timestamp with time zone, is_edited boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT d.*
  FROM public.get_employee_directory(
    p_search := NULL,
    p_property_id := NULL,
    p_department_id := NULL,
    p_role := NULL,
    p_management_level := 'all',
    p_sort := 'name_asc',
    p_include_inactive := true
  ) d
  WHERE d.id = p_profile_id
  LIMIT 1
),
skill_data AS (
  SELECT COALESCE(array_agg(s_name ORDER BY s_name), ARRAY[]::text[]) AS skills
  FROM (
    SELECT DISTINCT s.name AS s_name
    FROM public.user_skills us
    JOIN public.skills s ON s.id = us.skill_id
    WHERE us.user_id = p_profile_id
      AND COALESCE(us.verified, true) = true
  ) sub
),
cert_data AS (
  SELECT COALESCE(array_agg(c_title ORDER BY c_date DESC NULLS LAST), ARRAY[]::text[]) AS certifications
  FROM (
    SELECT DISTINCT ON (COALESCE(c.title, c.certificate_type, 'Certificate'))
      COALESCE(c.title, c.certificate_type, 'Certificate') AS c_title,
      COALESCE(c.completion_date, c.created_at) AS c_date
    FROM public.certificates c
    WHERE c.user_id = p_profile_id
      AND COALESCE(c.status, 'active') <> 'revoked'
    ORDER BY COALESCE(c.title, c.certificate_type, 'Certificate'), COALESCE(c.completion_date, c.created_at) DESC NULLS LAST
  ) sub
),
direct_report_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'job_title', p.job_title,
        'avatar_url', p.avatar_url
      )
      ORDER BY p.full_name
    ),
    '[]'::jsonb
  ) AS direct_reports
  FROM public.profiles p
  WHERE p.reporting_to = p_profile_id
    AND COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
)
SELECT
  b.id,
  b.full_name,
  b.avatar_url,
  b.job_title,
  b.work_email,
  b.phone_extension,
  b.bio,
  b.joining_date,
  b.is_active,
  b.staff_id,
  b.manager_id,
  b.manager_name,
  b.manager_title,
  b.property_names,
  b.department_names,
  b.roles,
  sd.skills,
  cd.certifications,
  dr.direct_reports,
  b.updated_at,
  (b.updated_at > (SELECT p.created_at FROM public.profiles p WHERE p.id = b.id)) AS is_edited
FROM base b
CROSS JOIN skill_data sd
CROSS JOIN cert_data cd
CROSS JOIN direct_report_data dr;
$function$;

-- get_org_hierarchy
CREATE OR REPLACE FUNCTION public.get_org_hierarchy(p_root_user_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text, reporting_to uuid, manager_name text, depth integer, path uuid[], path_names text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_org_ids uuid[];
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  IF public.is_platform_super_admin() THEN
    SELECT array_agg(DISTINCT om.organization_id) INTO v_org_ids
    FROM organization_memberships om
    WHERE om.is_active = true;
  ELSE
    SELECT array_agg(DISTINCT om.organization_id) INTO v_org_ids
    FROM organization_memberships om
    WHERE om.user_id = v_caller_id AND om.is_active = true;
  END IF;

  IF v_org_ids IS NULL OR array_length(v_org_ids, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      NULL::TEXT as manager_name,
      0 as depth,
      ARRAY[p.id] as path,
      ARRAY[p.full_name] as path_names
    FROM profiles p
    JOIN organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE p.is_active = true
      AND om.organization_id = ANY(v_org_ids)
      AND (
        CASE
          WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id
          ELSE p.reporting_to IS NULL
        END
      )

    UNION ALL

    SELECT
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      h.full_name as manager_name,
      h.depth + 1,
      h.path || p.id,
      h.path_names || p.full_name
    FROM profiles p
    JOIN organization_memberships om2 ON om2.user_id = p.id AND om2.is_active = true
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND om2.organization_id = ANY(v_org_ids)
      AND NOT p.id = ANY(h.path)
      AND h.depth < 20
  )
  SELECT DISTINCT ON (hierarchy.id)
    hierarchy.id,
    hierarchy.full_name,
    hierarchy.job_title,
    hierarchy.email,
    hierarchy.reporting_to,
    hierarchy.manager_name,
    hierarchy.depth,
    hierarchy.path,
    hierarchy.path_names
  FROM hierarchy
  ORDER BY hierarchy.id, hierarchy.depth;
END;
$function$;

-- get_org_structure
CREATE OR REPLACE FUNCTION public.get_org_structure(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT (public.org_visible(p_org_id) OR public.is_platform_operator()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'organization', (SELECT jsonb_build_object('id', o.id, 'name', o.name, 'lifecycle_status', o.lifecycle_status) FROM public.organizations o WHERE o.id = p_org_id),
    'brands', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) ORDER BY b.name)
                        FROM public.brands b WHERE b.organization_id = p_org_id AND b.is_deleted = false), '[]'::jsonb),
    'departments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'id', d.id, 'name', d.name,
                               'member_count', (SELECT count(*) FROM public.organization_memberships om WHERE om.department_id = d.id AND om.is_active = true)
                             ) ORDER BY d.name)
                             FROM public.departments d WHERE d.organization_id = p_org_id AND d.is_active = true), '[]'::jsonb),
    'hotels', '[]'::jsonb
  ) INTO v;
  RETURN v;
END;
$function$;

-- get_org_setup_gaps
CREATE OR REPLACE FUNCTION public.get_org_setup_gaps(p_org_id uuid)
 RETURNS TABLE(kind text, subject_id uuid, subject_name text, detail text, since timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.tenant_can(p_org_id, 'org.admin') OR public.tenant_can(p_org_id, 'people.manage')) THEN
    RAISE EXCEPTION 'You are not allowed to view setup for this organization'
      USING ERRCODE = '42501', HINT = 'ORG_ADMIN_REQUIRED';
  END IF;

  RETURN QUERY
  SELECT 'unplaced_member'::text, m.user_id, COALESCE(p.full_name, p.email)::text,
         'department'::text,
         m.created_at
    FROM public.organization_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.organization_id = p_org_id AND m.is_active
     AND m.role::text NOT IN ('organization_owner', 'organization_admin', 'brand_admin')
     AND m.department_id IS NULL
  UNION ALL
  SELECT CASE WHEN i.expires_at IS NOT NULL AND i.expires_at < now() THEN 'expired_invitation' ELSE 'pending_invitation' END,
         i.id, i.email::text, i.role::text, COALESCE(i.invited_at, i.created_at)
    FROM public.user_invitations i
   WHERE i.organization_id = p_org_id AND i.accepted_at IS NULL
     AND lower(COALESCE(i.status, 'pending')) IN ('pending', 'sent', 'expired')
  UNION ALL
  SELECT 'department_without_manager', d.id, d.name, NULL::text, d.created_at
    FROM public.departments d
   WHERE d.organization_id = p_org_id AND COALESCE(d.is_deleted, false) = false AND COALESCE(d.is_active, true)
     AND d.manager_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.organization_memberships m
                      WHERE m.organization_id = p_org_id AND m.department_id = d.id AND m.is_active
                        AND m.role::text = 'department_manager')
  UNION ALL
  SELECT 'missing_logo', o.id, o.name, NULL::text, o.created_at
    FROM public.organizations o
   WHERE o.id = p_org_id AND o.logo_url IS NULL;
END;
$function$;

-- get_organization_profile
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
      'hotels', 0,
      'departments', (SELECT count(*) FROM public.departments WHERE organization_id = p_org_id AND is_active = true),
      'members', (SELECT count(*) FROM public.organization_memberships WHERE organization_id = p_org_id AND is_active = true),
      'courses', (SELECT count(*) FROM public.courses WHERE organization_id = p_org_id AND is_deleted = false),
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

-- get_caller_assignment_scopes
CREATE OR REPLACE FUNCTION public.get_caller_assignment_scopes(p_org_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_platform boolean := false;
  v_effective_org_id uuid := p_org_id;
  v_user_memberships record;
  v_can_org boolean := false;
  v_can_brand boolean := false;
  v_can_dept boolean := false;
  v_brand_ids uuid[] := '{}';
  v_dept_ids uuid[] := '{}';
  v_primary_role text := 'learner';
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
      'can_assign_hotel', false,
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
    SELECT role, brand_id, department_id, is_primary
      FROM public.organization_memberships
     WHERE user_id = v_user_id
       AND (organization_id = v_effective_org_id OR v_effective_org_id IS NULL)
       AND is_active = true
  LOOP
    IF v_user_memberships.role IN ('organization_owner', 'organization_admin', 'training_manager') THEN
      v_can_org := true;
      v_can_brand := true;
      v_can_dept := true;
      v_primary_role := v_user_memberships.role::text;
    ELSIF v_user_memberships.role IN ('brand_admin') AND v_user_memberships.brand_id IS NOT NULL THEN
      v_can_brand := true;
      v_can_dept := true;
      IF NOT (v_user_memberships.brand_id = ANY(v_brand_ids)) THEN
        v_brand_ids := array_append(v_brand_ids, v_user_memberships.brand_id);
      END IF;
      v_primary_role := 'brand_admin';
    ELSIF v_user_memberships.role = 'department_manager' AND v_user_memberships.department_id IS NOT NULL THEN
      v_can_dept := true;
      IF NOT (v_user_memberships.department_id = ANY(v_dept_ids)) THEN
        v_dept_ids := array_append(v_dept_ids, v_user_memberships.department_id);
      END IF;
      IF v_primary_dept_id IS NULL THEN
        v_primary_dept_id := v_user_memberships.department_id;
      END IF;
      v_primary_role := 'department_manager';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'is_platform_admin', false,
    'effective_org_id', v_effective_org_id,
    'can_assign_org', v_can_org,
    'can_assign_brand', v_can_brand,
    'can_assign_hotel', false,
    'can_assign_dept', v_can_dept,
    'can_assign_role', (v_can_org OR v_can_brand OR v_can_dept),
    'can_assign_individual', (v_can_org OR v_can_brand OR v_can_dept),
    'authorized_brand_ids', CASE WHEN v_can_org THEN NULL ELSE v_brand_ids END,
    'authorized_hotel_ids', NULL,
    'authorized_dept_ids', CASE WHEN v_can_org THEN NULL ELSE v_dept_ids END,
    'primary_role', v_primary_role,
    'primary_hotel_id', NULL,
    'primary_department_id', v_primary_dept_id
  );
END;
$function$;

-- get_assignable_recipients_count
CREATE OR REPLACE FUNCTION public.get_assignable_recipients_count(
  p_org_id uuid,
  p_brand_id uuid DEFAULT NULL::uuid,
  p_hotel_id uuid DEFAULT NULL::uuid,
  p_dept_id uuid DEFAULT NULL::uuid,
  p_role text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_individual_user_ids uuid[] DEFAULT NULL::uuid[],
  p_scope_type text DEFAULT 'organization'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_total_count integer := 0;
  v_dept_count integer := 0;
BEGIN
  v_scopes := public.get_caller_assignment_scopes(p_org_id);
  
  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE 
     AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('recipient_count', 0, 'hotel_count', 0, 'dept_count', 0);
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;
  
  IF NOT v_can_org THEN
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
      COUNT(DISTINCT om.department_id)
    INTO v_total_count, v_dept_count
    FROM public.organization_memberships om
    WHERE om.organization_id = p_org_id
      AND om.is_active = true
      AND om.user_id = ANY(p_individual_user_ids)
      AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts));
  ELSE
    SELECT 
      COUNT(DISTINCT om.user_id),
      COUNT(DISTINCT om.department_id)
    INTO v_total_count, v_dept_count
    FROM public.organization_memberships om
    WHERE om.organization_id = p_org_id
      AND om.is_active = true
      AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
      AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
      AND (p_brand_id IS NULL OR om.brand_id = p_brand_id)
      AND (p_dept_id IS NULL OR om.department_id = p_dept_id)
      AND (p_role IS NULL OR p_role = 'all' OR om.role::text = p_role);
  END IF;

  RETURN jsonb_build_object(
    'recipient_count', COALESCE(v_total_count, 0),
    'hotel_count', 0,
    'dept_count', COALESCE(v_dept_count, 0)
  );
END;
$function$;

-- get_assignable_learners
CREATE OR REPLACE FUNCTION public.get_assignable_learners(
  p_org_id uuid,
  p_brand_id uuid DEFAULT NULL::uuid,
  p_hotel_id uuid DEFAULT NULL::uuid,
  p_dept_id uuid DEFAULT NULL::uuid,
  p_role text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
  id uuid, full_name text, email text, avatar_url text, hotel_id uuid, hotel_name text,
  brand_id uuid, brand_name text, department_id uuid, department_name text, role text, job_title text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
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
    NULL::uuid AS hotel_id,
    NULL::text AS hotel_name,
    b.id AS brand_id,
    b.name AS brand_name,
    d.id AS department_id,
    d.name AS department_name,
    om.role::text AS role,
    p.job_title
  FROM public.organization_memberships om
  JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.brands b ON b.id = om.brand_id
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.organization_id = p_org_id
    AND om.is_active = true
    AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
    AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
    -- Requested filters
    AND (p_brand_id IS NULL OR b.id = p_brand_id OR om.brand_id = p_brand_id)
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
$function$;

-- create_scoped_training_assignment
CREATE OR REPLACE FUNCTION public.create_scoped_training_assignment(
  p_course_id uuid,
  p_scope_type text,
  p_organization_id uuid,
  p_brand_id uuid DEFAULT NULL::uuid,
  p_hotel_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid,
  p_target_role text DEFAULT NULL::text,
  p_target_user_ids uuid[] DEFAULT NULL::uuid[],
  p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_priority text DEFAULT 'normal'::text,
  p_instructions text DEFAULT NULL::text,
  p_requires_acknowledgement boolean DEFAULT false,
  p_notify_on_due boolean DEFAULT true,
  p_reminder_days_before integer[] DEFAULT '{7,3,1}'::integer[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_eligible_users uuid[];
  v_rule_id uuid;
  v_course_title text;
  v_user_id uuid;
  v_effective_scope_type text := p_scope_type;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF v_effective_scope_type = 'hotel' THEN
    v_effective_scope_type := 'organization';
  END IF;

  SELECT title INTO v_course_title FROM public.courses WHERE id = p_course_id AND is_deleted = false;
  IF v_course_title IS NULL THEN
    RAISE EXCEPTION 'Course not found or inactive.';
  END IF;

  v_scopes := public.get_caller_assignment_scopes(p_organization_id);

  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE THEN
    IF v_effective_scope_type = 'organization' AND (v_scopes->>'can_assign_org')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at organization level.';
    ELSIF v_effective_scope_type = 'brand' AND (v_scopes->>'can_assign_brand')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at brand level.';
    ELSIF v_effective_scope_type = 'department' AND (v_scopes->>'can_assign_dept')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at department level.';
    ELSIF v_effective_scope_type = 'role' AND (v_scopes->>'can_assign_role')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign by role.';
    ELSIF v_effective_scope_type = 'individual' AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign to individuals.';
    END IF;
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;

    IF v_effective_scope_type = 'brand' AND (v_auth_brands IS NULL OR NOT (p_brand_id = ANY(v_auth_brands))) THEN
      RAISE EXCEPTION 'Access denied: not authorized for this brand.';
    ELSIF v_effective_scope_type = 'department' AND (v_auth_depts IS NULL OR NOT (p_department_id = ANY(v_auth_depts))) THEN
      RAISE EXCEPTION 'Access denied: not authorized for this department.';
    END IF;
  END IF;

  IF v_effective_scope_type = 'individual' AND p_target_user_ids IS NOT NULL THEN
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true AND om.user_id = ANY(p_target_user_ids)
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))) INTO v_eligible_users;
  ELSE
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
        AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
        AND (p_brand_id IS NULL OR om.brand_id = p_brand_id)
        AND (p_department_id IS NULL OR om.department_id = p_department_id)
        AND (p_target_role IS NULL OR p_target_role = 'all' OR om.role::text = p_target_role)) INTO v_eligible_users;
  END IF;

  IF array_length(v_eligible_users, 1) IS NULL OR array_length(v_eligible_users, 1) = 0 THEN
    RAISE EXCEPTION 'No eligible active learners found in the selected assignment scope.';
  END IF;

  INSERT INTO public.assignments (
    training_module_id, content_id, content_type, organization_id, brand_id, department_id,
    target_role, target_type, target_id, scope_type, scope_id, target_user_ids, recipient_count,
    due_date, priority, instructions, requires_acknowledgement, notify_on_due, reminder_days_before,
    assigned_by, created_by, is_active, status
  ) VALUES (
    p_course_id, p_course_id, 'module', p_organization_id, p_brand_id, p_department_id,
    p_target_role, v_effective_scope_type,
    COALESCE(p_department_id::text, p_brand_id::text, p_organization_id::text),
    v_effective_scope_type, COALESCE(p_department_id, p_brand_id, p_organization_id),
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
    VALUES (v_caller_id, 'create_training_assignment', 'assignments', v_rule_id, p_organization_id,
      jsonb_build_object('course_id', p_course_id, 'course_title', v_course_title, 'scope_type', v_effective_scope_type,
                         'recipient_count', array_length(v_eligible_users, 1), 'due_date', p_due_date));
  END IF;

  RETURN jsonb_build_object('success', true, 'rule_id', v_rule_id, 'course_id', p_course_id,
                            'recipient_count', array_length(v_eligible_users, 1), 'scope_type', v_effective_scope_type);
END;
$function$;

-- get_risk_queue
DROP FUNCTION IF EXISTS public.get_risk_queue(uuid);
CREATE FUNCTION public.get_risk_queue(p_org_id uuid)
 RETURNS TABLE(kind text, user_id uuid, person_name text, department_id uuid, department_name text, item_id uuid, item_title text, due_date timestamp with time zone, days_overdue integer, score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.tenant_can(p_org_id, 'reports.view') OR public.tenant_can(p_org_id, 'assignment.manage')) THEN
    RAISE EXCEPTION 'You are not allowed to view training risk for this organization'
      USING ERRCODE = '42501', HINT = 'REPORTS_NOT_ALLOWED';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT DISTINCT ON (m.user_id) m.user_id, m.department_id
      FROM public.organization_memberships m
     WHERE m.organization_id = p_org_id AND m.is_active
     ORDER BY m.user_id, m.is_primary DESC
  ),
  overdue AS (
    SELECT t.user_id, t.training_id, min(t.due_date) AS due_date
      FROM public._module_assignment_targets(ARRAY[p_org_id]) t
     WHERE t.due_date IS NOT NULL AND t.due_date < now()
     GROUP BY t.user_id, t.training_id
  ),
  overdue_open AS (
    SELECT o.* FROM overdue o
     WHERE NOT EXISTS (
       SELECT 1 FROM public.training_progress tp
        WHERE tp.user_id = o.user_id AND tp.training_id = o.training_id
          AND tp.lp_content_type = 'module' AND tp.status = 'completed' AND tp.passed IS TRUE
          AND COALESCE(tp.is_deleted, false) = false)
  ),
  failed AS (
    SELECT DISTINCT ON (tp.user_id, tp.training_id) tp.user_id, tp.training_id, tp.score_percentage, tp.completed_at
      FROM public.training_progress tp
     WHERE tp.organization_id = p_org_id AND tp.lp_content_type = 'quiz'
       AND tp.passed IS FALSE AND COALESCE(tp.is_deleted, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.training_progress ok
                        WHERE ok.user_id = tp.user_id AND ok.training_id = tp.training_id
                          AND ok.lp_content_type = 'quiz' AND ok.passed IS TRUE
                          AND COALESCE(ok.is_deleted, false) = false)
     ORDER BY tp.user_id, tp.training_id, tp.completed_at DESC NULLS LAST
  )
  SELECT 'overdue'::text, oo.user_id, pr.full_name, mb.department_id, d.name,
         oo.training_id, c.title, oo.due_date, (now()::date - oo.due_date::date)::integer, NULL::numeric
    FROM overdue_open oo
    JOIN members mb ON mb.user_id = oo.user_id
    LEFT JOIN public.profiles pr ON pr.id = oo.user_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
    LEFT JOIN public.courses c ON c.id = oo.training_id
  UNION ALL
  SELECT 'failed_quiz', f.user_id, pr.full_name, mb.department_id, d.name,
         f.training_id, q.title, f.completed_at, NULL, f.score_percentage
    FROM failed f
    JOIN members mb ON mb.user_id = f.user_id
    LEFT JOIN public.profiles pr ON pr.id = f.user_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
    LEFT JOIN public.quizzes q ON q.id = f.training_id
  UNION ALL
  SELECT 'expiring_certificate', ce.user_id, pr.full_name, mb.department_id, d.name,
         ce.id, ce.title::text, ce.expiry_date, (now()::date - ce.expiry_date::date)::integer, NULL
    FROM public.certificates ce
    JOIN members mb ON mb.user_id = ce.user_id
    LEFT JOIN public.profiles pr ON pr.id = ce.user_id
    LEFT JOIN public.departments d ON d.id = mb.department_id
   WHERE ce.organization_id = p_org_id
     AND ce.expiry_date IS NOT NULL AND ce.expiry_date < now() + interval '30 days'
     AND lower(COALESCE(ce.status, '')) NOT IN ('revoked', 'superseded');
END;
$function$;

-- get_training_analytics_summary
DROP FUNCTION IF EXISTS public.get_training_analytics_summary(timestamp with time zone, uuid, uuid, boolean);
CREATE FUNCTION public.get_training_analytics_summary(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_department_id uuid DEFAULT NULL::uuid,
  p_my_team_only boolean DEFAULT false
)
 RETURNS TABLE(total_assignees bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, overdue_count bigint, completion_rate numeric, average_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    targets AS (
        SELECT t.user_id, t.training_id, min(t.due_date) AS due_date
          FROM scope, public._module_assignment_targets(scope.orgs) t
         WHERE (p_start_date IS NULL OR t.rule_created_at >= p_start_date)
           AND public._learner_matches_filters(t.user_id, t.organization_id, p_department_id, p_my_team_only)
         GROUP BY t.user_id, t.training_id
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, dt.due_date, tp.status, tp.score_percentage
          FROM targets dt
          LEFT JOIN public.training_progress tp
            ON tp.user_id = dt.user_id
           AND tp.training_id = dt.training_id
           AND tp.lp_content_type = 'module'
           AND tp.is_deleted = false
    )
    SELECT
        count(*) AS total_assignees,
        count(*) FILTER (WHERE status = 'completed') AS completed_count,
        count(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        count(*) FILTER (WHERE status IS NULL OR status = 'not_started') AS not_started_count,
        count(*) FILTER (WHERE status IS DISTINCT FROM 'completed' AND due_date IS NOT NULL AND due_date < now()) AS overdue_count,
        CASE WHEN count(*) > 0
            THEN round(100.0 * count(*) FILTER (WHERE status = 'completed') / count(*), 1)
            ELSE 0
        END AS completion_rate,
        (SELECT round(avg(j2.score_percentage), 1) FROM joined j2 WHERE j2.status = 'completed' AND j2.score_percentage IS NOT NULL) AS average_score
    FROM joined;
$function$;

-- get_training_completion_trend
DROP FUNCTION IF EXISTS public.get_training_completion_trend(integer, uuid, uuid, boolean);
CREATE FUNCTION public.get_training_completion_trend(
  p_weeks integer DEFAULT 12,
  p_department_id uuid DEFAULT NULL::uuid,
  p_my_team_only boolean DEFAULT false
)
 RETURNS TABLE(week_start date, completed_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    weeks AS (
        SELECT generate_series(
            date_trunc('week', now() - ((p_weeks - 1) || ' weeks')::interval),
            date_trunc('week', now()),
            interval '1 week'
        )::date AS week_start
    ),
    scoped_completions AS (
        SELECT tp.completed_at
          FROM public.training_progress tp, scope
         WHERE tp.organization_id = ANY (scope.orgs)
           AND tp.lp_content_type = 'module'
           AND tp.is_deleted = false
           AND tp.status = 'completed'
           AND tp.completed_at >= now() - (p_weeks || ' weeks')::interval
           AND public._learner_matches_filters(tp.user_id, tp.organization_id, p_department_id, p_my_team_only)
    )
    SELECT w.week_start, count(sc.completed_at) AS completed_count
      FROM weeks w
      LEFT JOIN scoped_completions sc ON date_trunc('week', sc.completed_at)::date = w.week_start
     GROUP BY w.week_start
     ORDER BY w.week_start;
$function$;

-- get_training_module_performance
DROP FUNCTION IF EXISTS public.get_training_module_performance(uuid, uuid, integer);
CREATE FUNCTION public.get_training_module_performance(
  p_department_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 10
)
 RETURNS TABLE(module_id uuid, title text, assignee_count bigint, completed_count bigint, completion_rate numeric, average_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    targets AS (
        SELECT DISTINCT t.user_id, t.training_id
          FROM scope, public._module_assignment_targets(scope.orgs) t
         WHERE public._learner_matches_filters(t.user_id, t.organization_id, p_department_id, false)
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, tp.status, tp.score_percentage
          FROM targets dt
          LEFT JOIN public.training_progress tp
            ON tp.user_id = dt.user_id AND tp.training_id = dt.training_id
           AND tp.lp_content_type = 'module' AND tp.is_deleted = false
    )
    SELECT
        m.id AS module_id, m.title,
        count(j.user_id) AS assignee_count,
        count(j.user_id) FILTER (WHERE j.status = 'completed') AS completed_count,
        CASE WHEN count(j.user_id) > 0
            THEN round(100.0 * count(j.user_id) FILTER (WHERE j.status = 'completed') / count(j.user_id), 1)
            ELSE 0
        END AS completion_rate,
        round(avg(j.score_percentage) FILTER (WHERE j.status = 'completed'), 1) AS average_score
      FROM public.courses m
      CROSS JOIN scope
      LEFT JOIN joined j ON j.training_id = m.id
     WHERE m.is_deleted = false
       AND m.organization_id = ANY (scope.orgs)
     GROUP BY m.id, m.title
     ORDER BY assignee_count DESC NULLS LAST
     LIMIT p_limit;
$function$;

-- duplicate_training_module
CREATE OR REPLACE FUNCTION public.duplicate_training_module(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_new_module_id uuid;
    v_source public.courses%ROWTYPE;
BEGIN
    IF NOT public._can_edit_training_module(p_module_id) THEN
        RAISE EXCEPTION 'Not authorized to duplicate this module';
    END IF;

    SELECT * INTO v_source FROM public.courses WHERE id = p_module_id;
    IF v_source.id IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.courses (
        organization_id, title, description, estimated_duration_minutes, department_id,
        validity_period_days, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language,
        template_id, passing_score_percentage, status, category, difficulty_level,
        certificate_enabled, created_by
    )
    VALUES (
        v_source.organization_id, v_source.title || ' (Copy)', v_source.description, v_source.estimated_duration_minutes,
        v_source.department_id, v_source.validity_period_days,
        v_source.allow_retake, v_source.max_attempts, v_source.auto_advance, v_source.show_feedback,
        v_source.randomize_questions, v_source.show_answers, v_source.time_limit_minutes,
        v_source.audience, v_source.content_language, v_source.template_id,
        v_source.passing_score_percentage, 'draft', v_source.category, v_source.difficulty_level,
        v_source.certificate_enabled, auth.uid()
    )
    RETURNING id INTO v_new_module_id;

    INSERT INTO public.lessons (
        organization_id, training_module_id, title, block_type, block_order, content, content_ar,
        content_url, content_data, is_mandatory, points, passing_score, duration_seconds,
        ai_generated, ai_source_content, source_document_id, created_by
    )
    SELECT
        v_source.organization_id, v_new_module_id, l.title, l.block_type, l.block_order, l.content, l.content_ar,
        l.content_url, l.content_data, l.is_mandatory, l.points, l.passing_score, l.duration_seconds,
        l.ai_generated, l.ai_source_content, l.source_document_id, auth.uid()
      FROM public.lessons l
     WHERE l.training_module_id = p_module_id
       AND NOT l.is_deleted;

    RETURN v_new_module_id;
END;
$function$;

-- resolve_training_module_write_target
CREATE OR REPLACE FUNCTION public.resolve_training_module_write_target(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module RECORD;
  v_target uuid;
BEGIN
  SELECT id, title, status, is_active, is_deleted, department_id
  INTO v_module
  FROM public.courses
  WHERE id = p_module_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_module.is_deleted, false) = false
     AND COALESCE(v_module.is_active, true) = true
     AND COALESCE(v_module.status, 'draft') <> 'archived' THEN
    RETURN v_module.id;
  END IF;

  SELECT tm.id
  INTO v_target
  FROM public.courses tm
  WHERE tm.id <> v_module.id
    AND tm.title = v_module.title
    AND COALESCE(tm.is_deleted, false) = false
    AND COALESCE(tm.is_active, true) = true
    AND COALESCE(tm.status, 'draft') <> 'archived'
    AND tm.department_id IS NOT DISTINCT FROM v_module.department_id
  ORDER BY tm.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_target;
END;
$function$;

-- issue_training_certificate
CREATE OR REPLACE FUNCTION public.issue_training_certificate(p_training_progress_id uuid)
 RETURNS certificates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tp record;
  v_module_id uuid;
  v_module_title text;
  v_module_passing_score numeric;
  v_module_validity_days integer;
  v_module_department_id uuid;
  v_profile record;
  v_cert public.certificates;
  v_cert_number text;
  v_verification_code text;
  v_expiry timestamptz;
BEGIN
  SELECT * INTO v_tp
  FROM public.training_progress
  WHERE id = p_training_progress_id
    AND user_id = auth.uid()
    AND coalesce(is_deleted, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training progress not found';
  END IF;

  IF v_tp.status IS DISTINCT FROM 'completed' OR coalesce(v_tp.passed, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Training not completed or not passed';
  END IF;

  SELECT * INTO v_cert
  FROM public.certificates
  WHERE training_progress_id = p_training_progress_id
    AND certificate_type = 'training'
    AND status = 'active';

  IF FOUND THEN
    RETURN v_cert;
  END IF;

  SELECT id, title, passing_score_percentage, validity_period_days, department_id
  INTO v_module_id, v_module_title, v_module_passing_score, v_module_validity_days, v_module_department_id
  FROM public.courses
  WHERE id = v_tp.training_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'This progress record is not tied to a training module';
  END IF;

  SELECT id, full_name, email INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  v_cert_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_verification_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  IF v_module_validity_days IS NOT NULL AND v_module_validity_days > 0 THEN
    v_expiry := coalesce(v_tp.completed_at, now()) + make_interval(days => v_module_validity_days);
  END IF;

  INSERT INTO public.certificates (
    user_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, completion_date, expiry_date,
    score, passing_score, training_module_id, training_progress_id,
    department_id, status
  ) VALUES (
    auth.uid(), coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    'training', v_cert_number, v_verification_code, coalesce(v_module_title, 'Training Module'),
    coalesce(v_tp.completed_at, now()), v_expiry,
    v_tp.score_percentage, v_module_passing_score, v_module_id, v_tp.id,
    v_module_department_id, 'active'
  )
  ON CONFLICT (training_progress_id) WHERE training_progress_id IS NOT NULL AND status = 'active' DO NOTHING
  RETURNING * INTO v_cert;

  IF v_cert.id IS NULL THEN
    SELECT * INTO v_cert FROM public.certificates
    WHERE training_progress_id = p_training_progress_id AND certificate_type = 'training' AND status = 'active';
  END IF;

  RETURN v_cert;
END;
$function$;

-- issue_training_certificate_from_training_progress
CREATE OR REPLACE FUNCTION public.issue_training_certificate_from_training_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_module_title text;
    v_certificate_enabled boolean := false;
    v_passing_score integer := 80;
    v_validity_days integer;
    v_department_id uuid;
    v_recipient_name text;
    v_recipient_email text;
BEGIN
    IF COALESCE(NEW.is_deleted, false)
       OR NEW.status <> 'completed'
       OR NEW.completed_at IS NULL
       OR NEW.passed IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    SELECT title, certificate_enabled, COALESCE(passing_score_percentage, 80),
           validity_period_days, department_id
      INTO v_module_title, v_certificate_enabled, v_passing_score,
           v_validity_days, v_department_id
      FROM public.courses
     WHERE id = NEW.training_id;

    IF NOT COALESCE(v_certificate_enabled, false) THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM public.certificates c
         WHERE c.training_progress_id = NEW.id
           AND c.certificate_type = 'training'
           AND c.status = 'active'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(full_name, email, 'Training Participant'), email
      INTO v_recipient_name, v_recipient_email
      FROM public.profiles
     WHERE id = NEW.user_id;

    BEGIN
        INSERT INTO public.certificates (
            user_id, recipient_name, recipient_email, certificate_type,
            certificate_number, verification_code, training_module_id,
            training_progress_id, title, description, completion_date,
            expiry_date, department_id,
            score, passing_score, status, metadata
        ) VALUES (
            NEW.user_id,
            COALESCE(v_recipient_name, 'Training Participant'),
            v_recipient_email,
            'training',
            public.generate_certificate_number(),
            public.generate_verification_code(),
            NEW.training_id,
            NEW.id,
            v_module_title,
            'Congratulations! You''ve earned a certificate for completing ' || v_module_title || '.',
            NEW.completed_at,
            CASE WHEN v_validity_days > 0 THEN NEW.completed_at + make_interval(days => v_validity_days) END,
            v_department_id,
            round(COALESCE(NEW.score_percentage, NEW.quiz_score))::integer,
            v_passing_score,
            'active',
            jsonb_build_object(
                'issued_by', 'training_progress_completion_trigger',
                'source', 'server_side_module_completion',
                'cycle_started_at', NEW.cycle_started_at
            )
        );
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$function$;

-- platform_set_membership
CREATE OR REPLACE FUNCTION public.platform_set_membership(
  p_org_id uuid,
  p_user_id uuid,
  p_role text,
  p_hotel_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid,
  p_active boolean DEFAULT true
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage'))
     AND NOT public.is_tenant_people_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to manage members of this organization' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('organization_owner','organization_admin','brand_admin','hotel_admin',
                    'department_manager','training_manager','knowledge_manager','author','instructor','learner') THEN
    RAISE EXCEPTION 'Invalid membership role' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'organization_owner' AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Only a platform operator may set organization_owner' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organization_memberships SET
    role = p_role::public.membership_role,
    department_id = p_department_id, is_active = p_active, updated_at = now()
  WHERE organization_id = p_org_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role, department_id, is_active)
    VALUES (p_org_id, p_user_id, p_role::public.membership_role, p_department_id, p_active);
  END IF;
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_membership', 'organization_membership', p_user_id::text,
          jsonb_build_object('role', p_role, 'department_id', p_department_id, 'is_active', p_active));
END;
$function$;

-- resolve_account_context
CREATE OR REPLACE FUNCTION public.resolve_account_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_operator boolean;
  v_roles text[];
  v_perms text[];
  v_session jsonb;
  v_memberships jsonb;
  v_primary_org uuid;
  v_member_count int;
  v_operational_count int;
  v_dest text;
  v_top_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('is_platform_operator', false, 'recommended_destination', '/login');
  END IF;
  v_is_operator := public.is_platform_operator(v_uid);

  SELECT array_agg(DISTINCT pra.platform_role::text) INTO v_roles
  FROM public.platform_users pu
  JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id
  WHERE pu.user_id = v_uid AND pu.is_active AND pra.revoked_at IS NULL;

  SELECT array_agg(p) INTO v_perms
  FROM (SELECT unnest(ARRAY['operator.manage','tenant.manage','billing.manage','master_content.manage',
                            'ops.manage','config.manage','tenant.enter','tenant.read']) AS p) cand
  WHERE public.platform_operator_can(cand.p, v_uid);

  SELECT to_jsonb(s) INTO v_session FROM (
    SELECT pas.id, pas.target_organization_id, pas.acting_role, pas.access_reason,
           pas.started_at, pas.expires_at, o.name AS target_organization_name
    FROM public.platform_access_sessions pas
    JOIN public.organizations o ON o.id = pas.target_organization_id
    WHERE pas.admin_user_id = v_uid AND pas.is_active = true
      AND (pas.ended_at IS NULL OR pas.ended_at > now()) AND pas.expires_at > now()
    ORDER BY pas.started_at DESC LIMIT 1
  ) s;

  SELECT jsonb_agg(jsonb_build_object(
           'organization_id', om.organization_id, 'organization_name', o.name, 'role', om.role::text,
           'brand_id', om.brand_id, 'hotel_id', NULL, 'hotel_name', NULL,
           'department_id', om.department_id, 'department_name', d.name, 'is_active', om.is_active,
           'lifecycle_status', o.lifecycle_status,
           'operational', public.org_is_operational(om.organization_id)
         ) ORDER BY om.is_primary DESC, o.name),
         count(*),
         count(*) FILTER (WHERE public.org_is_operational(om.organization_id)),
         (array_agg(om.organization_id ORDER BY om.is_primary DESC, o.name))[1]
    INTO v_memberships, v_member_count, v_operational_count, v_primary_org
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.user_id = v_uid AND om.is_active = true;

  SELECT om.role::text INTO v_top_role
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_uid AND om.is_active = true AND public.org_is_operational(om.organization_id)
  ORDER BY CASE om.role::text
    WHEN 'organization_owner' THEN 0 WHEN 'organization_admin' THEN 1 WHEN 'brand_admin' THEN 2
    WHEN 'hotel_admin' THEN 3 WHEN 'department_manager' THEN 4 WHEN 'training_manager' THEN 5
    WHEN 'instructor' THEN 6 WHEN 'knowledge_manager' THEN 7 WHEN 'author' THEN 8 ELSE 9 END
  LIMIT 1;

  IF v_is_operator THEN
    v_dest := '/platform';
    IF v_session IS NOT NULL THEN
      v_primary_org := (v_session->>'target_organization_id')::uuid;
    ELSE
      v_primary_org := NULL;
    END IF;
  ELSIF v_member_count > 0 AND v_operational_count = 0 THEN
    v_dest := '/suspended';
  ELSIF v_top_role IN ('organization_owner','organization_admin','brand_admin','hotel_admin') THEN
    v_dest := '/admin/organization';
  ELSIF v_top_role IN ('training_manager','department_manager') THEN
    v_dest := '/manage';
  ELSIF v_top_role IN ('knowledge_manager','author','instructor') THEN
    v_dest := '/studio';
  ELSE
    v_dest := '/learn';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_uid,
    'is_platform_operator', v_is_operator,
    'platform_roles', COALESCE(to_jsonb(v_roles), '[]'::jsonb),
    'platform_permissions', COALESCE(to_jsonb(v_perms), '[]'::jsonb),
    'active_platform_session', v_session,
    'tenant_memberships', COALESCE(v_memberships, '[]'::jsonb),
    'primary_organization_id', v_primary_org,
    'is_multi_org', COALESCE(v_member_count, 0) > 1,
    'all_orgs_suspended', (COALESCE(v_member_count,0) > 0 AND COALESCE(v_operational_count,0) = 0),
    'recommended_destination', v_dest
  );
END;
$function$;

-- search_knowledge_articles
DROP FUNCTION IF EXISTS public.search_knowledge_articles(text, text, text, uuid, uuid, boolean, integer, integer);
CREATE OR REPLACE FUNCTION public.search_knowledge_articles(
  p_query text,
  p_content_type text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_department_id uuid DEFAULT NULL::uuid,
  p_property_id uuid DEFAULT NULL::uuid,
  p_requires_acknowledgment boolean DEFAULT NULL::boolean,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
  id uuid, title text, description text, summary text, content text, file_url text, status document_status,
  visibility text, department_id uuid, role app_role, requires_acknowledgment boolean, view_count integer,
  estimated_read_time integer, updated_at timestamp with time zone, rank real, file_size bigint,
  file_extension text, download_count integer, current_version integer, content_type text, category_id uuid,
  subcategory_id uuid, sop_code text, review_frequency_months integer, next_review_date date,
  compliance_level text, priority text, requires_quiz boolean, passing_score integer, quiz_enabled boolean,
  linked_training_id uuid, linked_quiz_id uuid, created_by uuid, published_at timestamp with time zone,
  author_name text, author_avatar text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        d.id, d.title, d.description, d.summary, d.content, d.file_url, d.status,
        d.visibility, d.department_id, d.role, d.requires_acknowledgment, d.view_count,
        d.estimated_read_time, d.updated_at,
        CASE WHEN p_query IS NOT NULL AND btrim(p_query) <> ''
            THEN ts_rank(d.search_vector, websearch_to_tsquery('english', p_query))
            ELSE 0.0::real
        END AS rank,
        d.file_size, d.file_extension, d.download_count, d.current_version, d.content_type,
        d.category_id, d.subcategory_id, d.sop_code, d.review_frequency_months, d.next_review_date,
        d.compliance_level, d.priority, d.requires_quiz, d.passing_score, d.quiz_enabled,
        d.linked_training_id, d.linked_quiz_id, d.created_by, d.published_at,
        p.full_name AS author_name, p.avatar_url AS author_avatar
    FROM public.documents d
    LEFT JOIN public.profiles p ON p.id = d.created_by
    WHERE d.is_deleted = false
        AND d.is_archived = false
        AND (
          public.is_platform_super_admin()
          OR COALESCE(d.is_master_template, false) = true
          OR public.org_visible(d.organization_id)
        )
        AND (p_status IS NULL OR d.status::text = p_status)
        AND d.knowledge_base_status = 'indexed'
        AND d.is_active_kb_version = true
        AND (p_query IS NULL OR btrim(p_query) = '' OR d.search_vector @@ websearch_to_tsquery('english', p_query))
        AND (p_content_type IS NULL OR lower(d.content_type) = lower(p_content_type))
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_requires_acknowledgment IS NULL OR d.requires_acknowledgment = p_requires_acknowledgment)
    ORDER BY rank DESC, d.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
$function$;

-- secure_search_documents
CREATE OR REPLACE FUNCTION public.secure_search_documents(
  p_search_query text,
  p_property_id uuid DEFAULT NULL::uuid,
  p_folder_id uuid DEFAULT NULL::uuid,
  p_status text DEFAULT NULL::text,
  p_visibility text DEFAULT NULL::text,
  p_department_id uuid DEFAULT NULL::uuid,
  p_file_type text[] DEFAULT NULL::text[],
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_confidentiality_level text DEFAULT NULL::text,
  p_include_deleted boolean DEFAULT false,
  p_include_archived boolean DEFAULT false,
  p_sort_by text DEFAULT 'created_at'::text,
  p_sort_order text DEFAULT 'desc'::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
  id uuid, title text, description text, content text, file_url text, status text, visibility text,
  property_id uuid, department_id uuid, folder_id uuid, file_type text, file_size bigint,
  file_extension text, confidentiality_level text, is_deleted boolean, is_archived boolean,
  created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone,
  expires_at timestamp with time zone, view_count integer, download_count integer, content_type text, author jsonb
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_sort_column TEXT;
BEGIN
    v_sort_column := CASE WHEN p_sort_by IN ('created_at','updated_at','title','file_size','view_count') THEN p_sort_by ELSE 'created_at' END;
    v_is_admin := public.is_platform_super_admin();

    RETURN QUERY
    SELECT d.id, d.title, d.description, d.content, d.file_url, d.status::TEXT, d.visibility::TEXT,
           NULL::uuid AS property_id, d.department_id, d.folder_id, d.file_type, d.file_size, d.file_extension,
           d.confidentiality_level::TEXT, d.is_deleted, d.is_archived, d.created_by, d.created_at,
           d.updated_at, d.expires_at, d.view_count, d.download_count, d.content_type,
           jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) AS author
    FROM documents d
    LEFT JOIN profiles p ON d.created_by = p.id
    WHERE
        (p_search_query IS NULL OR p_search_query = '' OR
            (d.title ILIKE '%'||p_search_query||'%' OR d.description ILIKE '%'||p_search_query||'%' OR d.content ILIKE '%'||p_search_query||'%'))
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        AND (v_is_admin OR COALESCE(d.is_master_template,false) OR public.org_visible(d.organization_id))
        AND (
            v_is_admin
            OR d.created_by = v_user_id
            OR d.owner_id = v_user_id
            OR (d.status = 'PUBLISHED' AND (
                    d.visibility = 'all_properties'
                    OR (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM organization_memberships om
                        WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
                    ))
                    OR (d.visibility = 'role' AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT))
               ))
        )
    ORDER BY
        CASE v_sort_column WHEN 'title' THEN d.title ELSE NULL END ASC NULLS LAST,
        CASE v_sort_column WHEN 'created_at' THEN d.created_at::TEXT WHEN 'updated_at' THEN d.updated_at::TEXT ELSE NULL END::TIMESTAMPTZ DESC NULLS LAST
    LIMIT LEAST(p_limit, 500) OFFSET GREATEST(p_offset, 0);
END;
$function$;

-- secure_search_users
CREATE OR REPLACE FUNCTION public.secure_search_users(
  p_search_query text,
  p_property_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid,
  p_role text DEFAULT NULL::text,
  p_is_active boolean DEFAULT true,
  p_limit integer DEFAULT 50
)
 RETURNS TABLE(id uuid, email text, full_name text, phone text, job_title text, staff_id text, avatar_url text, is_active boolean, hire_date date, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_platform BOOLEAN;
    v_user_org_ids UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    v_is_platform := public.is_platform_super_admin();
    v_user_org_ids := public.current_user_organization_ids();

    RETURN QUERY
    SELECT DISTINCT
        p.id, p.email, p.full_name, p.phone, p.job_title, p.staff_id, p.avatar_url,
        p.is_active, p.hire_date, p.created_at
    FROM public.profiles p
    LEFT JOIN public.organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE
        (p_search_query IS NULL OR p_search_query = '' OR 
            (p.full_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%' OR
             p.job_title ILIKE '%' || p_search_query || '%' OR
             p.staff_id ILIKE '%' || p_search_query || '%'))
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
        -- Department filter
        AND (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships om3
            WHERE om3.user_id = p.id AND om3.is_active = true AND om3.department_id = p_department_id
        ))
        -- Role filter
        AND (p_role IS NULL OR om.role::text = p_role OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = p.id AND ur.role::TEXT = p_role
        ))
        AND (
            v_is_platform
            OR p.id = v_user_id
            OR (
                om.organization_id = ANY(v_user_org_ids)
                AND public.org_is_operational(om.organization_id)
            )
        )
    ORDER BY p.full_name ASC NULLS LAST
    LIMIT LEAST(p_limit, 200);
END;
$function$;

-- verify_certificate
CREATE OR REPLACE FUNCTION public.verify_certificate(verification_code_param character varying)
 RETURNS TABLE(is_valid boolean, certificate_number character varying, verification_code character varying, recipient_name character varying, title character varying, certificate_type character varying, completion_date timestamp with time zone, expiry_date timestamp with time zone, status character varying, issued_at timestamp with time zone, property_name text, department_name text, organization_name text, organization_logo_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.verification_code,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at,
    NULL::text as property_name,
    d.name as department_name,
    o.name as organization_name,
    o.logo_url as organization_logo_url
  FROM certificates c
  LEFT JOIN departments d ON d.id = c.department_id
  LEFT JOIN organizations o ON o.id = c.organization_id
  WHERE upper(c.verification_code) = upper(verification_code_param);
END;
$function$;

-- evaluate_organization_quotas
CREATE OR REPLACE FUNCTION public.evaluate_organization_quotas(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_billing_period text := to_char(now(), 'YYYY-MM');
  v_plan record;
  v_org record;
  v_learners_used integer := 0;
  v_learners_max integer := 0;
  v_learners_pct numeric := 0;
  v_storage_used_bytes bigint := 0;
  v_storage_max_gb numeric := 0;
  v_storage_max_bytes bigint := 0;
  v_storage_pct numeric := 0;
  v_ai_credits_used integer := 0;
  v_ai_credits_max integer := 0;
  v_ai_credits_pct numeric := 0;
  v_warnings_triggered jsonb := '[]'::jsonb;
  v_quota_type text;
  v_pct numeric;
  v_threshold integer;
  v_thresholds integer[] := ARRAY[80, 90, 100];
  v_admin_recipients uuid[];
  v_admin_id uuid;
  v_notif_title text;
  v_notif_msg text;
BEGIN
  IF NOT (public.is_platform_operator() OR public.is_tenant_admin(p_org_id)) THEN
    RAISE EXCEPTION 'Access Denied: Tenant admin privileges required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT o.id, o.name, o.max_learners, o.max_storage_gb, o.max_ai_credits_monthly, o.ai_credits_used_this_month
  INTO v_org
  FROM public.organizations o
  WHERE o.id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found', p_org_id USING ERRCODE = 'P0002';
  END IF;

  SELECT sp.*
  INTO v_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = p_org_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT count(*)::integer INTO v_learners_used
  FROM public.organization_memberships
  WHERE organization_id = p_org_id AND is_active = true;

  v_learners_max := COALESCE(v_org.max_learners, v_plan.max_learners, 50);
  IF v_learners_max > 0 THEN
    v_learners_pct := ROUND((v_learners_used::numeric / v_learners_max::numeric) * 100, 1);
  END IF;

  SELECT COALESCE(sum(file_size), 0)::bigint INTO v_storage_used_bytes
  FROM public.documents
  WHERE organization_id = p_org_id AND NOT COALESCE(is_deleted, false);

  v_storage_max_gb := COALESCE(v_org.max_storage_gb, v_plan.max_storage_gb, 5);
  v_storage_max_bytes := (v_storage_max_gb * 1024 * 1024 * 1024)::bigint;
  IF v_storage_max_bytes > 0 THEN
    v_storage_pct := ROUND((v_storage_used_bytes::numeric / v_storage_max_bytes::numeric) * 100, 1);
  END IF;

  v_ai_credits_used := COALESCE(v_org.ai_credits_used_this_month, 0);
  v_ai_credits_max := COALESCE(v_org.max_ai_credits_monthly, v_plan.max_ai_credits_monthly, 100);
  IF v_ai_credits_max > 0 THEN
    v_ai_credits_pct := ROUND((v_ai_credits_used::numeric / v_ai_credits_max::numeric) * 100, 1);
  END IF;

  FOREACH v_quota_type IN ARRAY ARRAY['learners', 'storage', 'ai_credits'] LOOP
    v_pct := CASE v_quota_type
      WHEN 'learners' THEN v_learners_pct
      WHEN 'storage' THEN v_storage_pct
      WHEN 'ai_credits' THEN v_ai_credits_pct
      ELSE 0
    END;

    IF v_pct >= 80 THEN
      FOREACH v_threshold IN ARRAY v_thresholds LOOP
        IF v_pct >= v_threshold THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.quota_warning_events
            WHERE organization_id = p_org_id
              AND quota_type = v_quota_type
              AND threshold_percentage = v_threshold
              AND billing_period = v_billing_period
          ) THEN
            INSERT INTO public.quota_warning_events (
              organization_id, quota_type, threshold_percentage,
              current_usage_percentage, billing_period
            ) VALUES (
              p_org_id, v_quota_type, v_threshold, v_pct, v_billing_period
            );

            SELECT array_agg(user_id) INTO v_admin_recipients
            FROM public.organization_memberships
            WHERE organization_id = p_org_id
              AND is_active = true
              AND role IN ('organization_owner', 'organization_admin');

            v_notif_title := 'Quota Warning: ' || v_quota_type || ' at ' || v_threshold || '%';
            v_notif_msg := 'Your organization has reached ' || v_pct || '% of allocated ' || v_quota_type || ' capacity. Upgrade plan to prevent service disruption.';

            IF v_admin_recipients IS NOT NULL AND array_length(v_admin_recipients, 1) > 0 THEN
              FOREACH v_admin_id IN ARRAY v_admin_recipients LOOP
                INSERT INTO public.notifications (
                  user_id, type, title, message, link, is_read, metadata, created_at, updated_at
                ) VALUES (
                  v_admin_id,
                  'quota_warning',
                  v_notif_title,
                  v_notif_msg,
                  '/admin/settings?tab=subscription',
                  false,
                  jsonb_build_object(
                    'organization_id', p_org_id,
                    'quota_type', v_quota_type,
                    'threshold_pct', v_threshold,
                    'current_pct', v_pct,
                    'billing_period', v_billing_period
                  ),
                  now(),
                  now()
                );
              END LOOP;
            END IF;

            v_warnings_triggered := v_warnings_triggered || jsonb_build_object(
              'quota_type', v_quota_type,
              'threshold_pct', v_threshold,
              'current_pct', v_pct,
              'recipients_count', COALESCE(array_length(v_admin_recipients, 1), 0)
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'billing_period', v_billing_period,
    'utilization', jsonb_build_object(
      'hotels', jsonb_build_object('used', 0, 'max', 0, 'pct', 0),
      'learners', jsonb_build_object('used', v_learners_used, 'max', v_learners_max, 'pct', v_learners_pct),
      'storage', jsonb_build_object('used', v_storage_used_bytes, 'max', v_storage_max_bytes, 'pct', v_storage_pct, 'used_gb', ROUND((v_storage_used_bytes::numeric / (1024*1024*1024)::numeric), 2), 'max_gb', v_storage_max_gb),
      'ai_credits', jsonb_build_object('used', v_ai_credits_used, 'max', v_ai_credits_max, 'pct', v_ai_credits_pct)
    ),
    'warnings_triggered', v_warnings_triggered
  );
END;
$function$;

-- export_organization_archive
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
    'hotels', '[]'::jsonb,
    'departments', (SELECT jsonb_agg(row_to_json(d)) FROM public.departments d WHERE d.organization_id = p_org_id AND d.is_active = true),
    'memberships', (SELECT jsonb_agg(row_to_json(om)) FROM public.organization_memberships om WHERE om.organization_id = p_org_id AND om.is_active = true),
    'courses', (SELECT jsonb_agg(row_to_json(m)) FROM public.courses m WHERE m.organization_id = p_org_id AND m.is_deleted = false),
    'quizzes', (SELECT jsonb_agg(row_to_json(q)) FROM public.quizzes q WHERE q.organization_id = p_org_id AND NOT COALESCE(q.is_deleted, false)),
    'assignments', (SELECT jsonb_agg(row_to_json(r)) FROM public.assignments r WHERE r.organization_id = p_org_id AND NOT COALESCE(r.is_deleted, false)),
    'training_progress', (SELECT jsonb_agg(row_to_json(tp)) FROM public.training_progress tp WHERE tp.organization_id = p_org_id AND tp.is_deleted = false),
    'completion_history', (SELECT jsonb_agg(row_to_json(h)) FROM public.training_completion_history h WHERE h.organization_id = p_org_id),
    'certificates', (SELECT jsonb_agg(row_to_json(cert)) FROM public.certificates cert WHERE cert.organization_id = p_org_id),
    'documents', (SELECT jsonb_agg(row_to_json(doc)) FROM public.documents doc WHERE doc.organization_id = p_org_id AND doc.status = 'PUBLISHED')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- get_media_asset_with_usage
CREATE OR REPLACE FUNCTION public.get_media_asset_with_usage(p_media_asset_id uuid)
 RETURNS TABLE(
  id uuid, title text, description text, filename text, public_url text, media_type media_type,
  category media_category, file_size_bytes bigint, mime_type text, duration_seconds integer,
  thumbnail_url text, tags text[], usage_count integer, last_used_at timestamp with time zone,
  uploaded_by uuid, uploader_name text, property_id uuid, property_name text, is_public boolean,
  created_at timestamp with time zone, usages jsonb
 )
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT ma.id, ma.title, ma.description, ma.filename, ma.public_url, ma.media_type, ma.category,
    ma.file_size_bytes, ma.mime_type, ma.duration_seconds, ma.thumbnail_url, ma.tags, ma.usage_count,
    ma.last_used_at, ma.uploaded_by, p.full_name as uploader_name, NULL::uuid as property_id, NULL::text as property_name,
    ma.is_public, ma.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', mau.id,'usage_type', mau.usage_type,
      'usage_entity_id', mau.usage_entity_id,'usage_entity_title', mau.usage_entity_title,'created_at', mau.created_at))
      FROM media_asset_usages mau WHERE mau.media_asset_id = ma.id), '[]'::jsonb) as usages
  FROM media_assets ma
  LEFT JOIN profiles p ON p.id = ma.uploaded_by
  WHERE ma.id = p_media_asset_id;
END;
$function$;

-- get_platform_global_search
CREATE OR REPLACE FUNCTION public.get_platform_global_search(p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_pattern TEXT;
  v_orgs JSONB;
  v_hotels JSONB := '[]'::jsonb;
  v_depts JSONB;
  v_users JSONB;
  v_master_sops JSONB;
  v_master_courses JSONB;
  v_tenant_sops JSONB;
  v_tenant_courses JSONB;
  v_assessments JSONB;
  v_question_banks JSONB;
BEGIN
  IF NOT public.is_platform_operator(v_caller_id) THEN
    RAISE EXCEPTION 'Access Denied: platform operators only' USING ERRCODE = '42501';
  END IF;

  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    RETURN JSONB_BUILD_OBJECT(
      'organizations', '[]'::jsonb, 'hotels', '[]'::jsonb, 'departments', '[]'::jsonb, 'users', '[]'::jsonb,
      'master_sops', '[]'::jsonb, 'master_courses', '[]'::jsonb,
      'tenant_sops', '[]'::jsonb, 'tenant_courses', '[]'::jsonb,
      'assessments', '[]'::jsonb, 'question_banks', '[]'::jsonb
    );
  END IF;

  v_pattern := '%' || TRIM(p_query) || '%';

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'name', name, 'slug', slug, 'status', lifecycle_status)), '[]'::jsonb)
  INTO v_orgs
  FROM (SELECT id, name, slug, lifecycle_status FROM public.organizations WHERE is_deleted = false AND (name ILIKE v_pattern OR slug ILIKE v_pattern) LIMIT 10) o;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', d.id, 'name', d.name, 'organization_name', o.name)), '[]'::jsonb)
  INTO v_depts
  FROM (SELECT id, name, organization_id FROM public.departments WHERE is_active = true AND name ILIKE v_pattern LIMIT 10) d
  LEFT JOIN public.organizations o ON o.id = d.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'full_name', full_name, 'email', email, 'job_title', job_title)), '[]'::jsonb)
  INTO v_users
  FROM (SELECT id, full_name, email, job_title FROM public.profiles WHERE is_deleted = false AND (full_name ILIKE v_pattern OR email ILIKE v_pattern OR job_title ILIKE v_pattern) LIMIT 10) u;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'title', title, 'code', sop_code, 'category', category_id)), '[]'::jsonb)
  INTO v_master_sops
  FROM (SELECT id, title, sop_code, category_id FROM public.documents WHERE is_master_template = true AND is_deleted = false AND (title ILIKE v_pattern OR sop_code ILIKE v_pattern) LIMIT 10) ms;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'title', title, 'category', category)), '[]'::jsonb)
  INTO v_master_courses
  FROM (SELECT id, title, category FROM public.courses WHERE is_master_template = true AND is_deleted = false AND title ILIKE v_pattern LIMIT 10) mc;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', d.id, 'title', d.title, 'organization_name', o.name, 'code', d.sop_code)), '[]'::jsonb)
  INTO v_tenant_sops
  FROM (SELECT id, title, organization_id, sop_code FROM public.documents WHERE COALESCE(is_master_template, false) = false AND is_deleted = false AND (title ILIKE v_pattern OR sop_code ILIKE v_pattern) LIMIT 10) d
  LEFT JOIN public.organizations o ON o.id = d.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', c.id, 'title', c.title, 'organization_name', o.name, 'category', c.category)), '[]'::jsonb)
  INTO v_tenant_courses
  FROM (SELECT id, title, organization_id, category FROM public.courses WHERE COALESCE(is_master_template, false) = false AND is_deleted = false AND title ILIKE v_pattern LIMIT 10) c
  LEFT JOIN public.organizations o ON o.id = c.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', q.id, 'title', q.title, 'organization_name', o.name, 'type', q.quiz_type)), '[]'::jsonb)
  INTO v_assessments
  FROM (SELECT id, title, organization_id, quiz_type FROM public.quizzes WHERE is_deleted = false AND title ILIKE v_pattern LIMIT 10) q
  LEFT JOIN public.organizations o ON o.id = q.organization_id;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', qb.id, 'name', qb.name, 'organization_name', o.name, 'is_master', qb.is_master)), '[]'::jsonb)
  INTO v_question_banks
  FROM (SELECT id, name, organization_id, is_master FROM public.question_banks WHERE is_deleted = false AND name ILIKE v_pattern LIMIT 10) qb
  LEFT JOIN public.organizations o ON o.id = qb.organization_id;

  RETURN JSONB_BUILD_OBJECT(
    'organizations', v_orgs, 'hotels', v_hotels, 'departments', v_depts, 'users', v_users,
    'master_sops', v_master_sops, 'master_courses', v_master_courses,
    'tenant_sops', v_tenant_sops, 'tenant_courses', v_tenant_courses,
    'assessments', v_assessments, 'question_banks', v_question_banks
  );
END;
$function$;

-- get_platform_usage_analytics
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
      'hotels',          0,
      'members',         (SELECT count(*) FROM public.organization_memberships WHERE is_active = true),
      'courses',         (SELECT count(*) FROM public.courses WHERE is_deleted = false),
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
        'hotels', 0,
        'members', (SELECT count(*) FROM public.organization_memberships om WHERE om.organization_id = o.id AND om.is_active = true),
        'courses', (SELECT count(*) FROM public.courses m WHERE m.organization_id = o.id AND m.is_deleted = false),
        'documents', (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.is_deleted = false),
        'ai_credits_used', o.ai_credits_used_this_month,
        'ai_credits_limit', o.max_ai_credits_monthly,
        'max_hotels', 0,
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

-- get_platform_user_directory
CREATE OR REPLACE FUNCTION public.get_platform_user_directory(
  p_search text DEFAULT NULL::text,
  p_org_id uuid DEFAULT NULL::uuid,
  p_role text DEFAULT NULL::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
  id uuid, email text, full_name text, avatar_url text, is_active boolean, is_platform_user boolean,
  platform_role text, primary_organization_id uuid, primary_organization_name text,
  membership_count bigint, memberships jsonb, created_at timestamp with time zone, total_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_caller_id uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_operator(v_caller_id) THEN
    RAISE EXCEPTION 'Access Denied: platform operators only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH user_memberships AS (
    SELECT om.user_id, om.organization_id, o.name AS org_name, om.role::text AS role,
           NULL::uuid AS hotel_id, NULL::text AS hotel_name, om.department_id, d.name AS dept_name,
           om.is_active AS member_active, om.is_primary
    FROM public.organization_memberships om
    LEFT JOIN public.organizations o ON o.id = om.organization_id
    LEFT JOIN public.departments d ON d.id = om.department_id
  ),
  aggregated_memberships AS (
    SELECT um.user_id, COUNT(um.organization_id) AS m_count,
      (ARRAY_AGG(um.organization_id ORDER BY um.is_primary DESC))[1] AS first_org_id,
      (ARRAY_AGG(um.org_name ORDER BY um.is_primary DESC))[1] AS first_org_name,
      JSONB_AGG(JSONB_BUILD_OBJECT('organization_id', um.organization_id, 'organization_name', um.org_name,
        'role', um.role, 'hotel_id', um.hotel_id, 'hotel_name', um.hotel_name, 'department_id', um.department_id,
        'department_name', um.dept_name, 'is_active', um.member_active)) AS memberships_json
    FROM user_memberships um GROUP BY um.user_id
  ),
  op_roles AS (
    SELECT pra.platform_user_id AS user_id,
      (ARRAY_AGG(pra.platform_role::text ORDER BY CASE pra.platform_role::text
        WHEN 'system_owner' THEN 0 WHEN 'platform_admin' THEN 1
        WHEN 'platform_training_manager' THEN 2 WHEN 'platform_knowledge_manager' THEN 3
        WHEN 'platform_operations' THEN 4 WHEN 'platform_support' THEN 5
        ELSE 6 END))[1] AS top_role
    FROM public.platform_role_assignments pra
    JOIN public.platform_users pu ON pu.user_id = pra.platform_user_id AND pu.is_active
    WHERE pra.revoked_at IS NULL
    GROUP BY pra.platform_user_id
  ),
  filtered AS (
    SELECT p.id, p.email::text AS email, p.full_name::text AS full_name, p.avatar_url::text AS avatar_url,
      COALESCE(p.is_active, true) AS is_active,
      public.is_platform_operator(p.id) AS is_platform_user,
      opr.top_role AS platform_role,
      am.first_org_id AS primary_organization_id, am.first_org_name AS primary_organization_name,
      COALESCE(am.m_count, 0) AS membership_count, COALESCE(am.memberships_json, '[]'::jsonb) AS memberships,
      p.created_at
    FROM public.profiles p
    LEFT JOIN aggregated_memberships am ON am.user_id = p.id
    LEFT JOIN op_roles opr ON opr.user_id = p.id
    WHERE (p_search IS NULL OR p.full_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%')
      AND (p_org_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships om2 WHERE om2.user_id = p.id AND om2.organization_id = p_org_id))
      AND (p_role IS NULL
           OR EXISTS (SELECT 1 FROM public.organization_memberships om3 WHERE om3.user_id = p.id AND om3.role::text = p_role)
           OR EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = p.id AND ur2.role::text = p_role)
           OR opr.top_role = p_role)
  )
  SELECT f.id, f.email, f.full_name, f.avatar_url, f.is_active, f.is_platform_user, f.platform_role,
    f.primary_organization_id, f.primary_organization_name, f.membership_count, f.memberships, f.created_at,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Drop Hotel / Property Columns Across All Tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.assignments DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.certificates DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.certificates DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.course_generation_jobs DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.course_generation_presets DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.courses DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.courses DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.departments DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.departments DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.document_folders DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.documents DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.documents DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.media_assets DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.media_collections DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.organization_memberships DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS max_hotels CASCADE;
ALTER TABLE public.practical_submissions DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.question_banks DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.report_definitions DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.search_logs DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS max_hotels CASCADE;
ALTER TABLE public.system_events DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE public.training_paths DROP COLUMN IF EXISTS target_property_id CASCADE;
ALTER TABLE public.training_sessions DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.unified_questions DROP COLUMN IF EXISTS hotel_id CASCADE;
ALTER TABLE public.user_invitations DROP COLUMN IF EXISTS property_id CASCADE;

-- -----------------------------------------------------------------------------
-- 8. Drop Hotels Table and Trigger
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS enforce_hotel_entitlement ON public.hotels;
DROP TRIGGER IF EXISTS trg_enforce_hotel_entitlement ON public.hotels;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP FUNCTION IF EXISTS public.enforce_hotel_entitlement() CASCADE;

-- -----------------------------------------------------------------------------
-- 9. Unique Membership Index (organization_id, user_id)
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_org_membership_unique;
CREATE UNIQUE INDEX idx_org_membership_unique ON public.organization_memberships (organization_id, user_id);

-- -----------------------------------------------------------------------------
-- 10. Function Permissions
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.can_view_employee_public_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_scoped_training_assignment TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.duplicate_training_module(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.export_organization_archive(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assignable_learners TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assignable_recipients_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_audit_data_for_export TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_caller_assignment_scopes TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_employee_directory TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_employee_public_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_media_asset_with_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_hierarchy TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_setup_gaps(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_structure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_organization_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_global_search(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_analytics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_user_directory TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_risk_queue(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_training_analytics_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_training_completion_trend TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_training_module_performance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_training_certificate(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_set_membership TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_account_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_training_module_write_target(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_knowledge_articles TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secure_search_documents TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secure_search_users TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO anon, authenticated, service_role;

COMMIT;

