-- Similarity search helpers for bulk user creation resolution

create extension if not exists pg_trgm with schema extensions;

create or replace function public.search_properties_by_similarity(
  search_text text,
  result_limit int default 5
)
returns table (
  id uuid,
  name text,
  score real
)
language sql
stable
as $$
  select
    p.id,
    p.name,
    similarity(p.name, search_text) as score
  from public.properties p
  where coalesce(p.is_deleted, false) = false
  order by score desc, p.name asc
  limit result_limit;
$$;

create or replace function public.search_departments_by_similarity(
  search_text text,
  property_ids uuid[] default null,
  result_limit int default 5
)
returns table (
  id uuid,
  name text,
  score real
)
language sql
stable
as $$
  select
    d.id,
    d.name,
    similarity(d.name, search_text) as score
  from public.departments d
  where coalesce(d.is_deleted, false) = false
    and (
      property_ids is null
      or array_length(property_ids, 1) is null
      or d.property_id = any(property_ids)
    )
  order by score desc, d.name asc
  limit result_limit;
$$;

create or replace function public.search_job_titles_by_similarity(
  search_text text,
  result_limit int default 5
)
returns table (
  title text,
  score real
)
language sql
stable
as $$
  select
    jt.title,
    similarity(jt.title, search_text) as score
  from public.job_titles jt
  order by score desc, jt.title asc
  limit result_limit;
$$;
;
