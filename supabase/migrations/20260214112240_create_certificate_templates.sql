-- Create certificate templates used by TrainingCertificateGenerator UI.
-- This is intentionally minimal: read access for all authenticated users,
-- management restricted to admins.

create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  template_html text not null default '',
  background_color text not null default '#ffffff',
  text_color text not null default '#111827',
  accent_color text not null default '#b8860b',
  font_family text not null default 'Georgia',
  logo_url text,
  signature_url text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certificate_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'certificate_templates'
      and policyname = 'certificate_templates_select'
  ) then
    create policy certificate_templates_select
      on public.certificate_templates
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'certificate_templates'
      and policyname = 'certificate_templates_admin_write'
  ) then
    create policy certificate_templates_admin_write
      on public.certificate_templates
      for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

-- Seed a default template if none exist.
insert into public.certificate_templates (name, description, is_default, is_active)
select 'Default', 'Default certificate template', true, true
where not exists (select 1 from public.certificate_templates);
;
