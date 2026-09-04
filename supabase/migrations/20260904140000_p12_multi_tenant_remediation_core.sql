-- ==============================================================================
-- Migration: 20260904140000_p12_multi_tenant_remediation_core.sql
-- Description: Core Multi-Tenant Isolation & Vulnerability Remediation
-- Remediations:
--   1. Parent Entity Defaulting & Nullability (P0-1)
--   2. Child Trigger Early-Exit Fix (P0-2)
--   3. Organizations Control-Plane Lockdown (GAP-01)
--   4. Mandatory Break-Glass Session Enforcement (GAP-02)
--   5. Drop Un-Scoped Vector Search Overload (GAP-07)
--   6. RLS Hardening: Quizzes, Tasks, search_sops RPC, Archive Export, Operational Checks
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. PARENT ENTITY DEFAULTING & NULLABILITY (P0-1)
-- ==============================================================================

-- Trigger function that defaults NEW.organization_id from current user's primary membership
CREATE OR REPLACE FUNCTION public.tg_set_parent_default_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
  END IF;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required for % and could not be determined from user context', TG_TABLE_NAME
      USING ERRCODE = '23502';
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.tg_set_parent_default_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.tg_set_parent_default_org() TO authenticated, service_role;

-- Backfill any existing NULL organization_ids with canonical default tenant
UPDATE public.courses SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.documents SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.announcements SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.departments SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.training_modules SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.assessments SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.certificates SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.brands SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
UPDATE public.hotels SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;

-- Enforce NOT NULL on parent tables
ALTER TABLE public.courses          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.documents        ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.announcements    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.departments      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.training_modules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.assessments      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.certificates     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.brands           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.hotels           ALTER COLUMN organization_id SET NOT NULL;

-- Attach BEFORE INSERT triggers
DROP TRIGGER IF EXISTS trg_courses_set_default_org ON public.courses;
CREATE TRIGGER trg_courses_set_default_org
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_documents_set_default_org ON public.documents;
CREATE TRIGGER trg_documents_set_default_org
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_announcements_set_default_org ON public.announcements;
CREATE TRIGGER trg_announcements_set_default_org
  BEFORE INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_departments_set_default_org ON public.departments;
CREATE TRIGGER trg_departments_set_default_org
  BEFORE INSERT ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_training_modules_set_default_org ON public.training_modules;
CREATE TRIGGER trg_training_modules_set_default_org
  BEFORE INSERT ON public.training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_assessments_set_default_org ON public.assessments;
CREATE TRIGGER trg_assessments_set_default_org
  BEFORE INSERT ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_certificates_set_default_org ON public.certificates;
CREATE TRIGGER trg_certificates_set_default_org
  BEFORE INSERT ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_brands_set_default_org ON public.brands;
CREATE TRIGGER trg_brands_set_default_org
  BEFORE INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

DROP TRIGGER IF EXISTS trg_hotels_set_default_org ON public.hotels;
CREATE TRIGGER trg_hotels_set_default_org
  BEFORE INSERT ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_parent_default_org();

-- ==============================================================================
-- 2. CHILD TRIGGER EARLY-EXIT FIX (P0-2)
-- ==============================================================================

-- 2a. set_announcement_child_org
CREATE OR REPLACE FUNCTION public.set_announcement_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.announcement_id IS NOT NULL THEN
    SELECT a.organization_id INTO v_org
    FROM public.announcements a
    WHERE a.id = NEW.announcement_id;
  END IF;

  v_org := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)', NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_announcement_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_announcement_child_org() TO authenticated, service_role;

-- 2b. set_documents_child_org
CREATE OR REPLACE FUNCTION public.set_documents_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_fk    text := TG_ARGV[0];
  v_fkval uuid;
  v_org   uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.documents d
    WHERE d.id = v_fkval;
  END IF;

  v_org := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)', NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_documents_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_documents_child_org() TO authenticated, service_role;

-- 2c. set_training_child_org
CREATE OR REPLACE FUNCTION public.set_training_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_fk     text := TG_ARGV[0];
  v_parent text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT p.organization_id FROM public.%I p WHERE p.id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  v_org := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)', NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_training_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_training_child_org() TO authenticated, service_role;

-- ==============================================================================
-- 3. LOCK DOWN public.organizations TABLE (GAP-01)
-- ==============================================================================

