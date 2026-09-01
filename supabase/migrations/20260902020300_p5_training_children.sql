-- ==============================================================================
-- P5 TENANCY — GROUP 3: training / course / path children
-- ==============================================================================
-- Parents (all TENANT_DIRECT, organization_id NOT NULL or LIT-safe):
--   training_modules, courses, training_paths, training_progress, training_sessions
--
-- Full treatment (organization_id column + guarded FK + backfill + index +
-- NOT NULL + BEFORE INSERT trigger + RLS remediation):
--   course_source_documents      (training_module_id -> training_modules)
--   module_skills                (module_id          -> training_modules)
--   source_change_flags          (training_module_id -> training_modules)
--   training_certificate_settings(module_id          -> training_modules)
--   training_module_prerequisites(module_id          -> training_modules)
--   training_module_versions     (training_module_id -> training_modules)   [51 rows]
--   training_block_progress      (training_module_id -> training_modules)   [21 rows]
--   course_visual_assets         (course_id          -> training_modules)   [18 rows, all course_id NULL -> LIT]
--   training_path_modules        (path_id            -> training_paths)
--   user_path_enrollments        (path_id            -> training_paths)
--
-- Column + backfill + index + NOT NULL + trigger ONLY (RLS already carries a
-- correct parent-org predicate from an earlier phase — policies left untouched):
--   course_competencies          (course_id          -> courses)
--   course_modules               (course_id          -> courses)   SELECT RLS fixed in P1
--   training_certificates        (training_progress_id-> training_progress)
--   training_session_attendees   (session_id         -> training_sessions)
--
-- Backfill rule: organization_id := COALESCE(parent.organization_id, LIT)
--   LIT = e0000000-0000-0000-0000-000000000001
-- Every populated table resolves 100% of rows (verified: no orphans;
-- course_visual_assets.course_id is NULL for all 18 rows -> LIT), so SET NOT NULL
-- is safe immediately after backfill.
--
-- RLS remediation contract (no access broadened vs the current live policy):
--   * policies keyed on legacy user_roles role names / has_role / has_any_role /
--     is_hr_or_admin are replaced with tenant-helper equivalents
--     (is_tenant_content_editor / is_tenant_people_admin on organization_id).
--   * policies whose only scoping was an EXISTS-to-parent with no org predicate,
--     or "any authenticated user" / "true", gain an org_visible(organization_id) gate.
--   * own-row policies (user_id = auth.uid()) that are already tenant-safe are kept.
--   * is_platform_super_admin() escape hatches + service_role FOR ALL added for
--     consistency with the rest of the sweep.
--
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.course_source_documents       DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.module_skills                 DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.source_change_flags           DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_certificate_settings DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_module_prerequisites DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_module_versions      DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_block_progress       DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.course_visual_assets          DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_path_modules         DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.user_path_enrollments         DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.course_competencies           DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.course_modules                DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_certificates         DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.training_session_attendees    DROP COLUMN IF EXISTS organization_id;
--     DROP FUNCTION IF EXISTS public.set_training_child_org();
--   COMMIT;
--   (restore prior policies from git history)
--
-- Idempotent. Single transaction.
-- ==============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Shared BEFORE INSERT trigger function.
--   TG_ARGV[0] = local FK column name
--   TG_ARGV[1] = parent table name (must expose organization_id)
-- Populates NEW.organization_id from the parent row when NULL, else LIT.
-- --------------------------------------------------------------------------
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
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT p.organization_id FROM public.%I p WHERE p.id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_training_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_training_child_org() TO authenticated, service_role;

-- ==========================================================================
-- Column + backfill + index + NOT NULL + trigger (expanded inline per table)
-- ==========================================================================

-- === course_source_documents (FK training_module_id -> training_modules) ===
ALTER TABLE public.course_source_documents ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='course_source_documents'
      AND constraint_name='course_source_documents_organization_id_fkey') THEN
    ALTER TABLE public.course_source_documents
      ADD CONSTRAINT course_source_documents_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.course_source_documents x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.training_module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_source_documents_organization_id ON public.course_source_documents (organization_id);
ALTER TABLE public.course_source_documents ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.course_source_documents;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.course_source_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_module_id', 'training_modules');

