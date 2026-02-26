-- FINAL ATTEMPT: MEGA MIGRATION
-- Handles everything including arrays and forgotten tables.
-- Created: 2026-02-06

BEGIN;

-- 1. Backup all policies
CREATE TEMP TABLE policy_backup AS 
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%app_role%' OR with_check LIKE '%app_role%' OR qual LIKE '%has_role%' OR with_check LIKE '%has_role%' OR qual LIKE '%get_my_roles%' OR with_check LIKE '%get_my_roles%' OR qual LIKE '%has_any_role%' OR with_check LIKE '%has_any_role%');

-- 2. Drop Policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT * FROM policy_backup LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. Drop Triggers and Functions
DROP TRIGGER IF EXISTS on_user_department_change ON public.user_departments;
DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
DROP TRIGGER IF EXISTS on_profile_job_title_change ON public.profiles;

DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(uuid, public.app_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.has_role_optimized(public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_roles() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_property_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.promote_employee(uuid, uuid, public.app_role, text, uuid, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.promote_employee(uuid, public.app_role, text, uuid, date, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, public.app_role, text, uuid, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.suggest_system_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_request_details(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.apply_training_rules_to_user() CASCADE;

-- 4. Defaults
ALTER TABLE public.job_titles ALTER COLUMN default_role DROP DEFAULT;

-- 5. TYPE SWAP
ALTER TYPE public.app_role RENAME TO app_role_old;

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

-- UPDATE COLUMNS
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
ALTER TABLE public.announcement_targets ALTER COLUMN target_roles TYPE public.app_role[] USING target_roles::text[]::public.app_role[];

ALTER TABLE public.job_titles ALTER COLUMN default_role SET DEFAULT 'staff'::public.app_role;

-- 6. RECREATE FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_roles()
 RETURNS public.app_role[] LANGUAGE sql STABLE AS $$
  SELECT COALESCE(array_agg(role), '{}') FROM user_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid uuid)
 RETURNS TABLE(id uuid, user_id uuid, role public.app_role) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY SELECT ur.id, ur.user_id, ur.role FROM user_roles ur WHERE ur.user_id = user_uuid;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, check_role public.app_role)
 RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = check_role);
$$;

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_name text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.has_role(uid, role_name::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(uid uuid, check_roles public.app_role[])
 RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = uid AND role = ANY(check_roles));
$$;

CREATE OR REPLACE FUNCTION public.has_role_optimized(check_role public.app_role)
 RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT check_role = ANY(public.get_my_roles());
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS public.app_role LANGUAGE sql STABLE AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'corporate_admin'::public.app_role THEN 0
    WHEN 'regional_admin'::public.app_role THEN 1
    WHEN 'regional_hr'::public.app_role THEN 2
    WHEN 'property_manager'::public.app_role THEN 10
    WHEN 'property_hr'::public.app_role THEN 11
    WHEN 'department_head'::public.app_role THEN 20
    WHEN 'staff'::public.app_role THEN 30
  END LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_property_access(uid uuid, prop_id uuid)
 RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_properties WHERE user_id = uid AND property_id = prop_id) 
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role IN ('corporate_admin'::public.app_role, 'regional_admin'::public.app_role, 'regional_hr'::public.app_role));
$$;

CREATE OR REPLACE FUNCTION public.suggest_system_role(p_job_title text)
 RETURNS public.app_role LANGUAGE plpgsql AS $$
