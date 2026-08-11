#!/usr/bin/env node
/**
 * Regression guardrails.
 *
 * Each check here encodes a bug class that has ALREADY shipped to production in
 * this repo more than once. The point is not style -- it is to make a specific,
 * previously-recurring defect impossible to reintroduce silently.
 *
 * These are hard failures (exit 1). Anything advisory belongs in ESLint as a
 * warning instead -- this file is only for "this has bitten us repeatedly".
 *
 * Run: npm run check:guardrails
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

/** Files that are legitimately allowed to contain test doubles. */
const TEST_PATH_RE = /(\btest\b|\b__tests__\b|\.test\.|\.spec\.|\bmocks?\b|\bfactories\b)/i

/**
 * Opt-out marker. Put `// guardrail-ok: <reason>` on the line above a flagged
 * line to accept it. Deliberately requires a written reason -- these checks are
 * meant to force a conscious decision, not to be silently suppressed.
 */
const OPT_OUT_RE = /\/\/\s*guardrail-ok:/

const failures = []

/** True if the line above `line` (1-indexed) carries an opt-out marker. */
function hasOptOut(lines, line) {
  const prev = lines[line - 2]
  return typeof prev === 'string' && OPT_OUT_RE.test(prev)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      walk(full, files)
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
      files.push(full)
    }
  }
  return files
}

const sourceFiles = walk(SRC)

// ---------------------------------------------------------------------------
// GUARDRAIL 1: no fake/demo/sample data in shipped UI
//
// History: the public certificate-verification page shipped clickable "sample
// codes" that always failed verification; the training-assignment wizard
// shipped SAMPLE_CONTENT_PACKAGES as pre-selected real-looking options backed
// by UUIDs that exist in no table, letting an admin submit a permanently broken
// assignment. Both looked like working features to a reviewer.
// ---------------------------------------------------------------------------
const FAKE_DATA_RE = /\b(?:const|let|var)\s+((?:SAMPLE|MOCK|DEMO|FAKE|DUMMY)_[A-Z0-9_]+)\s*=/g

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (TEST_PATH_RE.test(rel)) continue

  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  for (const match of src.matchAll(FAKE_DATA_RE)) {
    const line = src.slice(0, match.index).split('\n').length
    if (hasOptOut(lines, line)) continue
    failures.push(
      `${rel}:${line}  Fake-data constant "${match[1]}" in shipped code.\n` +
      `    Hardcoded sample/mock/demo data has repeatedly reached production here and\n` +
      `    read as a working feature. Load real data, or render an honest empty state.\n` +
      `    If this is genuinely test-only, move it under a test/mocks/factories path,\n` +
      `    or add "// guardrail-ok: <reason>" on the line above if it is not fake data.`
    )
  }
}

// ---------------------------------------------------------------------------
// GUARDRAIL 2: storage bucket names must be real
//
// History: announcement attachment uploads targeted a bucket named
// "attachments" that has never existed in this project, so every upload failed
// at runtime. A typo'd bucket name is invisible to the type system because
// .from() takes a plain string.
//
// Keep in sync with: select id from storage.buckets;
// ---------------------------------------------------------------------------
const KNOWN_BUCKETS = new Set([
  'announcement-attachments',
  'avatars',
  'content-media',
  'documents',
  'employee-documents',
  'expense-receipts',
  'maintenance-attachments',
  'media',
  'payslips',
  'referral-cvs',
  'reports-exports',
  'requests',
  'resumes',
  'sop-attachments',
  'task-attachments',
  'training-content',
])

const STORAGE_FROM_RE = /storage\s*\n?\s*\.from\(\s*['"]([^'"]+)['"]\s*\)/g

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (TEST_PATH_RE.test(rel)) continue

  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  for (const match of src.matchAll(STORAGE_FROM_RE)) {
    const bucket = match[1]
    if (KNOWN_BUCKETS.has(bucket)) continue
    const line = src.slice(0, match.index).split('\n').length
    if (hasOptOut(lines, line)) continue
    failures.push(
      `${rel}:${line}  Unknown storage bucket "${bucket}".\n` +
      `    No such bucket exists in this Supabase project, so every upload/download\n` +
      `    against it fails at runtime. Known buckets: ${[...KNOWN_BUCKETS].join(', ')}.\n` +
      `    If you genuinely added a new bucket, add it to KNOWN_BUCKETS in this script.`
    )
  }
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n✖ ${failures.length} guardrail violation(s):\n`)
  for (const f of failures) console.error('  ' + f + '\n')
  console.error(
    'These checks exist because each of these bug classes has already shipped to\n' +
    'production in this repo. See scripts/check-guardrails.mjs for the history.\n'
  )
  process.exit(1)
}

console.log('✔ Guardrails passed (no fake-data constants, no unknown storage buckets).')
