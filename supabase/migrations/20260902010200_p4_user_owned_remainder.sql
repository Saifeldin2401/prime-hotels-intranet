-- ==============================================================================
-- P4-a  TENANCY - USER_OWNED remainder
-- ==============================================================================
-- Adds organization_id to the remaining USER_OWNED tables that were NOT covered
-- by batch A (20260902000500), backfills it, indexes it, sets NOT NULL (all rows
-- in TENANCY_MAP are NOT-NULL-safe / YES), keeps it populated on INSERT via a
-- BEFORE INSERT trigger, and replaces legacy global-role RLS with tenant RLS.
--
-- Tables (owner / backfill source):
--   account_action_notes         user_id      -> owner active membership else LIT
--   comments                     author_id    -> owner active membership else LIT
--   course_generation_presets    created_by   -> owner active membership else LIT
--   data_import_logs             property_id  -> hotels.organization_id else LIT   (VIA_PARENT)
--   document_tags                created_by   -> owner active membership else LIT
--   microlearning_content        created_by   -> owner active membership else LIT
--   pending_user_approvals       user_id      -> owner active membership else LIT
--   scheduled_compliance_reports created_by   -> owner active membership else LIT
--   training_content_templates   created_by   -> owner active membership else LIT
--   user_invitations             department_id-> departments.organization_id
--                                              else inviter membership else LIT
--   user_skills                  user_id      -> owner active membership else LIT
--
-- RLS model:
--   * people-admin tables (account_action_notes, pending_user_approvals,
--     user_invitations, user_skills): own-row read where legitimate +
--     org_visible AND is_tenant_people_admin for oversight / writes.
--   * admin tables (data_import_logs, scheduled_compliance_reports):
--     org_visible AND is_tenant_admin.
--   * content-editor tables (course_generation_presets, document_tags,
--     microlearning_content, training_content_templates): org_visible read;
--     writes gated created_by = auth.uid() OR is_tenant_content_editor.
--   * comments: org_visible read (internal comments gated is_tenant_people_admin);
--     own-row create/update, own-row-or-people-admin delete.
--   * is_platform_super_admin() retains cross-tenant access; service_role full.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS, guarded FK, DROP POLICY IF EXISTS +
-- CREATE, CREATE INDEX IF NOT EXISTS). Wrapped BEGIN/COMMIT.
--
-- Rollback:
--   For each table T in the list above:
--     ALTER TABLE public.T DISABLE ROW LEVEL SECURITY;  -- or restore prior policies from git
--     DROP TRIGGER IF EXISTS trg_set_org_from_member ON public.T;
--     ALTER TABLE public.T ALTER COLUMN organization_id DROP NOT NULL;
--     ALTER TABLE public.T DROP COLUMN organization_id;   -- cascades FK + index
--   DROP FUNCTION IF EXISTS public.set_org_from_hotel_property();
--   DROP FUNCTION IF EXISTS public.set_org_from_department_or_inviter();
-- ==============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- dedicated VIA_PARENT trigger functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_org_from_hotel_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT h.organization_id INTO NEW.organization_id
    FROM public.hotels h
    WHERE h.id = NEW.property_id;

    NEW.organization_id := COALESCE(NEW.organization_id,
                                    'e0000000-0000-0000-0000-000000000001'::uuid);
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_org_from_hotel_property() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_org_from_hotel_property() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_org_from_department_or_inviter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_org_from_department_or_inviter() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_org_from_department_or_inviter() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- column + FK + backfill + index + NOT NULL + trigger  (member-helper tables)
-- ---------------------------------------------------------------------------
DO $mig$
DECLARE
  tbls text[][] := ARRAY[
    ['account_action_notes','user_id'],
    ['comments','author_id'],
    ['course_generation_presets','created_by'],
    ['document_tags','created_by'],
    ['microlearning_content','created_by'],
    ['pending_user_approvals','user_id'],
    ['scheduled_compliance_reports','created_by'],
    ['training_content_templates','created_by'],
    ['user_skills','user_id']
  ];
  t text;
  oc text;
  i int;
