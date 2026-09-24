BEGIN;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_course()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.course_id IS NOT NULL THEN
      SELECT c.organization_id INTO NEW.organization_id FROM public.courses c WHERE c.id = NEW.course_id;
    END IF;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_objective()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT o.organization_id INTO NEW.organization_id
      FROM public.learning_objectives o WHERE o.id = NEW.objective_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_course_module()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
      FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
     WHERE cm.id = NEW.course_module_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_lesson()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT l.organization_id INTO NEW.organization_id
      FROM public.lessons l WHERE l.id = NEW.lesson_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT e.organization_id INTO NEW.organization_id
      FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_learning_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.enrollment_id IS NOT NULL THEN
      SELECT e.organization_id INTO NEW.organization_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
    END IF;
    IF NEW.organization_id IS NULL AND NEW.course_id IS NOT NULL THEN
      SELECT c.organization_id INTO NEW.organization_id FROM public.courses c WHERE c.id = NEW.course_id;
    END IF;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_report_definition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT rd.organization_id INTO NEW.organization_id
      FROM public.report_definitions rd WHERE rd.id = NEW.report_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_scheduled_compliance_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT scr.organization_id INTO NEW.organization_id
      FROM public.scheduled_compliance_reports scr WHERE scr.id = NEW.report_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_sop_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT sc.organization_id INTO NEW.organization_id
      FROM public.sop_comments sc WHERE sc.id = NEW.comment_id;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.p6_set_org_from_document_folder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF NEW.folder_id IS NOT NULL THEN
      SELECT df.organization_id INTO NEW.organization_id
        FROM public.document_folders df WHERE df.id = NEW.folder_id;
    END IF;
    NEW.organization_id := COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001');
  END IF;
  RETURN NEW;
END;
$$;

-- Parity hardening (P5P6_REVIEW minor): trigger-only helpers, lock down EXECUTE.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.p6_set_org_from_course()',
    'public.p6_set_org_from_objective()',
    'public.p6_set_org_from_course_module()',
    'public.p6_set_org_from_lesson()',
    'public.p6_set_org_from_enrollment()',
    'public.p6_set_org_learning_events()',
    'public.p6_set_org_from_report_definition()',
    'public.p6_set_org_from_scheduled_compliance_report()',
    'public.p6_set_org_from_sop_comment()',
    'public.p6_set_org_from_document_folder()'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- 1. learning_objectives
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_objectives_organization_id_fkey') THEN
    ALTER TABLE public.learning_objectives
      ADD CONSTRAINT learning_objectives_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.learning_objectives lo SET organization_id = COALESCE(
  (SELECT c.organization_id FROM public.courses c WHERE c.id = lo.course_id),
  'e0000000-0000-0000-0000-000000000001') WHERE lo.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_learning_objectives_organization_id ON public.learning_objectives (organization_id);
ALTER TABLE public.learning_objectives ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.learning_objectives;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.learning_objectives
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_course();

-- 2. objective_links
ALTER TABLE public.objective_links ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'objective_links_organization_id_fkey') THEN
    ALTER TABLE public.objective_links
      ADD CONSTRAINT objective_links_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.objective_links ol SET organization_id = COALESCE(
  (SELECT o.organization_id FROM public.learning_objectives o WHERE o.id = ol.objective_id),
  'e0000000-0000-0000-0000-000000000001') WHERE ol.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_objective_links_organization_id ON public.objective_links (organization_id);
ALTER TABLE public.objective_links ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.objective_links;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.objective_links
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_objective();

-- 3. lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_organization_id_fkey') THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.lessons l SET organization_id = COALESCE(
  (SELECT c.organization_id FROM public.course_modules cm JOIN public.courses c ON c.id = cm.course_id WHERE cm.id = l.course_module_id),
  'e0000000-0000-0000-0000-000000000001') WHERE l.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_organization_id ON public.lessons (organization_id);
ALTER TABLE public.lessons ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.lessons;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_course_module();

-- 4. lesson_blocks
ALTER TABLE public.lesson_blocks ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_blocks_organization_id_fkey') THEN
    ALTER TABLE public.lesson_blocks
      ADD CONSTRAINT lesson_blocks_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.lesson_blocks lb SET organization_id = COALESCE(
  (SELECT c.organization_id FROM public.lessons l
     JOIN public.course_modules cm ON cm.id = l.course_module_id
     JOIN public.courses c ON c.id = cm.course_id WHERE l.id = lb.lesson_id),
  'e0000000-0000-0000-0000-000000000001') WHERE lb.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_organization_id ON public.lesson_blocks (organization_id);
ALTER TABLE public.lesson_blocks ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.lesson_blocks;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.lesson_blocks
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_lesson();

-- 5. lesson_progress
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_progress_organization_id_fkey') THEN
    ALTER TABLE public.lesson_progress
      ADD CONSTRAINT lesson_progress_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.lesson_progress lp SET organization_id = COALESCE(
  (SELECT e.organization_id FROM public.enrollments e WHERE e.id = lp.enrollment_id),
  'e0000000-0000-0000-0000-000000000001') WHERE lp.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_organization_id ON public.lesson_progress (organization_id);
ALTER TABLE public.lesson_progress ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.lesson_progress;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_enrollment();

-- 6. learning_events
ALTER TABLE public.learning_events ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_events_organization_id_fkey') THEN
    ALTER TABLE public.learning_events
      ADD CONSTRAINT learning_events_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.learning_events ev SET organization_id = COALESCE(
  (SELECT e.organization_id FROM public.enrollments e WHERE e.id = ev.enrollment_id),
  (SELECT c.organization_id FROM public.courses c WHERE c.id = ev.course_id),
  'e0000000-0000-0000-0000-000000000001') WHERE ev.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_learning_events_organization_id ON public.learning_events (organization_id);
