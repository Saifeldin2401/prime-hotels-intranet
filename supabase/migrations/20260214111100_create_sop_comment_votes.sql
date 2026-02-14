-- Add per-user votes for SOP/Knowledge comments and keep sop_comments.upvotes in sync.

create table if not exists public.sop_comment_votes (
  comment_id uuid not null references public.sop_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('up', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.sop_comment_votes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sop_comment_votes'
      and policyname = 'sop_comment_votes_select'
  ) then
    create policy sop_comment_votes_select
      on public.sop_comment_votes
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sop_comment_votes'
      and policyname = 'sop_comment_votes_insert'
  ) then
    create policy sop_comment_votes_insert
      on public.sop_comment_votes
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sop_comment_votes'
      and policyname = 'sop_comment_votes_update'
  ) then
    create policy sop_comment_votes_update
      on public.sop_comment_votes
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sop_comment_votes'
      and policyname = 'sop_comment_votes_delete'
  ) then
    create policy sop_comment_votes_delete
      on public.sop_comment_votes
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.sync_sop_comment_upvotes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_id uuid;
begin
  v_comment_id := coalesce(new.comment_id, old.comment_id);

  update public.sop_comments c
  set upvotes = (
    select coalesce(sum(case v.vote_type when 'up' then 1 when 'down' then -1 else 0 end), 0)
    from public.sop_comment_votes v
    where v.comment_id = v_comment_id
  ),
  updated_at = now()
  where c.id = v_comment_id;

  return null;
end;
$$;

drop trigger if exists trg_sync_sop_comment_upvotes on public.sop_comment_votes;
create trigger trg_sync_sop_comment_upvotes
after insert or update or delete on public.sop_comment_votes
for each row execute function public.sync_sop_comment_upvotes();

