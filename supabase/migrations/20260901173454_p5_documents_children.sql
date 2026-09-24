BEGIN;

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
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    SELECT d.organization_id INTO v_org
    FROM public.documents d
    WHERE d.id = v_fkval;
  END IF;
  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_documents_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_documents_child_org() TO authenticated, service_role;

-- === document_approvals ===
ALTER TABLE public.document_approvals ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_approvals'
      AND constraint_name='document_approvals_organization_id_fkey') THEN
    ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_approvals x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_approvals_organization_id ON public.document_approvals (organization_id);
ALTER TABLE public.document_approvals ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_approvals;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_bookmarks ===
ALTER TABLE public.document_bookmarks ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_bookmarks'
      AND constraint_name='document_bookmarks_organization_id_fkey') THEN
    ALTER TABLE public.document_bookmarks ADD CONSTRAINT document_bookmarks_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_bookmarks x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_organization_id ON public.document_bookmarks (organization_id);
ALTER TABLE public.document_bookmarks ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_bookmarks;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_comments ===
ALTER TABLE public.document_comments ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_comments'
      AND constraint_name='document_comments_organization_id_fkey') THEN
    ALTER TABLE public.document_comments ADD CONSTRAINT document_comments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_comments x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_comments_organization_id ON public.document_comments (organization_id);
ALTER TABLE public.document_comments ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_comments;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_department_access ===
ALTER TABLE public.document_department_access ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_department_access'
      AND constraint_name='document_department_access_organization_id_fkey') THEN
    ALTER TABLE public.document_department_access ADD CONSTRAINT document_department_access_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_department_access x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  (SELECT dep.organization_id FROM public.departments dep WHERE dep.id = x.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_department_access_organization_id ON public.document_department_access (organization_id);
ALTER TABLE public.document_department_access ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_department_access;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_department_access
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_favorites ===
ALTER TABLE public.document_favorites ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_favorites'
      AND constraint_name='document_favorites_organization_id_fkey') THEN
    ALTER TABLE public.document_favorites ADD CONSTRAINT document_favorites_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_favorites x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_favorites_organization_id ON public.document_favorites (organization_id);
ALTER TABLE public.document_favorites ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_favorites;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_favorites
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_feedback ===
ALTER TABLE public.document_feedback ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_feedback'
      AND constraint_name='document_feedback_organization_id_fkey') THEN
    ALTER TABLE public.document_feedback ADD CONSTRAINT document_feedback_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_feedback x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_feedback_organization_id ON public.document_feedback (organization_id);
ALTER TABLE public.document_feedback ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_feedback;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_tag_assignments ===
ALTER TABLE public.document_tag_assignments ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_tag_assignments'
      AND constraint_name='document_tag_assignments_organization_id_fkey') THEN
    ALTER TABLE public.document_tag_assignments ADD CONSTRAINT document_tag_assignments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_tag_assignments x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_organization_id ON public.document_tag_assignments (organization_id);
ALTER TABLE public.document_tag_assignments ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_tag_assignments;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === document_versions ===
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_versions'
      AND constraint_name='document_versions_organization_id_fkey') THEN
    ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_versions x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_versions_organization_id ON public.document_versions (organization_id);
ALTER TABLE public.document_versions ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_versions;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === knowledge_related_articles ===
ALTER TABLE public.knowledge_related_articles ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='knowledge_related_articles'
      AND constraint_name='knowledge_related_articles_organization_id_fkey') THEN
    ALTER TABLE public.knowledge_related_articles ADD CONSTRAINT knowledge_related_articles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.knowledge_related_articles x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_related_articles_organization_id ON public.knowledge_related_articles (organization_id);
ALTER TABLE public.knowledge_related_articles ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.knowledge_related_articles;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.knowledge_related_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === related_articles (FK source_document_id) ===
ALTER TABLE public.related_articles ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='related_articles'
      AND constraint_name='related_articles_organization_id_fkey') THEN
    ALTER TABLE public.related_articles ADD CONSTRAINT related_articles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.related_articles x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.source_document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_related_articles_organization_id ON public.related_articles (organization_id);
ALTER TABLE public.related_articles ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.related_articles;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.related_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('source_document_id');