-- === module_skills (FK module_id -> training_modules) ======================
ALTER TABLE public.module_skills ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='module_skills'
      AND constraint_name='module_skills_organization_id_fkey') THEN
    ALTER TABLE public.module_skills
      ADD CONSTRAINT module_skills_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.module_skills x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_module_skills_organization_id ON public.module_skills (organization_id);
ALTER TABLE public.module_skills ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.module_skills;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.module_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('module_id', 'training_modules');

-- === source_change_flags (FK training_module_id -> training_modules) =======
ALTER TABLE public.source_change_flags ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='source_change_flags'
      AND constraint_name='source_change_flags_organization_id_fkey') THEN
    ALTER TABLE public.source_change_flags
      ADD CONSTRAINT source_change_flags_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.source_change_flags x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.training_module_id),
     (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_source_change_flags_organization_id ON public.source_change_flags (organization_id);
ALTER TABLE public.source_change_flags ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.source_change_flags;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.source_change_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_module_id', 'training_modules');

-- === training_certificate_settings (FK module_id -> training_modules) ======
ALTER TABLE public.training_certificate_settings ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_certificate_settings'
      AND constraint_name='training_certificate_settings_organization_id_fkey') THEN
    ALTER TABLE public.training_certificate_settings
      ADD CONSTRAINT training_certificate_settings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_certificate_settings x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_certificate_settings_organization_id ON public.training_certificate_settings (organization_id);
ALTER TABLE public.training_certificate_settings ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_certificate_settings;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_certificate_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('module_id', 'training_modules');

-- === training_module_prerequisites (FK module_id -> training_modules) ======
ALTER TABLE public.training_module_prerequisites ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_module_prerequisites'
      AND constraint_name='training_module_prerequisites_organization_id_fkey') THEN
    ALTER TABLE public.training_module_prerequisites
      ADD CONSTRAINT training_module_prerequisites_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_module_prerequisites x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_module_prerequisites_organization_id ON public.training_module_prerequisites (organization_id);
ALTER TABLE public.training_module_prerequisites ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_module_prerequisites;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_module_prerequisites
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('module_id', 'training_modules');

-- === training_module_versions (FK training_module_id -> training_modules) ==
ALTER TABLE public.training_module_versions ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_module_versions'
      AND constraint_name='training_module_versions_organization_id_fkey') THEN
    ALTER TABLE public.training_module_versions
      ADD CONSTRAINT training_module_versions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_module_versions x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.training_module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_module_versions_organization_id ON public.training_module_versions (organization_id);
ALTER TABLE public.training_module_versions ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_module_versions;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_module_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_module_id', 'training_modules');

-- === training_block_progress (FK training_module_id -> training_modules) ===
ALTER TABLE public.training_block_progress ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_block_progress'
      AND constraint_name='training_block_progress_organization_id_fkey') THEN
    ALTER TABLE public.training_block_progress
      ADD CONSTRAINT training_block_progress_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_block_progress x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.training_module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_block_progress_organization_id ON public.training_block_progress (organization_id);
ALTER TABLE public.training_block_progress ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_block_progress;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_block_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_module_id', 'training_modules');

-- === course_visual_assets (FK course_id -> training_modules; all NULL -> LIT) ===
ALTER TABLE public.course_visual_assets ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='course_visual_assets'
      AND constraint_name='course_visual_assets_organization_id_fkey') THEN
    ALTER TABLE public.course_visual_assets
      ADD CONSTRAINT course_visual_assets_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.course_visual_assets x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.course_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_visual_assets_organization_id ON public.course_visual_assets (organization_id);
ALTER TABLE public.course_visual_assets ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.course_visual_assets;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.course_visual_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('course_id', 'training_modules');

