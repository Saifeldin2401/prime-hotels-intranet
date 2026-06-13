-- Ensure module completions finalized inside learning_progress metadata safeguards
-- are always pushed through to legacy training_progress and certificate issuance.

drop trigger if exists trg_sync_learning_to_training_progress on public.learning_progress;

create trigger trg_sync_learning_to_training_progress
after insert or update of assignment_id, content_type, content_id, status, progress_percentage, score_percentage, passed, completed_at, metadata, updated_at, last_accessed_at, last_activity_at, is_deleted
on public.learning_progress
for each row
execute function public.sync_learning_to_training_progress();

-- Resync module rows from learning_progress into training_progress so any already
-- repaired completion rows are reflected in the admin hub and certificate flow.
insert into public.training_progress (
  user_id,
  training_id,
  assignment_id,
  status,
  started_at,
  completed_at,
  quiz_score,
  updated_at,
  is_deleted
)
select
  lp.user_id,
  lp.content_id as training_id,
  lp.assignment_id,
  case lp.status
    when 'completed' then 'completed'::public.training_status
    when 'in_progress' then 'in_progress'::public.training_status
    when 'overdue' then 'expired'::public.training_status
    else 'not_started'::public.training_status
  end as status,
  case
    when lp.status in ('in_progress', 'completed', 'overdue')
      then coalesce(lp.last_accessed_at, lp.created_at, now())
    else null
  end as started_at,
  lp.completed_at,
  case when lp.score_percentage is null then null else round(lp.score_percentage)::int end as quiz_score,
  now() as updated_at,
  coalesce(lp.is_deleted, false) as is_deleted
from public.learning_progress lp
where lp.content_type = 'module'
  and exists (
    select 1
    from public.training_modules tm
    where tm.id = lp.content_id
  )
on conflict (user_id, training_id)
do update set
  assignment_id = excluded.assignment_id,
  status = excluded.status,
  started_at = coalesce(public.training_progress.started_at, excluded.started_at),
  completed_at = excluded.completed_at,
  quiz_score = excluded.quiz_score,
  is_deleted = excluded.is_deleted,
  updated_at = now();

-- Safety backfill for any completed synced rows that still do not have a training certificate.
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
  tp.user_id,
  coalesce(p.full_name, p.email, 'Training Participant') as recipient_name,
  p.email as recipient_email,
  'training',
  public.generate_certificate_number(),
  public.generate_verification_code(),
  tp.training_id,
  tp.id,
  tm.title,
  'Congratulations! You''ve earned a certificate for completing ' || tm.title || '.',
  tp.completed_at,
  tp.quiz_score,
  coalesce(tm.passing_score_percentage, 80),
  'active',
  jsonb_build_object(
    'issued_by', 'training_progress_resync_backfill',
    'source', 'module_completion_sync_fix'
  )
from public.training_progress tp
join public.training_modules tm on tm.id = tp.training_id
left join public.profiles p on p.id = tp.user_id
left join public.certificates c
  on c.training_progress_id = tp.id
 and c.certificate_type = 'training'
 and c.status = 'active'
where coalesce(tp.is_deleted, false) = false
  and tp.status = 'completed'
  and tp.completed_at is not null
  and coalesce(tm.certificate_enabled, false) = true
  and c.id is null;
