-- Tenant-scoped learning analytics and review workflow on the membership role model.
--
-- The analytics / review RPCs were SECURITY DEFINER functions gated on the legacy,
-- global user_roles table (super_admin, corporate_admin, regional_*, property_hr,
-- department_head) and did not filter by tenant at all:
--   * only legacy super_admins could use them, so tenant training managers saw
--     empty dashboards and nobody but a platform super admin could approve modules;
--   * whoever did pass the check saw every tenant's data (rules targeting
--     'everyone' joined every profile in the database);
--   * p_my_team_only = true bypassed the role check entirely.
-- Every function below now derives authority from organization_memberships and
-- restricts rows to the organizations the caller manages.

-- ---------------------------------------------------------------------------
-- 1. Scope helpers
-- ---------------------------------------------------------------------------

-- Organizations whose learning data the caller may analyse / manage.
CREATE OR REPLACE FUNCTION public.learning_manager_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN '{}'::uuid[]
    WHEN public.is_platform_super_admin() THEN
      ARRAY(SELECT o.id FROM public.organizations o WHERE NOT COALESCE(o.is_deleted, false))
    ELSE ARRAY(
      SELECT om.organization_id
        FROM public.organization_memberships om
       WHERE om.user_id = auth.uid()
         AND om.is_active
         AND om.role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin',
                         'department_manager', 'training_manager')
         AND public.org_is_operational(om.organization_id)
      UNION
      SELECT o.id FROM public.organizations o WHERE public.has_active_platform_session(o.id))
  END;
$function$;

-- Organizations in which the caller manages at least one department (team view).
CREATE OR REPLACE FUNCTION public.learning_team_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ARRAY(
    SELECT DISTINCT d.organization_id
      FROM public.departments d
     WHERE d.manager_id = auth.uid()
       AND public.org_is_operational(d.organization_id));
$function$;

-- Organizations in which the caller edits learning content.
CREATE OR REPLACE FUNCTION public.content_editor_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN '{}'::uuid[]
    WHEN public.is_platform_super_admin() THEN
      ARRAY(SELECT o.id FROM public.organizations o WHERE NOT COALESCE(o.is_deleted, false))
    ELSE ARRAY(
      SELECT o.id FROM public.organizations o
       WHERE o.id = ANY (public.current_user_organization_ids())
         AND public.is_tenant_content_editor(o.id))
  END;
$function$;

-- Is the user inside the dashboard's department / property / my-team filters?
CREATE OR REPLACE FUNCTION public._learner_matches_filters(p_user_id uuid, p_org_id uuid, p_department_id uuid, p_property_id uuid, p_my_team_only boolean)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships m
             WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.is_active
               AND m.department_id = p_department_id))
     AND (p_property_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships m
             WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.is_active
               AND m.hotel_id = p_property_id))
     AND (NOT COALESCE(p_my_team_only, false) OR EXISTS (
            SELECT 1 FROM public.organization_memberships m
              JOIN public.departments d ON d.id = m.department_id
             WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.is_active
               AND d.manager_id = auth.uid()));
$function$;