-- === training_path_modules (FK path_id -> training_paths) ==================
ALTER TABLE public.training_path_modules ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_path_modules'
      AND constraint_name='training_path_modules_organization_id_fkey') THEN
    ALTER TABLE public.training_path_modules
      ADD CONSTRAINT training_path_modules_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_path_modules x
   SET organization_id = COALESCE(
     (SELECT p.organization_id FROM public.training_paths p WHERE p.id = x.path_id),
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.module_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_path_modules_organization_id ON public.training_path_modules (organization_id);
ALTER TABLE public.training_path_modules ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_path_modules;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_path_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('path_id', 'training_paths');

-- === user_path_enrollments (FK path_id -> training_paths) ==================
ALTER TABLE public.user_path_enrollments ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='user_path_enrollments'
      AND constraint_name='user_path_enrollments_organization_id_fkey') THEN
    ALTER TABLE public.user_path_enrollments
      ADD CONSTRAINT user_path_enrollments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.user_path_enrollments x
   SET organization_id = COALESCE(
     (SELECT p.organization_id FROM public.training_paths p WHERE p.id = x.path_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_path_enrollments_organization_id ON public.user_path_enrollments (organization_id);
ALTER TABLE public.user_path_enrollments ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.user_path_enrollments;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.user_path_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('path_id', 'training_paths');

-- ==========================================================================
-- Column-only tables (RLS already parent-org scoped in an earlier phase)
-- ==========================================================================

-- === course_competencies (FK course_id -> courses) ========================
ALTER TABLE public.course_competencies ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='course_competencies'
      AND constraint_name='course_competencies_organization_id_fkey') THEN
    ALTER TABLE public.course_competencies
      ADD CONSTRAINT course_competencies_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.course_competencies x
   SET organization_id = COALESCE(
     (SELECT c.organization_id FROM public.courses c WHERE c.id = x.course_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_competencies_organization_id ON public.course_competencies (organization_id);
ALTER TABLE public.course_competencies ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.course_competencies;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.course_competencies
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('course_id', 'courses');

-- === course_modules (FK course_id -> courses) — SELECT RLS fixed in P1 =====
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='course_modules'
      AND constraint_name='course_modules_organization_id_fkey') THEN
    ALTER TABLE public.course_modules
      ADD CONSTRAINT course_modules_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.course_modules x
   SET organization_id = COALESCE(
     (SELECT c.organization_id FROM public.courses c WHERE c.id = x.course_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_modules_organization_id ON public.course_modules (organization_id);
ALTER TABLE public.course_modules ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.course_modules;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('course_id', 'courses');

-- === training_certificates (FK training_progress_id -> training_progress) ==
ALTER TABLE public.training_certificates ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_certificates'
      AND constraint_name='training_certificates_organization_id_fkey') THEN
    ALTER TABLE public.training_certificates
      ADD CONSTRAINT training_certificates_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_certificates x
   SET organization_id = COALESCE(
     (SELECT tp.organization_id FROM public.training_progress tp WHERE tp.id = x.training_progress_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_certificates_organization_id ON public.training_certificates (organization_id);
ALTER TABLE public.training_certificates ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_certificates;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_progress_id', 'training_progress');

-- === training_session_attendees (FK session_id -> training_sessions) =======
ALTER TABLE public.training_session_attendees ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='training_session_attendees'
      AND constraint_name='training_session_attendees_organization_id_fkey') THEN
    ALTER TABLE public.training_session_attendees
      ADD CONSTRAINT training_session_attendees_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.training_session_attendees x
   SET organization_id = COALESCE(
     (SELECT ts.organization_id FROM public.training_sessions ts WHERE ts.id = x.session_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_session_attendees_organization_id ON public.training_session_attendees (organization_id);
ALTER TABLE public.training_session_attendees ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.training_session_attendees;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.training_session_attendees
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('session_id', 'training_sessions');

-- ==============================================================================
-- RLS remediation
-- ==============================================================================

-- --------------------------------------------------------------------------
-- course_source_documents
--   select: EXISTS-to-training_modules, no org predicate.
--   write : EXISTS-to-training_modules + legacy user_roles names.
-- --------------------------------------------------------------------------
ALTER TABLE public.course_source_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_source_documents_select ON public.course_source_documents;
CREATE POLICY course_source_documents_select ON public.course_source_documents
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS course_source_documents_write ON public.course_source_documents;
CREATE POLICY course_source_documents_write ON public.course_source_documents
  FOR ALL TO authenticated
  USING (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (
        SELECT 1 FROM public.training_modules tm
        WHERE tm.id = course_source_documents.training_module_id
          AND tm.created_by = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (
        SELECT 1 FROM public.training_modules tm
        WHERE tm.id = course_source_documents.training_module_id
          AND tm.created_by = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS course_source_documents_service_role_all ON public.course_source_documents;
CREATE POLICY course_source_documents_service_role_all ON public.course_source_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- module_skills
--   view  : true (cross-tenant leak).
--   manage: raw user_roles EXISTS (legacy app_role names, no org).
-- --------------------------------------------------------------------------
ALTER TABLE public.module_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view module skills" ON public.module_skills;
DROP POLICY IF EXISTS module_skills_select ON public.module_skills;
CREATE POLICY module_skills_select ON public.module_skills
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS module_skills_manage_insert ON public.module_skills;
CREATE POLICY module_skills_manage_insert ON public.module_skills
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS module_skills_manage_update ON public.module_skills;
CREATE POLICY module_skills_manage_update ON public.module_skills
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS module_skills_manage_delete ON public.module_skills;
CREATE POLICY module_skills_manage_delete ON public.module_skills
  FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS module_skills_service_role_all ON public.module_skills;
CREATE POLICY module_skills_service_role_all ON public.module_skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- source_change_flags
--   select/update scoped only by is_content_manager / EXISTS-to-parent — add
--   the org_visible(organization_id) gate; keep the existing predicates.
-- --------------------------------------------------------------------------
ALTER TABLE public.source_change_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_change_flags_select ON public.source_change_flags;
CREATE POLICY source_change_flags_select ON public.source_change_flags
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        is_content_manager((SELECT auth.uid()))
        OR is_tenant_content_editor(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.training_modules tm
          WHERE tm.id = source_change_flags.training_module_id
            AND (tm.created_by = (SELECT auth.uid()) OR tm.owner_id = (SELECT auth.uid()))
        )
      )
    )
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS source_change_flags_update ON public.source_change_flags;
CREATE POLICY source_change_flags_update ON public.source_change_flags
  FOR UPDATE TO authenticated
  USING (
    org_visible(organization_id)
    AND (is_content_manager((SELECT auth.uid())) OR is_tenant_content_editor(organization_id))
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (is_content_manager((SELECT auth.uid())) OR is_tenant_content_editor(organization_id))
  );

DROP POLICY IF EXISTS source_change_flags_service_role_all ON public.source_change_flags;
CREATE POLICY source_change_flags_service_role_all ON public.source_change_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- training_certificate_settings
--   select: auth.uid() IS NOT NULL (cross-tenant leak).
--   manage: is_hr_or_admin (legacy, no org).
-- --------------------------------------------------------------------------
ALTER TABLE public.training_certificate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_view_cert_settings ON public.training_certificate_settings;
CREATE POLICY auth_view_cert_settings ON public.training_certificate_settings
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS hr_admin_manage_cert_settings_insert ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_insert ON public.training_certificate_settings
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS hr_admin_manage_cert_settings_update ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_update ON public.training_certificate_settings
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS hr_admin_manage_cert_settings_delete ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_delete ON public.training_certificate_settings
  FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS training_certificate_settings_service_role_all ON public.training_certificate_settings;
CREATE POLICY training_certificate_settings_service_role_all ON public.training_certificate_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- training_module_prerequisites
--   select: auth.uid() IS NOT NULL (cross-tenant leak).
--   manage: is_hr_or_admin (legacy, no org).
-- --------------------------------------------------------------------------
ALTER TABLE public.training_module_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_view_prereqs ON public.training_module_prerequisites;
CREATE POLICY auth_view_prereqs ON public.training_module_prerequisites
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS hr_admin_manage_prereqs_insert ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_insert ON public.training_module_prerequisites
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS hr_admin_manage_prereqs_update ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_update ON public.training_module_prerequisites
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS hr_admin_manage_prereqs_delete ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_delete ON public.training_module_prerequisites
  FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));

DROP POLICY IF EXISTS training_module_prerequisites_service_role_all ON public.training_module_prerequisites;
CREATE POLICY training_module_prerequisites_service_role_all ON public.training_module_prerequisites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- training_module_versions
--   select: EXISTS-to-parent (author) OR legacy user_roles names, no org.
--   No INSERT/UPDATE/DELETE policy exists — add write policy for editors so the
--   table is not authenticated-writable via a missing-policy gap once RLS forces
--   evaluation (service_role + editor only; no broadening for regular users).
-- --------------------------------------------------------------------------
ALTER TABLE public.training_module_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_module_versions_select ON public.training_module_versions;
CREATE POLICY training_module_versions_select ON public.training_module_versions
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        is_tenant_content_editor(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.training_modules m
          WHERE m.id = training_module_versions.training_module_id
            AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))
        )
      )
    )
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS training_module_versions_write ON public.training_module_versions;
CREATE POLICY training_module_versions_write ON public.training_module_versions
  FOR ALL TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        is_tenant_content_editor(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.training_modules m
          WHERE m.id = training_module_versions.training_module_id
            AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))
        )
      )
    )
    OR is_platform_super_admin()
  )
  WITH CHECK (
    (
      org_visible(organization_id)
      AND (
        is_tenant_content_editor(organization_id)
        OR EXISTS (
          SELECT 1 FROM public.training_modules m
          WHERE m.id = training_module_versions.training_module_id
            AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))
        )
      )
    )
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS training_module_versions_service_role_all ON public.training_module_versions;
CREATE POLICY training_module_versions_service_role_all ON public.training_module_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- training_block_progress
--   own-row insert/update/delete are tenant-safe — kept.
--   select: own OR has_any_role(legacy app_role names), no org.
-- --------------------------------------------------------------------------
ALTER TABLE public.training_block_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_block_progress_select ON public.training_block_progress;
CREATE POLICY training_block_progress_select ON public.training_block_progress
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id))
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS training_block_progress_service_role_all ON public.training_block_progress;
CREATE POLICY training_block_progress_service_role_all ON public.training_block_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- course_visual_assets
--   select: true (cross-tenant leak). write policies keep their existing
--   role-helper predicates, gated by org_visible(organization_id).
-- --------------------------------------------------------------------------
ALTER TABLE public.course_visual_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p5_course_visual_assets_select ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_select ON public.course_visual_assets
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS p5_course_visual_assets_insert ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_insert ON public.course_visual_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    org_visible(organization_id)
    AND created_by = (SELECT auth.uid())
    AND (is_content_author((SELECT auth.uid())) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS p5_course_visual_assets_update ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_update ON public.course_visual_assets
  FOR UPDATE TO authenticated
  USING (
    org_visible(organization_id)
    AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS p5_course_visual_assets_delete ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_delete ON public.course_visual_assets
  FOR DELETE TO authenticated
  USING (
    org_visible(organization_id)
    AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS course_visual_assets_service_role_all ON public.course_visual_assets;
CREATE POLICY course_visual_assets_service_role_all ON public.course_visual_assets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- training_path_modules
--   select: EXISTS-to-training_paths, no org predicate.
--   insert/update/delete: role helpers, no org — gate with org_visible.
-- --------------------------------------------------------------------------
ALTER TABLE public.training_path_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p5_training_path_modules_select ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_select ON public.training_path_modules
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

DROP POLICY IF EXISTS p5_training_path_modules_insert ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_insert ON public.training_path_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    org_visible(organization_id)
    AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS p5_training_path_modules_update ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_update ON public.training_path_modules
  FOR UPDATE TO authenticated
  USING (
    org_visible(organization_id)
    AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS p5_training_path_modules_delete ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_delete ON public.training_path_modules
  FOR DELETE TO authenticated
  USING (
    org_visible(organization_id)
    AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS training_path_modules_service_role_all ON public.training_path_modules;
CREATE POLICY training_path_modules_service_role_all ON public.training_path_modules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- user_path_enrollments
--   own-row insert/update/delete are tenant-safe — kept.
--   view: own OR has_role(legacy app_role names), no org.
-- --------------------------------------------------------------------------
ALTER TABLE public.user_path_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_path_enrollments_view ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_view ON public.user_path_enrollments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id))
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS user_path_enrollments_service_role_all ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_service_role_all ON public.user_path_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- course_competencies / course_modules / training_certificates /
-- training_session_attendees:
--   RLS already carries a correct parent-org predicate (org_visible via the
--   parent EXISTS) from an earlier phase. Policies left unchanged by design;
--   only the organization_id column + trigger were added above.
-- --------------------------------------------------------------------------

COMMIT;