-- === sop_comments ===
ALTER TABLE public.sop_comments ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='sop_comments'
      AND constraint_name='sop_comments_organization_id_fkey') THEN
    ALTER TABLE public.sop_comments ADD CONSTRAINT sop_comments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.sop_comments x SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE x.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_sop_comments_organization_id ON public.sop_comments (organization_id);
ALTER TABLE public.sop_comments ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.sop_comments;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.sop_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_child_org('document_id');

-- === already-present columns: index + NOT NULL only ===
CREATE INDEX IF NOT EXISTS idx_document_acknowledgments_organization_id ON public.document_acknowledgments (organization_id);
ALTER TABLE public.document_acknowledgments ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_required_reading_organization_id ON public.knowledge_required_reading (organization_id);
ALTER TABLE public.knowledge_required_reading ALTER COLUMN organization_id SET NOT NULL;

-- ================= RLS remediation =================
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_approvals_delete_author_admin_pending ON public.document_approvals;
CREATE POLICY document_approvals_delete_author_admin_pending ON public.document_approvals
  FOR DELETE TO authenticated
  USING (
    status = 'pending'::text AND is_active = true AND org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_approvals.document_id AND d.created_by = (SELECT auth.uid()))
    )
  );
DROP POLICY IF EXISTS document_approvals_service_role_all ON public.document_approvals;
CREATE POLICY document_approvals_service_role_all ON public.document_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_bookmarks_service_role_all ON public.document_bookmarks;
CREATE POLICY document_bookmarks_service_role_all ON public.document_bookmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_comments_delete ON public.document_comments;
CREATE POLICY document_comments_delete ON public.document_comments
  FOR DELETE TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        user_id = (SELECT auth.uid())
        OR is_tenant_content_editor(organization_id)
        OR EXISTS (SELECT 1 FROM public.documents d
          WHERE d.id = document_comments.document_id
            AND (d.created_by = (SELECT auth.uid()) OR d.owner_id = (SELECT auth.uid())))
      )
    )
    OR is_platform_super_admin()
  );
DROP POLICY IF EXISTS document_comments_resolve ON public.document_comments;
CREATE POLICY document_comments_resolve ON public.document_comments
  FOR UPDATE TO authenticated
  USING (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_comments.document_id
          AND (d.created_by = (SELECT auth.uid()) OR d.owner_id = (SELECT auth.uid())))
    )
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_comments.document_id
          AND (d.created_by = (SELECT auth.uid()) OR d.owner_id = (SELECT auth.uid())))
    )
  );
DROP POLICY IF EXISTS document_comments_service_role_all ON public.document_comments;
CREATE POLICY document_comments_service_role_all ON public.document_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_department_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage department access (INSERT)" ON public.document_department_access;
DROP POLICY IF EXISTS "Manage department access (UPDATE)" ON public.document_department_access;
DROP POLICY IF EXISTS "Manage department access (DELETE)" ON public.document_department_access;
DROP POLICY IF EXISTS document_department_access_service_role_all ON public.document_department_access;
CREATE POLICY document_department_access_service_role_all ON public.document_department_access
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_favorites_service_role_all ON public.document_favorites;
CREATE POLICY document_favorites_service_role_all ON public.document_favorites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_admin_view_feedback ON public.document_feedback;
DROP POLICY IF EXISTS document_feedback_admin_read ON public.document_feedback;
CREATE POLICY document_feedback_admin_read ON public.document_feedback
  FOR SELECT TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );
DROP POLICY IF EXISTS document_feedback_service_role_all ON public.document_feedback;
CREATE POLICY document_feedback_service_role_all ON public.document_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_tag_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_tag_assignments_select ON public.document_tag_assignments;
CREATE POLICY document_tag_assignments_select ON public.document_tag_assignments
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        is_tenant_content_editor(organization_id)
        OR EXISTS (SELECT 1 FROM public.documents d
          WHERE d.id = document_tag_assignments.document_id
            AND (
              d.created_by = (SELECT auth.uid())
              OR (d.status = 'PUBLISHED'::document_status
                  AND has_property_access((SELECT auth.uid()), d.property_id))
            ))
      )
    )
    OR is_platform_super_admin()
  );
DROP POLICY IF EXISTS document_tag_assignments_insert ON public.document_tag_assignments;
CREATE POLICY document_tag_assignments_insert ON public.document_tag_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_tag_assignments.document_id AND d.created_by = (SELECT auth.uid()))
    )
  );
