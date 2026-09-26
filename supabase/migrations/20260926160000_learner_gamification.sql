-- =============================================================================
-- Learner gamification: points, levels, streaks, badges and leaderboards.
--
-- Nothing here is stored or self-reported. Every point is derived from real
-- learning records, so it cannot drift from reality and cannot be farmed:
--
--   lesson      10  first completion of each lesson          lesson_progress
--   course     100  each completed course (+25 at >= 90%)    training_progress
--   quiz_pass   40  first pass of each quiz                  unified_quiz_sessions
--   quiz_perfect 20 first 100% score on each quiz            unified_quiz_sessions
--   certificate 50  each certificate not revoked             certificates
--   reading     15  each acknowledged required reading       document_acknowledgments
--   on_time     20  assigned course completed by its due date training_progress + assignments
--
-- A "learning day" is any day with one of the events above or a lesson view.
-- Leaderboards only show members who have not opted out
-- (profiles.show_on_leaderboard); the caller always sees their own row.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------------
-- Internal: every point-earning event in one organization.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._learning_point_events(p_org_id uuid)
 RETURNS TABLE(user_id uuid, occurred_at timestamptz, kind text, ref_id uuid, points integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- lessons: first completion of each lesson
  SELECT lp.user_id, min(lp.completed_at), 'lesson', lp.training_module_id, 10
    FROM public.lesson_progress lp
   WHERE lp.organization_id = p_org_id AND lp.completed_at IS NOT NULL
   GROUP BY lp.user_id, lp.training_module_id, lp.block_id
  UNION ALL
  -- courses
  SELECT tp.user_id, tp.completed_at, 'course', tp.training_id,
         100 + CASE WHEN COALESCE(tp.score_percentage, 0) >= 90 THEN 25 ELSE 0 END
    FROM public.training_progress tp
   WHERE tp.organization_id = p_org_id AND tp.lp_content_type = 'module'
     AND tp.completed_at IS NOT NULL AND NOT COALESCE(tp.is_deleted, false)
  UNION ALL
  -- courses finished on or before their assignment's due date
  SELECT tp.user_id, tp.completed_at, 'on_time', tp.training_id, 20
    FROM public.training_progress tp
    JOIN public.assignments a ON a.id = tp.assignment_id
   WHERE tp.organization_id = p_org_id AND tp.lp_content_type = 'module'
     AND tp.completed_at IS NOT NULL AND NOT COALESCE(tp.is_deleted, false)
     AND a.due_date IS NOT NULL AND tp.completed_at <= a.due_date
  UNION ALL
  -- first pass of each quiz
  SELECT q.user_id, min(q.completed_at), 'quiz_pass', q.quiz_entity_id, 40
    FROM public.unified_quiz_sessions q
   WHERE q.organization_id = p_org_id AND q.completed_at IS NOT NULL AND q.passed
   GROUP BY q.user_id, q.quiz_entity_id
  UNION ALL
  -- first perfect score on each quiz
  SELECT q.user_id, min(q.completed_at), 'quiz_perfect', q.quiz_entity_id, 20
    FROM public.unified_quiz_sessions q
   WHERE q.organization_id = p_org_id AND q.completed_at IS NOT NULL AND q.score_percentage >= 100
   GROUP BY q.user_id, q.quiz_entity_id
  UNION ALL
  -- certificates
  SELECT c.user_id, COALESCE(c.completion_date, c.created_at), 'certificate', c.id, 50
    FROM public.certificates c
   WHERE c.organization_id = p_org_id AND COALESCE(c.status, 'active') <> 'revoked'
  UNION ALL
  -- required reading acknowledged
  SELECT da.user_id, da.acknowledged_at, 'reading', da.document_id, 15
    FROM public.document_acknowledgments da
   WHERE da.organization_id = p_org_id AND da.acknowledged_at IS NOT NULL;
$function$;

-- Internal: distinct learning days per user (events + lesson views), in p_tz.
CREATE OR REPLACE FUNCTION public._learning_days(p_org_id uuid, p_user_id uuid, p_tz text)
 RETURNS TABLE(day date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT (t AT TIME ZONE p_tz)::date
    FROM (
      SELECT e.occurred_at AS t FROM public._learning_point_events(p_org_id) e WHERE e.user_id = p_user_id
      UNION ALL
      SELECT lp.last_viewed_at FROM public.lesson_progress lp
       WHERE lp.organization_id = p_org_id AND lp.user_id = p_user_id AND lp.last_viewed_at IS NOT NULL
      UNION ALL
      SELECT q.completed_at FROM public.unified_quiz_sessions q
       WHERE q.organization_id = p_org_id AND q.user_id = p_user_id AND q.completed_at IS NOT NULL
    ) x
   WHERE t IS NOT NULL;
$function$;

-- Internal: may the caller read gamification data of this organization?
CREATE OR REPLACE FUNCTION public._can_read_learning_game(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_platform_super_admin()
    OR (p_org_id = ANY (public.current_user_organization_ids()) AND public.org_is_operational(p_org_id))
  );
$function$;

-- -----------------------------------------------------------------------------
-- My stats: points, streaks, week strip, counts, badges, recent activity.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_stats(p_org_id uuid, p_tz text DEFAULT 'UTC')
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_tz text := CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_tz) THEN p_tz ELSE 'UTC' END;
  v_today date := (now() AT TIME ZONE v_tz)::date;
  v_total int; v_week int; v_month int;
  v_counts jsonb;
  v_current int := 0; v_best int := 0;
  v_week_strip jsonb;
  v_badges jsonb;
  v_recent jsonb;
  v_streak_earned jsonb;
BEGIN
  IF NOT public._can_read_learning_game(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _my_events (occurred_at timestamptz, kind text, ref_id uuid, points int) ON COMMIT DROP;
  TRUNCATE _my_events;
  INSERT INTO _my_events
    SELECT e.occurred_at, e.kind, e.ref_id, e.points
      FROM public._learning_point_events(p_org_id) e
     WHERE e.user_id = v_uid AND e.occurred_at IS NOT NULL;

  SELECT COALESCE(sum(points), 0),
         COALESCE(sum(points) FILTER (WHERE (occurred_at AT TIME ZONE v_tz)::date > v_today - 7), 0),
         COALESCE(sum(points) FILTER (WHERE date_trunc('month', occurred_at AT TIME ZONE v_tz) = date_trunc('month', now() AT TIME ZONE v_tz)), 0)
    INTO v_total, v_week, v_month
    FROM _my_events;

  SELECT jsonb_build_object(
      'lessons',         count(*) FILTER (WHERE kind = 'lesson'),
      'courses',         count(*) FILTER (WHERE kind = 'course'),
      'quizzes_passed',  count(*) FILTER (WHERE kind = 'quiz_pass'),
      'perfect_quizzes', count(*) FILTER (WHERE kind = 'quiz_perfect'),
      'certificates',    count(*) FILTER (WHERE kind = 'certificate'),
      'readings',        count(*) FILTER (WHERE kind = 'reading'),
      'on_time',         count(*) FILTER (WHERE kind = 'on_time'))
    INTO v_counts
    FROM _my_events;

  -- Streaks: islands of consecutive learning days.
  CREATE TEMP TABLE IF NOT EXISTS _my_runs (run_start date, run_end date, len int) ON COMMIT DROP;
  TRUNCATE _my_runs;
  INSERT INTO _my_runs
    SELECT min(day), max(day), count(*)::int
      FROM (SELECT day, day - (row_number() OVER (ORDER BY day))::int AS grp
              FROM public._learning_days(p_org_id, v_uid, v_tz)) d
     GROUP BY grp;

  SELECT COALESCE(max(len), 0) INTO v_best FROM _my_runs;
  -- The current streak is alive if its last day is today or yesterday.
  SELECT COALESCE(max(len), 0) INTO v_current FROM _my_runs WHERE run_end >= v_today - 1;

  SELECT jsonb_agg(jsonb_build_object(
           'date', d::date,
           'active', EXISTS (SELECT 1 FROM _my_runs r WHERE d::date BETWEEN r.run_start AND r.run_end),
           'points', (SELECT COALESCE(sum(points), 0) FROM _my_events WHERE (occurred_at AT TIME ZONE v_tz)::date = d::date))
         ORDER BY d)
    INTO v_week_strip
    FROM generate_series(v_today - 6, v_today, interval '1 day') d;

  -- Day a streak badge was earned: the N-th day of the first run reaching N.
  SELECT jsonb_build_object(
      '3',  (SELECT min(run_start + 2)  FROM _my_runs WHERE len >= 3),
      '7',  (SELECT min(run_start + 6)  FROM _my_runs WHERE len >= 7),
      '30', (SELECT min(run_start + 29) FROM _my_runs WHERE len >= 30))
    INTO v_streak_earned;

  -- Badges: earned when the N-th qualifying event happened.
  WITH ranked AS (
    SELECT kind, occurred_at, row_number() OVER (PARTITION BY kind ORDER BY occurred_at) AS n
      FROM _my_events
  ),
  running AS (
    SELECT occurred_at, sum(points) OVER (ORDER BY occurred_at ROWS UNBOUNDED PRECEDING) AS total
      FROM _my_events
  ),
  defs(id, metric, target, sort) AS (VALUES
    ('first_steps',   'lesson',       1,  1),
    ('course_1',      'course',       1,  2),
    ('course_5',      'course',       5,  3),
    ('course_10',     'course',      10,  4),
    ('quiz_5',        'quiz_pass',    5,  5),
    ('perfect_score', 'quiz_perfect', 1,  6),
    ('certified',     'certificate',  1,  7),
    ('on_time_3',     'on_time',      3,  8),
    ('reader_5',      'reading',      5,  9),
    ('streak_3',      'streak',       3, 10),
    ('streak_7',      'streak',       7, 11),
    ('streak_30',     'streak',      30, 12),
    ('points_1000',   'points',    1000, 13)
  )
  SELECT jsonb_agg(jsonb_build_object(
           'id', defs.id,
           'target', defs.target,
           'progress', LEAST(defs.target, CASE defs.metric
                          WHEN 'streak' THEN v_best
                          WHEN 'points' THEN v_total
                          ELSE (SELECT count(*) FROM _my_events e WHERE e.kind = defs.metric)::int END),
           'earned_at', CASE defs.metric
                          WHEN 'streak' THEN (v_streak_earned ->> defs.target::text)::date::timestamptz
                          WHEN 'points' THEN (SELECT min(r.occurred_at) FROM running r WHERE r.total >= defs.target)
                          ELSE (SELECT r.occurred_at FROM ranked r WHERE r.kind = defs.metric AND r.n = defs.target) END)
         ORDER BY defs.sort)
    INTO v_badges
    FROM defs;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'occurred_at') DESC), '[]'::jsonb) INTO v_recent
    FROM (
      SELECT jsonb_build_object(
               'kind', e.kind, 'points', e.points, 'occurred_at', e.occurred_at, 'ref_id', e.ref_id,
               'title', COALESCE(
                  (SELECT c.title FROM public.courses c WHERE c.id = e.ref_id),
                  (SELECT cert.title::text FROM public.certificates cert WHERE cert.id = e.ref_id),
                  (SELECT d.title FROM public.documents d WHERE d.id = e.ref_id))) AS x
        FROM _my_events e
       ORDER BY e.occurred_at DESC
       LIMIT 6
    ) r;

  RETURN jsonb_build_object(
    'points_total', v_total,
    'points_week', v_week,
    'points_month', v_month,
    'streak_current', v_current,
    'streak_best', v_best,
    'active_today', EXISTS (SELECT 1 FROM _my_runs WHERE v_today BETWEEN run_start AND run_end),
    'week', COALESCE(v_week_strip, '[]'::jsonb),
    'counts', v_counts,
    'badges', COALESCE(v_badges, '[]'::jsonb),
    'recent', v_recent,
    'show_on_leaderboard', (SELECT p.show_on_leaderboard FROM public.profiles p WHERE p.id = v_uid)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- People leaderboard: whole organization or the caller's department.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learning_leaderboard(
  p_org_id uuid, p_period text DEFAULT 'month', p_scope text DEFAULT 'organization', p_limit integer DEFAULT 10)
 RETURNS TABLE(rank integer, user_id uuid, full_name text, avatar_url text, department_name text, points integer, is_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_since timestamptz := CASE p_period
    WHEN 'week'  THEN now() - interval '7 days'
    WHEN 'month' THEN date_trunc('month', now())
    ELSE '-infinity'::timestamptz END;
  v_my_depts uuid[];
BEGIN
  IF NOT public._can_read_learning_game(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(om.department_id) FILTER (WHERE om.department_id IS NOT NULL), '{}')
    INTO v_my_depts
    FROM public.organization_memberships om
   WHERE om.user_id = v_uid AND om.organization_id = p_org_id AND om.is_active;

  RETURN QUERY
  WITH members AS (
    SELECT DISTINCT ON (om.user_id) om.user_id, d.name AS department_name
      FROM public.organization_memberships om
      LEFT JOIN public.departments d ON d.id = om.department_id
     WHERE om.organization_id = p_org_id AND om.is_active
       AND (p_scope <> 'department' OR om.department_id = ANY (v_my_depts))
     ORDER BY om.user_id, om.is_primary DESC NULLS LAST
  ),
  pts AS (
    SELECT e.user_id, sum(e.points)::int AS pts
      FROM public._learning_point_events(p_org_id) e
     WHERE e.occurred_at >= v_since
     GROUP BY e.user_id
  ),
  scored AS (
    SELECT m.user_id, m.department_name, COALESCE(x.pts, 0) AS pts
      FROM members m
      LEFT JOIN pts x ON x.user_id = m.user_id
  ),
  visible AS (
    SELECT s.*, p.full_name, p.avatar_url
      FROM scored s
      JOIN public.profiles p ON p.id = s.user_id
     WHERE p.is_active AND (p.show_on_leaderboard OR s.user_id = v_uid)
  ),
  ranked AS (
    SELECT (rank() OVER (ORDER BY v.pts DESC))::int AS rnk, v.*
      FROM visible v
  )
  SELECT r.rnk, r.user_id, r.full_name, r.avatar_url, r.department_name, r.pts, (r.user_id = v_uid)
    FROM ranked r
   WHERE r.rnk <= GREATEST(p_limit, 1) OR r.user_id = v_uid
   ORDER BY r.rnk, r.full_name;
END;
$function$;

-- -----------------------------------------------------------------------------
-- Team leaderboard: departments ranked by points per member (fair to small teams).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_team_leaderboard(p_org_id uuid, p_period text DEFAULT 'month')
 RETURNS TABLE(rank integer, department_id uuid, department_name text, member_count integer, points integer, points_per_member numeric, completion_rate integer, is_my_team boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_since timestamptz := CASE p_period
    WHEN 'week'  THEN now() - interval '7 days'
    WHEN 'month' THEN date_trunc('month', now())
    ELSE '-infinity'::timestamptz END;
BEGIN
  IF NOT public._can_read_learning_game(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT om.department_id, om.user_id
      FROM public.organization_memberships om
     WHERE om.organization_id = p_org_id AND om.is_active AND om.department_id IS NOT NULL
  ),
  pts AS (
    SELECT e.user_id, sum(e.points)::int AS points
      FROM public._learning_point_events(p_org_id) e
     WHERE e.occurred_at >= v_since
     GROUP BY e.user_id
  ),
  progress AS (
    SELECT tp.user_id,
           count(*) AS total,
           count(*) FILTER (WHERE tp.completed_at IS NOT NULL) AS done
      FROM public.training_progress tp
     WHERE tp.organization_id = p_org_id AND tp.lp_content_type = 'module' AND NOT COALESCE(tp.is_deleted, false)
     GROUP BY tp.user_id
  ),
  teams AS (
    SELECT d.id, d.name,
           count(DISTINCT m.user_id)::int AS members,
           COALESCE(sum(p.points), 0)::int AS points,
           COALESCE(sum(pr.done), 0) AS done,
           COALESCE(sum(pr.total), 0) AS total,
           bool_or(m.user_id = v_uid) AS mine
      FROM public.departments d
      JOIN members m ON m.department_id = d.id
      LEFT JOIN pts p ON p.user_id = m.user_id
      LEFT JOIN progress pr ON pr.user_id = m.user_id
     WHERE d.organization_id = p_org_id AND d.is_active
     GROUP BY d.id, d.name
  )
  SELECT (rank() OVER (ORDER BY (t.points::numeric / GREATEST(t.members, 1)) DESC))::int,
         t.id, t.name, t.members, t.points,
         round(t.points::numeric / GREATEST(t.members, 1), 1),
         CASE WHEN t.total > 0 THEN round(100.0 * t.done / t.total)::int ELSE NULL END,
         COALESCE(t.mine, false)
    FROM teams t
   ORDER BY 1, t.name;
END;
$function$;

-- -----------------------------------------------------------------------------
-- Opt in/out of leaderboards (own profile only).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_leaderboard_visibility(p_visible boolean)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.profiles SET show_on_leaderboard = COALESCE(p_visible, true), updated_at = now()
   WHERE id = auth.uid()
  RETURNING show_on_leaderboard;
$function$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._learning_point_events(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._learning_days(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._can_read_learning_game(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._learning_point_events(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._learning_days(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public._can_read_learning_game(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_learning_stats(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_learning_leaderboard(uuid, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_leaderboard(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_leaderboard_visibility(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_learning_stats(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_learning_leaderboard(uuid, text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_leaderboard(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_leaderboard_visibility(boolean) TO authenticated, service_role;

COMMIT;
