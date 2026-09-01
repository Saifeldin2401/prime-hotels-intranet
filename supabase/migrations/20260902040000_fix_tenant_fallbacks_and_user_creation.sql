-- ============================================================================
-- Migration: 20260902040000_fix_tenant_fallbacks_and_user_creation.sql
-- Fix hardcoded Altus tenant fallbacks across database triggers, column defaults, and user creation
-- ============================================================================

-- 0. Drop hardcoded Altus default literals from all column definitions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE '%e0000000-0000-0000-0000-000000000001%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT;', r.table_name, r.column_name);
  END LOOP;
END $$;

-- 1. Update handle_new_user to respect metadata organization_id and create membership
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
    IF v_role_str IN ('organization_owner','organization_admin','brand_admin','hotel_admin','department_manager','training_manager','knowledge_manager','author','instructor','learner') THEN
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

-- 2. Update set_organization_id_from_member (do NOT default to Altus)
CREATE OR REPLACE FUNCTION public.set_organization_id_from_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_col text := COALESCE(TG_ARGV[0], 'user_id');
  v_uid uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_col) INTO v_uid USING NEW;

  IF v_uid IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_uid AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;

    IF v_org IS NULL AND TG_TABLE_NAME = 'profiles' THEN
      SELECT (u.raw_user_meta_data->>'organization_id')::uuid INTO v_org
      FROM auth.users u
      WHERE u.id = v_uid
        AND COALESCE(u.raw_user_meta_data->>'organization_id', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    END IF;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

-- 3. Update tg_audit_set_organization_id (do NOT default to Altus)
CREATE OR REPLACE FUNCTION public.tg_audit_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'system_events' THEN
    v_actor := NEW.actor_id;
  ELSE
    v_actor := NEW.user_id;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_actor AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

-- 4. Update sync_training_module_to_course (do NOT default to Altus)
CREATE OR REPLACE FUNCTION public.sync_training_module_to_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.courses (
    id,
    title,
    description,
    status,
    difficulty_level,
    estimated_duration_minutes,
    passing_score_percentage,
    certificate_enabled,
    allow_retake,
    max_attempts,
    department_id,
    blueprint,
    quality_score,
    source_training_module_id,
    created_by,
    created_at,
    updated_at,
    is_deleted,
    organization_id,
    scope_type,
    is_master_template
  ) VALUES (
    NEW.id,
    NEW.title,
    NEW.description,
    NEW.status,
    COALESCE(NEW.difficulty_level, 'intermediate'),
    COALESCE(NEW.estimated_duration_minutes, 30),
    COALESCE(NEW.passing_score_percentage, 80),
    COALESCE(NEW.certificate_enabled, true),
    true,
    3,
    NEW.department_id,
    NEW.blueprint,
    COALESCE(NEW.quality_score, 90),
    NEW.id,
    NEW.created_by,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    COALESCE(NEW.is_deleted, false),
    NEW.organization_id,
    'organization',
    COALESCE(NEW.is_master_template, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    difficulty_level = EXCLUDED.difficulty_level,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    passing_score_percentage = EXCLUDED.passing_score_percentage,
    certificate_enabled = EXCLUDED.certificate_enabled,
    department_id = EXCLUDED.department_id,
    blueprint = EXCLUDED.blueprint,
    quality_score = EXCLUDED.quality_score,
    updated_at = EXCLUDED.updated_at,
    is_deleted = EXCLUDED.is_deleted,
    organization_id = EXCLUDED.organization_id,
    is_master_template = EXCLUDED.is_master_template;
  RETURN NEW;
END;
$function$;

-- 5. Update messaging triggers
CREATE OR REPLACE FUNCTION public.set_messaging_org_default_lit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_messaging_message_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.departments d
    WHERE d.id = NEW.department_id;
  END IF;

  IF v_org IS NULL AND NEW.sender_id IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = NEW.sender_id
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := COALESCE(v_org, (public.current_user_organization_ids())[1]);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_messaging_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  NEW.organization_id := COALESCE(v_org, (public.current_user_organization_ids())[1]);
  RETURN NEW;
END;
$function$;

-- 6. Update general parent-inheritance triggers
CREATE OR REPLACE FUNCTION public.set_organization_id_default_lit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_org_from_hotel_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT h.organization_id INTO NEW.organization_id
    FROM public.hotels h
    WHERE h.id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_org_from_department_or_inviter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.departments d
    WHERE d.id = NEW.department_id;
  END IF;

  IF v_org IS NULL AND NEW.invited_by IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = NEW.invited_by
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_p5_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;
  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_p5_child_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;
  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_training_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fk     text := TG_ARGV[0];
  v_parent text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT p.organization_id FROM public.%I p WHERE p.id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;
  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_announcement_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.announcement_id IS NOT NULL THEN
    SELECT a.organization_id INTO v_org
    FROM public.announcements a
    WHERE a.id = NEW.announcement_id;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_documents_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fk    text := TG_ARGV[0];
  v_fkval uuid;
  v_org   uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.documents d
    WHERE d.id = v_fkval;
  END IF;
  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

-- 7. Update p6_set_org_* triggers
CREATE OR REPLACE FUNCTION public.p6_set_org_from_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.course_id IS NOT NULL THEN
      SELECT c.organization_id INTO NEW.organization_id FROM public.courses c WHERE c.id = NEW.course_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_objective()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT o.organization_id INTO NEW.organization_id
      FROM public.learning_objectives o WHERE o.id = NEW.objective_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id INTO NEW.organization_id
      FROM public.lessons l WHERE l.id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT e.organization_id INTO NEW.organization_id
      FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_learning_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.enrollment_id IS NOT NULL THEN
      SELECT e.organization_id INTO NEW.organization_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
    END IF;
    IF NEW.organization_id IS NULL AND NEW.course_id IS NOT NULL THEN
      SELECT c.organization_id INTO NEW.organization_id FROM public.courses c WHERE c.id = NEW.course_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_report_definition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT rd.organization_id INTO NEW.organization_id
      FROM public.report_definitions rd WHERE rd.id = NEW.report_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_document_folder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.folder_id IS NOT NULL THEN
      SELECT df.organization_id INTO NEW.organization_id
        FROM public.document_folders df WHERE df.id = NEW.folder_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_course_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
      FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
     WHERE cm.id = NEW.course_module_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_scheduled_compliance_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT scr.organization_id INTO NEW.organization_id
      FROM public.scheduled_compliance_reports scr WHERE scr.id = NEW.report_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_sop_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT sc.organization_id INTO NEW.organization_id
      FROM public.sop_comments sc WHERE sc.id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$function$;