DROP POLICY IF EXISTS document_tag_assignments_delete ON public.document_tag_assignments;
CREATE POLICY document_tag_assignments_delete ON public.document_tag_assignments
  FOR DELETE TO authenticated
  USING (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_tag_assignments.document_id AND d.created_by = (SELECT auth.uid()))
    )
  );
DROP POLICY IF EXISTS document_tag_assignments_service_role_all ON public.document_tag_assignments;
CREATE POLICY document_tag_assignments_service_role_all ON public.document_tag_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_versions_select ON public.document_versions;
CREATE POLICY document_versions_select ON public.document_versions
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        is_tenant_content_editor(organization_id)
        OR EXISTS (SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND (
              d.created_by = (SELECT auth.uid())
              OR (d.status = 'PUBLISHED'::document_status
                  AND has_property_access((SELECT auth.uid()), d.property_id))
            ))
      )
    )
    OR is_platform_super_admin()
  );
DROP POLICY IF EXISTS document_versions_insert_for_document_authors ON public.document_versions;
CREATE POLICY document_versions_insert_for_document_authors ON public.document_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    org_visible(organization_id)
    AND (
      is_tenant_content_editor(organization_id)
      OR EXISTS (SELECT 1 FROM public.documents d
        WHERE d.id = document_versions.document_id AND d.created_by = (SELECT auth.uid()))
    )
  );
DROP POLICY IF EXISTS document_versions_service_role_all ON public.document_versions;
CREATE POLICY document_versions_service_role_all ON public.document_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.knowledge_related_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_related_articles_manage_insert ON public.knowledge_related_articles;
DROP POLICY IF EXISTS knowledge_related_articles_manage_update ON public.knowledge_related_articles;
DROP POLICY IF EXISTS knowledge_related_articles_manage_delete ON public.knowledge_related_articles;
DROP POLICY IF EXISTS knowledge_related_articles_service_role_all ON public.knowledge_related_articles;
CREATE POLICY knowledge_related_articles_service_role_all ON public.knowledge_related_articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.related_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_related_articles ON public.related_articles;
DROP POLICY IF EXISTS related_articles_sel ON public.related_articles;
CREATE POLICY related_articles_sel ON public.related_articles
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS hr_admin_manage_related_articles_insert ON public.related_articles;
DROP POLICY IF EXISTS related_articles_insert ON public.related_articles;
CREATE POLICY related_articles_insert ON public.related_articles
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_related_articles_update ON public.related_articles;
DROP POLICY IF EXISTS related_articles_update ON public.related_articles;
CREATE POLICY related_articles_update ON public.related_articles
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
  WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_related_articles_delete ON public.related_articles;
DROP POLICY IF EXISTS related_articles_delete ON public.related_articles;
CREATE POLICY related_articles_delete ON public.related_articles
  FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS related_articles_service_role_all ON public.related_articles;
CREATE POLICY related_articles_service_role_all ON public.related_articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.sop_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_sop_comments ON public.sop_comments;
DROP POLICY IF EXISTS sop_comments_sel ON public.sop_comments;
CREATE POLICY sop_comments_sel ON public.sop_comments
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS users_create_sop_comments ON public.sop_comments;
CREATE POLICY users_create_sop_comments ON public.sop_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND org_visible(organization_id));
DROP POLICY IF EXISTS users_admin_update_sop_comments ON public.sop_comments;
CREATE POLICY users_admin_update_sop_comments ON public.sop_comments
  FOR UPDATE TO authenticated
  USING (
    org_visible(organization_id)
    AND (user_id = (SELECT auth.uid()) OR is_tenant_content_editor(organization_id))
  )
  WITH CHECK (
    org_visible(organization_id)
    AND (user_id = (SELECT auth.uid()) OR is_tenant_content_editor(organization_id))
  );
DROP POLICY IF EXISTS users_admin_delete_sop_comments ON public.sop_comments;
CREATE POLICY users_admin_delete_sop_comments ON public.sop_comments
  FOR DELETE TO authenticated
  USING (
    org_visible(organization_id)
    AND (user_id = (SELECT auth.uid()) OR is_tenant_content_editor(organization_id))
  );
DROP POLICY IF EXISTS sop_comments_service_role_all ON public.sop_comments;
CREATE POLICY sop_comments_service_role_all ON public.sop_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
