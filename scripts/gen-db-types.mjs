#!/usr/bin/env node
/**
 * Regenerates src/types/database.generated.ts from the live Supabase schema.
 *
 * Why this exists instead of a plain `supabase gen types ... > file` npm script:
 * the shell truncates the target file BEFORE the CLI runs, so any CLI failure
 * (missing binary, expired/!invalid token, network blip) leaves a 0-byte types
 * file behind. That has already happened at least twice in this repo's history
 * -- two commits contain a 0-byte database.generated.ts, which silently removes
 * all database typing rather than failing loudly.
 *
 * This writes to a temp file and only moves it into place after verifying the
 * output actually looks like generated types.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'

const PROJECT_ID = 'dhbfaclkfysqwfppuxxa'
const TARGET = 'src/types/database.generated.ts'
const TMP = `${TARGET}.tmp`

try {
  const out = execFileSync(
    'npx',
    ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_ID, '--schema', 'public'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' }
  )

  // Sanity-check before overwriting a known-good file.
  if (!out.includes('export type Database') || out.length < 10000) {
    throw new Error(
      `Generated output does not look like a valid schema (${out.length} bytes). Refusing to overwrite ${TARGET}.`
    )
  }

  writeFileSync(TMP, out, 'utf8')
  writeFileSync(TARGET, readFileSync(TMP, 'utf8'), 'utf8')
  unlinkSync(TMP)
  console.log(`✔ Regenerated ${TARGET} (${out.length} bytes)`)
} catch (err) {
  if (existsSync(TMP)) unlinkSync(TMP)
  console.error('✖ Type generation failed. The existing types file was left untouched.\n')
  console.error(err.message?.split('\n').slice(0, 5).join('\n') ?? err)
  console.error(
    '\nCommon causes:\n' +
    '  - SUPABASE_ACCESS_TOKEN missing or not in sbp_... format\n' +
    '  - supabase CLI binary unavailable for this platform\n'
  )
  process.exit(1)
}
