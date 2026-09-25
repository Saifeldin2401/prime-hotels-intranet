// Regenerates the Supabase database types from the live project.
// Usage: npm run db:types   (requires `supabase login` or SUPABASE_ACCESS_TOKEN)
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { relaxTriggerFilledOrg } from './relax-trigger-filled-org.mjs'

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'dhbfaclkfysqwfppuxxa'
const OUTPUTS = ['src/types/database.generated.ts']

const raw = execFileSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_ID, '--schema', 'public'],
  { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 },
)

if (!raw.startsWith('export type Json')) {
  console.error('Unexpected output from `supabase gen types`:\n' + raw.slice(0, 500))
  process.exit(1)
}

// organization_id is filled by BEFORE INSERT triggers on many tables; see the helper.
const { types } = relaxTriggerFilledOrg(raw)

for (const file of OUTPUTS) writeFileSync(file, types.endsWith('\n') ? types : types + '\n')
console.log(`Wrote ${types.split('\n').length} lines to ${OUTPUTS.join(', ')}`)