BEGIN
  FOR i IN 1 .. array_length(tbls, 1) LOOP
    t  := tbls[i][1];
    oc := tbls[i][2];

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', t);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = t
        AND constraint_name = t || '_organization_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE',
        t, t || '_organization_id_fkey');
    END IF;

    EXECUTE format(
      'UPDATE public.%I x
          SET organization_id = COALESCE(
            (SELECT om.organization_id
               FROM public.organization_memberships om
              WHERE om.user_id = x.%I
                AND om.is_active
              ORDER BY om.is_primary DESC, om.created_at ASC
              LIMIT 1),
            ''e0000000-0000-0000-0000-000000000001''::uuid)
        WHERE x.organization_id IS NULL', t, oc);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)',
                   'idx_' || t || '_organization_id', t);

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_from_member ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_org_from_member
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member(%L)', t, oc);

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$mig$;

-- ---------------------------------------------------------------------------
-- data_import_logs  (VIA_PARENT: property_id -> hotels.organization_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.data_import_logs ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='data_import_logs'
      AND constraint_name='data_import_logs_organization_id_fkey'
  ) THEN
    ALTER TABLE public.data_import_logs
      ADD CONSTRAINT data_import_logs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

UPDATE public.data_import_logs x
   SET organization_id = COALESCE(
     (SELECT h.organization_id FROM public.hotels h WHERE h.id = x.property_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_data_import_logs_organization_id
  ON public.data_import_logs (organization_id);

ALTER TABLE public.data_import_logs ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org_from_member ON public.data_import_logs;
CREATE TRIGGER trg_set_org_from_member
  BEFORE INSERT ON public.data_import_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_hotel_property();

ALTER TABLE public.data_import_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- user_invitations  (VIA_PARENT: department_id -> departments.organization_id,
--                    else inviter membership, else LIT)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_invitations ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='user_invitations'
      AND constraint_name='user_invitations_organization_id_fkey'
  ) THEN
    ALTER TABLE public.user_invitations
      ADD CONSTRAINT user_invitations_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

UPDATE public.user_invitations x
   SET organization_id = COALESCE(
     (SELECT d.organization_id FROM public.departments d WHERE d.id = x.department_id),
     (SELECT om.organization_id
        FROM public.organization_memberships om
       WHERE om.user_id = x.invited_by
         AND om.is_active
       ORDER BY om.is_primary DESC, om.created_at ASC
       LIMIT 1),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_invitations_organization_id
  ON public.user_invitations (organization_id);

ALTER TABLE public.user_invitations ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org_from_member ON public.user_invitations;
CREATE TRIGGER trg_set_org_from_member
  BEFORE INSERT ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_department_or_inviter();

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- RLS POLICIES  (drop legacy / global-role, add tenant policies)
-- ==========================================================================

-- ---- account_action_notes : people-admin only -----------------------------
-- NOTE (P3P4_REVIEW): live table has SELECT + INSERT policies only. UPDATE/DELETE
-- authenticated policies are intentionally NOT added here (would broaden vs live).
DROP POLICY IF EXISTS account_action_notes_select ON public.account_action_notes;
DROP POLICY IF EXISTS account_action_notes_insert ON public.account_action_notes;
DROP POLICY IF EXISTS account_action_notes_update ON public.account_action_notes;
DROP POLICY IF EXISTS account_action_notes_delete ON public.account_action_notes;
DROP POLICY IF EXISTS account_action_notes_service_role_all ON public.account_action_notes;

CREATE POLICY account_action_notes_select ON public.account_action_notes
  FOR SELECT TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY account_action_notes_insert ON public.account_action_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));
