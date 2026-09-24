-- Emits the production schema as one JSON object (sections of DDL text), read by
-- scripts/build-schema-snapshot.mjs to write supabase/schema/production_schema.sql.
--
--   psql "$SUPABASE_DB_URL" -At -f scripts/generate-schema-snapshot.sql > snapshot.json
--   node scripts/build-schema-snapshot.mjs snapshot.json
--
-- (Also runnable through the Supabase MCP / SQL editor; save the single-cell result.)
with
ext as (
  select string_agg(format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I;', e.extname, n.nspname), E'\n' order by e.extname) s
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname <> 'plpgsql'),
enums as (
  select string_agg(format('CREATE TYPE public.%I AS ENUM (%s);', t.typname,
           (select string_agg(quote_literal(enumlabel), ', ' order by enumsortorder) from pg_enum where enumtypid = t.oid)), E'\n' order by t.typname) s
    from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype = 'e'),
tbls as (
  select string_agg(ddl, E'\n\n' order by nsp, relname) s from (
    select n.nspname nsp, c.relname,
           format(E'CREATE TABLE %I.%I (\n%s\n);', n.nspname, c.relname,
             string_agg(format('    %I %s%s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
               case when a.attidentity in ('a','d') then ' GENERATED ' || case a.attidentity when 'a' then 'ALWAYS' else 'BY DEFAULT' end || ' AS IDENTITY' else '' end,
               case when a.attgenerated = 's' then ' GENERATED ALWAYS AS (' || pg_get_expr(d.adbin, d.adrelid) || ') STORED'
                    when d.adbin is not null then ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
               case when a.attnotnull then ' NOT NULL' else '' end), E',\n' order by a.attnum)) ddl
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
     where n.nspname in ('public', 'archive') and c.relkind in ('r', 'p')
     group by n.nspname, c.relname) t),
fns as (
  select string_agg(pg_get_functiondef(p.oid) || ';', E'\n\n' order by p.proname, pg_get_function_identity_arguments(p.oid)) s
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
views as (
  with recursive v as (
    select c.oid, c.relname, c.relkind, c.reloptions from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')),
  deps as (
    select distinct v.oid view_oid, d.refobjid dep_oid
      from v join pg_rewrite r on r.ev_class = v.oid
      join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = r.oid
     where d.refobjid <> v.oid and d.refobjid in (select oid from v)),
  lvl as (
    select oid, 0 depth from v where oid not in (select view_oid from deps)
    union all
    select d.view_oid, l.depth + 1 from deps d join lvl l on l.oid = d.dep_oid)
  select string_agg(ddl, E'\n\n' order by depth, relname) s from (
    select v.relname, max(l.depth) depth,
           format(E'CREATE %s public.%I%s AS\n%s', case when v.relkind = 'm' then 'MATERIALIZED VIEW' else 'VIEW' end,
                  v.relname, coalesce(' WITH (' || array_to_string(v.reloptions, ', ') || ')', ''), pg_get_viewdef(v.oid)) ddl
      from v join lvl l on l.oid = v.oid
     group by v.relname, v.relkind, v.oid, v.reloptions) x),
cons as (
  select string_agg(format('ALTER TABLE ONLY %s ADD CONSTRAINT %I %s;', k.conrelid::regclass, k.conname, pg_get_constraintdef(k.oid)), E'\n'
           order by case k.contype when 'p' then 0 when 'u' then 1 when 'x' then 2 when 'c' then 3 else 4 end, k.conrelid::regclass::text, k.conname) s
    from pg_constraint k
   where k.connamespace in ('public'::regnamespace, 'archive'::regnamespace) and k.contype in ('p', 'u', 'c', 'x', 'f') and k.conrelid <> 0),
idx as (
  select string_agg(pg_get_indexdef(i.indexrelid) || ';', E'\n' order by ic.relname) s
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
   where ic.relnamespace in ('public'::regnamespace, 'archive'::regnamespace)
     and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid and k.contype in ('p', 'u', 'x'))),
trg as (
  select string_agg(pg_get_triggerdef(t.oid) || ';', E'\n' order by t.tgrelid::regclass::text, t.tgname) s
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal
     and (c.relnamespace = 'public'::regnamespace
          or exists (select 1 from pg_proc p where p.oid = t.tgfoid and p.pronamespace = 'public'::regnamespace))),
rls as (
  select string_agg(format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', n.nspname, c.relname)
           || case when c.relforcerowsecurity then format(E'\nALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', n.nspname, c.relname) else '' end,
           E'\n' order by n.nspname, c.relname) s
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'archive') and c.relkind in ('r', 'p') and c.relrowsecurity),
pol as (
  select string_agg(format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', p.policyname, p.schemaname, p.tablename,
           p.permissive, p.cmd, array_to_string(array(select quote_ident(r) from unnest(p.roles) r), ', '),
           coalesce(E'\n  USING (' || p.qual || ')', ''), coalesce(E'\n  WITH CHECK (' || p.with_check || ')', '')), E'\n\n'
           order by p.schemaname, p.tablename, p.policyname) s
    from pg_policies p where p.schemaname in ('public', 'storage', 'archive')),
