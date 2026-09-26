-- =============================================================================
-- Data for the learner design refresh.
--   * get_my_course_points      - points a learner earned from one course
--                                 (course finish screen)
--   * mark_learner_welcome_seen - first-run welcome is shown once per person
--   * get_team_momentum         - weekly points / active learners for managers
--   * get_popular_articles      - most-read knowledge this week, filtered to
--                                 what the caller may read
-- All derive from existing records (see 20260926160000_learner_gamification).
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learner_welcome_seen_at timestamptz;

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_course_points(p_org_id uuid, p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_lessons int; v_course int; v_on_time int; v_quiz int; v_cert int;
BEGIN
  IF NOT public._can_read_learning_game(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(e.points) FILTER (WHERE e.kind = 'lesson'), 0),
         COALESCE(sum(e.points) FILTER (WHERE e.kind = 'course'), 0),
         COALESCE(sum(e.points) FILTER (WHERE e.kind = 'on_time'), 0)
    INTO v_lessons, v_course, v_on_time
    FROM public._learning_point_events(p_org_id) e
   WHERE e.user_id = v_uid AND e.ref_id = p_course_id;

  -- Quizzes taken inside this course.
  SELECT COALESCE(sum(e.points), 0) INTO v_quiz
    FROM public._learning_point_events(p_org_id) e
   WHERE e.user_id = v_uid AND e.kind IN ('quiz_pass', 'quiz_perfect')
     AND EXISTS (SELECT 1 FROM public.unified_quiz_sessions q
                  WHERE q.user_id = v_uid AND q.quiz_entity_id = e.ref_id
                    AND q.context_entity_id = p_course_id);

  SELECT COALESCE(sum(e.points), 0) INTO v_cert
    FROM public._learning_point_events(p_org_id) e
    JOIN public.certificates c ON c.id = e.ref_id
   WHERE e.user_id = v_uid AND e.kind = 'certificate' AND c.training_module_id = p_course_id;

  RETURN jsonb_build_object(
    'total', v_lessons + v_course + v_on_time + v_quiz + v_cert,
    'lessons', v_lessons, 'course', v_course, 'on_time', v_on_time,
    'quizzes', v_quiz, 'certificate', v_cert);
END;
$function$;

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_learner_welcome_seen()
 RETURNS timestamptz
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.profiles
     SET learner_welcome_seen_at = COALESCE(learner_welcome_seen_at, now())
   WHERE id = auth.uid()
  RETURNING learner_welcome_seen_at;
$function$;

-- -----------------------------------------------------------------------------
-- Team momentum for managers. Organization admins and training managers see
-- the whole organization (optionally one department); department managers
-- see only their own departments.
CREATE OR REPLACE FUNCTION public.get_team_momentum(p_org_id uuid, p_weeks integer DEFAULT 8, p_department_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_weeks int := LEAST(GREATEST(COALESCE(p_weeks, 8), 1), 26);
  v_org_wide boolean;
  v_depts uuid[];
  v_members uuid[];
  v_start date := (date_trunc('week', now()) - make_interval(weeks => v_weeks - 1))::date;
  v_series jsonb;
  v_active_week int;
  v_learning_now int;
  v_top jsonb;
BEGIN
  IF v_uid IS NULL OR NOT (p_org_id = ANY (public.learning_manager_org_ids())) THEN
    RAISE EXCEPTION 'Not allowed to view team momentum for this organization' USING ERRCODE = '42501';
  END IF;

  v_org_wide := public.is_platform_super_admin() OR public.has_active_platform_session(p_org_id) OR EXISTS (
    SELECT 1 FROM public.organization_memberships om
     WHERE om.user_id = v_uid AND om.organization_id = p_org_id AND om.is_active
       AND om.role IN ('organization_owner', 'organization_admin', 'brand_admin', 'training_manager'));

  IF NOT v_org_wide THEN
    SELECT COALESCE(array_agg(om.department_id) FILTER (WHERE om.department_id IS NOT NULL), '{}')
      INTO v_depts
      FROM public.organization_memberships om
     WHERE om.user_id = v_uid AND om.organization_id = p_org_id AND om.is_active AND om.role = 'department_manager';
    IF p_department_id IS NOT NULL AND NOT (p_department_id = ANY (v_depts)) THEN
      RAISE EXCEPTION 'Not allowed to view this department' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT om.user_id), '{}') INTO v_members
    FROM public.organization_memberships om
   WHERE om.organization_id = p_org_id AND om.is_active
     AND (p_department_id IS NULL OR om.department_id = p_department_id)
     AND (v_org_wide OR om.department_id = ANY (v_depts))
     AND om.user_id <> v_uid;

  CREATE TEMP TABLE IF NOT EXISTS _team_events (user_id uuid, occurred_at timestamptz, points int) ON COMMIT DROP;
  TRUNCATE _team_events;
  INSERT INTO _team_events
    SELECT e.user_id, e.occurred_at, e.points
      FROM public._learning_point_events(p_org_id) e
     WHERE e.user_id = ANY (v_members) AND e.occurred_at >= v_start
    UNION ALL
    SELECT lp.user_id, lp.last_viewed_at, 0
      FROM public.lesson_progress lp
     WHERE lp.organization_id = p_org_id AND lp.user_id = ANY (v_members) AND lp.last_viewed_at >= v_start;

  SELECT jsonb_agg(jsonb_build_object(
           'week_start', w::date,
           'points', (SELECT COALESCE(sum(points), 0) FROM _team_events WHERE occurred_at >= w AND occurred_at < w + interval '7 days'),
           'active_learners', (SELECT count(DISTINCT user_id) FROM _team_events WHERE occurred_at >= w AND occurred_at < w + interval '7 days'))
         ORDER BY w)
    INTO v_series
    FROM generate_series(v_start::timestamptz, date_trunc('week', now()), interval '7 days') w;

  SELECT count(DISTINCT user_id) INTO v_active_week FROM _team_events WHERE occurred_at >= now() - interval '7 days';
  SELECT count(DISTINCT user_id) INTO v_learning_now FROM _team_events WHERE occurred_at >= date_trunc('day', now()) - interval '1 day';

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'points')::int DESC), '[]'::jsonb) INTO v_top
    FROM (
      SELECT jsonb_build_object('user_id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'points', sum(t.points)::int) AS x
        FROM _team_events t JOIN public.profiles p ON p.id = t.user_id
       WHERE t.occurred_at >= now() - interval '30 days'
       GROUP BY p.id, p.full_name, p.avatar_url
       HAVING sum(t.points) > 0
       ORDER BY sum(t.points) DESC
       LIMIT 5
    ) s;

  RETURN jsonb_build_object(
    'members', COALESCE(array_length(v_members, 1), 0),
    'active_this_week', v_active_week,
    'learning_now', v_learning_now,
    'weeks', COALESCE(v_series, '[]'::jsonb),
    'top_learners', v_top);
END;
$function$;

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_popular_articles(p_org_id uuid, p_days integer DEFAULT 7, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, title text, title_ar text, content_type text, readers integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT public._can_read_learning_game(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH views AS (
    SELECT se.entity_id AS document_id, count(DISTINCT se.actor_id)::int AS readers
      FROM public.system_events se
     WHERE se.event_type = 'doc_view'
       AND se.created_at >= now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 7), 1), 90))
       AND se.entity_id IS NOT NULL
     GROUP BY se.entity_id
  )
  SELECT d.id, d.title, d.title_ar, d.content_type, v.readers
    FROM views v
    JOIN public.documents d ON d.id = v.document_id
   WHERE d.status = 'PUBLISHED' AND NOT d.is_deleted
     AND (d.organization_id = p_org_id OR COALESCE(d.is_master_template, false))
     AND public.validate_document_access(d.id)
   ORDER BY v.readers DESC, d.updated_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_course_points(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_learner_welcome_seen() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_momentum(uuid, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_popular_articles(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_course_points(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_learner_welcome_seen() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_momentum(uuid, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_popular_articles(uuid, integer, integer) TO authenticated, service_role;

COMMIT;
