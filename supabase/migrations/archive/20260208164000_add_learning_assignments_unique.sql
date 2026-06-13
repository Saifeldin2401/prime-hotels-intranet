-- Support ON CONFLICT (target_id, content_type, content_id) in onboarding trigger
create unique index if not exists learning_assignments_target_content_unique
on public.learning_assignments (target_id, content_type, content_id);
