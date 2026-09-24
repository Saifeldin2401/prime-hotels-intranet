CREATE OR REPLACE FUNCTION public.can_view_learning_analytics()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.role)::text = ANY (ARRAY[
              'super_admin','corporate_admin','regional_admin',
              'regional_hr','property_hr','department_head'
          ])
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_learning_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_learning_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_learner_analytics(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    job_title text,
    enrolled_count bigint,
    completed_count bigint,
    in_progress_count bigint,
    not_started_count bigint,
    avg_progress numeric,
    total_time_seconds bigint,
    quiz_sessions bigint,
    avg_quiz_score numeric,
    pass_rate numeric,
    last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok),
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
        FROM public.training_progress p
        WHERE p.is_deleted = false
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
        FROM public.unified_quiz_sessions s
        WHERE (p_user_id IS NULL OR s.user_id = p_user_id)
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
    WHERE (SELECT ok FROM allowed)
    ORDER BY tp.last_activity_at DESC NULLS LAST, pr.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_learner_analytics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_analytics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_learner_topic_breakdown(p_user_id uuid)
RETURNS TABLE(
    training_module_id uuid,
    module_title text,
    attempts bigint,
    correct bigint,
    accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok)
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
      AND (SELECT ok FROM allowed)
    GROUP BY q.training_module_id, tm.title
    ORDER BY accuracy ASC NULLS LAST, attempts DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_learner_topic_breakdown(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_topic_breakdown(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_analytics()
RETURNS TABLE(
    module_id uuid,
    title text,
    status text,
    category text,
    enrolled_count bigint,
    completed_count bigint,
    in_progress_count bigint,
    completion_rate numeric,
    avg_progress numeric,
    avg_time_seconds numeric,
    avg_score numeric,
    quiz_pass_rate numeric,
    last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok),
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
        FROM public.training_progress p
        WHERE p.is_deleted = false
          AND coalesce(p.lp_content_type, 'module') = 'module'
        GROUP BY p.training_id
    ),
    quiz AS (
        SELECT
            s.quiz_entity_id AS module_id,
            round(100.0 * count(*) FILTER (WHERE s.passed IS TRUE)
                  / nullif(count(*) FILTER (WHERE s.completed_at IS NOT NULL), 0), 1) AS quiz_pass_rate
        FROM public.unified_quiz_sessions s
        WHERE s.quiz_type = 'training'
        GROUP BY s.quiz_entity_id
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
    LEFT JOIN prog ON prog.module_id = tm.id
    LEFT JOIN quiz ON quiz.module_id = tm.id
    WHERE tm.is_deleted = false
      AND (SELECT ok FROM allowed)
    ORDER BY coalesce(prog.enrolled_count, 0) DESC, tm.title;
$$;

REVOKE EXECUTE ON FUNCTION public.get_course_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_top_documents(
    p_days integer DEFAULT 30,
    p_limit integer DEFAULT 25
)
RETURNS TABLE(
    document_id uuid,
    title text,
    content_type text,
    lifetime_views integer,
    recent_views bigint,
    distinct_recent_viewers bigint,
    last_viewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok),
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
    LEFT JOIN recent ON recent.document_id = d.id
    WHERE d.is_deleted IS NOT TRUE
      AND (d.status = 'PUBLISHED' OR (d.status)::text = 'published')
      AND (SELECT ok FROM allowed)
    ORDER BY coalesce(recent.recent_views, 0) DESC, coalesce(d.view_count, 0) DESC
    LIMIT greatest(p_limit, 1);
$$;

REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_top_documents(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_knowledge_analytics_top_documents(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_search_terms(
    p_days integer DEFAULT 30,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    term text,
    searches bigint,
    distinct_users bigint,
    avg_result_count numeric,
    zero_result_searches bigint,
    last_searched_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok)
    SELECT
        lower(btrim(s.query))                                   AS term,
        count(*)                                                AS searches,
        count(DISTINCT s.user_id)                               AS distinct_users,
        round(avg(s.result_count)::numeric, 1)                  AS avg_result_count,
        count(*) FILTER (WHERE s.result_count = 0)              AS zero_result_searches,
        max(s.created_at)                                       AS last_searched_at
    FROM public.search_logs s
    WHERE s.created_at >= now() - make_interval(days => greatest(p_days, 1))
      AND btrim(coalesce(s.query, '')) <> ''
      AND (SELECT ok FROM allowed)
    GROUP BY lower(btrim(s.query))
    ORDER BY searches DESC, last_searched_at DESC
    LIMIT greatest(p_limit, 1);
$$;

REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_search_terms(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_knowledge_analytics_search_terms(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_knowledge_analytics_zero_result_searches(
    p_days integer DEFAULT 90,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    term text,
    searches bigint,
    distinct_users bigint,
    last_searched_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok)
    SELECT
        lower(btrim(s.query))       AS term,
        count(*)                    AS searches,
        count(DISTINCT s.user_id)   AS distinct_users,
        max(s.created_at)           AS last_searched_at
    FROM public.search_logs s
    WHERE s.result_count = 0
      AND s.created_at >= now() - make_interval(days => greatest(p_days, 1))
      AND btrim(coalesce(s.query, '')) <> ''
      AND (SELECT ok FROM allowed)
    GROUP BY lower(btrim(s.query))
    ORDER BY searches DESC, last_searched_at DESC
    LIMIT greatest(p_limit, 1);
$$;

REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_zero_result_searches(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_knowledge_analytics_zero_result_searches(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_questions(
    p_module_id uuid DEFAULT NULL,
    p_min_attempts integer DEFAULT 1
)
RETURNS TABLE(
    question_id uuid,
    question_text text,
    question_type text,
    difficulty text,
    training_module_id uuid,
    module_title text,
    attempts bigint,
    distinct_learners bigint,
    pct_correct numeric,
    discrimination numeric,
    avg_time_seconds numeric,
    hint_used_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok),
    joined AS (
        SELECT
            a.question_id,
            a.user_id,
            a.is_correct,
            a.hint_used,
            a.time_spent_seconds,
            s.score_percentage AS session_score
        FROM public.unified_question_attempts a
        LEFT JOIN public.unified_quiz_sessions s ON s.id = a.session_id
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
    WHERE (SELECT ok FROM allowed)
      AND (p_module_id IS NULL OR q.training_module_id = p_module_id)
    GROUP BY q.id, q.question_text, q.question_type, q.difficulty, q.training_module_id, tm.title
    HAVING count(*) >= greatest(p_min_attempts, 1)
    ORDER BY pct_correct ASC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_questions(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assessment_analytics_questions(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_wrong_answers(p_question_id uuid)
RETURNS TABLE(
    answer_value text,
    answer_label text,
    is_correct boolean,
    times_chosen bigint,
    pct_of_attempts numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok),
    picks AS (
        SELECT
            coalesce(a.selected_answer, '(no answer)') AS answer_value,
            a.is_correct,
            count(*) AS times_chosen
        FROM public.unified_question_attempts a
        WHERE a.question_id = p_question_id
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
    WHERE (SELECT ok FROM allowed)
    ORDER BY p.times_chosen DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_wrong_answers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assessment_analytics_wrong_answers(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assessment_analytics_pass_rates(p_days integer DEFAULT 90)
RETURNS TABLE(
    quiz_type text,
    quiz_entity_id uuid,
    quiz_title text,
    completed_sessions bigint,
    distinct_learners bigint,
    passed bigint,
    failed bigint,
    pass_rate numeric,
    avg_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH allowed AS (SELECT public.can_view_learning_analytics() AS ok)
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
    WHERE s.completed_at IS NOT NULL
      AND s.completed_at >= now() - make_interval(days => greatest(p_days, 1))
      AND (SELECT ok FROM allowed)
    GROUP BY s.quiz_type, s.quiz_entity_id, tm.title, lq.title
    ORDER BY completed_sessions DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_pass_rates(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assessment_analytics_pass_rates(integer) TO authenticated;
