-- Merge admin_delegations and temporary_approvers into a single `delegations` table.
-- Both tables were verified 0 rows before this change. They shared ~80% of their schema
-- (delegator/delegate, time window, reason, max_approvals, fallback delegates, notify
-- flags) -- flagged as redundant in a prior audit. temporary_approvers additionally
-- carried dead legacy columns (approver_id, temporary_approver_id, start_date, end_date,
-- status) left over from a prior partial migration to the "new" delegator_id/delegate_id
-- shape, plus 6 stacked/overlapping RLS policies (a broad ALL/property_manager policy
-- and a legacy SELECT policy layered on top of 4 policies that already duplicated the
-- admin_delegations pattern) that Postgres ORs together on every query.
--
-- Design notes:
--  * `delegation_category` ('admin' | 'temporary_approval') is the new discriminator
--    between the two original concepts. It is intentionally NOT named `delegation_type`,
--    because admin_delegations.delegation_type is already a deeply-embedded enum
--    ('full_access' | 'specific_permissions' | 'approval_authority') used throughout
--    src/pages/admin/DelegationSettings.tsx and the Delegation TS type; reusing the name
--    would collide with that existing meaning. delegation_type is kept, now nullable,
--    for admin-category rows only.
--  * Table is named `delegations` (not `admin_delegations`) since it now represents
--    both concepts; frontend call sites are updated in the same change.
--  * Column names are standardized on admin_delegations' starts_at/ends_at (rather than
--    temporary_approvers' start_at/end_at).
--  * The no-overlap EXCLUDE constraint that existed only on admin_delegations is kept
--    scoped to delegation_category = 'admin' only, so it does not newly restrict
--    temporary-approval delegations that never had this constraint.
--
-- This first drops 3 cross-table RLS policies (on approval_requests and document_approvals)
-- that reference temporary_approvers, so the source tables can be dropped; they are
-- recreated at the end, repointed at public.delegations.

drop policy if exists approval_requests_select on public.approval_requests;
drop policy if exists document_approvals_select_consolidated on public.document_approvals;
drop policy if exists document_approvals_update_approver_or_delegate on public.document_approvals;

drop table if exists public.temporary_approvers;
drop table if exists public.admin_delegations;

create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  delegation_category text not null,
  delegator_id uuid not null,
  delegate_id uuid not null,

  -- admin-only sub-classification (null for temporary_approval rows)
  delegation_type text,
  permissions text[] default '{}'::text[],

  -- temporary_approval-only scoping (defaulted/unused for admin rows)
  scope_type text not null default 'all',
  scope_id uuid,
  entity_type text,
  entity_id uuid,

  reason text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  auto_expired boolean not null default false,

  max_approvals integer,
  approvals_used integer not null default 0,
  allow_redelegate boolean not null default false,
  fallback_delegate_ids uuid[] default '{}'::uuid[],

  notify_delegate boolean not null default true,
  notify_delegator boolean not null default true,
  notify_on_action boolean not null default true,
  notify_on_expiry boolean not null default true,

  paused_at timestamptz,
  paused_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint delegations_delegator_id_fkey foreign key (delegator_id) references public.profiles(id) on delete cascade,
  constraint delegations_delegate_id_fkey foreign key (delegate_id) references public.profiles(id) on delete cascade,
  constraint delegations_paused_by_fkey foreign key (paused_by) references public.profiles(id) on delete set null,
  constraint delegations_revoked_by_fkey foreign key (revoked_by) references public.profiles(id) on delete set null,

  constraint delegations_category_check check (delegation_category in ('admin', 'temporary_approval')),
  constraint delegations_type_check check (delegation_type is null or delegation_type in ('full_access', 'specific_permissions', 'approval_authority')),
  constraint delegations_category_type_consistency check (
    (delegation_category = 'admin' and delegation_type is not null)
    or (delegation_category = 'temporary_approval' and delegation_type is null)
  ),
  constraint delegations_scope_type_check check (scope_type in ('property', 'department', 'all')),
  constraint delegations_entity_check check (
    (entity_type is null and entity_id is null) or (entity_type is not null and entity_id is not null)
  ),
  constraint delegations_max_approvals_check check (max_approvals is null or max_approvals >= 1),
  constraint delegations_valid_range check (ends_at > starts_at)
);

create extension if not exists btree_gist;

alter table public.delegations
  add constraint delegations_no_overlap_admin
  exclude using gist (
    delegator_id with =,
    tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
  ) where (revoked_at is null and delegation_category = 'admin');

create index idx_delegations_delegator on public.delegations using btree (delegator_id);
create index idx_delegations_delegate on public.delegations using btree (delegate_id);
create index idx_delegations_active on public.delegations using btree (is_active, ends_at);
create index idx_delegations_fallbacks on public.delegations using gin (fallback_delegate_ids);
create index idx_delegations_paused_at on public.delegations using btree (paused_at);
create index idx_delegations_paused_by on public.delegations using btree (paused_by);
create index idx_delegations_revoked_by on public.delegations using btree (revoked_by);
create index idx_delegations_entity on public.delegations using btree (entity_type, entity_id) where (entity_type is not null and entity_id is not null);
create index idx_delegations_category on public.delegations using btree (delegation_category);

