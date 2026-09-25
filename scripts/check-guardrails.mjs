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
// GUARDRAIL 3: the generated database types must not be empty or truncated
//
// History: `npm run db:types` used to be `supabase gen types ... > file`. The
// shell truncates the target BEFORE the CLI runs, so any CLI failure (missing
// binary, invalid token, network blip) silently left a 0-byte types file. Two
// commits in this repo's history contain a 0-byte database.generated.ts, which
// quietly removes ALL database typing rather than failing loudly -- the exact
// safety net this project depends on. db:types is now atomic
// (scripts/gen-db-types.mjs), and this check stops a truncated file from ever
// being committed again.
// ---------------------------------------------------------------------------
const TYPES_FILE = join(SRC, 'types', 'database.generated.ts')
try {
  const types = readFileSync(TYPES_FILE, 'utf8')
  const tableCount = (types.match(/^      [a-z_]+: \{$/gm) || []).length

  if (types.length < 10000 || !types.includes('export type Database')) {
    failures.push(
      `src/types/database.generated.ts  Types file is empty or truncated (${types.length} bytes).\n` +
      `    This silently disables all Supabase type safety. Regenerate with\n` +
      `    "npm run db:types" (needs a valid sbp_... SUPABASE_ACCESS_TOKEN), or\n` +
      `    restore it: git checkout -- src/types/database.generated.ts`
    )
  } else if (tableCount < 150) {
    failures.push(
      `src/types/database.generated.ts  Only ${tableCount} tables found; expected 200+.\n` +
      `    The types file looks partially generated. Regenerate it rather than committing this.`
    )
  }
} catch {
  failures.push(
    `src/types/database.generated.ts  Missing. Supabase type safety depends on this file.`
  )
}

// ---------------------------------------------------------------------------
// GUARDRAIL 4: certificates are issued only by server command functions
//
// History (2026-09-25): any tenant author could INSERT/UPDATE `certificates`
// directly, so compliance evidence could be forged, while learner quiz and
// path certificates were silently rejected by RLS and the UI still reported
// "certificate earned". Direct writes are now revoked in the database; issue
// through createCertificate()/issueManualCertificate() (issue_* RPCs) instead.
// ---------------------------------------------------------------------------

const CERT_WRITE_RE = /from\(\s*['"]certificates['"]\s*\)\s*\.\s*(insert|update|upsert)\b/

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (TEST_PATH_RE.test(rel)) continue
  // Collapse whitespace so chained calls split across lines still match.
  const text = readFileSync(file, 'utf8')
  const flat = text.replace(/\s+/g, ' ')
  if (CERT_WRITE_RE.test(flat)) {
    failures.push(
      `${rel}  Writes to \`certificates\` directly.\n` +
      `    Certificates are issued only by the issue_* server functions — use\n` +
      `    createCertificate() or issueManualCertificate() from certificateService.`
    )
  }
}

// ---------------------------------------------------------------------------
// GUARDRAIL 4b: course lessons live in `lessons`, never in `documents`
//
// History (2026-09-25): lesson blocks were `documents` rows with
// content_type='training_block'. Sharing the knowledge table caused a
// cross-tenant leak and left 152 orphaned blocks. The database now rejects
// such rows (documents_no_lesson_blocks); this catches the code path early.
// ---------------------------------------------------------------------------

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (TEST_PATH_RE.test(rel) || rel === 'src/types/database.generated.ts') continue
  const text = readFileSync(file, 'utf8')
  if (/['"]training_block['"]/.test(text)) {
    failures.push(
      `${rel}  Uses content_type 'training_block'.\n` +
      `    Lesson blocks live in the \`lessons\` table; query .from('lessons') instead.`
    )
  }
}

// ---------------------------------------------------------------------------
// GUARDRAIL 5: pages and components do not talk to the database (ratchet)
//
// History (rebuild audit 2026-09-25): 85 page/component files queried Supabase
// directly, so the same business rule was re-implemented per screen and drifted
// (e.g. certificate issuance in three places, two of them silently failing).
// Data access belongs in services/hooks (target: features/<domain>/api).
// Existing offenders are frozen in scripts/guardrail-baselines/; the list may
// only shrink - a file that no longer imports the client must be removed too.
// ---------------------------------------------------------------------------

const UI_DIR_RE = /^src\/(pages|components)\//
const SUPABASE_IMPORT_RE = /from\s+['"]@\/lib\/supabase['"]/
const uiBaselinePath = join(ROOT, 'scripts', 'guardrail-baselines', 'ui-supabase-imports.json')
const uiBaseline = new Set(JSON.parse(readFileSync(uiBaselinePath, 'utf8')).files)
const uiOffenders = new Set()

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (!UI_DIR_RE.test(rel) || TEST_PATH_RE.test(rel)) continue
  if (SUPABASE_IMPORT_RE.test(readFileSync(file, 'utf8'))) uiOffenders.add(rel)
}

for (const rel of uiOffenders) {
  if (uiBaseline.has(rel)) continue
  failures.push(
    `${rel}  Imports the Supabase client in a page/component.\n` +
    `    Put the query in a service or hook (target: src/features/<domain>/api) and\n` +
    `    call that instead. See docs/engineering/ARCHITECTURE.md.`
  )
}

for (const rel of uiBaseline) {
  if (uiOffenders.has(rel)) continue
  failures.push(
    `${rel}  No longer imports the Supabase client (or was moved/deleted).\n` +
    `    Remove it from scripts/guardrail-baselines/ui-supabase-imports.json so the\n` +
    `    ratchet stays tight.`
  )
}

// ---------------------------------------------------------------------------
// GUARDRAIL 6: links use canonical workspace URLs
//
// History (UX assessment 2026-09-25): the same job was reachable at up to five
// URLs (/learn, /courses, /learning, /training, /training/hub), so navigation
// state, active highlighting and workspace identity disagreed from screen to
// screen, and the Studio landing sent authors back into Learn. Retired URLs
// now live only in src/routes/legacyRedirects.tsx; code must link to the
// canonical route (src/config/navigation.ts).
// ---------------------------------------------------------------------------

const LEGACY_URL_RE = new RegExp(
  String.raw`['"\x60]/(` +
  [
    String.raw`training(/|['"\x60?#])`,
    String.raw`learning(/|['"\x60?#])`,
    String.raw`courses(/|['"\x60?#])`,
    String.raw`assessments(/|['"\x60?#])`,
    String.raw`questions(/|['"\x60?#])`,
    String.raw`home/learner`,
    String.raw`reports['"\x60?#]`,
    String.raw`media['"\x60?#]`,
    String.raw`knowledge/(create|review|search|browse|wiki)`,
    String.raw`manage/review`,
    String.raw`admin/(analytics|certificates|report-builder)`,
    String.raw`dashboard/`,
    String.raw`studio/(builder|assessments)`,
  ].join('|') +
  ')'
)
const LEGACY_URL_ALLOW = new Set(['src/routes/legacyRedirects.tsx'])

for (const file of sourceFiles) {
  const rel = relative(ROOT, file).split(sep).join('/')
  if (LEGACY_URL_ALLOW.has(rel) || TEST_PATH_RE.test(rel) || rel.startsWith('src/integrations/')) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((text, i) => {
    if (/^\s*(\*|\/\/)/.test(text)) return
    if (LEGACY_URL_RE.test(text) && !hasOptOut(lines, i + 1)) {
      failures.push(
        `${rel}:${i + 1}  Links to a retired URL.\n` +
        `    Use the canonical workspace route from src/config/navigation.ts\n` +
        `    (old URLs are redirects only, in src/routes/legacyRedirects.tsx).`
      )
    }
  })
}

// ---------------------------------------------------------------------------
// GUARDRAIL 7: product vocabulary in English copy (ratchet)
//
// History (UX assessment 2026-09-25): "course", "module", "training",
// "assessment" and "exam" were used interchangeably for the same things, and
// "property"/"hotel", "tenant"/"organization" likewise. The official terms are
// in docs/product/PRODUCT_DEFINITION.md#vocabulary. The count of retired terms
// in en/*.json may only go down.
// ---------------------------------------------------------------------------

const VOCAB_RETIRED = [
  /\bmodules?\b/i, /\bexams?\b/i, /\benrol+ments?\b/i, /\bwiki\b/i,
  /\bpropert(y|ies)\b/i, /\bsuper ?admins?\b/i, /\bassessments?\b/i, /\btenants?\b/i,
]
const vocabBaselinePath = join(ROOT, 'scripts', 'guardrail-baselines', 'vocabulary.json')
const vocabBaseline = JSON.parse(readFileSync(vocabBaselinePath, 'utf8')).counts
const enDir = join(SRC, 'i18n', 'locales', 'en')
const countRetired = (value) => {
  if (typeof value === 'string') return VOCAB_RETIRED.some((re) => re.test(value)) ? 1 : 0
  if (value && typeof value === 'object') return Object.values(value).reduce((n, v) => n + countRetired(v), 0)
  return 0
}
for (const name of readdirSync(enDir).filter((f) => f.endsWith('.json'))) {
  const count = countRetired(JSON.parse(readFileSync(join(enDir, name), 'utf8')))
  const allowed = vocabBaseline[name] ?? 0
  if (count > allowed) {
    failures.push(
      `src/i18n/locales/en/${name}  ${count} strings use retired product terms (baseline ${allowed}).\n` +
      `    Use Course / Lesson / Quiz / Assignment / Certificate / Article / Organization / Hotel\n` +
      `    (docs/product/PRODUCT_DEFINITION.md#vocabulary).`
    )
  } else if (count < allowed) {
    failures.push(
      `src/i18n/locales/en/${name}  Now has ${count} retired-term strings (baseline ${allowed}).\n` +
      `    Lower the count in scripts/guardrail-baselines/vocabulary.json so the ratchet stays tight.`
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

console.log('✔ Guardrails passed (no fake-data constants, no unknown storage buckets, types file intact, no direct certificate writes, no new UI database access, canonical URLs only, vocabulary ratchet).')
