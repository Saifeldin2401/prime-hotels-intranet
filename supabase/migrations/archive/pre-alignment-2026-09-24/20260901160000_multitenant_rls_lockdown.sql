-- ============================================================================
-- Migration: 20260901160000_multitenant_rls_lockdown.sql
-- Description: Multi-Tenant Row Level Security (RLS) Isolation Lockdown
-- Secures all Knowledge, Training, Assessment, and Organizational tables
-- so Customer A cannot access Customer B's data under any circumstances.
-- ============================================================================

BEGIN;

-- 1. REFRESH CORE SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT organization_id 
      FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
        AND is_active = true
    ),
    '{}'::uuid[]
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_platform_session(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.platform_access_sessions 
    WHERE admin_user_id = auth.uid() 
      AND target_organization_id = p_org_id 
      AND is_active = true 
      AND (ended_at IS NULL OR ended_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_super_admin() 
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 
      FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
        AND organization_id = p_org_id 
        AND is_active = true 
        AND role IN ('organization_owner', 'organization_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_super_admin() 
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 
      FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
        AND organization_id = p_org_id 
        AND is_active = true 
        AND role IN ('organization_owner', 'organization_admin', 'training_manager', 'knowledge_manager', 'author', 'instructor')
    );
$$;

-- 2. SECURE ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_tenant_isolation_select" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_select" ON public.organizations
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() 
  OR id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(id)
);

DROP POLICY IF EXISTS "organizations_tenant_isolation_admin" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_admin" ON public.organizations
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin() 
  OR public.is_tenant_admin(id)
);

-- 3. SECURE BRANDS & HOTELS & DEPARTMENTS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_tenant_isolation_select" ON public.brands;
CREATE POLICY "brands_tenant_isolation_select" ON public.brands
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() 
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS "brands_tenant_isolation_admin" ON public.brands;
CREATE POLICY "brands_tenant_isolation_admin" ON public.brands
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin() 
  OR public.is_tenant_admin(organization_id)
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_tenant_isolation_select" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_select" ON public.hotels
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() 
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS "hotels_tenant_isolation_admin" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_admin" ON public.hotels
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin() 
  OR public.is_tenant_admin(organization_id)
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_tenant_isolation_select" ON public.departments;
CREATE POLICY "departments_tenant_isolation_select" ON public.departments
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() 
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR organization_id IS NULL
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS "departments_tenant_isolation_admin" ON public.departments;
CREATE POLICY "departments_tenant_isolation_admin" ON public.departments
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin() 
  OR (organization_id IS NOT NULL AND public.is_tenant_admin(organization_id))
);

-- 4. SECURE ORGANIZATION MEMBERSHIPS
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_memberships_tenant_isolation_select" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_select" ON public.organization_memberships
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() 
  OR user_id = auth.uid()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS "org_memberships_tenant_isolation_admin" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_admin" ON public.organization_memberships
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin() 
  OR public.is_tenant_admin(organization_id)
);

-- 5. SECURE DOCUMENTS & SOPS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_documents_select ON public.documents;
DROP POLICY IF EXISTS p5_documents_insert ON public.documents;
DROP POLICY IF EXISTS p5_documents_update ON public.documents;
DROP POLICY IF EXISTS p5_documents_delete ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_select ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_insert ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_update ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_delete ON public.documents;

CREATE POLICY "multitenant_documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (
        status = 'PUBLISHED'
        OR created_by = auth.uid()
        OR public.is_tenant_content_editor(organization_id)
      )
    )
  )
);

CREATE POLICY "multitenant_documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (is_master_template = true AND public.is_platform_super_admin())
    OR (
      organization_id IS NOT NULL 
      AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND public.is_tenant_content_editor(organization_id)
    )
  )
);

CREATE POLICY "multitenant_documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);

CREATE POLICY "multitenant_documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

-- 6. SECURE COURSES & LEARNING
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_select ON public.courses;
DROP POLICY IF EXISTS courses_write ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_select ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_insert ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_update ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_delete ON public.courses;

CREATE POLICY "multitenant_courses_select" ON public.courses
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (
        status = 'published'
        OR created_by = auth.uid()
        OR public.is_tenant_content_editor(organization_id)
      )
    )
  )
);