-- Drop wide-open admin policy
DROP POLICY IF EXISTS organizations_tenant_isolation_admin ON public.organizations;
DROP POLICY IF EXISTS organizations_tenant_update ON public.organizations;
DROP POLICY IF EXISTS organizations_platform_delete ON public.organizations;

-- Allow tenant admins to update their own organization ONLY when operational, or platform operator
CREATE POLICY organizations_tenant_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_operator()
    OR (public.is_tenant_admin(id) AND public.org_is_operational(id))
  )
  WITH CHECK (
    public.is_platform_operator()
    OR (public.is_tenant_admin(id) AND public.org_is_operational(id))
  );

-- Only platform operators with tenant.manage privilege may delete an organization
CREATE POLICY organizations_platform_delete ON public.organizations
  FOR DELETE TO authenticated
  USING (
    public.is_platform_operator()
    AND public.platform_operator_can('tenant.manage')
  );

-- Control-plane protection trigger
CREATE OR REPLACE FUNCTION public.trg_protect_organization_control_plane()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    IF (NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status)
       OR (NEW.is_active IS DISTINCT FROM OLD.is_active)
       OR (NEW.is_deleted IS DISTINCT FROM OLD.is_deleted)
       OR (NEW.max_hotels IS DISTINCT FROM OLD.max_hotels)
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
$fn$;

REVOKE EXECUTE ON FUNCTION public.trg_protect_organization_control_plane() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.trg_protect_organization_control_plane() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_organization_control_plane ON public.organizations;
CREATE TRIGGER trg_protect_organization_control_plane
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_organization_control_plane();

-- ==============================================================================
-- 4. MANDATORY BREAK-GLASS SESSION ENFORCEMENT (GAP-02)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN p_org_id IS NULL THEN public.platform_operator_has_role('system_owner')
    ELSE
      public.platform_operator_has_role('system_owner')
      OR public.has_active_platform_session(p_org_id)
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE user_id = auth.uid()
          AND organization_id = p_org_id
          AND is_active = true
          AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin')
          AND public.org_is_operational(organization_id)
      )
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN p_org_id IS NULL THEN public.platform_operator_has_role('system_owner')
    ELSE
      public.platform_operator_has_role('system_owner')
      OR public.has_active_platform_session(p_org_id)
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE user_id = auth.uid()
          AND organization_id = p_org_id
          AND is_active = true
          AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin',
                       'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
          AND public.org_is_operational(organization_id)
      )
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.is_tenant_content_editor(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_tenant_content_editor(uuid) TO authenticated, service_role;

-- ==============================================================================
-- 5. DROP UN-SCOPED VECTOR SEARCH OVERLOAD (GAP-07)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.match_knowledge_chunks(extensions.vector, text, integer, double precision);

-- ==============================================================================
-- 6. RLS HARDENING
-- ==============================================================================

-- 6a. public.quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view running quizzes" ON public.quizzes;
DROP POLICY IF EXISTS quizzes_select_secure ON public.quizzes;

CREATE POLICY quizzes_select_secure ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (
      status = 'running'
      OR created_by = auth.uid()
      OR public.is_tenant_content_editor(organization_id)
    )
  );

-- 6b. public.tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id uuid,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  due_date timestamp with time zone,
  start_date timestamp with time zone,
  completed_at timestamp with time zone,
  tags text[],
  estimated_hours numeric,
  actual_hours numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.org_visible(organization_id))
  WITH CHECK (public.org_visible(organization_id));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (public.org_visible(organization_id));

-- 6c. public.sop_document_search: Revoke direct access and provide search_sops RPC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'sop_document_search') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sop_document_search FROM anon, authenticated';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sop_document_search') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sop_document_search FROM anon, authenticated';
  ELSIF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'sop_document_search') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sop_document_search FROM anon, authenticated';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.search_sops(p_query text)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  file_url text,
  status document_status,
  organization_id uuid,
  category_id uuid,
  department_id uuid,
  created_at timestamp with time zone,
  rank real,
  headline text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_query_tsquery tsquery;
  v_user_id uuid := auth.uid();
