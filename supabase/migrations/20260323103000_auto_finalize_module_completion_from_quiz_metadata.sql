-- Server-side safeguard for module completions.
-- If a module progress row arrives with all required quiz scores saved in metadata
-- and the learner has passed, finalize the module even if the client is still on an
-- older bundle. Also issue the training certificate from training_progress when
-- completion is synced.

create or replace function public.finalize_module_learning_progress_from_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_quiz_count integer := 0;
    v_recorded_quiz_count integer := 0;
    v_avg_quiz_score integer := null;
    v_passing_score integer := 80;
begin
    if new.content_type <> 'module' or coalesce(new.is_deleted, false) then
        return new;
    end if;

    if coalesce(new.status, 'assigned') <> 'completed'
       and new.completed_at is null
       and coalesce(new.progress_percentage, 0) >= 100 then
        new.progress_percentage := 99;
    end if;

    select count(*)::int
      into v_quiz_count
      from public.training_content_blocks
     where training_module_id = new.content_id
       and is_deleted = false
       and type = 'quiz';

    if v_quiz_count = 0 or coalesce(new.progress_percentage, 0) < 99 then
        return new;
    end if;

    select coalesce(passing_score_percentage, 80)
      into v_passing_score
      from public.training_modules
     where id = new.content_id;

    select
        coalesce(count(*), 0)::int,
        round(avg(value::numeric), 0)::int
      into v_recorded_quiz_count, v_avg_quiz_score
      from jsonb_each_text(
        case
            when jsonb_typeof(new.metadata -> 'quiz_scores_by_id') = 'object'
                then new.metadata -> 'quiz_scores_by_id'
            else '{}'::jsonb
        end
      );

    if v_recorded_quiz_count = v_quiz_count
       and coalesce(v_avg_quiz_score, -1) >= v_passing_score then
        new.status := 'completed';
        new.progress_percentage := 100;
        if new.score_percentage is null or new.score_percentage < v_avg_quiz_score then
            new.score_percentage := v_avg_quiz_score;
        end if;
        new.passed := true;
        new.completed_at := coalesce(new.completed_at, new.updated_at, new.last_accessed_at, new.last_activity_at, now());
    end if;

    return new;
end;
$$;

drop trigger if exists trg_finalize_module_learning_progress_from_metadata on public.learning_progress;
create trigger trg_finalize_module_learning_progress_from_metadata
before insert or update of status, progress_percentage, score_percentage, passed, completed_at, metadata, updated_at, last_accessed_at, last_activity_at
on public.learning_progress
for each row
execute function public.finalize_module_learning_progress_from_metadata();

create or replace function public.issue_training_certificate_from_training_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_module_title text;
    v_certificate_enabled boolean := false;
    v_passing_score integer := 80;
    v_recipient_name text;
    v_recipient_email text;
begin
    if coalesce(new.is_deleted, false)
       or new.status <> 'completed'
       or new.completed_at is null then
        return new;
    end if;

    select
        title,
        certificate_enabled,
        coalesce(passing_score_percentage, 80)
      into v_module_title, v_certificate_enabled, v_passing_score
      from public.training_modules
     where id = new.training_id;

    if not coalesce(v_certificate_enabled, false) then
        return new;
    end if;

    if exists (
        select 1
          from public.certificates c
         where c.training_progress_id = new.id
           and c.certificate_type = 'training'
           and c.status = 'active'
    ) then
        return new;
    end if;

    select
        coalesce(full_name, email, 'Training Participant'),
        email
      into v_recipient_name, v_recipient_email
      from public.profiles
     where id = new.user_id;

    begin
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
        ) values (
            new.user_id,
            coalesce(v_recipient_name, 'Training Participant'),
            v_recipient_email,
            'training',
            public.generate_certificate_number(),
            public.generate_verification_code(),
            new.training_id,
            new.id,
            v_module_title,
            'Congratulations! You''ve earned a certificate for completing ' || v_module_title || '.',
            new.completed_at,
            new.quiz_score,
            v_passing_score,
            'active',
            jsonb_build_object(
                'issued_by', 'training_progress_completion_trigger',
                'source', 'server_side_module_completion_fallback'
            )
        );
    exception
        when unique_violation then
            null;
    end;

    return new;
end;
$$;

drop trigger if exists trg_issue_training_certificate_from_training_progress on public.training_progress;
create trigger trg_issue_training_certificate_from_training_progress
after insert or update of status, completed_at, quiz_score
on public.training_progress
for each row
execute function public.issue_training_certificate_from_training_progress();

-- Re-evaluate any currently stuck module rows that already contain passing quiz metadata.
update public.learning_progress
set updated_at = now()
where content_type = 'module'
  and coalesce(is_deleted, false) = false
  and coalesce(status, 'assigned') <> 'completed'
  and completed_at is null
  and coalesce(progress_percentage, 0) >= 99
  and coalesce(
        (
            select count(*)
            from jsonb_each_text(
                case
                    when jsonb_typeof(learning_progress.metadata -> 'quiz_scores_by_id') = 'object'
                        then learning_progress.metadata -> 'quiz_scores_by_id'
                    else '{}'::jsonb
                end
            )
        ),
        0
      ) > 0;