DECLARE v_role public.app_role;
BEGIN
  SELECT system_role INTO v_role FROM job_title_role_mappings WHERE LOWER(job_title) = LOWER(p_job_title) LIMIT 1;
  IF v_role IS NOT NULL THEN RETURN v_role; END IF;
  IF p_job_title ILIKE '%manager%' OR p_job_title ILIKE '%chef%' OR p_job_title ILIKE '%supervisor%' THEN RETURN 'department_head'::public.app_role;
  ELSIF p_job_title ILIKE '%director%' OR p_job_title ILIKE '%vp%' OR p_job_title ILIKE '%vice president%' THEN RETURN 'regional_admin'::public.app_role;
  ELSIF p_job_title ILIKE '%hr%' AND (p_job_title ILIKE '%corporate%' OR p_job_title ILIKE '%regional%') THEN RETURN 'regional_hr'::public.app_role;
  ELSIF p_job_title ILIKE '%hr%' THEN RETURN 'property_hr'::public.app_role;
  ELSIF p_job_title ILIKE '%general manager%' OR p_job_title ILIKE '%gm%' THEN RETURN 'property_manager'::public.app_role;
  ELSE RETURN 'staff'::public.app_role; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.promote_employee(p_employee_id uuid, p_promoter_id uuid, p_new_role public.app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text)
 RETURNS uuid LANGUAGE plpgsql AS $$
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
    INSERT INTO public.promotions (employee_id, promoted_by, old_role, new_role, old_job_title, new_job_title, old_department_id, new_department_id, effective_date, notes, status) 
    VALUES (p_employee_id, p_promoter_id, v_old_role, p_new_role, v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id, p_effective_date, p_notes, CASE WHEN p_effective_date <= v_current_date THEN 'completed' ELSE 'pending' END) RETURNING id INTO v_promotion_id;
    IF p_effective_date <= v_current_date THEN
        UPDATE public.profiles SET job_title = p_new_job_title, updated_at = NOW() WHERE id = p_employee_id;
        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);
        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN INSERT INTO public.user_departments (user_id, department_id) VALUES (p_employee_id, p_new_department_id); END IF;
    END IF;
    RETURN v_promotion_id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role public.app_role, p_new_job_title text, p_new_department_id uuid, p_notes text)
 RETURNS jsonb LANGUAGE plpgsql AS $$
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
    INSERT INTO public.promotions (employee_id, promoted_by, old_role, new_role, old_job_title, new_job_title, old_department_id, new_department_id, effective_date, notes, status) 
    VALUES (p_employee_id, v_requester_id, v_old_role, p_new_role, v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id, v_effective_date, p_notes, 'pending') RETURNING id INTO v_promotion_id;
    SELECT user_id INTO v_hr_assignee FROM public.user_roles WHERE role = 'regional_hr' LIMIT 1;
    INSERT INTO public.requests (entity_type, entity_id, requester_id, current_assignee_id, status, metadata) 
    VALUES ('promotion', v_promotion_id, v_requester_id, v_hr_assignee, 'pending_hr_review', jsonb_build_object('employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id), 'new_role', p_new_role, 'effective_date', v_effective_date)) RETURNING id, request_no INTO v_request_id, v_request_no;
    INSERT INTO public.request_steps (request_id, step_order, assignee_id, assignee_role, status) VALUES (v_request_id, 1, v_hr_assignee, 'regional_hr', 'pending');
    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_request(p_request_id uuid, p_reason text)
 RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_requester_id UUID; v_entity_type TEXT; v_entity_id UUID; v_status TEXT; v_user_role public.app_role;
BEGIN
    SELECT requester_id, entity_type, entity_id, status INTO v_requester_id, v_entity_type, v_entity_id, v_status FROM public.requests WHERE id = p_request_id;
    IF v_status NOT IN ('pending_approval', 'pending_hr_review', 'pending') THEN RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel a request that is not pending.'); END IF;
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF auth.uid() != v_requester_id AND v_user_role NOT IN ('corporate_admin'::public.app_role, 'regional_admin'::public.app_role, 'regional_hr'::public.app_role) THEN RETURN jsonb_build_object('success', false, 'message', 'Not authorized to cancel this request.'); END IF;
    UPDATE public.requests SET status = 'cancelled', updated_at = NOW() WHERE id = p_request_id;
    IF v_entity_type = 'promotion' THEN UPDATE public.promotions SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Cancelled: ' || p_reason || ']' WHERE id = v_entity_id;
    ELSIF v_entity_type = 'transfer' THEN UPDATE public.transfers SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Cancelled: ' || p_reason || ']' WHERE id = v_entity_id; END IF;
    RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.update_request_details(p_request_id uuid, p_updates jsonb)
 RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_entity_type TEXT; v_entity_id UUID; v_current_metadata JSONB;