comment on table public.delegations is 'Consolidated table replacing admin_delegations and temporary_approvers (merged 2026-07-21). delegation_category discriminates admin vs temporary_approval rows.';

alter table public.delegations enable row level security;

create policy delegations_select on public.delegations
  for select
  to authenticated
  using (
    delegator_id = (select auth.uid())
    or delegate_id = (select auth.uid())
    or (select auth.uid()) = any (fallback_delegate_ids)
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or has_role((select auth.uid()), 'regional_hr'::app_role)
    or has_role((select auth.uid()), 'property_hr'::app_role)
  );

create policy delegations_insert on public.delegations
  for insert
  to authenticated
  with check (
    delegator_id = (select auth.uid())
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or has_role((select auth.uid()), 'regional_hr'::app_role)
    or has_role((select auth.uid()), 'property_hr'::app_role)
  );

create policy delegations_update on public.delegations
  for update
  to authenticated
  using (
    delegator_id = (select auth.uid())
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or has_role((select auth.uid()), 'regional_hr'::app_role)
    or has_role((select auth.uid()), 'property_hr'::app_role)
  )
  with check (
    delegator_id = (select auth.uid())
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or has_role((select auth.uid()), 'regional_hr'::app_role)
    or has_role((select auth.uid()), 'property_hr'::app_role)
  );

create policy delegations_delete on public.delegations
  for delete
  to authenticated
  using (
    delegator_id = (select auth.uid())
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or has_role((select auth.uid()), 'regional_hr'::app_role)
    or has_role((select auth.uid()), 'property_hr'::app_role)
  );

revoke all on table public.delegations from public;
revoke all on table public.delegations from anon;
revoke all on table public.delegations from authenticated;
revoke all on table public.delegations from service_role;

grant select, insert, update, delete on table public.delegations to authenticated;
grant all on table public.delegations to service_role;

-- Recreate the 3 cross-table policies, repointed at public.delegations
-- (delegation_category = 'temporary_approval', starts_at/ends_at column names).

create policy approval_requests_select on public.approval_requests
  for select
  to authenticated
  using (
    (current_approver_id = (select auth.uid()))
    or has_role((select auth.uid()), 'regional_admin'::app_role)
    or (exists (
      select 1
      from public.delegations ta
      where ta.delegation_category = 'temporary_approval'
        and ((ta.delegate_id = (select auth.uid())) or ((select auth.uid()) = any (ta.fallback_delegate_ids)))
        and (ta.starts_at <= now())
        and (ta.ends_at >= now())
        and (
          ((ta.entity_type is not null) and (ta.entity_id is not null) and (ta.entity_type = approval_requests.entity_type) and (ta.entity_id = approval_requests.entity_id))
          or ((ta.entity_type is null) and (ta.entity_id is null) and (
            (ta.scope_type = 'all'::text)
            or ((ta.scope_type = 'property'::text) and (ta.scope_id in (select user_properties.property_id from user_properties where (user_properties.user_id = approval_requests.current_approver_id))))
            or ((ta.scope_type = 'department'::text) and (ta.scope_id in (select user_departments.department_id from user_departments where (user_departments.user_id = approval_requests.current_approver_id))))
          ))
        )
        and (ta.delegator_id = approval_requests.current_approver_id)
    ))
  );

create policy document_approvals_select_consolidated on public.document_approvals
  for select
  to authenticated
  using (
    (approver_id = (select auth.uid()))
    or (exists (select 1 from documents d where ((d.id = document_approvals.document_id) and ((d.created_by = (select auth.uid())) or has_role((select auth.uid()), 'regional_admin'::app_role)))))
    or (
      (approver_id = (select auth.uid()))
      or has_role((select auth.uid()), 'regional_admin'::app_role)
      or (exists (
        select 1
        from documents d
        join public.delegations ta on (ta.delegator_id = document_approvals.approver_id)
        where ta.delegation_category = 'temporary_approval'
          and (d.id = document_approvals.document_id)
          and ((ta.delegate_id = (select auth.uid())) or ((select auth.uid()) = any (ta.fallback_delegate_ids)))
          and (ta.starts_at <= now())
          and (ta.ends_at >= now())
          and (
            ((ta.entity_type is not null) and (ta.entity_id is not null) and (ta.entity_type = 'document_approval'::text) and (ta.entity_id = document_approvals.id))
            or ((ta.entity_type is null) and (ta.entity_id is null) and (
              (ta.scope_type = 'all'::text)
              or ((ta.scope_type = 'property'::text) and (not (ta.scope_id is distinct from d.property_id)))
              or ((ta.scope_type = 'department'::text) and (not (ta.scope_id is distinct from d.department_id)))
            ))
          )
      ))
    )
  );

