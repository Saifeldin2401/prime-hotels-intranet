-- Phase 3 (partial) + Phase 5: close the remaining cross-tenant RLS holes.
--
-- Phase 3 surgical fix: is_tenant_admin() / is_tenant_content_editor() checked for the role
-- value 'organization_owner', which exists in ZERO organization_memberships rows (live data
-- uses organization_admin / hotel_admin / department_manager / learner). Left unfixed, every
-- org-scoped write policy below would deny all real admins. The role lists are transitional
-- (both current and target vocab) until Phase 3 proper introduces the membership_role enum.
--
-- Phase 5: the tables below had organization_id but only legacy global-role policies with no
-- tenant predicate -> any org's training_manager / admin could read+write every other org's
-- rows. Replaced with org-scoped policy sets. Writes keep the legacy global-role checks as a
-- transitional OR, always ANDed with the org-membership predicate.
--
-- Deliberately NOT touched here: properties (retired in Phase 4), tasks (dropped in Phase 12).

BEGIN;

-- ============================================================================
-- 0. Safety net for the single-tenant transition: every tenant table that the
--    legacy app still writes without knowing about organization_id gets a
--    DEFAULT + backfill to the sole existing organization. Real multi-tenant
--    onboarding (Phase 10/11) replaces the default with an explicit value / a
--    membership-derived trigger.
-- ============================================================================
DO $$
DECLARE
  v_org uuid := 'e0000000-0000-0000-0000-000000000001';
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'training_progress','training_assignment_rules','training_assignment_submissions',
    'training_paths','knowledge_chunks','enrollments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT %L', t, v_org);
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', t, v_org);
  END LOOP;
END $$;

-- ============================================================================
-- 1. Transitional role-list fix for the tenant capability helpers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND organization_id = p_org_id
        AND is_active = true
        AND role IN ('owner','admin','organization_owner','organization_admin','hotel_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND organization_id = p_org_id
        AND is_active = true
        AND role IN ('owner','admin','organization_owner','organization_admin','hotel_admin',
                     'department_manager','training_manager','knowledge_manager','author','instructor')
    );
$$;

-- convenience predicate: caller may see rows for this org
CREATE OR REPLACE FUNCTION public.org_visible(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_platform_super_admin()
    OR p_org_id = ANY (public.current_user_organization_ids())
    OR public.has_active_platform_session(p_org_id);
$$;
GRANT EXECUTE ON FUNCTION public.org_visible(uuid) TO authenticated;

-- ============================================================================
-- 2. announcements  (0 rows)
-- ============================================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='announcements'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.announcements', p.policyname); END LOOP;
END $$;
CREATE POLICY announcements_sel ON public.announcements FOR SELECT TO authenticated
USING (public.org_visible(organization_id));
CREATE POLICY announcements_ins ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)
           AND COALESCE(created_by, auth.uid()) = auth.uid());
CREATE POLICY announcements_upd ON public.announcements FOR UPDATE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));
CREATE POLICY announcements_del ON public.announcements FOR DELETE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

-- ============================================================================
-- 3. certificate_templates  (1 row)
-- ============================================================================
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='certificate_templates'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.certificate_templates', p.policyname); END LOOP;
END $$;
CREATE POLICY certificate_templates_sel ON public.certificate_templates FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.org_visible(organization_id));
CREATE POLICY certificate_templates_write ON public.certificate_templates FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)))
WITH CHECK (public.is_platform_super_admin() OR (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)));

-- ============================================================================
-- 4. certificates  (0 rows)
-- ============================================================================
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='certificates'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.certificates', p.policyname); END LOOP;
END $$;
CREATE POLICY certificates_sel ON public.certificates FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));
CREATE POLICY certificates_ins ON public.certificates FOR INSERT TO authenticated
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));
CREATE POLICY certificates_upd ON public.certificates FOR UPDATE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));
CREATE POLICY certificates_del ON public.certificates FOR DELETE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

-- ============================================================================
-- 5. knowledge_chunks  (0 rows) - RAG store, org-fenced at row level
-- ============================================================================
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='knowledge_chunks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.knowledge_chunks', p.policyname); END LOOP;
END $$;
CREATE POLICY knowledge_chunks_sel ON public.knowledge_chunks FOR SELECT TO authenticated
USING (public.org_visible(organization_id));
CREATE POLICY knowledge_chunks_write ON public.knowledge_chunks FOR ALL TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));
-- service_role (edge-function embedding writer) bypasses RLS automatically.

-- ============================================================================
-- 6. question_banks  (0 rows)
-- ============================================================================
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='question_banks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.question_banks', p.policyname); END LOOP;
END $$;
CREATE POLICY question_banks_sel ON public.question_banks FOR SELECT TO authenticated
USING (public.is_platform_super_admin() OR COALESCE(is_master_template,false) = true OR public.org_visible(organization_id));
CREATE POLICY question_banks_write ON public.question_banks FOR ALL TO authenticated
USING ((COALESCE(is_master_template,false) = true AND public.is_platform_super_admin())
       OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)))