CREATE POLICY account_action_notes_service_role_all ON public.account_action_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- comments : org-visible read, own-row write --------------------------
DROP POLICY IF EXISTS auth_view_comments ON public.comments;
DROP POLICY IF EXISTS users_create_comments ON public.comments;
DROP POLICY IF EXISTS users_update_own_comments ON public.comments;
DROP POLICY IF EXISTS users_admin_delete_comments ON public.comments;
DROP POLICY IF EXISTS comments_select ON public.comments;
DROP POLICY IF EXISTS comments_insert ON public.comments;
DROP POLICY IF EXISTS comments_update ON public.comments;
DROP POLICY IF EXISTS comments_delete ON public.comments;
DROP POLICY IF EXISTS comments_service_role_all ON public.comments;

CREATE POLICY comments_select ON public.comments
  FOR SELECT TO authenticated
  USING (
    (public.org_visible(organization_id)
     AND ((is_internal IS NOT TRUE) OR public.is_tenant_people_admin(organization_id)))
    OR public.is_platform_super_admin()
  );
CREATE POLICY comments_insert ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()) AND public.org_visible(organization_id));
CREATE POLICY comments_update ON public.comments
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()) AND public.org_visible(organization_id))
  WITH CHECK (author_id = (SELECT auth.uid()) AND public.org_visible(organization_id));
CREATE POLICY comments_delete ON public.comments
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id)
     AND (author_id = (SELECT auth.uid()) OR public.is_tenant_people_admin(organization_id)))
    OR public.is_platform_super_admin()
  );
CREATE POLICY comments_service_role_all ON public.comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- course_generation_presets : content-editor -------------------------
-- NOTE (P3P4_REVIEW): live course_generation_presets_manage was admin-only
-- (super_admin/corporate_admin + created_by self on non-system rows). Writes are
-- gated on is_tenant_admin(organization_id) here to preserve that admin-only scope.
DROP POLICY IF EXISTS course_generation_presets_select ON public.course_generation_presets;
DROP POLICY IF EXISTS course_generation_presets_manage ON public.course_generation_presets;
DROP POLICY IF EXISTS course_generation_presets_insert ON public.course_generation_presets;
DROP POLICY IF EXISTS course_generation_presets_update ON public.course_generation_presets;
DROP POLICY IF EXISTS course_generation_presets_delete ON public.course_generation_presets;
DROP POLICY IF EXISTS course_generation_presets_service_role_all ON public.course_generation_presets;

CREATE POLICY course_generation_presets_select ON public.course_generation_presets
  FOR SELECT TO authenticated
  USING (is_system = true OR public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY course_generation_presets_insert ON public.course_generation_presets
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY course_generation_presets_update ON public.course_generation_presets
  FOR UPDATE TO authenticated
  USING (
    (public.org_visible(organization_id) AND is_system = false
     AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    (public.org_visible(organization_id) AND is_system = false
     AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY course_generation_presets_delete ON public.course_generation_presets
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id) AND is_system = false
     AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY course_generation_presets_service_role_all ON public.course_generation_presets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- data_import_logs : tenant-admin -----------------------------------
DROP POLICY IF EXISTS "Users see import logs for accessible properties" ON public.data_import_logs;
DROP POLICY IF EXISTS "Managers can create import logs" ON public.data_import_logs;
DROP POLICY IF EXISTS "Managers can update import logs" ON public.data_import_logs;
DROP POLICY IF EXISTS "Managers can delete import logs" ON public.data_import_logs;
DROP POLICY IF EXISTS data_import_logs_select ON public.data_import_logs;
DROP POLICY IF EXISTS data_import_logs_insert ON public.data_import_logs;
DROP POLICY IF EXISTS data_import_logs_update ON public.data_import_logs;
DROP POLICY IF EXISTS data_import_logs_delete ON public.data_import_logs;
DROP POLICY IF EXISTS data_import_logs_service_role_all ON public.data_import_logs;

-- NOTE (P3P4_REVIEW): live read predicate has_property_access(auth.uid(), property_id)
-- is preserved verbatim; an org-scoped tenant-admin branch is added as an
-- ALTERNATIVE only. Import logs are NOT exposed to all org members.
CREATE POLICY data_import_logs_select ON public.data_import_logs
  FOR SELECT TO authenticated
  USING (
    public.has_property_access((SELECT auth.uid()), property_id)
    OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY data_import_logs_insert ON public.data_import_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));
CREATE POLICY data_import_logs_update ON public.data_import_logs
  FOR UPDATE TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));
