-- Phase 4a (rebuild, 2026-09-25): enforce the business-logic map in the
-- command functions that already existed.
--
-- 1. approve_training_module: an author could approve their own course.
--    Four-eyes rule: the creator cannot approve while another reviewer exists
--    in the organization (single-reviewer organizations can still publish).
-- 2. publish_document_to_kb:
--    * "published by" came from a client-supplied p_user_id (forgeable
--      attribution); it is now the caller.
--    * p_supersedes_id was not checked against the organization, so an editor
--      in one tenant could supersede (deactivate) another tenant's article.
--    * p_department_id is checked against the document's organization.
-- 3. create_scoped_training_assignment accepted draft/pending courses, so
--    learners could be assigned content that is not published.
-- 4. Certificates notified learners through an HR-era trigger function
--    (create_hr_notification, branching on performance_reviews / goals) that
--    linked to /profile. Replaced by notify_certificate_issued.
-- 5. get_department_compliance(org): department compliance computed on the
--    server from the real assignment targets. The dashboard computed it in the
--    browser with several queries per department, divided completions by
--    individual assignments only (rates above 100%), and weighted a removed
--    tasks domain at 45%.
--
-- Rule violations raise with a stable code in HINT (errors:rules.<CODE>).

-- ---------------------------------------------------------------------------
-- 1. Four-eyes course approval
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_training_module(p_module_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_org uuid;
    v_title text;
    v_author uuid;
    v_block record;
    v_quiz_id uuid;
    v_question_count integer;
BEGIN
    SELECT organization_id, created_by INTO v_org, v_author FROM public.courses WHERE id = p_module_id;
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'Course not found' USING ERRCODE = 'P0002', HINT = 'COURSE_NOT_FOUND';
    END IF;
    IF NOT public.can_review_training_module(v_org) THEN
        RAISE EXCEPTION 'You are not allowed to approve courses' USING ERRCODE = '42501', HINT = 'COURSE_REVIEW_NOT_ALLOWED';
    END IF;

    IF v_author = auth.uid() AND EXISTS (
        SELECT 1 FROM public.organization_memberships om
         WHERE om.organization_id = v_org AND om.is_active AND om.user_id <> auth.uid()
           AND om.role IN ('organization_owner', 'organization_admin', 'training_manager')
    ) THEN
        RAISE EXCEPTION 'Another reviewer must approve a course you created'
          USING ERRCODE = '42501', HINT = 'COURSE_SELF_APPROVAL';
    END IF;

    FOR v_block IN
        SELECT id, content_data, is_mandatory
          FROM public.training_content_blocks_v
         WHERE training_module_id = p_module_id AND is_deleted = false AND type = 'quiz'
    LOOP
        IF v_block.is_mandatory IS FALSE THEN
            CONTINUE;
        END IF;

        v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
        IF v_quiz_id IS NULL THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz block is not linked to a quiz'
              USING ERRCODE = 'P0001', HINT = 'COURSE_QUIZ_NOT_LINKED';
        END IF;

        SELECT count(*) INTO v_question_count
          FROM public.unified_quiz_questions uq
          JOIN public.unified_questions q ON q.id = uq.question_id
         WHERE uq.quiz_id = v_quiz_id AND q.status = 'published';

        IF v_question_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz has no published questions'
              USING ERRCODE = 'P0001', HINT = 'COURSE_QUIZ_EMPTY';
        END IF;
    END LOOP;

    UPDATE public.courses
       SET status = 'published', updated_at = now(), updated_by = auth.uid()
     WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title INTO v_title;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'This course is not waiting for review' USING ERRCODE = 'P0001', HINT = 'COURSE_NOT_PENDING_REVIEW';
    END IF;

    PERFORM public.snapshot_training_module_version(p_module_id);

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, link, entity_type, entity_id)
        VALUES (
            v_author, v_org,
            'training_review_approved',
            'Training module approved',
            '"' || v_title || '" was approved and is now published.',
            '/training/hub/' || p_module_id,
            'training_module',
            p_module_id
        );
    END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Knowledge publishing: caller attribution, same-organization targets
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_document_to_kb(p_document_id uuid, p_user_id uuid, p_visibility text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_supersedes_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_doc record;
    v_supersede_target uuid;
    v_actor uuid;
BEGIN
    SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document not found');
    END IF;

    IF NOT (public.is_platform_super_admin() OR public._p7_is_service_context()
            OR public.is_tenant_admin(v_doc.organization_id) OR public.is_tenant_content_editor(v_doc.organization_id)) THEN
      RAISE EXCEPTION 'You are not allowed to publish in this organization'
        USING ERRCODE = '42501', HINT = 'KB_PUBLISH_NOT_ALLOWED';
    END IF;

    -- The caller is the publisher. Only trusted server contexts may attribute
    -- a publish to someone else.
    v_actor := CASE WHEN public._p7_is_service_context() THEN COALESCE(p_user_id, auth.uid()) ELSE auth.uid() END;

    v_supersede_target := COALESCE(p_supersedes_id, v_doc.supersedes_document_id);

    IF v_supersede_target IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.documents WHERE id = v_supersede_target AND organization_id = v_doc.organization_id
    ) THEN
        RAISE EXCEPTION 'The replaced article must belong to the same organization'
          USING ERRCODE = '42501', HINT = 'KB_SUPERSEDE_OTHER_ORG';
    END IF;

    IF p_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.departments WHERE id = p_department_id AND organization_id = v_doc.organization_id
    ) THEN
        RAISE EXCEPTION 'Choose a department from this organization'
          USING ERRCODE = '22023', HINT = 'KB_DEPARTMENT_OTHER_ORG';
    END IF;

    IF v_supersede_target IS NOT NULL THEN
        UPDATE public.documents
        SET
            knowledge_base_status = 'superseded',
            is_active_kb_version = false,
            updated_at = NOW()
        WHERE id = v_supersede_target;
    END IF;

    UPDATE public.documents
    SET
        status = 'PUBLISHED'::document_status,
        knowledge_base_status = 'indexed',
        is_active_kb_version = true,
        published_at = NOW(),
        published_by = v_actor,
        last_published_by = v_actor,
        visibility = COALESCE(p_visibility::document_visibility, visibility),
        category_id = COALESCE(p_category_id, category_id),
        department_id = COALESCE(p_department_id, department_id),
        supersedes_document_id = v_supersede_target,
        updated_at = NOW(),
        updated_by = v_actor
    WHERE id = p_document_id;

    RETURN jsonb_build_object('success', true, 'document_id', p_document_id, 'superseded_id', v_supersede_target);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Only published courses can be assigned
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_sig regprocedure := 'public.create_scoped_training_assignment(uuid,text,uuid,uuid,uuid,uuid,text,uuid[],timestamptz,text,text,boolean,boolean,integer[])'::regprocedure;
  v_def text := pg_get_functiondef(v_sig);
  v_anchor text := $a$    RAISE EXCEPTION 'Training module belongs to a different organization; deploy it to this organization first.';
  END IF;$a$;