CREATE POLICY "multitenant_courses_insert" ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

CREATE POLICY "multitenant_courses_update" ON public.courses
FOR UPDATE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);

CREATE POLICY "multitenant_courses_delete" ON public.courses
FOR DELETE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

-- 7. SECURE COURSE MODULES, LESSONS & LESSON BLOCKS
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_modules_select ON public.course_modules;
DROP POLICY IF EXISTS course_modules_write ON public.course_modules;
DROP POLICY IF EXISTS multitenant_course_modules_select ON public.course_modules;
DROP POLICY IF EXISTS multitenant_course_modules_write ON public.course_modules;

CREATE POLICY "multitenant_course_modules_select" ON public.course_modules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
  )
);

CREATE POLICY "multitenant_course_modules_write" ON public.course_modules
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
      AND (
        (c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id))
      )
  )
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_select ON public.lessons;
DROP POLICY IF EXISTS lessons_write ON public.lessons;
DROP POLICY IF EXISTS multitenant_lessons_select ON public.lessons;
DROP POLICY IF EXISTS multitenant_lessons_write ON public.lessons;

CREATE POLICY "multitenant_lessons_select" ON public.lessons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
  )
);

CREATE POLICY "multitenant_lessons_write" ON public.lessons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
      AND (
        (c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id))
      )
  )
);

ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_blocks_select ON public.lesson_blocks;
DROP POLICY IF EXISTS lesson_blocks_write ON public.lesson_blocks;
DROP POLICY IF EXISTS multitenant_lesson_blocks_select ON public.lesson_blocks;
DROP POLICY IF EXISTS multitenant_lesson_blocks_write ON public.lesson_blocks;

CREATE POLICY "multitenant_lesson_blocks_select" ON public.lesson_blocks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.course_module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
  )
);

CREATE POLICY "multitenant_lesson_blocks_write" ON public.lesson_blocks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.course_module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND (
        (c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id))
      )
  )
);

-- 8. SECURE UNIFIED QUESTIONS & QUESTION BANKS
ALTER TABLE public.unified_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_unified_questions_select ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_insert ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_update ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_delete ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_select ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_insert ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_update ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_delete ON public.unified_questions;

CREATE POLICY "multitenant_unified_questions_select" ON public.unified_questions
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR (organization_id IS NULL AND is_master_template IS TRUE)
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (
      status = 'published'
      OR created_by = auth.uid()
      OR public.is_tenant_content_editor(organization_id)
    )
  )
);

CREATE POLICY "multitenant_unified_questions_insert" ON public.unified_questions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (organization_id IS NULL AND public.is_platform_super_admin())
    OR (
      organization_id IS NOT NULL 
      AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND public.is_tenant_content_editor(organization_id)
    )
  )
);

CREATE POLICY "multitenant_unified_questions_update" ON public.unified_questions
FOR UPDATE TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);

CREATE POLICY "multitenant_unified_questions_delete" ON public.unified_questions
FOR DELETE TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

-- 9. SECURE ASSESSMENTS & ATTEMPTS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assessments_select ON public.assessments;
DROP POLICY IF EXISTS assessments_write ON public.assessments;
DROP POLICY IF EXISTS multitenant_assessments_select ON public.assessments;
DROP POLICY IF EXISTS multitenant_assessments_write ON public.assessments;

CREATE POLICY "multitenant_assessments_select" ON public.assessments
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (
        status = 'published'
        OR created_by = auth.uid()
        OR public.is_tenant_content_editor(organization_id)
      )
    )
  )
);

CREATE POLICY "multitenant_assessments_write" ON public.assessments
FOR ALL TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

-- 10. SECURE ENROLLMENTS & LESSON PROGRESS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_update ON public.enrollments;
DROP POLICY IF EXISTS enrollments_delete ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_insert ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_update ON public.enrollments;

CREATE POLICY "multitenant_enrollments_select" ON public.enrollments
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR user_id = auth.uid()
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

CREATE POLICY "multitenant_enrollments_insert" ON public.enrollments
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
  OR public.is_platform_super_admin()
);

CREATE POLICY "multitenant_enrollments_update" ON public.enrollments
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

COMMIT;