ALTER TABLE public.learning_events ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.learning_events;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.learning_events
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_learning_events();

-- 7. report_runs
ALTER TABLE public.report_runs ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_runs_organization_id_fkey') THEN
    ALTER TABLE public.report_runs
      ADD CONSTRAINT report_runs_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.report_runs rr SET organization_id = COALESCE(
  (SELECT rd.organization_id FROM public.report_definitions rd WHERE rd.id = rr.report_id),
  'e0000000-0000-0000-0000-000000000001') WHERE rr.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_runs_organization_id ON public.report_runs (organization_id);
ALTER TABLE public.report_runs ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.report_runs;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.report_runs
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_report_definition();

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_report_runs ON public.report_runs;
CREATE POLICY auth_view_report_runs ON public.report_runs
  FOR SELECT TO public
  USING (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND (
      (triggered_by IS NOT NULL AND triggered_by = (SELECT auth.uid()))
      OR can_view_report_definition(report_id)
    )
  );
DROP POLICY IF EXISTS hr_admin_manage_report_runs_insert ON public.report_runs;
CREATE POLICY hr_admin_manage_report_runs_insert ON public.report_runs
  FOR INSERT TO public
  WITH CHECK (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  );
DROP POLICY IF EXISTS hr_admin_manage_report_runs_update ON public.report_runs;
CREATE POLICY hr_admin_manage_report_runs_update ON public.report_runs
  FOR UPDATE TO public
  USING (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  );
DROP POLICY IF EXISTS hr_admin_manage_report_runs_delete ON public.report_runs;
CREATE POLICY hr_admin_manage_report_runs_delete ON public.report_runs
  FOR DELETE TO public
  USING (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  );

-- 8. scheduled_report_executions
ALTER TABLE public.scheduled_report_executions ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_report_executions_organization_id_fkey') THEN
    ALTER TABLE public.scheduled_report_executions
      ADD CONSTRAINT scheduled_report_executions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.scheduled_report_executions sre SET organization_id = COALESCE(
  (SELECT scr.organization_id FROM public.scheduled_compliance_reports scr WHERE scr.id = sre.report_id),
  'e0000000-0000-0000-0000-000000000001') WHERE sre.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_report_executions_organization_id ON public.scheduled_report_executions (organization_id);
ALTER TABLE public.scheduled_report_executions ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.scheduled_report_executions;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.scheduled_report_executions
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_scheduled_compliance_report();

ALTER TABLE public.scheduled_report_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_admin_manage_report_executions ON public.scheduled_report_executions;
CREATE POLICY hr_admin_manage_report_executions ON public.scheduled_report_executions
  FOR ALL TO public
  USING (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND is_hr_or_admin((SELECT auth.uid()))
  );

-- 9. sop_comment_votes
ALTER TABLE public.sop_comment_votes ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sop_comment_votes_organization_id_fkey') THEN
    ALTER TABLE public.sop_comment_votes
      ADD CONSTRAINT sop_comment_votes_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.sop_comment_votes scv SET organization_id = COALESCE(
  (SELECT sc.organization_id FROM public.sop_comments sc WHERE sc.id = scv.comment_id),
  'e0000000-0000-0000-0000-000000000001') WHERE scv.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_sop_comment_votes_organization_id ON public.sop_comment_votes (organization_id);
ALTER TABLE public.sop_comment_votes ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.sop_comment_votes;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.sop_comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_sop_comment();

ALTER TABLE public.sop_comment_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_own_votes ON public.sop_comment_votes;
CREATE POLICY users_own_votes ON public.sop_comment_votes
  FOR ALL TO public
  USING (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  );

-- 10. document_notification_rules
ALTER TABLE public.document_notification_rules ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_notification_rules_organization_id_fkey') THEN
    ALTER TABLE public.document_notification_rules
      ADD CONSTRAINT document_notification_rules_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_notification_rules dnr SET organization_id = COALESCE(
  (SELECT df.organization_id FROM public.document_folders df WHERE df.id = dnr.folder_id),
  'e0000000-0000-0000-0000-000000000001') WHERE dnr.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_notification_rules_organization_id ON public.document_notification_rules (organization_id);
ALTER TABLE public.document_notification_rules ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_p6_set_org ON public.document_notification_rules;
CREATE TRIGGER trg_p6_set_org BEFORE INSERT ON public.document_notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.p6_set_org_from_document_folder();

ALTER TABLE public.document_notification_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_notification_rules_select_own ON public.document_notification_rules;
CREATE POLICY document_notification_rules_select_own ON public.document_notification_rules
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  );
DROP POLICY IF EXISTS document_notification_rules_insert_own ON public.document_notification_rules;
CREATE POLICY document_notification_rules_insert_own ON public.document_notification_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.document_folders df
        WHERE df.id = document_notification_rules.folder_id
          AND (
            df.is_system = true
            OR df.created_by = (SELECT auth.uid())
            OR has_property_access((SELECT auth.uid()), df.property_id)
          )
      )
    )
  );
DROP POLICY IF EXISTS document_notification_rules_update_own ON public.document_notification_rules;
CREATE POLICY document_notification_rules_update_own ON public.document_notification_rules
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  );
DROP POLICY IF EXISTS document_notification_rules_delete_own ON public.document_notification_rules;
CREATE POLICY document_notification_rules_delete_own ON public.document_notification_rules
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL
    AND org_visible(organization_id)
  );

COMMIT;
