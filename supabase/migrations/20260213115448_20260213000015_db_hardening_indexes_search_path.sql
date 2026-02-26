-- Performance: add missing FK coverage indexes
create index if not exists idx_account_action_notes_created_by on public.account_action_notes(created_by);
create index if not exists idx_admin_delegations_paused_by on public.admin_delegations(paused_by);

-- Security: lock function search_path to avoid mutable resolution at runtime
alter function public.apply_request_priority_default() set search_path = public, pg_temp;
alter function public.apply_request_step_sla() set search_path = public, pg_temp;
alter function public.sync_request_due_at() set search_path = public, pg_temp;
alter function public.apply_maintenance_sla() set search_path = public, pg_temp;
alter function public.request_apply_action(uuid, text, text, uuid, text) set search_path = public, pg_temp;;
