# P0/P2 Remediation Migration Review (adversarial)

Reviewed 2026-09-01 against live schema of project `dhbfaclkfysqwfppuxxa` (Postgres 17.6).
Latest applied migration in live DB: `20260901252000`. (Files `20260901260000_*` exist in-repo but are NOT yet applied.)

Files reviewed:

1. `20260902000100_fix_cross_tenant_read_leaks_learning_children.sql`
2. `20260902000100_tenant_scope_quiz_question_children.sql`
3. `20260902000300_course_generation_jobs_org_rls.sql`
4. `20260902000100_p2_tenancy_a1_audit_telemetry.sql`
5. `20260902000100_p2_tenancy_a2_user_owned_personal_tables.sql`

---

## GLOBAL BLOCKER — duplicate migration version (criterion 7)

Four of the five files share the identical version prefix **`20260902000100`** (files 1, 2, 4, 5).
Supabase derives the migration `version` (PK of `supabase_migrations.schema_migrations`) from the
leading digit run before the first `_`. Pushing these will attempt to insert version
`20260902000100` up to four times → duplicate-key abort, and the intra-batch apply order among
the four is only whatever lexical filename sort produces (`_fix…` < `_p2_tenancy_a1…` <
`_p2_tenancy_a2…` < `_tenant_scope…`), which is accidental, not designed.

**Required correction (all four):** renumber to unique, strictly increasing stamps, e.g.
`20260902000100` (file 1), `20260902000200` (file 2), `20260902000300` (file 3, already),
`20260902000400` (file 4), `20260902000500` (file 5). Ordering vs `20260901260000` is fine
(`20260902…` sorts after). A1 must precede A2 (it does under any of these numbers).

---

## FILE 1 — fix_cross_tenant_read_leaks_learning_children.sql

**VERDICT: PASS (content)** — blocked only by the shared version prefix above.

Checks:
- Idempotent: each `DROP POLICY IF EXISTS <name>` is followed by `CREATE POLICY <same name>` — re-runnable. OK.
- Transactional: wrapped in `BEGIN; … COMMIT;`. OK.
- Schema references verified live: `course_modules.course_id`, `lessons.course_module_id`,
  `lesson_blocks.lesson_id`, `learning_objectives.course_id`, `objective_links.objective_id`,
  `courses.{organization_id,is_master_template,is_deleted,status}` all exist.
- Helpers verified live: `org_visible(uuid)`, `is_platform_super_admin()`,
  `is_learning_editor(p_user uuid DEFAULT auth.uid())` — the no-arg call form used here resolves
  via the default. OK.
- All five policies are `FOR SELECT` → `USING` only, no `WITH CHECK` required. OK.
- Not a broadening. Live `pg_policy` confirms the current SELECT policies are exactly the
  un-scoped `EXISTS (SELECT 1 FROM courses c WHERE c.id = …)` bodies described in the header;
  the rewrite strictly ADDS `org_visible()` / `is_master_template` / `is_platform_super_admin()`
  predicates. Access narrows. OK.
- Sibling WRITE policies (`multitenant_*_write`, `learning_objectives_write`,
  `objective_links_write`) are untouched and already tenant-scoped. OK.

Nit (non-blocking): the `learning_objectives`/`objective_links` published-course branch keeps
`is_learning_editor()` as a global-editor bypass — matches the sibling write policy, acceptable.

---

## FILE 2 — tenant_scope_quiz_question_children.sql

**VERDICT: PASS (content)** — blocked only by the shared version prefix. Two behavioural
notes to confirm before deploy.

Checks:
- Idempotent: every `DROP POLICY IF EXISTS` targets the same name subsequently created;
  `ALTER TABLE … ENABLE ROW LEVEL SECURITY` is idempotent. OK.
- Transactional. OK.
- Schema verified live: `unified_questions.{id,organization_id,created_by,status}`,
  `unified_question_options.question_id`, `unified_question_versions.question_id`,
  `unified_question_usages.question_id`, `unified_question_attempts.{organization_id,user_id}`
  all exist.
- Helpers verified: `org_visible(uuid)`, `is_tenant_content_editor(p_org_id uuid)`,
  `is_platform_super_admin()`. OK.
- WITH CHECK coverage: `_options_insert` (WITH CHECK), `_options_update` (USING + WITH CHECK),
  `_options_delete` (USING), `_versions_insert` (WITH CHECK), `_usages_manage` FOR ALL
  (USING + WITH CHECK), `_attempts_insert` (WITH CHECK). Complete. OK.
- Not a broadening. Live policies confirm the current bodies are global-role based
  (`is_training_manager()`, `is_platform_admin()`, `is_content_author()`, bare
  `auth.uid() IS NOT NULL` on `unified_question_versions_insert`, or `status='published'`
  world-read). New bodies require same-org + `is_tenant_content_editor`. Access narrows. OK.

