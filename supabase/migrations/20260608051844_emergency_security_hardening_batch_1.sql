-- Emergency security hardening batch 1 for connect v2.
-- Non-destructive: no business tables are dropped and no rows are deleted.

-- 1) Disable cron jobs copied from another Supabase project ref until they are re-created
-- against the current project and verified function-by-function.
do $$
declare
  job record;
begin
  for job in
    select jobid
    from cron.job
    where active = true
      and command like '%https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/%'
  loop
    perform cron.alter_job(job.jobid, active => false);
  end loop;
end $$;

-- 2) Remove broad storage object policies that allow public listing/reading.
drop policy if exists "Allow public read access to avatars" on storage.objects;
drop policy if exists "Allow public read access to documents" on storage.objects;
drop policy if exists "Allow public read maintenance" on storage.objects;

-- 3) Keep employee documents private and express authenticated access using authenticated role.
update storage.buckets
set public = false,
    file_size_limit = coalesce(file_size_limit, 10485760),
    allowed_mime_types = coalesce(
      allowed_mime_types,
      array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    )
where id = 'employee-documents';

drop policy if exists "Authenticated users can read employee-documents" on storage.objects;
drop policy if exists "Authenticated users can upload to employee-documents" on storage.objects;
drop policy if exists "Users can delete own employee-documents files" on storage.objects;

create policy "employee_documents_authenticated_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'employee-documents');

create policy "employee_documents_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'employee-documents');

create policy "employee_documents_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'employee-documents' and owner = auth.uid());

-- 4) Remove duplicate broad media object policies; keep the narrower media bucket policies.
drop policy if exists "media_objects_select" on storage.objects;
drop policy if exists "media_objects_insert" on storage.objects;
drop policy if exists "media_objects_update" on storage.objects;
drop policy if exists "media_objects_delete" on storage.objects;

-- 5) Revoke API access to materialized search view; expose search through checked RPCs instead.
revoke all on table public.sop_document_search from anon, authenticated;

-- 6) Add minimal policies to RLS-enabled tables that previously had none.
do $$
begin
  if to_regclass('public.password_reset_requests') is not null then
    create policy password_reset_requests_admin_select
      on public.password_reset_requests
      for select
      to authenticated
      using (has_role_optimized('corporate_admin'::app_role) or has_role_optimized('regional_admin'::app_role));
  end if;

  if to_regclass('public.rate_limit_entries') is not null then
    create policy rate_limit_entries_admin_select
      on public.rate_limit_entries
      for select
      to authenticated
      using (has_role_optimized('corporate_admin'::app_role) or has_role_optimized('regional_admin'::app_role));
  end if;

  if to_regclass('public.sop_access_logs') is not null then
    create policy sop_access_logs_insert_own
      on public.sop_access_logs
      for insert
      to authenticated
      with check (user_id = auth.uid());

    create policy sop_access_logs_select_own_or_admin
      on public.sop_access_logs
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
      );
  end if;

  if to_regclass('public.sop_review_reminders') is not null then
    create policy sop_review_reminders_admin_select
      on public.sop_review_reminders
      for select
      to authenticated
      using (has_role_optimized('corporate_admin'::app_role) or has_role_optimized('regional_admin'::app_role));

    create policy sop_review_reminders_admin_update
      on public.sop_review_reminders
      for update
      to authenticated
      using (has_role_optimized('corporate_admin'::app_role) or has_role_optimized('regional_admin'::app_role))
      with check (has_role_optimized('corporate_admin'::app_role) or has_role_optimized('regional_admin'::app_role));
  end if;
end $$;

-- 7) Replace overly broad insert policies with scoped checks.
drop policy if exists "Public can submit applications" on public.job_applications;
create policy "Public can submit applications"
  on public.job_applications
  for insert
  to anon, authenticated
  with check (
    status = 'submitted'
    and applicant_email is not null
    and length(trim(applicant_email)) between 3 and 320
    and job_posting_id is not null
  );

drop policy if exists media_access_logs_insert on public.media_access_logs;
create policy media_access_logs_insert
  on public.media_access_logs
  for insert
  to authenticated
  with check (accessed_by = auth.uid());

drop policy if exists media_asset_usages_insert on public.media_asset_usages;
create policy media_asset_usages_insert
  on public.media_asset_usages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.media_assets ma
      where ma.id = media_asset_usages.media_asset_id
        and (
          ma.uploaded_by = auth.uid()
          or has_role(auth.uid(), 'regional_admin'::app_role)
          or has_role(auth.uid(), 'property_manager'::app_role)
        )
    )
  );

drop policy if exists "Users can insert notifications" on public.notifications;
create policy "Users can insert own notifications"
  on public.notifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- 8) Remove obvious duplicate indexes identified by advisors.
drop index if exists public.idx_delegations_delegate;
drop index if exists public.idx_delegations_delegator;
drop index if exists public.idx_delegations_active;
drop index if exists public.shifts_user_start_idx;