BEGIN
  IF position(v_anchor IN v_def) = 0 THEN
    RAISE EXCEPTION 'create_scoped_training_assignment changed; update this migration';
  END IF;
  v_def := replace(v_def, v_anchor, v_anchor || $b$

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND status = 'published') THEN
    RAISE EXCEPTION 'Only published courses can be assigned. Publish the course first.'
      USING ERRCODE = 'P0001', HINT = 'ASSIGN_COURSE_NOT_PUBLISHED';
  END IF;$b$);
  EXECUTE v_def;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Certificate notification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_certificate_issued()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, link, entity_type, entity_id)
    VALUES (NEW.user_id, NEW.organization_id, 'training_completed', 'Certificate issued',
            'Your certificate for "' || COALESCE(NEW.title, 'your training') || '" is ready.',
            '/training/certificates', 'certificate', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_certificate_issued() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_certificate_issued ON public.certificates;
CREATE TRIGGER on_certificate_issued AFTER INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.notify_certificate_issued();
DROP FUNCTION IF EXISTS public.create_hr_notification();

-- ---------------------------------------------------------------------------
-- 5. Department compliance, computed on the server
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_department_compliance(p_org_id uuid)
 RETURNS TABLE (
   department_id uuid,
   department_name text,
   head_name text,
   staff_count integer,
   assigned_count integer,
   completed_count integer,
   overdue_count integer,
   training_completion_rate numeric,
   sop_compliance_rate numeric,
   overall_score numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.tenant_can(p_org_id, 'reports.view') THEN
    RAISE EXCEPTION 'You are not allowed to view compliance for this organization'
      USING ERRCODE = '42501', HINT = 'REPORTS_NOT_ALLOWED';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT m.user_id, m.department_id, m.role::text AS role
      FROM public.organization_memberships m
     WHERE m.organization_id = p_org_id AND m.is_active AND m.department_id IS NOT NULL
  ),
  targets AS (
    SELECT t.user_id, t.training_id, min(t.due_date) AS due_date
      FROM public._module_assignment_targets(ARRAY[p_org_id]) t
     GROUP BY t.user_id, t.training_id
  ),
  pairs AS (
    SELECT mb.department_id, tg.user_id, tg.training_id, tg.due_date,
           EXISTS (
             SELECT 1 FROM public.training_progress tp
              WHERE tp.user_id = tg.user_id AND tp.training_id = tg.training_id
                AND tp.lp_content_type = 'module' AND tp.status = 'completed' AND tp.passed IS TRUE
                AND COALESCE(tp.is_deleted, false) = false
           ) AS done
      FROM targets tg JOIN members mb ON mb.user_id = tg.user_id
  ),
  training AS (
    SELECT p.department_id,
           count(*)::integer AS assigned,
           count(*) FILTER (WHERE p.done)::integer AS completed,
           count(*) FILTER (WHERE NOT p.done AND p.due_date IS NOT NULL AND p.due_date < now())::integer AS overdue
      FROM pairs p GROUP BY p.department_id
  ),
  required_docs AS (
    SELECT d.id, d.department_id
      FROM public.documents d
     WHERE d.organization_id = p_org_id AND d.department_id IS NOT NULL
       AND d.status = 'PUBLISHED' AND d.requires_acknowledgment IS TRUE
       AND COALESCE(d.is_deleted, false) = false
  ),
  sop AS (
    SELECT rd.department_id,
           count(*)::integer AS required,
           count(a.id)::integer AS acknowledged
      FROM required_docs rd
      JOIN members mb ON mb.department_id = rd.department_id
      LEFT JOIN public.document_acknowledgments a ON a.document_id = rd.id AND a.user_id = mb.user_id
     GROUP BY rd.department_id
  )
  SELECT d.id,
         d.name,
         (SELECT pr.full_name FROM members mb JOIN public.profiles pr ON pr.id = mb.user_id
           WHERE mb.department_id = d.id AND mb.role = 'department_manager' LIMIT 1),
         (SELECT count(*)::integer FROM members mb WHERE mb.department_id = d.id),
         COALESCE(tr.assigned, 0),
         COALESCE(tr.completed, 0),
         COALESCE(tr.overdue, 0),
         CASE WHEN COALESCE(tr.assigned, 0) > 0 THEN round(100.0 * tr.completed / tr.assigned, 1) END,
         CASE WHEN COALESCE(s.required, 0) > 0 THEN round(100.0 * s.acknowledged / s.required, 1) END,
         CASE
           WHEN COALESCE(tr.assigned, 0) > 0 AND COALESCE(s.required, 0) > 0
             THEN round(0.6 * (100.0 * tr.completed / tr.assigned) + 0.4 * (100.0 * s.acknowledged / s.required), 1)
           WHEN COALESCE(tr.assigned, 0) > 0 THEN round(100.0 * tr.completed / tr.assigned, 1)
           WHEN COALESCE(s.required, 0) > 0 THEN round(100.0 * s.acknowledged / s.required, 1)
         END
    FROM public.departments d
    LEFT JOIN training tr ON tr.department_id = d.id
    LEFT JOIN sop s ON s.department_id = d.id
   WHERE d.organization_id = p_org_id AND COALESCE(d.is_deleted, false) = false AND COALESCE(d.is_active, true)
   ORDER BY 10 DESC NULLS LAST, d.name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_department_compliance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_department_compliance(uuid) TO authenticated;