fn_acl as (
  select string_agg(stmt, E'\n' order by sig, ord) s from (
    select p.oid::regprocedure::text sig, 0 ord,
           format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role;', p.oid::regprocedure) stmt
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    union all
    select p.oid::regprocedure::text, 1,
           format('GRANT EXECUTE ON FUNCTION %s TO %s;', p.oid::regprocedure,
                  case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end)
      from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p') and a.privilege_type = 'EXECUTE'
       and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))
       and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  ) x),
rel_acl as (
  select string_agg(stmt, E'\n' order by rel, ord, stmt) s from (
    select c.oid::regclass::text rel, 0 ord,
           format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated, service_role;', c.oid::regclass) stmt
      from pg_class c where c.relnamespace in ('public'::regnamespace, 'archive'::regnamespace) and c.relkind in ('r', 'p', 'v', 'm')
    union all
    select c.oid::regclass::text, 1,
           format('GRANT %s ON TABLE %s TO %s;', string_agg(a.privilege_type, ', ' order by a.privilege_type), c.oid::regclass,
                  case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end)
      from pg_class c cross join lateral aclexplode(c.relacl) a
     where c.relnamespace in ('public'::regnamespace, 'archive'::regnamespace) and c.relkind in ('r', 'p', 'v', 'm')
       and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))
     group by c.oid, a.grantee
  ) x),
buckets as (
  select string_agg(format('INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (%L, %L, %s, %s, %s) ON CONFLICT (id) DO NOTHING;',
           b.id, b.name, b.public, coalesce(b.file_size_limit::text, 'NULL'), coalesce(quote_literal(b.allowed_mime_types::text) || '::text[]', 'NULL')), E'\n' order by b.id) s
    from storage.buckets b),
pubs as (
  select string_agg(format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I;', schemaname, tablename), E'\n' order by schemaname, tablename) s
    from pg_publication_tables where pubname = 'supabase_realtime'),
crons as (
  select string_agg(format('SELECT cron.schedule(%L, %L, %L);', j.jobname, j.schedule, j.command)
           || case when not j.active then format(E'\nSELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = %L), active => false);', j.jobname) else '' end,
           E'\n\n' order by j.jobname) s
    from cron.job j)
select json_build_object(
  'extensions', (select s from ext), 'enums', (select s from enums), 'tables', (select s from tbls),
  'functions', (select s from fns), 'views', (select s from views), 'constraints', (select s from cons),
  'indexes', (select s from idx), 'triggers', (select s from trg), 'rls', (select s from rls),
  'policies', (select s from pol), 'function_grants', (select s from fn_acl), 'table_grants', (select s from rel_acl),
  'buckets', (select s from buckets), 'realtime', (select s from pubs), 'cron', (select s from crons)
) as snapshot;