BEGIN
  v_query_tsquery := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.description,
    d.file_url,
    d.status,
    d.organization_id,
    d.category_id,
    d.department_id,
    d.created_at,
    ts_rank_cd(d.search_vector, v_query_tsquery, 32)::REAL AS rank,
    ts_headline('english', d.title || ' ' || COALESCE(d.description, ''), v_query_tsquery,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10') AS headline
  FROM public.documents d
  WHERE (d.content_type = 'sop' OR d.content_type IS NULL)
    AND (d.search_vector @@ v_query_tsquery OR d.title ILIKE '%' || p_query || '%')
    AND COALESCE(d.is_deleted, false) = false
    AND COALESCE(d.is_archived, false) = false
    AND (public.is_platform_operator() OR COALESCE(d.is_master_template, false) OR public.org_visible(d.organization_id))
    AND (
      public.is_platform_operator()
      OR d.created_by = v_user_id
      OR d.owner_id = v_user_id
      OR (
        d.status = 'PUBLISHED'
        AND (
          d.visibility = 'all_properties'
          OR (d.visibility = 'property' AND public.has_property_access(v_user_id, d.property_id))
          OR (d.visibility = 'department' AND EXISTS (
            SELECT 1 FROM public.user_departments ud
            WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
          ))
          OR public.is_tenant_content_editor(d.organization_id)
        )
      )
    )
  ORDER BY rank DESC, d.created_at DESC
  LIMIT 50;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.search_sops(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.search_sops(text) TO authenticated, service_role;

-- 6d. public.export_organization_archive: Enforce tenant admin privileges
CREATE OR REPLACE FUNCTION public.export_organization_archive(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result JSONB;
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
    'courses', (SELECT jsonb_agg(row_to_json(c)) FROM public.courses c WHERE c.organization_id = p_org_id AND c.is_deleted = false),
    'assessments', (SELECT jsonb_agg(row_to_json(a)) FROM public.assessments a WHERE a.organization_id = p_org_id AND a.is_deleted = false),
    'certificates', (SELECT jsonb_agg(row_to_json(cert)) FROM public.certificates cert WHERE cert.organization_id = p_org_id),
    'documents', (SELECT jsonb_agg(row_to_json(doc)) FROM public.documents doc WHERE doc.organization_id = p_org_id AND doc.status = 'PUBLISHED')
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.export_organization_archive(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.export_organization_archive(uuid) TO authenticated, service_role;

-- 6e. Pin search_path for user_has_organization_access
CREATE OR REPLACE FUNCTION public.user_has_organization_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT (
    public.is_platform_operator() OR 
    EXISTS (
      SELECT 1 
      FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
        AND organization_id = p_org_id 
        AND is_active = true
    )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.user_has_organization_access(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.user_has_organization_access(uuid) TO authenticated, service_role;

-- 6f. Add public.org_is_operational(organization_id) to memberships and quota_warning_logs
DROP POLICY IF EXISTS org_memberships_tenant_isolation_select ON public.organization_memberships;
CREATE POLICY org_memberships_tenant_isolation_select ON public.organization_memberships
FOR SELECT TO authenticated
USING (
  public.is_platform_operator()
  OR (user_id = auth.uid() AND public.org_is_operational(organization_id))
  OR (organization_id = ANY(public.current_user_organization_ids()) AND public.org_is_operational(organization_id))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS org_memberships_tenant_isolation_admin ON public.organization_memberships;
CREATE POLICY org_memberships_tenant_isolation_admin ON public.organization_memberships
FOR ALL TO authenticated
USING (
  public.is_platform_operator()
  OR (public.is_tenant_people_admin(organization_id) AND public.org_is_operational(organization_id))
)
WITH CHECK (
  public.is_platform_operator()
  OR (
    public.is_tenant_people_admin(organization_id)
    AND public.org_is_operational(organization_id)
    AND role <> 'organization_owner'::membership_role
  )
);

DROP POLICY IF EXISTS quota_warning_logs_select ON public.quota_warning_logs;
CREATE POLICY quota_warning_logs_select ON public.quota_warning_logs
FOR SELECT TO authenticated
USING (
  public.is_platform_operator()
  OR (
    organization_id = ANY(public.current_user_organization_ids())
    AND public.org_is_operational(organization_id)
  )
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS quota_warning_logs_write ON public.quota_warning_logs;
CREATE POLICY quota_warning_logs_write ON public.quota_warning_logs
FOR ALL TO authenticated
USING (
  public.is_platform_operator()
  OR (
    public.is_tenant_admin(organization_id)
    AND public.org_is_operational(organization_id)
  )
)
WITH CHECK (
  public.is_platform_operator()
  OR (
    public.is_tenant_admin(organization_id)
    AND public.org_is_operational(organization_id)
  )
);

COMMIT;
