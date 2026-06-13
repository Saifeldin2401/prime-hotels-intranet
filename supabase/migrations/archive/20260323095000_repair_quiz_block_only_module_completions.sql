-- Repair legacy module rows where the final quiz block was recorded as completed
-- but the quiz score payload never reached learning_progress metadata.
-- We can safely mark these modules completed because the quiz block completion
-- is only recorded after a successful pass in the player flow, but the exact score
-- is not recoverable from current data, so score fields remain null.

create temporary table tmp_quiz_block_only_repairs on commit drop as
with final_quiz_blocks as (
    select distinct on (tcb.training_module_id)
        tcb.training_module_id as module_id,
        tcb.id as block_id
    from public.training_content_blocks tcb
    where tcb.is_deleted = false
      and tcb.type = 'quiz'
    order by tcb.training_module_id, tcb."order" desc, tcb.created_at desc
),
repair_targets as (
    select
        lp.id as learning_progress_id,
        lp.user_id,
        lp.assignment_id,
        lp.content_id as module_id,
        lp.created_at,
        coalesce(tbp.completed_at, tbp.last_viewed_at, lp.updated_at, now()) as resolved_completed_at,
        tm.certificate_enabled
    from public.learning_progress lp
    join final_quiz_blocks fqb
      on fqb.module_id = lp.content_id
    join public.training_block_progress tbp
      on tbp.user_id = lp.user_id
     and tbp.training_module_id = lp.content_id
     and tbp.block_id = fqb.block_id
     and tbp.completed_at is not null
    join public.training_modules tm
      on tm.id = lp.content_id
    where lp.content_type = 'module'
      and coalesce(lp.is_deleted, false) = false
      and coalesce(lp.status, 'assigned') <> 'completed'
      and lp.completed_at is null
      and coalesce(lp.progress_percentage, 0) >= 99
      and coalesce(
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
          ) = 0
),
updated_learning as (
    update public.learning_progress lp
    set
        status = 'completed',
        progress_percentage = 100,
        passed = coalesce(lp.passed, true),
        completed_at = rt.resolved_completed_at,
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
        lp.completed_at
)
select
    ul.learning_progress_id,
    ul.user_id,
    ul.assignment_id,
    ul.module_id,
    ul.created_at,
    ul.completed_at,
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
    null,
    coalesce(tmp.created_at, now()),
    coalesce(tmp.completed_at, now()),
    false
from tmp_quiz_block_only_repairs tmp
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
    updated_at = greatest(coalesce(tp.updated_at, tmp.completed_at), tmp.completed_at)
from tmp_quiz_block_only_repairs tmp
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
    null,
    coalesce(tm.passing_score_percentage, 80),
    'active',
    jsonb_build_object(
        'backfilled_by', '20260323095000_repair_quiz_block_only_module_completions',
        'source', 'quiz_block_only_completion_repair',
        'score_recoverable', false
    )
from tmp_quiz_block_only_repairs tmp
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
