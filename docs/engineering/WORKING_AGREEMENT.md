# Working agreement

Adopted 2026-09-25 as Phase 0 of the rebuild. The rebuild audit found that
most defects in this repo came from process, not code: five overlapping
audit passes in 30 days, several AI sessions writing to `master` at the same
time and sweeping each other's edits into commits, and every verification run
against production because no other database existed. These rules exist to
stop that.

## 1. One writer per branch

- Every change happens on its own branch (`fix/…`, `feat/…`, `chore/…`) and
  reaches `master` through a pull request. Nobody commits to `master` directly.
- Only one person or agent session works on a branch at a time. Parallel work
  goes on separate branches in separate git worktrees.
- Never `git add -A` in a checkout another session might be editing. Stage
  the files you changed.
- Never `git stash` or switch branches while a dev server or another session
  is using the checkout.
- Remove a worktree when its branch is merged.

## 2. Database changes

- Environments: **local → staging → production**. Staging is a Supabase
  branch of the production project.
- A migration is written as a file in `supabase/migrations/`, reviewed in a
  PR, applied to **staging first**, verified with the SQL suites, and only then
  applied to production.
- Files are named with the version the database records
  (`supabase_migrations.schema_migrations`), so the folder mirrors the live
  history 1:1. `npm run check:migrations` parses every file in CI.
- Every security or business-rule change ships with a regression suite in
  `supabase/tests/` (self-contained, impersonates users, rolls back). CI runs
  all suites against staging when `STAGING_DB_URL` is set.
- Production is never used for experiments. Read-only inspection is fine;
  anything else goes through a migration.

## 3. Business rules live on the server

- Writes that carry a rule (issuing a certificate, completing a course,
  grading, assigning) go through a named database command function
  (`issue_*`, `submit_*`, `complete_*`, `assign_*`). The browser never writes
  those tables directly.
- Rule violations raise with a stable code in `HINT` (e.g. `CERT_SELF_ISSUE`)
  so the UI can show a specific, human message.
- The UI never reports success it did not receive from the server.
- `npm run check:guardrails` fails the build on bug classes that have already
  shipped here more than once (fake data, unknown buckets, truncated types,
  direct certificate writes). Add a guardrail whenever a bug class repeats.

## 4. Definition of done for a PR

- `npm run verify` passes (lint, guardrails, typecheck, tests).
- `npm run check:migrations` and `npm run build` pass.
- Database changes: applied to staging, SQL suites pass there, advisors show
  no new ERROR.
- The PR description says what was verified and how, including anything that
  was not verified.
