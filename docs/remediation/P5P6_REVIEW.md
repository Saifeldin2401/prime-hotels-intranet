# P5 / P6 tenancy child-table migrations — adversarial review

Scope: `20260902020100` … `20260902020600`, reviewed against LIVE schema of
project `dhbfaclkfysqwfppuxxa` (no `2026090202*` rows in `supabase_migrations.schema_migrations`).

## Live-state facts established
- Every table / column / FK column / helper function / enum referenced by the six files
  **exists** in live (verified: 78 tables, all FK cols, `org_visible`, `is_tenant_admin`,
  `is_tenant_people_admin`, `is_tenant_content_editor`, `is_platform_super_admin`,
  `is_hr_or_admin`, `has_property_access`, `has_role`, `is_content_manager`,
  `is_content_author`, `is_training_manager`, `is_platform_admin`,
  `can_view_report_definition`; `app_role`, `document_status`).
- **Groups 3/4/5 are already live**: the target `organization_id` columns are present and
  `NOT NULL`, and `pg_policy` already contains the exact "new" policy sets from
  `020300`/`020400`/`020500`. Re-applying those three files is a near-no-op (idempotency
  caveats below).
- **Groups 1/2/6 are NOT applied** (no `organization_id` column yet on any of their
  child tables).
- Row counts for every child table touched by 1/2/6: **0**, except
  `document_comments` = **1** (backfills from `documents`, else `COALESCE`→LIT → `SET NOT NULL` safe).
  `document_acknowledgments` / `knowledge_required_reading`: 0 rows, 0 NULL org → `SET NOT NULL` safe.

---

## 20260902020100_p5_announcement_children — FAIL (low severity)

- Column/FK/backfill/index/NOT NULL: **PASS**. All 5 child tables have `announcement_id`;
  `announcement_comments`/`announcement_reads` have `user_id`. Parent `announcements`
  has `expires_at`. All 0 rows → `SET NOT NULL` safe.
- Trigger `set_announcement_child_org`: BEFORE INSERT, reads parent only, non-recursive,
  `SECURITY DEFINER` + `SET search_path = public`, `REVOKE`/`GRANT` hardened. **PASS**.