CREATE POLICY data_import_logs_delete ON public.data_import_logs
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY data_import_logs_service_role_all ON public.data_import_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- document_tags : content-editor ----------------------------------
DROP POLICY IF EXISTS document_tags_select ON public.document_tags;
DROP POLICY IF EXISTS document_tags_insert ON public.document_tags;
DROP POLICY IF EXISTS document_tags_update ON public.document_tags;
DROP POLICY IF EXISTS document_tags_delete ON public.document_tags;
DROP POLICY IF EXISTS document_tags_service_role_all ON public.document_tags;

-- NOTE (P3P4_REVIEW): live write policies require a privileged role; the bare
-- created_by = auth.uid() branch is removed so writes need is_tenant_content_editor.
CREATE POLICY document_tags_select ON public.document_tags
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY document_tags_insert ON public.document_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  );
CREATE POLICY document_tags_update ON public.document_tags
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  );
CREATE POLICY document_tags_delete ON public.document_tags
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id)
     AND public.is_tenant_content_editor(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY document_tags_service_role_all ON public.document_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- microlearning_content : content-editor -------------------------
DROP POLICY IF EXISTS "Microlearning viewable by authenticated users" ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_manage_insert ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_manage_update ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_manage_delete ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_content_select ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_content_insert ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_content_update ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_content_delete ON public.microlearning_content;
DROP POLICY IF EXISTS microlearning_content_service_role_all ON public.microlearning_content;

-- NOTE (P3P4_REVIEW): live write policies require a privileged role; the bare
-- created_by = auth.uid() branch is removed so writes need is_tenant_content_editor.
CREATE POLICY microlearning_content_select ON public.microlearning_content
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY microlearning_content_insert ON public.microlearning_content
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  );
CREATE POLICY microlearning_content_update ON public.microlearning_content
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND public.is_tenant_content_editor(organization_id)
  );
CREATE POLICY microlearning_content_delete ON public.microlearning_content
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id)
     AND public.is_tenant_content_editor(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY microlearning_content_service_role_all ON public.microlearning_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- pending_user_approvals : people-admin + own-row read -----------
DROP POLICY IF EXISTS hr_admin_manage_pending_approvals ON public.pending_user_approvals;
DROP POLICY IF EXISTS pending_user_approvals_select ON public.pending_user_approvals;
DROP POLICY IF EXISTS pending_user_approvals_insert ON public.pending_user_approvals;
DROP POLICY IF EXISTS pending_user_approvals_update ON public.pending_user_approvals;
DROP POLICY IF EXISTS pending_user_approvals_delete ON public.pending_user_approvals;
DROP POLICY IF EXISTS pending_user_approvals_service_role_all ON public.pending_user_approvals;

-- NOTE (P3P4_REVIEW): own-row read branch removed to match live hr-admin-only scope.
CREATE POLICY pending_user_approvals_select ON public.pending_user_approvals
  FOR SELECT TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY pending_user_approvals_insert ON public.pending_user_approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));
CREATE POLICY pending_user_approvals_update ON public.pending_user_approvals
  FOR UPDATE TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));