-- Learners targeted by active module assignment rules, resolved inside each rule's
-- own organization (an 'everyone' rule means everyone in that tenant).
CREATE OR REPLACE FUNCTION public._module_assignment_targets(p_org_ids uuid[])
RETURNS TABLE(user_id uuid, training_id uuid, due_date timestamptz, organization_id uuid, rule_created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH rules AS (
    SELECT r.target_type, r.target_id, r.content_id, r.due_date, r.organization_id, r.created_at
      FROM public.training_assignment_rules r
     WHERE r.is_active AND NOT COALESCE(r.is_deleted, false)
       AND r.content_type = 'module'
       AND r.organization_id = ANY (p_org_ids)
  )
  SELECT m.user_id, r.content_id, r.due_date, r.organization_id, r.created_at
    FROM rules r
    JOIN public.organization_memberships m ON m.organization_id = r.organization_id AND m.is_active
   WHERE r.target_type = 'everyone'
     OR (r.target_type = 'department' AND m.department_id = public._safe_uuid(r.target_id))
     OR (r.target_type = 'property'   AND m.hotel_id      = public._safe_uuid(r.target_id))
     OR (r.target_type = 'role'       AND m.role::text    = r.target_id)
     OR (r.target_type = 'user'       AND m.user_id       = public._safe_uuid(r.target_id));
$function$;

REVOKE ALL ON FUNCTION public.learning_manager_org_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.learning_team_org_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.content_editor_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_manager_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.learning_team_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.content_editor_org_ids() TO authenticated;
REVOKE ALL ON FUNCTION public._learner_matches_filters(uuid, uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._module_assignment_targets(uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_view_learning_analytics()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cardinality(public.learning_manager_org_ids()) > 0;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Training dashboard (TrainingAnalytics.tsx)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_training_analytics_summary(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
RETURNS TABLE(total_assignees bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, overdue_count bigint, completion_rate numeric, average_score numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    targets AS (
        SELECT t.user_id, t.training_id, min(t.due_date) AS due_date
          FROM scope, public._module_assignment_targets(scope.orgs) t
         WHERE (p_start_date IS NULL OR t.rule_created_at >= p_start_date)
           AND public._learner_matches_filters(t.user_id, t.organization_id, p_department_id, p_property_id, p_my_team_only)
         GROUP BY t.user_id, t.training_id
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, dt.due_date, tp.status, tp.score_percentage
          FROM targets dt
          LEFT JOIN public.training_progress tp
            ON tp.user_id = dt.user_id
           AND tp.training_id = dt.training_id
           AND tp.lp_content_type = 'module'
           AND tp.is_deleted = false
    )
    SELECT
        count(*) AS total_assignees,
        count(*) FILTER (WHERE status = 'completed') AS completed_count,
        count(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        count(*) FILTER (WHERE status IS NULL OR status = 'not_started') AS not_started_count,
        count(*) FILTER (WHERE status IS DISTINCT FROM 'completed' AND due_date IS NOT NULL AND due_date < now()) AS overdue_count,
        CASE WHEN count(*) > 0
            THEN round(100.0 * count(*) FILTER (WHERE status = 'completed') / count(*), 1)
            ELSE 0
        END AS completion_rate,
        (SELECT round(avg(j2.score_percentage), 1) FROM joined j2 WHERE j2.status = 'completed' AND j2.score_percentage IS NOT NULL) AS average_score
    FROM joined;
$function$;

CREATE OR REPLACE FUNCTION public.get_training_completion_trend(p_weeks integer DEFAULT 12, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
RETURNS TABLE(week_start date, completed_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    weeks AS (
        SELECT generate_series(
            date_trunc('week', now() - ((p_weeks - 1) || ' weeks')::interval),
            date_trunc('week', now()),
            interval '1 week'
        )::date AS week_start
    ),
    scoped_completions AS (
        SELECT tp.completed_at
          FROM public.training_progress tp, scope
         WHERE tp.organization_id = ANY (scope.orgs)
           AND tp.lp_content_type = 'module'
           AND tp.is_deleted = false
           AND tp.status = 'completed'
           AND tp.completed_at >= now() - (p_weeks || ' weeks')::interval
           AND public._learner_matches_filters(tp.user_id, tp.organization_id, p_department_id, p_property_id, p_my_team_only)
    )
    SELECT w.week_start, count(sc.completed_at) AS completed_count
      FROM weeks w
      LEFT JOIN scoped_completions sc ON date_trunc('week', sc.completed_at)::date = w.week_start
     GROUP BY w.week_start
     ORDER BY w.week_start;
$function$;

CREATE OR REPLACE FUNCTION public.get_training_module_funnel(p_module_id uuid)
RETURNS TABLE(block_id uuid, block_title text, block_type text, block_order integer, completed_count bigint, completion_rate numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH allowed AS (
        SELECT EXISTS (
            SELECT 1 FROM public.training_modules m
             WHERE m.id = p_module_id
               AND m.organization_id = ANY (public.learning_manager_org_ids())) AS ok
    ),
    enrolled AS (
        SELECT count(*) AS total
          FROM public.training_progress tp
         WHERE tp.training_id = p_module_id
           AND tp.lp_content_type = 'module'
           AND tp.is_deleted = false
    )
    SELECT
        b.id,
        b.title,
        b.type,
        b."order",
        count(bp.user_id) AS completed_count,
        CASE WHEN (SELECT total FROM enrolled) > 0
            THEN round(100.0 * count(bp.user_id) / (SELECT total FROM enrolled), 1)
            ELSE 0
        END AS completion_rate
      FROM public.training_content_blocks_v b
      LEFT JOIN public.training_block_progress bp
        ON bp.block_id = b.id AND bp.completed_at IS NOT NULL
     WHERE b.training_module_id = p_module_id
       AND b.is_deleted = false
       AND (SELECT ok FROM allowed)
     GROUP BY b.id, b.title, b.type, b."order"
     ORDER BY b."order";
$function$;

CREATE OR REPLACE FUNCTION public.get_training_module_performance(p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(module_id uuid, title text, assignee_count bigint, completed_count bigint, completion_rate numeric, average_score numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    targets AS (
        SELECT DISTINCT t.user_id, t.training_id
          FROM scope, public._module_assignment_targets(scope.orgs) t
         WHERE public._learner_matches_filters(t.user_id, t.organization_id, p_department_id, p_property_id, false)
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, tp.status, tp.score_percentage
          FROM targets dt
          LEFT JOIN public.training_progress tp
            ON tp.user_id = dt.user_id AND tp.training_id = dt.training_id
           AND tp.lp_content_type = 'module' AND tp.is_deleted = false
    )
    SELECT
        m.id AS module_id, m.title,
        count(j.user_id) AS assignee_count,
        count(j.user_id) FILTER (WHERE j.status = 'completed') AS completed_count,
        CASE WHEN count(j.user_id) > 0
            THEN round(100.0 * count(j.user_id) FILTER (WHERE j.status = 'completed') / count(j.user_id), 1)
            ELSE 0
        END AS completion_rate,
        round(avg(j.score_percentage) FILTER (WHERE j.status = 'completed'), 1) AS average_score
      FROM public.training_modules m
      CROSS JOIN scope
      LEFT JOIN joined j ON j.training_id = m.id
     WHERE m.is_deleted = false
       AND m.organization_id = ANY (scope.orgs)
     GROUP BY m.id, m.title
     ORDER BY assignee_count DESC NULLS LAST
     LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_expiring_certificates(p_within_days integer DEFAULT 90, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(certificate_id uuid, user_id uuid, recipient_name text, title text, training_module_id uuid, expiry_date timestamp with time zone, days_until_expiry integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        c.id, c.user_id, c.recipient_name::text, c.title::text, c.training_module_id, c.expiry_date,
        (extract(day FROM c.expiry_date - now()))::integer
      FROM public.certificates c
     WHERE c.organization_id = ANY (public.learning_manager_org_ids())
       AND c.status = 'active'
       AND c.expiry_date IS NOT NULL
       AND c.expiry_date <= now() + make_interval(days => p_within_days)
       AND public._learner_matches_filters(c.user_id, c.organization_id, p_department_id, p_property_id, false)
     ORDER BY c.expiry_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_skills_matrix(p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
RETURNS TABLE(user_id uuid, user_name text, department_name text, skill_id uuid, skill_name text, skill_category text, proficiency_level integer, verified boolean, has_skill boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (
        SELECT CASE WHEN p_my_team_only
                    THEN public.learning_manager_org_ids() || public.learning_team_org_ids()
                    ELSE public.learning_manager_org_ids() END AS orgs
    ),
    scoped_users AS (
        SELECT DISTINCT ON (p.id)
            p.id, p.full_name, d.name AS department_name
          FROM public.profiles p
          JOIN public.organization_memberships ud ON ud.user_id = p.id AND ud.is_active = true
          CROSS JOIN scope
          LEFT JOIN public.departments d ON d.id = ud.department_id
         WHERE p.is_active = true
           AND ud.organization_id = ANY (scope.orgs)
           AND public._learner_matches_filters(p.id, ud.organization_id, p_department_id, p_property_id, p_my_team_only)
         ORDER BY p.id, ud.department_id NULLS LAST
    )
    SELECT
        su.id, su.full_name, su.department_name, s.id, s.name, s.category,
        us.proficiency_level, us.verified, (us.id IS NOT NULL) AS has_skill
      FROM scoped_users su
      CROSS JOIN public.skills s
      CROSS JOIN scope
      LEFT JOIN public.user_skills us
        ON us.user_id = su.id AND us.skill_id = s.id AND us.organization_id = ANY (scope.orgs)
     ORDER BY su.full_name, s.category, s.name;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Learning analytics lenses (learningAnalyticsService.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_course_analytics()
RETURNS TABLE(module_id uuid, title text, status text, category text, enrolled_count bigint, completed_count bigint, in_progress_count bigint, completion_rate numeric, avg_progress numeric, avg_time_seconds numeric, avg_score numeric, quiz_pass_rate numeric, last_activity_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    prog AS (
        SELECT
            p.training_id AS module_id,
            count(*)                                                   AS enrolled_count,
            count(*) FILTER (WHERE p.status = 'completed')             AS completed_count,
            count(*) FILTER (WHERE p.status = 'in_progress')           AS in_progress_count,
            round(100.0 * count(*) FILTER (WHERE p.status = 'completed') / nullif(count(*), 0), 1) AS completion_rate,
            round(avg(coalesce(p.progress_percentage, 0))::numeric, 1) AS avg_progress,
            round(avg(nullif(p.time_spent_seconds, 0))::numeric, 0)    AS avg_time_seconds,
            round(avg(coalesce(p.score_percentage, p.quiz_score))::numeric, 1) AS avg_score,
            max(coalesce(p.last_activity_at, p.last_accessed_at, p.completed_at)) AS last_activity_at
          FROM public.training_progress p, scope
         WHERE p.is_deleted = false
           AND p.organization_id = ANY (scope.orgs)
           AND coalesce(p.lp_content_type, 'module') = 'module'
         GROUP BY p.training_id
    ),
    -- Quiz sessions are recorded per quiz; attribute them to the module whose
    -- quiz block links that quiz.
    quiz AS (
        SELECT
            b.training_module_id AS module_id,
            round(100.0 * count(*) FILTER (WHERE s.passed IS TRUE)
                  / nullif(count(*) FILTER (WHERE s.completed_at IS NOT NULL), 0), 1) AS quiz_pass_rate
          FROM public.unified_quiz_sessions s
          JOIN public.training_content_blocks_v b
            ON b.type = 'quiz' AND NOT b.is_deleted
           AND public._safe_uuid(b.content_data ->> 'quiz_id') = s.quiz_entity_id
          CROSS JOIN scope
         WHERE s.quiz_type = 'learning_quiz'
           AND s.organization_id = ANY (scope.orgs)
         GROUP BY b.training_module_id
    )
    SELECT
        tm.id,
        tm.title,
        tm.status,
        tm.category,
        coalesce(prog.enrolled_count, 0),
        coalesce(prog.completed_count, 0),
        coalesce(prog.in_progress_count, 0),
        coalesce(prog.completion_rate, 0),
        coalesce(prog.avg_progress, 0),
        prog.avg_time_seconds,
        prog.avg_score,
        quiz.quiz_pass_rate,
        prog.last_activity_at
      FROM public.training_modules tm
      CROSS JOIN scope
      LEFT JOIN prog ON prog.module_id = tm.id
      LEFT JOIN quiz ON quiz.module_id = tm.id
     WHERE tm.is_deleted = false
       AND tm.organization_id = ANY (scope.orgs)
     ORDER BY coalesce(prog.enrolled_count, 0) DESC, tm.title;
$function$;

CREATE OR REPLACE FUNCTION public.get_learner_analytics(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, full_name text, job_title text, enrolled_count bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, avg_progress numeric, total_time_seconds bigint, quiz_sessions bigint, avg_quiz_score numeric, pass_rate numeric, last_activity_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    tp AS (
        SELECT
            p.user_id,
            count(*)                                                          AS enrolled_count,
            count(*) FILTER (WHERE p.status = 'completed')                    AS completed_count,
            count(*) FILTER (WHERE p.status = 'in_progress')                  AS in_progress_count,
            count(*) FILTER (WHERE p.status = 'not_started')                  AS not_started_count,
            round(avg(coalesce(p.progress_percentage, 0))::numeric, 1)        AS avg_progress,
            coalesce(sum(p.time_spent_seconds), 0)::bigint                    AS total_time_seconds,
            max(coalesce(p.last_activity_at, p.last_accessed_at, p.completed_at)) AS last_activity_at
          FROM public.training_progress p, scope
         WHERE p.is_deleted = false
           AND p.organization_id = ANY (scope.orgs)
           AND (p_user_id IS NULL OR p.user_id = p_user_id)
         GROUP BY p.user_id
    ),
    qz AS (
        SELECT
            s.user_id,
            count(*) FILTER (WHERE s.completed_at IS NOT NULL)                                 AS quiz_sessions,
            round(avg(s.score_percentage) FILTER (WHERE s.completed_at IS NOT NULL)::numeric, 1) AS avg_quiz_score,
            round(
                100.0 * count(*) FILTER (WHERE s.passed IS TRUE)
                / nullif(count(*) FILTER (WHERE s.completed_at IS NOT NULL), 0), 1
            )                                                                                  AS pass_rate
          FROM public.unified_quiz_sessions s, scope
         WHERE s.organization_id = ANY (scope.orgs)
           AND (p_user_id IS NULL OR s.user_id = p_user_id)
         GROUP BY s.user_id
    )
    SELECT
        pr.id,
        pr.full_name,
        pr.job_title,
        coalesce(tp.enrolled_count, 0),
        coalesce(tp.completed_count, 0),
        coalesce(tp.in_progress_count, 0),
        coalesce(tp.not_started_count, 0),
        coalesce(tp.avg_progress, 0),
        coalesce(tp.total_time_seconds, 0),
        coalesce(qz.quiz_sessions, 0),
        qz.avg_quiz_score,
        qz.pass_rate,
        tp.last_activity_at
      FROM public.profiles pr
      JOIN tp ON tp.user_id = pr.id
      LEFT JOIN qz ON qz.user_id = pr.id
     ORDER BY tp.last_activity_at DESC NULLS LAST, pr.full_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_learner_topic_breakdown(p_user_id uuid)
RETURNS TABLE(training_module_id uuid, module_title text, attempts bigint, correct bigint, accuracy numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        q.training_module_id,
        coalesce(tm.title, 'Unlinked questions') AS module_title,
        count(*)                                 AS attempts,
        count(*) FILTER (WHERE a.is_correct)     AS correct,
        round(100.0 * count(*) FILTER (WHERE a.is_correct) / nullif(count(*), 0), 1) AS accuracy
      FROM public.unified_question_attempts a
      JOIN public.unified_questions q ON q.id = a.question_id
      LEFT JOIN public.training_modules tm ON tm.id = q.training_module_id
     WHERE a.user_id = p_user_id
       AND a.organization_id = ANY (public.learning_manager_org_ids())
     GROUP BY q.training_module_id, tm.title
     ORDER BY accuracy ASC NULLS LAST, attempts DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_top_documents(p_days integer DEFAULT 30, p_limit integer DEFAULT 25)
RETURNS TABLE(document_id uuid, title text, content_type text, lifetime_views integer, recent_views bigint, distinct_recent_viewers bigint, last_viewed_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    recent AS (
        SELECT
            v.document_id,
            count(*)                    AS recent_views,
            count(DISTINCT v.user_id)   AS distinct_recent_viewers,
            max(v.viewed_at)            AS last_viewed_at
          FROM public.document_views_v v
         WHERE v.viewed_at >= now() - make_interval(days => greatest(p_days, 1))
         GROUP BY v.document_id
    )
    SELECT
        d.id,
        d.title,
        d.content_type,
        coalesce(d.view_count, 0),
        coalesce(recent.recent_views, 0),
        coalesce(recent.distinct_recent_viewers, 0),
        recent.last_viewed_at
      FROM public.documents d
      CROSS JOIN scope
      LEFT JOIN recent ON recent.document_id = d.id
     WHERE d.is_deleted IS NOT TRUE
       AND d.organization_id = ANY (scope.orgs)
       AND (d.status = 'PUBLISHED' OR (d.status)::text = 'published')
     ORDER BY coalesce(recent.recent_views, 0) DESC, coalesce(d.view_count, 0) DESC
     LIMIT greatest(p_limit, 1);
$function$;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_search_terms(p_days integer DEFAULT 30, p_limit integer DEFAULT 50)
RETURNS TABLE(term text, searches bigint, distinct_users bigint, avg_result_count numeric, zero_result_searches bigint, last_searched_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        lower(btrim(s.query))                                   AS term,
        count(*)                                                AS searches,
        count(DISTINCT s.user_id)                               AS distinct_users,
        round(avg(s.result_count)::numeric, 1)                  AS avg_result_count,
        count(*) FILTER (WHERE s.result_count = 0)              AS zero_result_searches,
        max(s.created_at)                                       AS last_searched_at
      FROM public.search_logs s
     WHERE s.organization_id = ANY (public.learning_manager_org_ids())
       AND s.created_at >= now() - make_interval(days => greatest(p_days, 1))
       AND btrim(coalesce(s.query, '')) <> ''
     GROUP BY lower(btrim(s.query))
     ORDER BY searches DESC, last_searched_at DESC
     LIMIT greatest(p_limit, 1);
$function$;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_zero_result_searches(p_days integer DEFAULT 90, p_limit integer DEFAULT 50)
RETURNS TABLE(term text, searches bigint, distinct_users bigint, last_searched_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        lower(btrim(s.query))       AS term,
        count(*)                    AS searches,
        count(DISTINCT s.user_id)   AS distinct_users,
        max(s.created_at)           AS last_searched_at
      FROM public.search_logs s
     WHERE s.organization_id = ANY (public.learning_manager_org_ids())
       AND s.result_count = 0
       AND s.created_at >= now() - make_interval(days => greatest(p_days, 1))
       AND btrim(coalesce(s.query, '')) <> ''
     GROUP BY lower(btrim(s.query))
     ORDER BY searches DESC, last_searched_at DESC
     LIMIT greatest(p_limit, 1);
$function$;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_pass_rates(p_days integer DEFAULT 90)
RETURNS TABLE(quiz_type text, quiz_entity_id uuid, quiz_title text, completed_sessions bigint, distinct_learners bigint, passed bigint, failed bigint, pass_rate numeric, avg_score numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        s.quiz_type,
        s.quiz_entity_id,
        coalesce(tm.title, lq.title, '(unnamed quiz)') AS quiz_title,
        count(*)                                       AS completed_sessions,
        count(DISTINCT s.user_id)                      AS distinct_learners,
        count(*) FILTER (WHERE s.passed IS TRUE)       AS passed,
        count(*) FILTER (WHERE s.passed IS NOT TRUE)   AS failed,
        round(100.0 * count(*) FILTER (WHERE s.passed IS TRUE) / nullif(count(*), 0), 1) AS pass_rate,
        round(avg(s.score_percentage)::numeric, 1)     AS avg_score
      FROM public.unified_quiz_sessions s
      LEFT JOIN public.training_modules tm ON tm.id = s.quiz_entity_id
      LEFT JOIN public.learning_quizzes lq ON lq.id = s.quiz_entity_id
     WHERE s.organization_id = ANY (public.learning_manager_org_ids())
       AND s.completed_at IS NOT NULL
       AND s.completed_at >= now() - make_interval(days => greatest(p_days, 1))
     GROUP BY s.quiz_type, s.quiz_entity_id, tm.title, lq.title
     ORDER BY completed_sessions DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_questions(p_module_id uuid DEFAULT NULL::uuid, p_min_attempts integer DEFAULT 1)
RETURNS TABLE(question_id uuid, question_text text, question_type text, difficulty text, training_module_id uuid, module_title text, attempts bigint, distinct_learners bigint, pct_correct numeric, discrimination numeric, avg_time_seconds numeric, hint_used_rate numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH scope AS (SELECT public.learning_manager_org_ids() AS orgs),
    joined AS (
        SELECT
            a.question_id,
            a.user_id,
            a.is_correct,
            a.hint_used,
            a.time_spent_seconds,
            s.score_percentage AS session_score
          FROM public.unified_question_attempts a
          CROSS JOIN scope
          LEFT JOIN public.unified_quiz_sessions s ON s.id = a.session_id
         WHERE a.organization_id = ANY (scope.orgs)
    )
    SELECT
        q.id,
        q.question_text,
        (q.question_type)::text,
        (q.difficulty)::text,
        q.training_module_id,
        tm.title,
        count(*)                                              AS attempts,
        count(DISTINCT j.user_id)                               AS distinct_learners,
        round(100.0 * count(*) FILTER (WHERE j.is_correct) / nullif(count(*), 0), 1) AS pct_correct,
        round(corr((j.is_correct)::int::numeric, j.session_score)::numeric, 3)         AS discrimination,
        round(avg(nullif(j.time_spent_seconds, 0))::numeric, 1) AS avg_time_seconds,
        round(100.0 * count(*) FILTER (WHERE j.hint_used) / nullif(count(*), 0), 1)  AS hint_used_rate
      FROM public.unified_questions q
      JOIN joined j ON j.question_id = q.id
      LEFT JOIN public.training_modules tm ON tm.id = q.training_module_id
     WHERE (p_module_id IS NULL OR q.training_module_id = p_module_id)
     GROUP BY q.id, q.question_text, q.question_type, q.difficulty, q.training_module_id, tm.title
    HAVING count(*) >= greatest(p_min_attempts, 1)
     ORDER BY pct_correct ASC NULLS LAST;
$function$;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_wrong_answers(p_question_id uuid)
RETURNS TABLE(answer_value text, answer_label text, is_correct boolean, times_chosen bigint, pct_of_attempts numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH picks AS (
        SELECT
            coalesce(a.selected_answer, '(no answer)') AS answer_value,
            a.is_correct,
            count(*) AS times_chosen
          FROM public.unified_question_attempts a
         WHERE a.question_id = p_question_id
           AND a.organization_id = ANY (public.learning_manager_org_ids())
         GROUP BY coalesce(a.selected_answer, '(no answer)'), a.is_correct
    ),
    total AS (SELECT sum(times_chosen) AS n FROM picks)
    SELECT
        p.answer_value,
        coalesce(o.option_text, p.answer_value) AS answer_label,
        p.is_correct,
        p.times_chosen,
        round(100.0 * p.times_chosen / nullif((SELECT n FROM total), 0), 1) AS pct_of_attempts
      FROM picks p
      LEFT JOIN public.unified_question_options o
        ON (o.id::text = p.answer_value OR o.option_text = p.answer_value)
       AND o.question_id = p_question_id
     ORDER BY p.times_chosen DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_questions_pass_rates(p_question_ids uuid[])
RETURNS TABLE(question_id uuid, total_attempts integer, correct_attempts integer, accuracy_rate numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        a.question_id,
        count(*)::integer AS total_attempts,
        count(*) FILTER (WHERE a.is_correct)::integer AS correct_attempts,
        ROUND(100.0 * count(*) FILTER (WHERE a.is_correct) / NULLIF(count(*), 0), 1) AS accuracy_rate
      FROM public.unified_question_attempts a
     WHERE a.question_id = ANY (p_question_ids)
       AND a.organization_id = ANY (public.content_editor_org_ids() || public.learning_manager_org_ids())
     GROUP BY a.question_id;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Platform usage stats (useAnalyticsStats.ts) - tenant admins/managers,
--    their own organizations only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_summary()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orgs uuid[] := public.learning_manager_org_ids();
BEGIN
  IF cardinality(v_orgs) = 0 THEN
    RETURN json_build_object('active_now', 0, 'active_today', 0, 'sessions_today', 0);
  END IF;
  RETURN json_build_object(
    'active_now', (SELECT count(DISTINCT user_id) FROM public.user_sessions
                   WHERE organization_id = ANY (v_orgs)
                     AND last_active_at > now() - interval '5 minutes'
                     AND revoked_at IS NULL AND expires_at > now()),
    'active_today', (SELECT count(DISTINCT user_id) FROM public.analytics_events
                     WHERE organization_id = ANY (v_orgs)
                       AND "timestamp" >= date_trunc('day', now())),
    'sessions_today', (SELECT count(*) FROM public.user_sessions
                       WHERE organization_id = ANY (v_orgs)
                         AND created_at >= date_trunc('day', now()))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_ago integer DEFAULT 30)
RETURNS TABLE(date date, active_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orgs uuid[] := public.learning_manager_org_ids();
BEGIN
  IF cardinality(v_orgs) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT g::date AS date,
         count(DISTINCT ae.user_id) AS active_users
    FROM generate_series(current_date - GREATEST(days_ago - 1, 0), current_date, interval '1 day') g
    LEFT JOIN public.analytics_events ae
      ON ae."timestamp"::date = g::date AND ae.organization_id = ANY (v_orgs)
   GROUP BY g::date
   ORDER BY g::date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_search_metrics(days_ago integer DEFAULT 30)
RETURNS TABLE(total_searches bigint, zero_results_count bigint, avg_results_count numeric, top_queries json)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orgs uuid[] := public.learning_manager_org_ids();
BEGIN
  IF cardinality(v_orgs) = 0 THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::numeric, '[]'::json; RETURN;
  END IF;
  RETURN QUERY
  WITH s AS (
    SELECT properties->>'query' AS q, NULLIF(properties->>'results_count','')::int AS rc
      FROM public.analytics_events
     WHERE organization_id = ANY (v_orgs)
       AND (event_name ILIKE 'search%' OR category = 'search')
       AND "timestamp" > now() - (days_ago || ' days')::interval
  )
  SELECT count(*)::bigint,
         count(*) FILTER (WHERE rc = 0)::bigint,
         COALESCE(round(avg(rc), 2), 0)::numeric,
         COALESCE((SELECT json_agg(json_build_object('query', q, 'count', c))
                     FROM (SELECT q, count(*) c FROM s WHERE q IS NOT NULL GROUP BY q ORDER BY count(*) DESC LIMIT 10) t),
                  '[]'::json)
    FROM s;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_events(limit_count integer DEFAULT 10)
RETURNS TABLE(event_name text, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orgs uuid[] := public.learning_manager_org_ids();
BEGIN
  IF cardinality(v_orgs) = 0 THEN RETURN; END IF;
  RETURN QUERY
  SELECT ae.event_name, count(*) AS count
    FROM public.analytics_events ae
   WHERE ae.organization_id = ANY (v_orgs)
   GROUP BY ae.event_name
   ORDER BY count(*) DESC
   LIMIT GREATEST(limit_count, 1);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Module review workflow (TrainingHub.tsx / TrainingBuilderContext.tsx)
-- ---------------------------------------------------------------------------

-- Reviewers: tenant admins and training managers of the module's organization.
CREATE OR REPLACE FUNCTION public.can_review_training_module(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_super_admin()
    OR (public.org_visible(p_org_id)
        AND (public.is_tenant_admin(p_org_id)
             OR EXISTS (
               SELECT 1 FROM public.organization_memberships om
                WHERE om.user_id = auth.uid() AND om.organization_id = p_org_id
                  AND om.is_active AND om.role = 'training_manager')));
$function$;

REVOKE ALL ON FUNCTION public.can_review_training_module(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_training_module(uuid) TO authenticated;

-- Authors and content editors of the module's organization.
CREATE OR REPLACE FUNCTION public._can_edit_training_module(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.training_modules m
     WHERE m.id = p_module_id
       AND public.org_visible(m.organization_id)
       AND (m.created_by = auth.uid() OR m.updated_by = auth.uid()
            OR public.is_tenant_content_editor(m.organization_id)));
$function$;

REVOKE ALL ON FUNCTION public._can_edit_training_module(uuid) FROM PUBLIC, anon, authenticated;

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
    SELECT organization_id INTO v_org FROM public.training_modules WHERE id = p_module_id;
    IF v_org IS NULL OR NOT public.can_review_training_module(v_org) THEN
        RAISE EXCEPTION 'Not authorized to approve training modules';
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
            RAISE EXCEPTION 'Cannot publish: a required quiz block is not linked to a quiz';
        END IF;

        SELECT count(*) INTO v_question_count
          FROM public.unified_quiz_questions uq
          JOIN public.unified_questions q ON q.id = uq.question_id
         WHERE uq.quiz_id = v_quiz_id AND q.status = 'published';

        IF v_question_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz has no published questions';
        END IF;
    END LOOP;

    UPDATE public.training_modules
       SET status = 'published', updated_at = now(), updated_by = auth.uid()
     WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
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

CREATE OR REPLACE FUNCTION public.reject_training_module(p_module_id uuid, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_org uuid;
    v_title text;
    v_author uuid;
BEGIN
    SELECT organization_id INTO v_org FROM public.training_modules WHERE id = p_module_id;
    IF v_org IS NULL OR NOT public.can_review_training_module(v_org) THEN
        RAISE EXCEPTION 'Not authorized to reject training modules';
    END IF;

    UPDATE public.training_modules
       SET status = 'draft', updated_at = now(), updated_by = auth.uid()
     WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, link, entity_type, entity_id, metadata)
        VALUES (
            v_author, v_org,
            'training_review_rejected',
            'Training module needs changes',
            '"' || v_title || '" was sent back to draft.' || CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
            '/training/hub/' || p_module_id || '?view=builder',
            'training_module',
            p_module_id,
            jsonb_build_object('reason', p_reason)
        );
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_training_module_for_review(p_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_org uuid;
    v_title text;
BEGIN
    IF NOT public._can_edit_training_module(p_module_id) THEN
        RAISE EXCEPTION 'Not authorized to submit this module for review';
    END IF;

    UPDATE public.training_modules
       SET status = 'pending_review', updated_at = now(), updated_by = auth.uid()
     WHERE id = p_module_id
    RETURNING title, organization_id INTO v_title, v_org;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    -- Notify the reviewers of this module's organization only.
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, link, entity_type, entity_id)
    SELECT DISTINCT
        om.user_id, v_org,
        'training_review_requested',
        'Training module awaiting review',
        '"' || v_title || '" was submitted for review before publishing.',
        '/training/hub/' || p_module_id,
        'training_module',
        p_module_id
      FROM public.organization_memberships om
     WHERE om.organization_id = v_org
       AND om.is_active
       AND om.role IN ('organization_owner', 'organization_admin', 'training_manager')
       AND om.user_id <> auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.snapshot_training_module_version(p_module_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_next_version integer;
    v_module jsonb;
    v_blocks jsonb;
    v_version_id uuid;
    v_org uuid;
BEGIN
    SELECT organization_id INTO v_org FROM public.training_modules WHERE id = p_module_id;
    IF NOT (public._can_edit_training_module(p_module_id)
            OR (v_org IS NOT NULL AND public.can_review_training_module(v_org))) THEN
        RAISE EXCEPTION 'Not authorized to version this module';
    END IF;

    SELECT to_jsonb(m) INTO v_module FROM public.training_modules m WHERE m.id = p_module_id;
    IF v_module IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b."order"), '[]'::jsonb)
      INTO v_blocks
      FROM public.training_content_blocks_v b
     WHERE b.training_module_id = p_module_id AND b.is_deleted = false;

    SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
      FROM public.training_module_versions
     WHERE training_module_id = p_module_id;

    INSERT INTO public.training_module_versions (training_module_id, organization_id, version_number, snapshot, published_by)
    VALUES (p_module_id, v_org, v_next_version, jsonb_build_object('module', v_module, 'blocks', v_blocks), auth.uid())
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.duplicate_training_module(p_module_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_new_module_id uuid;
    v_source public.training_modules%ROWTYPE;
BEGIN
    IF NOT public._can_edit_training_module(p_module_id) THEN
        RAISE EXCEPTION 'Not authorized to duplicate this module';
    END IF;

    SELECT * INTO v_source FROM public.training_modules WHERE id = p_module_id;
    IF v_source.id IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.training_modules (
        organization_id, title, description, estimated_duration_minutes, property_id, department_id,
        validity_period_days, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language,
        template_id, passing_score_percentage, status, category, difficulty_level,
        certificate_enabled, created_by
    )
    VALUES (
        v_source.organization_id, v_source.title || ' (Copy)', v_source.description, v_source.estimated_duration_minutes,
        v_source.property_id, v_source.department_id, v_source.validity_period_days,
        v_source.allow_retake, v_source.max_attempts, v_source.auto_advance, v_source.show_feedback,
        v_source.randomize_questions, v_source.show_answers, v_source.time_limit_minutes,
        v_source.audience, v_source.content_language, v_source.template_id,
        v_source.passing_score_percentage, 'draft', v_source.category, v_source.difficulty_level,
        v_source.certificate_enabled, auth.uid()
    )
    RETURNING id INTO v_new_module_id;

    INSERT INTO public.documents (
        organization_id, title, status, created_by, content, content_type, training_module_id,
        block_type, block_order, content_data, is_mandatory, duration_seconds, points,
        content_url, ai_generated, ai_source_content, visibility
    )
    SELECT
        v_source.organization_id, d.title, d.status, auth.uid(), d.content, 'training_block', v_new_module_id,
        d.block_type, d.block_order, d.content_data, d.is_mandatory, d.duration_seconds, d.points,
        d.content_url, d.ai_generated, d.ai_source_content, d.visibility
      FROM public.documents d
     WHERE d.training_module_id = p_module_id
       AND d.content_type = 'training_block'
       AND d.is_deleted = false;

    RETURN v_new_module_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_module_skills(p_user_id uuid, p_module_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_org uuid;
    v_rows_affected integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

    SELECT organization_id INTO v_org FROM public.training_modules WHERE id = p_module_id;
    IF v_org IS NULL THEN RETURN 0; END IF;

    IF p_user_id <> auth.uid() AND NOT (v_org = ANY (public.learning_manager_org_ids())) THEN
        RAISE EXCEPTION 'Not authorized to award skills for this user';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.training_progress tp
        WHERE tp.user_id = p_user_id AND tp.training_id = p_module_id AND tp.status = 'completed'
          AND COALESCE(tp.is_deleted, false) = false) THEN
        RETURN 0;
    END IF;

    INSERT INTO public.user_skills (user_id, organization_id, skill_id, proficiency_level, verified)
    SELECT p_user_id, v_org, ms.skill_id, LEAST(GREATEST(COALESCE(ms.points_awarded, 1), 1), 5), false
      FROM public.module_skills ms WHERE ms.module_id = p_module_id
    ON CONFLICT (user_id, skill_id) DO UPDATE
      SET proficiency_level = GREATEST(public.user_skills.proficiency_level, EXCLUDED.proficiency_level),
          verified = public.user_skills.verified
      WHERE public.user_skills.proficiency_level < EXCLUDED.proficiency_level;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;

-- Legacy global gate; its four callers are rewritten above.
DROP FUNCTION IF EXISTS public.is_regional_admin_or_higher(uuid);