Notes to confirm (not failures):
- N1. The new SELECT policies on `_options` / `_versions` / `_usages` DROP the existing
  "`status = 'published'` ⇒ world-readable" path. Any cross-tenant shared/master question bank
  (a published question in org A surfaced to learners in org B) will stop returning option rows.
  Confirm no such cross-org published-bank pattern is in use; if it is, add an
  `is_master_template`-style bypass mirroring File 1.
- N2. `unified_question_attempts.organization_id` is NULLABLE with column default
  `'e0000000-0000-0000-0000-000000000001'` (verified live). The new INSERT `WITH CHECK`
  requires `org_visible(organization_id)`. A user whose active org is NOT the canonical org,
  inserting an attempt row that relies on the column default, will be rejected. Confirm the app
  always sets `organization_id` explicitly on attempt inserts.

---

## FILE 3 — course_generation_jobs_org_rls.sql

**VERDICT: PASS.** Unique version (`20260902000300`), ordered after `20260901260000`.

Checks:
- Idempotent: `CREATE OR REPLACE FUNCTION`; `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`;
  `DROP POLICY IF EXISTS <name>` + `CREATE POLICY <same name>` for all four policies;
  `ALTER TABLE … ENABLE ROW LEVEL SECURITY` idempotent. Fully re-runnable. OK.
- Transactional. OK.
- Schema verified: `course_generation_jobs.{organization_id,created_by}` exist; helper
  `current_user_organization_ids()` returns `uuid[]` (no-arg). OK.
- WITH CHECK coverage: SELECT (USING), INSERT (WITH CHECK), UPDATE (USING + WITH CHECK),
  DELETE (USING). Complete. OK.
- Not a broadening: live SELECT policy is `created_by = auth.uid() OR user_roles IN
  (super_admin,corporate_admin,regional_admin,property_manager,department_head)` with NO org
  filter; live INSERT is `created_by = auth.uid()` only; no UPDATE/DELETE policies exist.
  New policies replace the un-scoped legacy-role SELECT with `org_visible AND
  is_tenant_content_editor` and add tenant-scoped UPDATE/DELETE. Access narrows. OK.
- Trigger `course_generation_jobs_default_org()`: `BEFORE INSERT … FOR EACH ROW`, mutates
  `NEW` only, no recursion, `SECURITY DEFINER` + `SET search_path = public`. `auth.uid()` is
  schema-qualified so resolves under the restricted path. OK.
- No backfill / no NOT NULL added, so criterion 5 is N/A. OK.

Nits (non-blocking):
- `created_by = auth.uid()` is used un-wrapped in the SELECT/INSERT policies; repo convention
  (`20260627124514_rls_initplan_wrap_auth_uid`) is `(SELECT auth.uid())`. Wrap for initplan
  caching.