CREATE POLICY pending_user_approvals_delete ON public.pending_user_approvals
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY pending_user_approvals_service_role_all ON public.pending_user_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- scheduled_compliance_reports : tenant-admin -------------------
DROP POLICY IF EXISTS hr_admin_manage_scheduled_reports ON public.scheduled_compliance_reports;
DROP POLICY IF EXISTS scheduled_compliance_reports_select ON public.scheduled_compliance_reports;
DROP POLICY IF EXISTS scheduled_compliance_reports_insert ON public.scheduled_compliance_reports;
DROP POLICY IF EXISTS scheduled_compliance_reports_update ON public.scheduled_compliance_reports;
DROP POLICY IF EXISTS scheduled_compliance_reports_delete ON public.scheduled_compliance_reports;
DROP POLICY IF EXISTS scheduled_compliance_reports_service_role_all ON public.scheduled_compliance_reports;

CREATE POLICY scheduled_compliance_reports_select ON public.scheduled_compliance_reports
  FOR SELECT TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY scheduled_compliance_reports_insert ON public.scheduled_compliance_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)
    AND created_by = (SELECT auth.uid())
  );
CREATE POLICY scheduled_compliance_reports_update ON public.scheduled_compliance_reports
  FOR UPDATE TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));
CREATE POLICY scheduled_compliance_reports_delete ON public.scheduled_compliance_reports
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY scheduled_compliance_reports_service_role_all ON public.scheduled_compliance_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- training_content_templates : content-editor -----------------
DROP POLICY IF EXISTS training_content_templates_select ON public.training_content_templates;
DROP POLICY IF EXISTS training_content_templates_insert ON public.training_content_templates;
DROP POLICY IF EXISTS training_content_templates_update ON public.training_content_templates;
DROP POLICY IF EXISTS training_content_templates_delete ON public.training_content_templates;
DROP POLICY IF EXISTS training_content_templates_service_role_all ON public.training_content_templates;

-- NOTE (P3P4_REVIEW): live table is SELECT-only for authenticated. No net-new
-- write policies are added; only the org-scoped SELECT (narrowed to org
-- visibility) replaces the prior authenticated read.
CREATE POLICY training_content_templates_select ON public.training_content_templates
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY training_content_templates_service_role_all ON public.training_content_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- user_invitations : people-admin + inviter -----------------
DROP POLICY IF EXISTS user_invitations_admin_select ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_admin_insert ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_admin_update ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_admin_delete ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_service_role_all ON public.user_invitations;

CREATE POLICY user_invitations_admin_select ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY user_invitations_admin_insert ON public.user_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND (invited_by = (SELECT auth.uid()) OR public.is_tenant_people_admin(organization_id))
  );
CREATE POLICY user_invitations_admin_update ON public.user_invitations
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (invited_by = (SELECT auth.uid()) OR public.is_tenant_people_admin(organization_id))
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND (invited_by = (SELECT auth.uid()) OR public.is_tenant_people_admin(organization_id))
  );
-- NOTE (P3P4_REVIEW): no authenticated DELETE policy on user_invitations in live;
-- intentionally not added here (would broaden). Revocation goes via service_role.
CREATE POLICY user_invitations_service_role_all ON public.user_invitations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- user_skills : people-admin + own-row read ---------------
DROP POLICY IF EXISTS consolidated_user_skills_select ON public.user_skills;
DROP POLICY IF EXISTS user_skills_manage_insert ON public.user_skills;
DROP POLICY IF EXISTS user_skills_manage_update ON public.user_skills;
DROP POLICY IF EXISTS user_skills_manage_delete ON public.user_skills;
DROP POLICY IF EXISTS user_skills_service_role_all ON public.user_skills;

CREATE POLICY consolidated_user_skills_select ON public.user_skills
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY user_skills_manage_insert ON public.user_skills
  FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));
CREATE POLICY user_skills_manage_update ON public.user_skills
  FOR UPDATE TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));
CREATE POLICY user_skills_manage_delete ON public.user_skills
  FOR DELETE TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY user_skills_service_role_all ON public.user_skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