- Idempotency: every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS` **of the same
  name** (lines 264–273 etc.). **PASS**.
- RLS narrowing: attachments / targets / comments / reads all add `org_visible()` and swap
  `has_role('regional_admin')` / `is_hr_or_admin` → `is_tenant_people_admin`; `UPDATE`
  on `announcement_comments` gains the `WITH CHECK` it lacked live. Good.

**FAIL — access broadened vs live (golden rule a):**
`announcement_acknowledgments` has exactly one live SELECT policy — `hr_admin_view_acks`
(`is_hr_or_admin(auth.uid())`). The new `aack_own_select` adds
`org_visible(organization_id) AND user_id = auth.uid()`, i.e. a non-admin can now read
their own acknowledgment rows — a read path that does not exist today. The file header's
claim "No access is broadened vs the current live policies" is therefore inaccurate.

**Fix:** drop the `aack_own_select` policy (leave only `aack_admin_select` +
`aack_service_all` + the own write policies), **or** explicitly document the acknowledged
broadening and update the header.

Minor: the new policies also add an `is_platform_super_admin()` OR-branch on
`aack_own_select` / `aatt_select` / `aread_select` / `atgt_select` — a small deliberate
broadening for platform operators, consistent with the rest of the sweep (see cross-cutting).

---

## 20260902020200_p5_documents_children — FAIL

- Column/FK/backfill/index/NOT NULL: **PASS**. `related_articles` correctly keyed on
  `source_document_id` (not `document_id`); `document_department_access` backfill also
  falls back to `departments.organization_id` then LIT. `document_comments` (1 row) safe.
  `document_acknowledgments` / `knowledge_required_reading` index+NOT NULL only — safe.
- Trigger `set_documents_child_org` (dynamic `TG_ARGV[0]` FK column): non-recursive,
  DEFINER + pinned search_path + REVOKE/GRANT. **PASS**.

**FAIL — not idempotent (contradicts header "Idempotent"):** the following `CREATE POLICY`
statements have **no preceding `DROP POLICY IF EXISTS` of their own name** (they only drop
the legacy name), so a second apply (CI retry, partial failure re-run) aborts with
"policy already exists":
- `document_feedback_admin_read` (only drops `hr_admin_view_feedback`)
- `related_articles_sel`, `related_articles_insert`, `related_articles_update`,
  `related_articles_delete` (only drop `auth_view_related_articles` /
  `hr_admin_manage_related_articles_*`)
- `sop_comments_sel` (only drops `auth_view_sop_comments`)

**Fix:** add `DROP POLICY IF EXISTS <new_name> ON <table>;` before each of the six
`CREATE POLICY` calls above (or keep the original policy names).

Narrowing / no-broadening: **PASS overall**, with functional-change notes (all are
narrowings, allowed):
- `document_department_access`: dropping the three `"Manage department access (*)"`
  policies removes the `documents.created_by = auth.uid()` write path for document authors
  who are not `is_tenant_content_editor`. Narrowing — safe, but a real capability loss.
- `document_tag_assignments` / `document_comments_resolve` / `document_versions`: the
  `property_manager + has_property_access` and `regional_hr` branches are dropped.
  Narrowing.
- Role-semantics note: `is_hr_or_admin` → `is_tenant_content_editor` on `document_feedback`,
  `related_articles`, `sop_comments` admin branches. If a tenant has content editors who
  are not HR/admin, their read/manage access on those three tables widens slightly. Matches
  the sweep contract for `document_*`; flag for owner sign-off, not a hard FAIL.
- `is_platform_super_admin()` OR-branch added to `document_comments_delete` /
  `document_feedback_admin_read` / `document_tag_assignments_select` /
  `document_versions_select` / `related_articles_sel` / `sop_comments_sel` — small
  deliberate operator broadening (cross-cutting).
- `document_bookmarks` / `document_favorites` ALL policies keep their pre-existing
  missing-`WITH CHECK` (USING is reused for INSERT by Postgres, so functionally OK); the
  file leaves them as-is by design.

---

## 20260902020300_p5_training_children — PASS (already live; matches)

- All target columns present + `NOT NULL` in live; policy sets identical to the file.
- FK columns verified: `training_module_id`, `module_id`, `path_id`/`module_id`,
  `course_id`, `training_progress_id`, `session_id`, `quiz_id`, etc. all exist.
  `source_change_flags` backfill also falls back through `documents` then LIT.
- Triggers non-recursive, DEFINER + pinned search_path + REVOKE/GRANT.
- Narrowing: every rewritten policy adds `org_visible()`; `true` / `auth.uid() IS NOT NULL`
  SELECTs replaced with `org_visible()`.

Notes (already in prod, not blocking):
- `module_skills_select` is `CREATE`d after dropping only `"Everyone can view module skills"`
  — no self-`DROP` → the file is not re-runnable for this one statement.
- `training_module_versions_write` is a **newly introduced** `FOR ALL` write policy. If RLS
  was already enabled on `training_module_versions` with only a SELECT policy before the
  original apply, this widened write access from "nobody (except service_role)" to
  "tenant content editors / module authors / super_admin". It is live now; call out for
  the record.

---

## 20260902020400_p5_quiz_assessment_children — PASS (already live; matches)

- `unified_question_*`, `unified_quiz_questions`, `assessment_questions`,
  `practical_submissions`, `competency_levels`, `certificate_history` all have
  `organization_id NOT NULL` in live; parents (`unified_questions`, `learning_quizzes`,
  `assessments`, `practical_assessments`, `competencies`, `certificates`) all expose
  `organization_id`.
- `certificate_history` lockdown: live policies are exactly
  `certificate_history_select_scoped` / `certificate_history_insert_same_org` /
  `certificate_history_service_role_all` as written. `certificate_id` + `performed_by`
  columns exist. Deliberate omission of an `is_platform_super_admin()` bypass matches the
  sibling `certificates` policy shape. **PASS**.
- File is idempotent for `certificate_history` (drops the new names too). The 7 "col only"
  tables: column+FK+index+NOT NULL+trigger only, policies untouched — consistent with
  "RLS already gates org via parent EXISTS".

---

## 20260902020500_p5_dept_media_misc_children — PASS (already live; matches)

- `categories`, `document_categories`, `document_folders`, `events`, `report_definitions`,
  `media_asset_usages`, `media_collection_items`, `webhook_deliveries` all have
  `organization_id NOT NULL` in live; policy sets identical to the file (all drop-then-
  create use the same names → idempotent).
- FK columns (`department_id`, `media_asset_id`, `collection_id`, `endpoint_id`) exist.
  Backfills fall back to LIT.
- `events` / `categories` / `document_categories` / `report_definitions` writes gated by
  `org_visible()`; SELECT `true`/`auth.uid() IS NOT NULL` replaced with `org_visible()`.
- `document_folders_delete` intentionally retains `has_role('regional_admin' /
  'property_manager')` legacy branches (added `org_visible()` + `is_system=false` +
  `is_platform_super_admin()`), acknowledged in the file. Narrowing vs any prior form.
- `media_*` + `webhook_deliveries.whd_sel` policies left untouched per phase rules. **PASS**.

---

## 20260902020600_p6_deep_children — PASS conditionally (ordering hazard)

- 10 tables, all **0 rows** in live → `SET NOT NULL` immediately safe.
- FK columns verified: `course_id` (nullable on `learning_objectives`/`learning_events`),
  `objective_id`, `course_module_id`, `lesson_id`, `enrollment_id`, `report_id`,
  `comment_id`, `folder_id`, `user_id`, `triggered_by`. Parents `enrollments`,
  `report_definitions` (NOT NULL), `scheduled_compliance_reports` (NOT NULL) all expose
  `organization_id` **now**.
- Trigger fns `p6_set_org_*`: BEFORE INSERT, parent-only reads, non-recursive, DEFINER +
  `SET search_path = public`. Multi-hop chains (`lessons`→`course_modules`→`courses`,
  `lesson_blocks`→`lessons`→…) are correct.
- RLS (`report_runs`, `scheduled_report_executions`, `sop_comment_votes`,
  `document_notification_rules`): every touched policy **adds** `organization_id IS NOT NULL
  AND org_visible(organization_id)` (strict narrowing); `scheduled_report_executions` and
  `sop_comment_votes` `FOR ALL` policies **gain the `WITH CHECK`** they lacked live
  (golden rule c fixed); no `WITH CHECK (true)` for authenticated. Every `CREATE POLICY`
  is preceded by `DROP POLICY IF EXISTS` of the same name → idempotent. **PASS**.

**FAIL if run out of order (ordering hard-dependency):** the `sop_comment_votes` backfill
(`SELECT sc.organization_id FROM public.sop_comments sc …`) and
`p6_set_org_from_sop_comment()` reference `sop_comments.organization_id`, which **does not
exist in live yet** — it is added by `020200`. Applying `020600` before `020200` aborts
with `column sc.organization_id does not exist` (the file's "COALESCE to LIT" guard covers
missing *data*, not a missing *column*). Filename order (`020200` < `020600`) makes a
normal `db push` safe, but `020600` **cannot be applied standalone** against the current
live DB. `report_runs` / `scheduled_report_executions` / `document_notification_rules`
parents are already present, so only the `020200` dependency matters.

Minor: `p6_set_org_*` functions omit the `REVOKE EXECUTE … FROM public, anon` /
`GRANT … TO authenticated, service_role` hardening that groups 1–5 apply to their trigger
fns. Low risk (trigger-only helpers), but inconsistent — recommend adding for parity.

---

## Cross-cutting risks

1. **Operator broadening.** Groups 1/2 add `is_platform_super_admin()` OR-branches and
   `service_role FOR ALL (USING true / WITH CHECK true)` policies to tables that have
   neither today. `service_role` already bypasses RLS (no-op). The `is_platform_super_admin()`
   branch is a genuine, if intentional, broadening vs the current live policies on the
   group 1/2 tables — the same pattern already shipped to prod in groups 3/4/5. Get
   explicit owner sign-off that platform super-admins are meant to read/write these
   child tables cross-tenant.
2. **Role remapping.** `is_hr_or_admin` → `is_tenant_content_editor` (documents children)
   and → `is_tenant_people_admin` (announcements children) changes *which* users are
   admins on these tables, not just the tenant scope. Confirm the tenant-role membership
   is a superset/subset as intended per table.
3. **`020200` idempotency** must be fixed before merge — retriable migrations are assumed
   by the deploy pipeline.
