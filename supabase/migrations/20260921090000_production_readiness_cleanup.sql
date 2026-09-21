-- Production-readiness cleanup (learning-platform scope).
--
-- 1. Public partner-briefing form: create the table it has always inserted into.
-- 2. organization_id: fill from parent/owner context on insert, backfill orphans,
--    and require it on tenant content tables (an org-less row is invisible under
--    org_visible() RLS, so it was always a silent data-loss bug).
-- 3. tasks: only the creator, the assignee, or a tenant admin may edit; only the
--    creator or a tenant admin may delete; inserts must be attributed to the caller.
-- 4. Drop empty tables nothing references any more, the storage policies of seven
--    empty, unreferenced buckets (announcement-attachments, employee-documents,
--    payslips, referral-cvs, resumes, sop-attachments, task-attachments), and the
--    helper functions that only existed for them. The buckets themselves must be
--    deleted through the Storage API/dashboard (storage.protect_delete blocks SQL).
-- 5. Unschedule cron jobs that call neutralized (410) edge functions.
--
-- Deliberately left nullable: platform_events, system_settings (NULL = platform
-- scope), wizard_user_progress (NULL org = platform-level wizard, relied on by
-- skip_or_complete_wizard), notification_queue and employee_transfer_logs
-- (recipients may be platform operators without an active membership).


-- ---------------------------------------------------------------------------
-- 1. partner_briefing_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_briefing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  organization text CHECK (organization IS NULL OR char_length(organization) <= 200),
  mandate_type text CHECK (mandate_type IS NULL OR char_length(mandate_type) <= 100),
  message text CHECK (message IS NULL OR char_length(message) <= 5000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_briefing_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors of the public site) may submit; nobody but
-- platform operators may read or manage submissions.
DROP POLICY IF EXISTS partner_briefing_requests_public_insert ON public.partner_briefing_requests;
CREATE POLICY partner_briefing_requests_public_insert ON public.partner_briefing_requests
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');

DROP POLICY IF EXISTS partner_briefing_requests_operator_select ON public.partner_briefing_requests;
CREATE POLICY partner_briefing_requests_operator_select ON public.partner_briefing_requests
  FOR SELECT TO authenticated USING (public.is_platform_operator());

DROP POLICY IF EXISTS partner_briefing_requests_operator_update ON public.partner_briefing_requests;
CREATE POLICY partner_briefing_requests_operator_update ON public.partner_briefing_requests
  FOR UPDATE TO authenticated USING (public.is_platform_operator()) WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS partner_briefing_requests_operator_delete ON public.partner_briefing_requests;
CREATE POLICY partner_briefing_requests_operator_delete ON public.partner_briefing_requests
  FOR DELETE TO authenticated USING (public.is_platform_operator());

REVOKE ALL ON public.partner_briefing_requests FROM anon, authenticated;
GRANT INSERT ON public.partner_briefing_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.partner_briefing_requests TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. organization_id fill-in
-- ---------------------------------------------------------------------------
-- Each trigger argument is '<source>:<column>'. <source> is either a public table
-- with an organization_id column (the org is read from the row whose id = NEW.<column>)
-- or 'member' (the org is the active primary membership of the user in NEW.<column>).
-- Sources are tried in order; the caller's own org is the last resort. A caller-
-- supplied organization_id is kept as is (RLS WITH CHECK already restricts it to
-- orgs the caller can see; master content legitimately references other orgs).
CREATE OR REPLACE FUNCTION public.tg_fill_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_arg text;
  v_source text;
  v_column text;
  v_id uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_arg IN ARRAY COALESCE(TG_ARGV, ARRAY[]::text[]) LOOP
    v_source := split_part(v_arg, ':', 1);
    v_column := split_part(v_arg, ':', 2);
    EXECUTE format('SELECT ($1).%I::uuid', v_column) INTO v_id USING NEW;
    CONTINUE WHEN v_id IS NULL;

    IF v_source = 'member' THEN
      SELECT om.organization_id INTO v_org
      FROM public.organization_memberships om
      WHERE om.user_id = v_id AND om.is_active
      ORDER BY om.is_primary DESC NULLS LAST, om.created_at ASC
      LIMIT 1;
    ELSE
      EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_source) INTO v_org USING v_id;
    END IF;

    IF v_org IS NOT NULL THEN
      NEW.organization_id := v_org;
      RETURN NEW;
    END IF;
  END LOOP;

  NEW.organization_id := (public.current_user_organization_ids())[1];
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_fill_organization_id() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('certificate_templates',     ARRAY[]::text[]),
      ('competencies',              ARRAY['departments:department_id']),
      ('knowledge_chunks',          ARRAY['documents:document_id']),
      ('learning_quizzes',          ARRAY['training_modules:training_module_id', 'documents:source_document_id', 'member:created_by']),
      ('media_assets',              ARRAY['hotels:property_id', 'member:uploaded_by']),
      ('media_collections',         ARRAY['hotels:property_id', 'member:created_by']),
      ('practical_assessments',     ARRAY['courses:course_id', 'departments:department_id']),
      ('question_banks',            ARRAY['departments:department_id', 'member:created_by']),
      ('training_assignment_rules', ARRAY['hotels:hotel_id', 'departments:department_id', 'departments:target_department_id', 'brands:brand_id', 'member:created_by']),
      ('training_paths',            ARRAY['departments:target_department_id', 'member:created_by']),
      ('training_sessions',         ARRAY['hotels:hotel_id', 'courses:course_id', 'member:instructor_id']),
      ('unified_questions',         ARRAY['question_banks:question_bank_id', 'hotels:hotel_id', 'brands:brand_id', 'member:created_by']),
      ('user_competencies',         ARRAY['competencies:competency_id', 'member:user_id']),
      ('unified_quiz_sessions',     ARRAY['member:user_id']),
      ('unified_question_attempts', ARRAY['unified_quiz_sessions:session_id', 'member:user_id']),
      ('employee_transfer_logs',    ARRAY['member:user_id']),
      ('notification_queue',        ARRAY['member:user_id'])
    ) AS t(tbl, args)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.%I', r.tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_fill_organization_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_fill_organization_id(%s)',
      r.tbl,
      COALESCE((SELECT string_agg(quote_literal(a), ', ') FROM unnest(r.args) a), '')
    );
  END LOOP;
