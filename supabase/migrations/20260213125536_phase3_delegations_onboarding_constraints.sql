create extension if not exists btree_gist;

alter table public.admin_delegations
  add constraint admin_delegations_no_overlap_per_type
  exclude using gist (
    delegator_id with =,
    delegation_type with =,
    tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
  )
  where (revoked_at is null);

alter table public.onboarding_tasks enable row level security;

drop policy if exists "Users can update relevant onboarding tasks" on public.onboarding_tasks;

create policy "Users can update assigned onboarding tasks" on public.onboarding_tasks
  for update
  to public
  using (
    assigned_to_id = (select auth.uid())
    or exists (
      select 1
      from public.user_roles r
      where r.user_id = (select auth.uid())
        and r.role = any (array['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])
    )
  );
;
