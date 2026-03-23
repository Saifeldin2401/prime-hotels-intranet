-- Repair module progress rows that met completion requirements but were left in_progress.
-- This also backfills the linked legacy training_progress row and creates the missing
-- training certificate when the module is configured to issue one.

create temporary table tmp_repaired_module_completions on commit drop as
with module_quiz_counts as (
    select
        training_module_id as module_id,
        count(*)::int as quiz_count
    from public.training_content_blocks
    where is_deleted = false
      and type = 'quiz'
    group by training_module_id
),
eligible as (
    select
        lp.id as learning_progress_id,
        lp.user_id,
        lp.assignment_id,
        lp.content_id as module_id,
        lp.created_at,
        lp.updated_at,
        lp.last_accessed_at,
        lp.last_activity_at,
        lp.progress_percentage,
        coalesce(mqc.quiz_count, 0) as quiz_count,
        coalesce(
            (
                select count(*)
                from jsonb_each_text(
                    case
                        when jsonb_typeof(lp.metadata -> 'quiz_scores_by_id') = 'object'
                            then lp.metadata -> 'quiz_scores_by_id'
                        else '{}'::jsonb
                    end
                )
            ),
            0
        )::int as recorded_quiz_count,
        (
            select round(avg(value::numeric), 0)::int
            from jsonb_each_text(
                case
                    when jsonb_typeof(lp.metadata -> 'quiz_scores_by_id') = 'object'
                        then lp.metadata -> 'quiz_scores_by_id'
                    else '{}'::jsonb
                end
            )
        ) as avg_quiz_score,
        coalesce(tm.passing_score_percentage, 80) as passing_score,
        tm.certificate_enabled,
        coalesce(lp.completed_at, lp.updated_at, lp.last_accessed_at, lp.last_activity_at, now()) as resolved_completed_at
    from public.learning_progress lp
    join public.training_modules tm
      on tm.id = lp.content_id
    left join module_quiz_counts mqc
      on mqc.module_id = lp.content_id
    where lp.content_type = 'module'
      and coalesce(lp.is_deleted, false) = false
      and coalesce(lp.status, 'assigned') <> 'completed'
),
repair_targets as (
    select
        learning_progress_id,
        user_id,
        assignment_id,
        module_id,
        created_at,
        resolved_completed_at,
        case
            when quiz_count > 0 then avg_quiz_score
            else null
        end as resolved_score,
        case
            when quiz_count > 0 then true
            else true
        end as resolved_passed,
        certificate_enabled
    from eligible
    where (quiz_count = 0 and progress_percentage >= 100)
       or (
            quiz_count > 0
        and recorded_quiz_count = quiz_count
        and coalesce(avg_quiz_score, -1) >= passing_score
        and progress_percentage >= 99
       )
),
updated_learning as (
    update public.learning_progress lp
    set
        status = 'completed',
        progress_percentage = 100,
        score_percentage = coalesce(rt.resolved_score, lp.score_percentage),
        passed = coalesce(rt.resolved_passed, lp.passed, true),
        completed_at = coalesce(lp.completed_at, rt.resolved_completed_at),
        last_activity_at = coalesce(lp.last_activity_at, rt.resolved_completed_at),
        last_accessed_at = coalesce(lp.last_accessed_at, rt.resolved_completed_at),
        updated_at = greatest(coalesce(lp.updated_at, rt.resolved_completed_at), rt.resolved_completed_at)
    from repair_targets rt
    where lp.id = rt.learning_progress_id
    returning
        lp.id as learning_progress_id,
        lp.user_id,
        lp.assignment_id,
        lp.content_id as module_id,
        lp.created_at,
        lp.completed_at,
        lp.score_percentage,
        lp.passed
)
select
    ul.learning_progress_id,
    ul.user_id,
    ul.assignment_id,
    ul.module_id,
    ul.created_at,
    ul.completed_at,
    ul.score_percentage,
    ul.passed,
    rt.certificate_enabled
from updated_learning ul
join repair_targets rt
  on rt.learning_progress_id = ul.learning_progress_id;

insert into public.training_progress (
    user_id,
    training_id,
    assignment_id,
    status,
    started_at,
    completed_at,
    quiz_score,
    created_at,
    updated_at,
    is_deleted
)
select
    tmp.user_id,
    tmp.module_id,
    tmp.assignment_id,
    'completed'::public.training_status,
    coalesce(tmp.created_at, tmp.completed_at, now()),
    tmp.completed_at,
    case
        when tmp.score_percentage is null then null
        else round(tmp.score_percentage)::int
    end,
    coalesce(tmp.created_at, now()),
    coalesce(tmp.completed_at, now()),
    false
from tmp_repaired_module_completions tmp
where not exists (
    select 1
    from public.training_progress tp
    where tp.user_id = tmp.user_id
      and tp.training_id = tmp.module_id
      and coalesce(tp.is_deleted, false) = false
);

update public.training_progress tp
set
    status = 'completed',
    completed_at = coalesce(tp.completed_at, tmp.completed_at),
    quiz_score = coalesce(
        case
            when tmp.score_percentage is null then null
            else round(tmp.score_percentage)::int
        end,
        tp.quiz_score
    ),
    updated_at = greatest(coalesce(tp.updated_at, tmp.completed_at), tmp.completed_at)
from tmp_repaired_module_completions tmp
where tp.user_id = tmp.user_id
  and tp.training_id = tmp.module_id
  and coalesce(tp.is_deleted, false) = false;

insert into public.certificates (
    user_id,
    recipient_name,
    recipient_email,
    certificate_type,
    certificate_number,
    verification_code,
    training_module_id,
    training_progress_id,
    title,
    description,
    completion_date,
    score,
    passing_score,
    status,
    metadata
)
select
    tmp.user_id,
    coalesce(p.full_name, p.email, 'Training Participant'),
    p.email,
    'training',
    public.generate_certificate_number(),
    public.generate_verification_code(),
    tmp.module_id,
    tp.id,
    tm.title,
    'Congratulations! You''ve earned a certificate for completing ' || tm.title || '.',
    tmp.completed_at,
    tmp.score_percentage,
    coalesce(tm.passing_score_percentage, 80),
    'active',
    jsonb_build_object(
        'backfilled_by', '20260323093000_repair_stuck_module_completions',
        'source', 'stuck_module_completion_repair'
    )
from tmp_repaired_module_completions tmp
join public.training_modules tm
  on tm.id = tmp.module_id
 and tm.certificate_enabled = true
join public.training_progress tp
  on tp.user_id = tmp.user_id
 and tp.training_id = tmp.module_id
 and coalesce(tp.is_deleted, false) = false
left join public.profiles p
  on p.id = tmp.user_id
left join public.certificates c
  on c.training_progress_id = tp.id
 and c.certificate_type = 'training'
 and c.status = 'active'
where c.id is null;