- A user with zero org memberships: trigger sets `organization_id := (…ids())[1]` → NULL →
  INSERT `WITH CHECK (created_by = auth.uid() AND org_visible(organization_id))` fails.
  Acceptable (such a user shouldn't be generating courses) but note the behavioural change.

---

## FILE 4 — p2_tenancy_a1_audit_telemetry.sql

**VERDICT: FAIL.**

### FAIL 4a — not idempotent (criterion 1)

The migration creates the following policies **without a preceding `DROP POLICY IF EXISTS`
for that exact name**:
- `system_events_select_tenant`
- `analytics_events_insert_own`, `analytics_events_select_tenant`
- `user_sessions_insert`, `user_sessions_select_tenant`, `user_sessions_manage_tenant`

(It only drops the *legacy* names: `system_events_select_consolidated`,
`hr_admin_view_analytics`, `auth_insert_own_events`, `user_sessions_admin_all`,
`user_sessions_select_own`. `ai_usage_log_*` and `search_logs_*` reuse their names and are
fine.) A second run aborts with `policy "…" for table "…" already exists`, and because the
whole file is one transaction the audit-table RLS is left half-migrated on the failed attempt.

**Required correction:** add `DROP POLICY IF EXISTS <name> ON public.<table>;` immediately
before every `CREATE POLICY` in the file (all six names above).

### FAIL 4b — duplicate version prefix

Shares `20260902000100` with files 1, 2, 5. See global blocker. Renumber (suggest
`20260902000400`, after A-nothing and before A2).

### Concerns to resolve (not independently blocking)

- C4a — `user_sessions` principal broadening. Live policy `user_sessions_admin_all` (FOR ALL,
  USING only) is limited to `app_role IN ('corporate_admin','regional_admin')`. The replacement
  `user_sessions_manage_tenant` (FOR ALL, USING + WITH CHECK — the added WITH CHECK is an
  improvement) grants revoke/update/delete of sessions to **any** `is_tenant_people_admin(org)`
  principal. If that helper resolves for tenant HR / people-admin roles that are NOT
  corporate/regional_admin, this widens who can terminate other users' sessions within a tenant.
  Confirm this is intended; if not, gate on `is_tenant_admin(org)` instead.
- C4b — visibility regression for actor-less rows. `system_events_select_tenant` and
  `analytics_events_select_tenant` both require `organization_id IS NOT NULL`. The backfill
  deliberately leaves system-origin / anonymous rows with `organization_id = NULL`, so those
  rows become readable **only** by `is_platform_super_admin()`. Previously
  `system_events_select_consolidated` (corporate/regional_admin/regional_hr) and
  `hr_admin_view_analytics` (`is_hr_or_admin`) could see them. Acceptable if intended; note the
  loss of tenant-admin visibility into anonymous analytics.
- C4c — `analytics_events_select_tenant` / `system_events_select_tenant` are the only SELECT
  policies after migration; both are permissive and include the own-row branch
  (`user_id`/`actor_id = auth.uid()`), so end users keep their own rows. OK, but see C4b for the
  admin side.

### Checks that PASS

- Columns verified live: `system_events.actor_id`, `analytics_events.user_id`,
  `ai_usage_log.{user_id,course_id}` (both `uuid`; `training_modules.id` is `uuid`),
  `search_logs.{user_id,department_id,property_id}`, `user_sessions.user_id`,
  `organization_memberships.{is_active,is_primary,created_at}`, `training_modules.organization_id`,
  `departments.organization_id`, `hotels.organization_id` all exist.
- Backfill vs NOT NULL (criterion 5): `ai_usage_log` and `search_logs` backfill via `COALESCE(…,
  'e0000000-0000-0000-0000-000000000001'::uuid)` — constant final arg ⇒ no NULL survivors; the
  canonical org row exists (verified live); FK is `… REFERENCES organizations(id) ON DELETE
  RESTRICT` and the target exists. `SET NOT NULL` is safe. `system_events` / `analytics_events`
  / `user_sessions` are left nullable. OK.
- FK creation guarded by `pg_constraint` lookup — idempotent. Columns `ADD COLUMN IF NOT EXISTS`,
  indexes `CREATE INDEX IF NOT EXISTS`. OK.
- Trigger `tg_audit_set_organization_id()`: `BEFORE INSERT … FOR EACH ROW`, mutates `NEW` only,
  no recursion; `SECURITY DEFINER` + `SET search_path = public, pg_temp`; `REVOKE ALL … FROM
  public, anon`. Table-name branch (`system_events` ⇒ `NEW.actor_id`, else `NEW.user_id`) is
  valid for all five tables. OK.
- All new INSERT policies carry `WITH CHECK`; the FOR ALL policy carries both USING and WITH
  CHECK; SELECT policies are USING-only (correct) (criterion 3). OK.
- Transactional. OK.

---

## FILE 5 — p2_tenancy_a2_user_owned_personal_tables.sql

**VERDICT: FAIL.**

### FAIL 5a — `push_subscriptions` Web-Push credential exposure (criterion 4 — broadening)

The loop adds a `<t>_people_admin_read` SELECT policy
(`organization_id = ANY(current_user_organization_ids()) AND is_tenant_people_admin(organization_id)`)
to 13 tables flagged `'1'`, **including `push_subscriptions`**. Live policy set for that table
today is own-row only (`push_subscriptions_select_own` etc.). `push_subscriptions.subscription`
(jsonb, verified live columns: `id,user_id,subscription,created_at,updated_at`) holds the full
Web Push endpoint + `p256dh` + `auth` keys — i.e. the capability to send push notifications as
the platform to that user's browser. Granting every tenant people-admin read access to all
members' rows hands them exfiltratable push-send credentials for the whole org. This is the same
class of secret the migration explicitly withholds from people-admins for `password_history` /
`mfa_secrets` (flagged `'0'`).

**Required correction:** move `push_subscriptions` to the `'0'` group (column + backfill + index
+ trigger + `service_role` policy, but NO people-admin read). If people-admin visibility of
"does this user have push enabled" is genuinely needed, expose it through a view that omits the
`subscription` payload.

### FAIL 5b — duplicate version prefix

Shares `20260902000100` with files 1, 2, 4. See global blocker. Renumber (suggest
`20260902000500`, strictly after the A1 file).

### Concerns to resolve (not independently blocking)

- C5a — quieter broadening on the other own-row tables. `notification_preferences`,
  `user_settings`, `user_dashboard_preferences` are own-row-only today (verified live); they gain
  a people-admin read. Low sensitivity (preferences/settings) and the header states people-admin
  read is intended, so acceptable — but it IS a loosening, list it in the change record.
  `notifications`, `scheduled_reminders`, `knowledge_required_reading`, `notification_batches`
  ("Authenticated can view all batches"), `user_achievements` ("view all achievements") already
  have equal-or-wider SELECT, so the new policy is redundant there.
- C5b — `document_acknowledgments` has no SELECT policy today (verified: only
  `doc_ack_update_own` + `document_acknowledgments_insert`). Adding
  `document_acknowledgments_select_own` (own-row) is a deliberate, safe broadening from
  "nothing" to "own row". OK — just noting it is technically new read access.
- C5c — `set_organization_id_from_member()` extracts the owning uid with
  `EXECUTE format('SELECT ($1).%I', v_col) INTO v_uid USING NEW`. Dynamic field access on the
  `NEW` record works for a registered table rowtype but is fragile and hard to read; a
  `CASE v_col WHEN 'created_by' THEN NEW.created_by ELSE NEW.user_id END` (the only two values
  used) or per-column trigger args would be safer. Smoke-test an INSERT on each of the 15 tables
  after applying.

### Checks that PASS

- Idempotent: `CREATE OR REPLACE FUNCTION`; per-table loop does `ADD COLUMN IF NOT EXISTS`,
  guarded FK (via `information_schema.table_constraints`), `CREATE INDEX IF NOT EXISTS`,
  `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`,
  and `DROP POLICY IF EXISTS <name>` **before** each `CREATE POLICY` (both
  `_service_role_all` and `_people_admin_read`). `document_acknowledgments_select_own` is
  dropped before create. Fully re-runnable. OK.
- Transactional. OK.
- All 15 tables + owning columns verified live (`notification_batches` owns via `created_by` —
  confirmed no `user_id` column — and the loop correctly passes `'created_by'`; the other 14 use
  `user_id`). All 15 already have RLS enabled with own-row (or wider) SELECT + own-row write, so
  enabling RLS is a no-op and existing user self-access is preserved (criterion: no functional
  lockout). OK.
- Backfill vs NOT NULL (criterion 5): `organization_id` is **never** made NOT NULL, and the
  backfill `COALESCE(…, 'e0000000-0000-0000-0000-000000000001'::uuid)` cannot produce NULL
  anyway. Safe.
- FK is `ON DELETE CASCADE` here (vs `RESTRICT` in File 4) — acceptable for user-owned personal
  rows, but inconsistent with File 4; pick one deliberately.
- `_people_admin_read` is SELECT → `USING` only (correct). `_service_role_all` is FOR ALL with
  USING + WITH CHECK (criterion 3). `document_acknowledgments_select_own` SELECT → USING only.
  OK.
- Helpers verified: `current_user_organization_ids()`, `is_tenant_people_admin(uuid)`. OK.
- `_service_role_all` policies are functionally inert (service_role bypasses RLS) — harmless
  noise, not a defect.

---

## SUMMARY

| File | Version unique? | Idempotent | Schema refs valid | USING/WITH CHECK complete | No accidental broadening | Backfill vs NOT NULL | Triggers sane | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 learning children | NO (dup) | yes | yes | yes | yes (narrows) | n/a | n/a | PASS content / blocked by version |
| 2 quiz children | NO (dup) | yes | yes | yes | yes (narrows) | n/a | n/a | PASS content / blocked by version; confirm N1,N2 |
| 3 course_generation_jobs | yes | yes | yes | yes | yes (narrows) | n/a | yes | PASS |
| 4 A1 audit/telemetry | NO (dup) | **NO** | yes | yes | see C4a/C4b | safe | yes | **FAIL** |
| 5 A2 personal tables | NO (dup) | yes | yes | yes | **NO — push_subscriptions** | safe | yes (fragile) | **FAIL** |

### Required before deploy
1. Renumber files 1, 2, 4, 5 to unique, strictly increasing versions (keep A1 < A2).
2. File 4: add `DROP POLICY IF EXISTS` for `system_events_select_tenant`,
   `analytics_events_insert_own`, `analytics_events_select_tenant`, `user_sessions_insert`,
   `user_sessions_select_tenant`, `user_sessions_manage_tenant`.
3. File 5: drop `push_subscriptions` from the people-admin-read (`'1'`) group → move to `'0'`.
4. File 4: confirm intended principal set for `user_sessions_manage_tenant`
   (`is_tenant_people_admin` vs `is_tenant_admin`) and accept/mitigate the anonymous-row
   visibility regression (C4b).
5. File 2: confirm no cross-tenant published question bank relies on the removed
   `status='published'` world-read path (N1); confirm app sets `unified_question_attempts.
   organization_id` explicitly (N2).
