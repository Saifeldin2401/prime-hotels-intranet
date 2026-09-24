# Database schema

`production_schema.sql` is a snapshot of the live `public` schema (plus storage
policies, buckets, realtime publication and cron jobs), generated from the
system catalog. It is the source to build a **new** environment (staging, DR,
local) — the migration history alone cannot do that, because production recorded
several migrations without their SQL.

```bash
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema/production_schema.sql
```

Apply it to an empty Supabase project. It does not contain table data, Vault or
Edge Function secrets, or auth settings, and its cron jobs call this project's URL.

## Regenerating

After schema changes land in production:

```bash
psql "$SUPABASE_DB_URL" -At -f scripts/generate-schema-snapshot.sql > snapshot.json
node scripts/build-schema-snapshot.mjs snapshot.json
npm run check:migrations   # parses every SQL file with libpg_query
```

## Migrations

`supabase/migrations/` mirrors production's `supabase_migrations.schema_migrations`
one-to-one (same versions, the SQL production recorded), so `supabase db push`
has nothing pending. Entries production recorded without SQL are marked
`SELECT 1;` placeholders; their effect is in the snapshot. Earlier repository
drafts are in `migrations/archive/pre-alignment-2026-09-24/`.

When adding a migration through the Supabase MCP / dashboard, the platform assigns
the version: name the repository file with the version it was recorded under.
