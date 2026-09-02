-- Migration 20260902040200: Migrate Legacy Roles to Platform Roles & Update Database Role Helpers
-- Author: Full-Stack Role Migration Engineer
-- Target: Live Supabase Postgres

BEGIN;

-- 0. Fix log_audit_event trigger function to resolve organization_id for system_events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor_id uuid;
    changes jsonb;
    action_type text;
    record_id uuid;
    v_org_id uuid;
    v_json_data jsonb;
BEGIN
    actor_id := auth.uid();
    IF TG_OP = 'INSERT' THEN
        action_type := 'create'; 
        changes := to_jsonb(NEW); 
        record_id := NEW.id;
        v_json_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update'; 
        changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)); 
        record_id := NEW.id;
        v_json_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete'; 
        changes := to_jsonb(OLD); 
        record_id := OLD.id;
        v_json_data := to_jsonb(OLD);
    END IF;

    -- 1. Try resolving from row itself
    IF v_json_data ? 'organization_id' AND (v_json_data->>'organization_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_org_id := (v_json_data->>'organization_id')::uuid;
    END IF;

    -- 2. Try resolving from actor's memberships
    IF v_org_id IS NULL AND actor_id IS NOT NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.organization_memberships 
        WHERE user_id = actor_id AND is_active = true 
        ORDER BY is_primary DESC NULLS LAST, created_at ASC 
        LIMIT 1;
    END IF;

    -- 3. Try resolving from record's user_id if table has user_id
    IF v_org_id IS NULL AND v_json_data ? 'user_id' AND (v_json_data->>'user_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        SELECT organization_id INTO v_org_id 
        FROM public.organization_memberships 
        WHERE user_id = (v_json_data->>'user_id')::uuid AND is_active = true 
        ORDER BY is_primary DESC NULLS LAST, created_at ASC 
        LIMIT 1;
    END IF;

    -- 4. Fallback to default active organization
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id 
        FROM public.organizations 
        WHERE is_active = true 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;

    IF record_id IS NOT NULL AND v_org_id IS NOT NULL THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, organization_id, metadata)
        VALUES ('audit', actor_id, TG_TABLE_NAME, record_id, v_org_id, jsonb_build_object('action', action_type, 'details', changes));
    END IF;
    RETURN NULL;
END;
$$;

-- 1. Update get_role_priority to properly score canonical platform roles
CREATE OR REPLACE FUNCTION public.get_role_priority(_role public.app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role::text
    WHEN 'administrator'     THEN 0
    WHEN 'super_admin'       THEN 0
    WHEN 'corporate_admin'   THEN 1
    WHEN 'training_manager'  THEN 2
    WHEN 'regional_admin'    THEN 2
    WHEN 'knowledge_manager' THEN 3
    WHEN 'regional_hr'       THEN 3
    WHEN 'property_manager'  THEN 4
    WHEN 'property_hr'       THEN 5
    WHEN 'department_head'   THEN 6
    WHEN 'author'            THEN 6
    WHEN 'manager'           THEN 7
    WHEN 'learner'           THEN 8
    WHEN 'staff'             THEN 8
    ELSE 999
  END;
$$;

-- 2. Update is_hr_or_admin helper with exact parameter default
CREATE OR REPLACE FUNCTION public.is_hr_or_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role::text = ANY (
        ARRAY[
          'administrator',
          'training_manager',
          'knowledge_manager',
          'super_admin',
          'corporate_admin',
          'regional_admin',
          'regional_hr',
          'property_hr'
        ]
      )
  );
$$;

-- 3. Update is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_admin.user_id
      AND ur.role::text IN ('administrator', 'super_admin', 'corporate_admin', 'regional_admin', 'training_manager')
  );
$$;

-- 4. Update is_content_manager helper
CREATE OR REPLACE FUNCTION public.is_content_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text IN ('administrator', 'training_manager', 'knowledge_manager', 'author', 'super_admin', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
  );
$$;

-- 5. Update get_user_role helper
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY CASE role::text
    WHEN 'administrator'     THEN 1
    WHEN 'super_admin'       THEN 1
    WHEN 'training_manager'  THEN 2
    WHEN 'knowledge_manager' THEN 3
    WHEN 'regional_admin'    THEN 4
    WHEN 'corporate_admin'   THEN 5
    WHEN 'regional_hr'       THEN 6
    WHEN 'property_manager'  THEN 7
    WHEN 'property_hr'       THEN 8
    WHEN 'author'            THEN 9
    WHEN 'department_head'   THEN 10
    WHEN 'manager'           THEN 11
    WHEN 'learner'           THEN 12
    WHEN 'staff'             THEN 13
    ELSE 99
  END
  LIMIT 1;
$$;

-- 6. Migrate existing rows in user_roles from legacy to platform roles
-- Avoid duplicates if user already has the platform role
-- 6a. corporate_admin / super_admin / regional_admin -> administrator
UPDATE public.user_roles
SET role = 'administrator'::public.app_role
WHERE role::text IN ('corporate_admin', 'super_admin', 'regional_admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'administrator'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

-- Delete any remaining duplicate legacy rows if user already has administrator
DELETE FROM public.user_roles
WHERE role::text IN ('corporate_admin', 'super_admin', 'regional_admin')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'administrator'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

-- 6b. regional_hr / property_manager / property_hr -> training_manager
UPDATE public.user_roles
SET role = 'training_manager'::public.app_role
WHERE role::text IN ('regional_hr', 'property_manager', 'property_hr')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'training_manager'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

DELETE FROM public.user_roles
WHERE role::text IN ('regional_hr', 'property_manager', 'property_hr')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'training_manager'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

-- 6c. department_head / manager -> author
UPDATE public.user_roles
SET role = 'author'::public.app_role
WHERE role::text IN ('department_head', 'manager')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'author'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

DELETE FROM public.user_roles
WHERE role::text IN ('department_head', 'manager')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'author'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

-- 6d. staff -> learner
UPDATE public.user_roles
SET role = 'learner'::public.app_role
WHERE role::text = 'staff'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'learner'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

DELETE FROM public.user_roles
WHERE role::text = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'learner'::public.app_role
      AND ur2.id <> public.user_roles.id
  );

COMMIT;
