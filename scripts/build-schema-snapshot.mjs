// Writes supabase/schema/production_schema.sql from the JSON produced by
// scripts/generate-schema-snapshot.sql.
// Usage: node scripts/build-schema-snapshot.mjs snapshot.json
import { readFileSync, writeFileSync } from 'node:fs'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/build-schema-snapshot.mjs <snapshot.json>')
  process.exit(1)
}

// Accept either the bare object or psql's single-cell output / a [{ snapshot }] row.
let parsed = JSON.parse(readFileSync(input, 'utf8'))
if (Array.isArray(parsed)) parsed = parsed[0]
const snap = parsed.snapshot ?? parsed

const constraints = (snap.constraints ?? '').split('\n')
const keys = constraints.filter((c) => !c.includes(' FOREIGN KEY ') && !c.includes(' CHECK '))
const checks = constraints.filter((c) => c.includes(' CHECK ') && !c.includes(' FOREIGN KEY '))
const foreignKeys = constraints.filter((c) => c.includes(' FOREIGN KEY '))

const rule = '='.repeat(74)
const section = (title, body) => {
  const text = (body ?? '').trim()
  return text ? `\n-- ${rule}\n-- ${title}\n-- ${rule}\n\n${text}\n` : ''
}

const header = `-- Production schema snapshot of the learning platform (Supabase project dhbfaclkfysqwfppuxxa).
--
-- Generated ${new Date().toISOString().slice(0, 10)} from the live system catalog (pg_get_*def), so it reflects
-- what production actually runs rather than the partial migration history. Use it to
-- build a fresh staging / DR database on an EMPTY Supabase project (auth, storage,
-- realtime, vault, pg_cron and pg_net are provided by the platform):
--
--   psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema/production_schema.sql
--
-- Not included: table data (reference/config rows), Vault secrets, Edge Function
-- secrets, auth configuration. Cron job commands embed this project's URL - repoint
-- them for another project. Regenerate with scripts/generate-schema-snapshot.sql.

SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC;
`

const out = [
  header,
  section('Extensions', snap.extensions),
  section('Enum types', snap.enums),
  section('Tables', snap.tables),
  section('Primary keys, unique and exclusion constraints', keys.join('\n')),
  section('Functions', snap.functions),
  section('Views (dependency order)', snap.views),
  section('Check constraints', checks.join('\n')),
  section('Foreign keys', foreignKeys.join('\n')),
  section('Indexes', snap.indexes),
  section('Triggers', snap.triggers),
  section('Row level security', snap.rls),
  section('Policies', snap.policies),
  section('Function privileges', snap.function_grants),
  section('Table privileges', snap.table_grants),
  section('Storage buckets', snap.buckets),
  section('Realtime publication', snap.realtime),
  section('Scheduled jobs (pg_cron)', snap.cron),
].join('')

writeFileSync('supabase/schema/production_schema.sql', out)
console.log(`Wrote supabase/schema/production_schema.sql (${out.length} chars)`)