END $$;

-- Backfill the existing orphans from their parents / owners.
UPDATE public.training_paths p
SET organization_id = d.organization_id
FROM public.departments d
WHERE p.organization_id IS NULL AND d.id = p.target_department_id;

UPDATE public.training_assignment_rules r
SET organization_id = COALESCE(
  (SELECT om.organization_id FROM public.organization_memberships om
    WHERE r.target_type = 'user' AND om.user_id::text = r.target_id AND om.is_active
    ORDER BY om.is_primary DESC NULLS LAST, om.created_at LIMIT 1),
  (SELECT m.organization_id FROM public.training_modules m WHERE m.id = r.content_id)
)
WHERE r.organization_id IS NULL;

UPDATE public.unified_quiz_sessions s
SET organization_id = (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = s.user_id AND om.is_active
  ORDER BY om.is_primary DESC NULLS LAST, om.created_at LIMIT 1
)
WHERE s.organization_id IS NULL;

UPDATE public.unified_question_attempts a
SET organization_id = COALESCE(
  (SELECT s.organization_id FROM public.unified_quiz_sessions s WHERE s.id = a.session_id),
  (SELECT q.organization_id FROM public.unified_questions q WHERE q.id = a.question_id)
)
WHERE a.organization_id IS NULL;

-- Require it on tenant content. Fails loudly (and rolls back) if any orphan survived.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'certificate_templates', 'competencies', 'knowledge_chunks', 'learning_quizzes',
    'media_assets', 'media_collections', 'practical_assessments', 'question_banks',
    'training_assignment_rules', 'training_paths', 'training_sessions', 'unified_questions',
    'user_competencies', 'unified_quiz_sessions', 'unified_question_attempts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. tasks
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.org_visible(organization_id) AND created_by_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id) AND (
      created_by_id = (SELECT auth.uid())
      OR assigned_to_id = (SELECT auth.uid())
      OR public.is_tenant_admin(organization_id)
    )
  )
  WITH CHECK (
    public.org_visible(organization_id) AND (
      created_by_id = (SELECT auth.uid())
      OR assigned_to_id = (SELECT auth.uid())
      OR public.is_tenant_admin(organization_id)
    )
  );

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (
    public.org_visible(organization_id) AND (
      created_by_id = (SELECT auth.uid())
      OR public.is_tenant_admin(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Unused, empty tables / buckets / helpers
-- ---------------------------------------------------------------------------
-- Every table below had 0 rows and no reference from the app, edge functions,
-- SQL functions, views, or other tables' policies (verified 2026-09-21).
DROP TABLE IF EXISTS
  public.api_keys,
  public.service_accounts,
  public.conversation_participants,
  public.data_import_logs,
  public.identity_providers,
  public.knowledge_required_reading,
  public.learning_events,
  public.lesson_progress,
  public.lesson_blocks,
  public.message_attachments,
  public.objective_links,
  public.scheduled_report_executions,
  public.training_certificate_settings,
  public.training_module_prerequisites,
  public.user_dashboard_preferences;

DROP POLICY IF EXISTS announcement_attachments_delete ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_select ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_update ON storage.objects;
DROP POLICY IF EXISTS employee_documents_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS employee_documents_authenticated_select ON storage.objects;
DROP POLICY IF EXISTS employee_documents_owner_delete ON storage.objects;
DROP POLICY IF EXISTS payslips_delete ON storage.objects;
DROP POLICY IF EXISTS payslips_insert ON storage.objects;
DROP POLICY IF EXISTS payslips_select ON storage.objects;
DROP POLICY IF EXISTS payslips_update ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_delete ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_insert ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_select ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_update ON storage.objects;
DROP POLICY IF EXISTS resumes_delete ON storage.objects;
DROP POLICY IF EXISTS resumes_insert ON storage.objects;
DROP POLICY IF EXISTS resumes_select ON storage.objects;
DROP POLICY IF EXISTS resumes_update ON storage.objects;
DROP POLICY IF EXISTS sop_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS sop_attachments_select ON storage.objects;
DROP POLICY IF EXISTS task_attachments_storage_insert ON storage.objects;
DROP POLICY IF EXISTS task_attachments_storage_select ON storage.objects;

DROP FUNCTION IF EXISTS public.can_view_employee_document(uuid);
DROP FUNCTION IF EXISTS public.can_manage_employee_document(uuid);
DROP FUNCTION IF EXISTS public.get_next_shift(uuid);

-- ---------------------------------------------------------------------------
-- 5. Cron jobs pointing at neutralized edge functions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'daily-workflows-job', 'approval-escalation-job', 'preventive-maintenance-job',
    'weekly-manager-report-job', 'recurring-tasks-job', 'fetch-news-every-6-hours'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