WITH CHECK ((COALESCE(is_master_template,false) = true AND public.is_platform_super_admin())
       OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));

-- ============================================================================
-- 7. training_assignment_rules  (8 rows) - learners read rules targeting them
-- ============================================================================
ALTER TABLE public.training_assignment_rules ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_assignment_rules'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_assignment_rules', p.policyname); END LOOP;
END $$;
CREATE POLICY training_assignment_rules_sel ON public.training_assignment_rules FOR SELECT TO authenticated
USING (public.org_visible(organization_id));
CREATE POLICY training_assignment_rules_write ON public.training_assignment_rules FOR ALL TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));

-- ============================================================================
-- 8. training_assignment_submissions  (0 rows) - learner owns own submission
-- ============================================================================
ALTER TABLE public.training_assignment_submissions ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_assignment_submissions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_assignment_submissions', p.policyname); END LOOP;
END $$;
CREATE POLICY training_assignment_submissions_sel ON public.training_assignment_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));
CREATE POLICY training_assignment_submissions_ins ON public.training_assignment_submissions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.org_visible(organization_id));
CREATE POLICY training_assignment_submissions_upd ON public.training_assignment_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)))
WITH CHECK (public.org_visible(organization_id));
CREATE POLICY training_assignment_submissions_del ON public.training_assignment_submissions FOR DELETE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

-- ============================================================================
-- 9. training_paths  (0 rows)
-- ============================================================================
ALTER TABLE public.training_paths ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_paths'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_paths', p.policyname); END LOOP;
END $$;
CREATE POLICY training_paths_sel ON public.training_paths FOR SELECT TO authenticated
USING (public.org_visible(organization_id));
CREATE POLICY training_paths_write ON public.training_paths FOR ALL TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));

-- ============================================================================
-- 10. training_progress  (15 rows) - learner owns own progress
-- ============================================================================
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_progress'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_progress', p.policyname); END LOOP;
END $$;
CREATE POLICY training_progress_sel ON public.training_progress FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));
CREATE POLICY training_progress_ins ON public.training_progress FOR INSERT TO authenticated
WITH CHECK (
  public.org_visible(organization_id)
  AND (user_id = auth.uid() OR public.is_tenant_content_editor(organization_id))
);
CREATE POLICY training_progress_upd ON public.training_progress FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)))
WITH CHECK (
  public.org_visible(organization_id)
  AND (user_id = auth.uid() OR public.is_tenant_content_editor(organization_id))
);
CREATE POLICY training_progress_del ON public.training_progress FOR DELETE TO authenticated
USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

-- ============================================================================
-- 11. Add missing WITH CHECK to the hierarchy FOR-ALL-NO-WITHCHECK policies
-- ============================================================================
DROP POLICY IF EXISTS "brands_tenant_isolation_admin" ON public.brands;
CREATE POLICY "brands_tenant_isolation_admin" ON public.brands FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id))
WITH CHECK (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id));

DROP POLICY IF EXISTS "hotels_tenant_isolation_admin" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_admin" ON public.hotels FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id))
WITH CHECK (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id));

DROP POLICY IF EXISTS "departments_tenant_isolation_admin" ON public.departments;
CREATE POLICY "departments_tenant_isolation_admin" ON public.departments FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR (organization_id IS NOT NULL AND public.is_tenant_admin(organization_id)))
WITH CHECK (public.is_platform_super_admin() OR (organization_id IS NOT NULL AND public.is_tenant_admin(organization_id)));

DROP POLICY IF EXISTS "organizations_tenant_isolation_admin" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_admin" ON public.organizations FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(id))
WITH CHECK (public.is_platform_super_admin() OR public.is_tenant_admin(id));

DROP POLICY IF EXISTS "org_memberships_tenant_isolation_admin" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_admin" ON public.organization_memberships FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id))
WITH CHECK (
  (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id))
  -- a tenant admin cannot grant a role to themselves that they do not already hold at admin level
  AND NOT (user_id = auth.uid() AND role IN ('owner','organization_owner') AND NOT public.is_platform_super_admin())
);

-- assessments: split the FOR ALL write policy so INSERT/UPDATE get an explicit WITH CHECK
DROP POLICY IF EXISTS "multitenant_assessments_write" ON public.assessments;
CREATE POLICY "multitenant_assessments_write" ON public.assessments FOR ALL TO authenticated
USING (
  (COALESCE(is_master_template,false) = true AND public.is_platform_super_admin())
  OR (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
)
WITH CHECK (
  (COALESCE(is_master_template,false) = true AND public.is_platform_super_admin())
  OR (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
);

COMMIT;