BEGIN
    IF NOT auth_has_any_role(auth.uid(), ARRAY['corporate_admin', 'regional_admin', 'regional_hr']) THEN RETURN jsonb_build_object('success', false, 'message', 'Unauthorized'); END IF;
    SELECT entity_type, entity_id, metadata INTO v_entity_type, v_entity_id, v_current_metadata FROM public.requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Request not found'); END IF;
    IF v_entity_type = 'promotion' THEN
        IF p_updates ? 'effective_date' THEN UPDATE public.promotions SET effective_date = (p_updates->>'effective_date')::DATE WHERE id = v_entity_id; END IF;
        IF p_updates ? 'new_role' THEN UPDATE public.promotions SET new_role = (p_updates->>'new_role')::public.app_role WHERE id = v_entity_id; END IF;
        UPDATE public.requests SET metadata = v_current_metadata || p_updates WHERE id = p_request_id;
    ELSIF v_entity_type = 'transfer' THEN
        IF p_updates ? 'effective_date' THEN UPDATE public.transfers SET effective_date = (p_updates->>'effective_date')::DATE WHERE id = v_entity_id; END IF;
        IF p_updates ? 'to_property_id' THEN UPDATE public.transfers SET to_property_id = (p_updates->>'to_property_id')::UUID WHERE id = v_entity_id; UPDATE public.requests SET metadata = v_current_metadata || jsonb_build_object('target_property', (SELECT name FROM public.properties WHERE id = (p_updates->>'to_property_id')::UUID), 'effective_date', (p_updates->>'effective_date')::DATE) WHERE id = p_request_id;
        ELSE UPDATE public.requests SET metadata = v_current_metadata || p_updates WHERE id = p_request_id; END IF;
    END IF;
    RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.apply_training_rules_to_user()
 RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_user_id UUID; v_department_id UUID; v_role public.app_role; v_job_title_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'user_departments' THEN v_user_id := NEW.user_id; v_department_id := NEW.department_id;
    ELSIF TG_TABLE_NAME = 'user_roles' THEN v_user_id := NEW.user_id; v_role := NEW.role;
    ELSIF TG_TABLE_NAME = 'profiles' THEN v_user_id := NEW.id; v_job_title_id := NEW.job_title_id; END IF;
    INSERT INTO public.learning_assignments (target_type, target_id, content_type, content_id, due_date, priority, assigned_by, created_at)
    SELECT 'user'::learning_target_type, v_user_id::text, 'module'::learning_content_type, tar.training_module_id, (NOW() + interval '30 days'), 'normal', tar.created_by, NOW()
    FROM public.training_assignment_rules tar WHERE tar.is_active = true AND ((tar.target_department_id = v_department_id) OR (tar.target_role = v_role::text) OR (tar.job_title_id = v_job_title_id))
    AND NOT EXISTS (SELECT 1 FROM public.learning_assignments la WHERE la.target_id = v_user_id::text AND la.content_id = tar.training_module_id AND la.content_type = 'module');
    RETURN NEW;
END $$;

-- Triggers
CREATE TRIGGER on_user_department_change AFTER INSERT OR UPDATE ON public.user_departments FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();
CREATE TRIGGER on_user_role_change AFTER INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();
CREATE TRIGGER on_profile_job_title_change AFTER UPDATE OF job_title_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();

-- 7. RESTORE POLICIES
DO $$
DECLARE r RECORD; sql TEXT;
BEGIN
    FOR r IN SELECT * FROM policy_backup LOOP
        sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s', r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd, array_to_string(r.roles, ','));
        IF r.qual IS NOT NULL THEN sql := sql || ' USING (' || r.qual || ')'; END IF;
        IF r.with_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || r.with_check || ')'; END IF;
        EXECUTE sql;
    END LOOP;
END $$;

-- 8. CLEANUP
DROP TYPE public.app_role_old;

-- Explicitly handle anyone who might have been a super_admin
UPDATE public.user_roles SET role = 'corporate_admin' WHERE role::text = 'super_admin';

COMMIT;;
