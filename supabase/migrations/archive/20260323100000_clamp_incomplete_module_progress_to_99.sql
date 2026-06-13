-- Legacy cleanup: incomplete module rows must never persist as 100%.
-- Keep completed rows at 100, but clamp unfinished rows back to 99 so the
-- database state matches the UI contract.

update public.learning_progress
set
    progress_percentage = 99,
    updated_at = now()
where content_type = 'module'
  and coalesce(is_deleted, false) = false
  and coalesce(status, 'assigned') <> 'completed'
  and completed_at is null
  and coalesce(progress_percentage, 0) >= 100;
