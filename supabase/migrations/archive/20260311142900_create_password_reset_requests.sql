create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.password_reset_requests enable row level security;

create index if not exists password_reset_requests_created_at_idx
  on public.password_reset_requests (created_at desc);

create index if not exists password_reset_requests_email_created_at_idx
  on public.password_reset_requests (email, created_at desc);

create index if not exists password_reset_requests_ip_created_at_idx
  on public.password_reset_requests (ip_address, created_at desc);