create policy document_approvals_update_approver_or_delegate on public.document_approvals
  for update
  to authenticated
  using (
    (status = 'pending'::text) and (is_active = true) and (
      (approver_id = (select auth.uid()))
      or has_role((select auth.uid()), 'regional_admin'::app_role)
      or (exists (
        select 1
        from public.delegations ta
        join documents d on ((d.id = document_approvals.document_id))
        where ta.delegation_category = 'temporary_approval'
          and (ta.delegator_id = document_approvals.approver_id)
          and ((ta.delegate_id = (select auth.uid())) or ((select auth.uid()) = any (ta.fallback_delegate_ids)))
          and (ta.starts_at <= now())
          and (ta.ends_at >= now())
          and ((ta.max_approvals is null) or (ta.approvals_used < ta.max_approvals))
          and (
            ((ta.entity_type is not null) and (ta.entity_id is not null) and (ta.entity_type = 'document_approval'::text) and (ta.entity_id = document_approvals.id))
            or ((ta.entity_type is null) and (ta.entity_id is null) and (
              (ta.scope_type = 'all'::text)
              or ((ta.scope_type = 'property'::text) and (not (ta.scope_id is distinct from d.property_id)))
              or ((ta.scope_type = 'department'::text) and (not (ta.scope_id is distinct from d.department_id)))
            ))
          )
      ))
    )
  )
  with check (status = any (array['pending'::text, 'approved'::text, 'rejected'::text]));

create or replace function public.expire_delegations()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.delegations
  set is_active = false, auto_expired = true, updated_at = now()
  where is_active = true and ends_at < now();
end;
$function$;

create or replace function public.can_user_act_on_document_approval(p_user_id uuid, p_approval_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_approvals da
    JOIN public.documents d ON d.id = da.document_id
    WHERE da.id = p_approval_id
      AND da.status = 'pending'
      AND da.is_active = TRUE
      AND (
        da.approver_id = p_user_id
        OR public.has_role(p_user_id, 'regional_admin')
        OR EXISTS (
          SELECT 1
          FROM public.delegations ta
          WHERE ta.delegation_category = 'temporary_approval'
            AND ta.delegator_id = da.approver_id
            AND (ta.delegate_id = p_user_id OR p_user_id = ANY(ta.fallback_delegate_ids))
            AND ta.starts_at <= now()
            AND ta.ends_at >= now()
            AND (ta.max_approvals IS NULL OR ta.approvals_used < ta.max_approvals)
            AND (
              (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
               AND ta.entity_type = 'document_approval'
               AND ta.entity_id = p_approval_id)
              OR
              (ta.entity_type IS NULL AND ta.entity_id IS NULL
               AND (
                 ta.scope_type = 'all'
                 OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
                 OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
               ))
            )
        )
      )
  );
$function$;

create or replace function public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_remaining_pending integer;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to approve this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.delegations ta
  join public.documents d on d.id = v_document_id
  where ta.delegation_category = 'temporary_approval'
    and ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.starts_at <= now()
    and ta.ends_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.starts_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'approved',
      approved_at = now(),
      feedback = coalesce(p_feedback, feedback),
      approved_by = p_approver_id,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.delegations
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_approved'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' approved a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  select count(*)
  into v_remaining_pending
  from public.document_approvals
  where document_id = v_document_id
    and status = 'pending'
    and is_active = true;

  if v_remaining_pending = 0 then
    update public.documents
    set status = 'PUBLISHED',
        updated_at = now()
    where id = v_document_id;

    if v_document_author is not null and v_document_author <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_document_author,
        'request_approved'::public.notification_type,
        'Document Approved',
        'Your document "' || coalesce(v_document_title, 'Document') || '" has been approved and published.',
        jsonb_build_object(
          'entity_type', 'document',
          'entity_id', v_document_id,
          'link', '/documents/' || v_document_id::text,
          'approval_id', p_approval_id,
          'published', true
        )
      );
    end if;

    return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', true);
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', false, 'remaining_pending', v_remaining_pending);
end;
$function$;

create or replace function public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Rejection reason is required';
  end if;

  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to reject this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.delegations ta
  join public.documents d on d.id = v_document_id
  where ta.delegation_category = 'temporary_approval'
    and ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.starts_at <= now()
    and ta.ends_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.starts_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = p_approver_id,
      rejection_reason = p_reason,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.delegations
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  update public.documents
  set status = 'REJECTED',
      updated_at = now()
  where id = v_document_id;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_rejected'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' rejected a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  if v_document_author is not null and v_document_author <> p_approver_id then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_document_author,
      'request_rejected'::public.notification_type,
      'Document Rejected',
      'Your document "' || coalesce(v_document_title, 'Document') || '" was rejected. Reason: ' || p_reason,
      jsonb_build_object(
        'entity_type', 'document',
        'entity_id', v_document_id,
        'link', '/documents/' || v_document_id::text,
        'approval_id', p_approval_id
      )
    );
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'rejected', true);
end;
$function$;
