# Supabase Migration Drift — Investigation & Remediation Plan

Date: 2026-09-01
Project ref (live): `dhbfaclkfysqwfppuxxa`
Investigated with: `mcp list_migrations`, `supabase_migrations.schema_migrations` inspection, on-disk `supabase/migrations/` review.

> Nothing was renamed or applied by this investigation. All commands below are proposals for a human to run.

---

## 1. Current DB migration history — tail

The last applied rows in `supabase_migrations.schema_migrations` (chronological):

| version | name | stored `statements` |
|---|---|---|
| 20260831200206 | phase4_harden_new_hire_automation_and_assignment_rls | present (8426 chars) |
| 20260831201346 | phase70_72_data_retention_and_scheduled_jobs | present (7972 chars) |
| … | … | … |
| 20260901245000 | disable_legacy_platform_fallback | present |
| 20260901249000 | phase48_49_integration_and_event_architecture | present (8810 chars) |
| **20260901250000** | **production_remediation_and_security_lockdown** | **NULL (no SQL stored)** |
| **20260901251000** | **multitenant_email_and_branding** | present (4555 chars) |
| **20260901252000** | **dynamicize_stored_notification_templates** | **stale: only the comment `-- dynamicize stored notification templates` (43 chars)** |

`20260901252000` is the newest row in DB history. There is **no** `20260901260000` row.

### Per-file reality check (DB objects actually inspected)

| Disk file | History row | Objects in DB? | Verdict |
|---|---|---|---|
| `20260901250000_production_remediation_and_security_lockdown.sql` | yes (statements NULL) | YES — `secure_search_users`/`secure_search_tasks` carry the tenant boundary, `can_manage_employee_document` hardened, `match_knowledge_chunks(5-arg)` present, policies `multitenant_courses_update` / `multitenant_documents_update` / `multitenant_tar_update` / `multitenant_unified_questions_update` all exist, `training_assignment_rules_sel`/`_write` dropped | **Effectively applied.** History row just lacks stored SQL. No DDL action needed; only history/ file hygiene. |
| `20260901251000_multitenant_email_and_branding.sql` | yes | YES — `get_tenant_email_context(uuid)`, `can_send_tenant_email(uuid,uuid)`, `organizations.email_*` columns, `notification_delivery_events.organization_id`, `notification_queue.organization_id` all present | **Applied & matches disk** (trivial cosmetic diff: DB body uses `v_org record` vs disk `v_org public.organizations%ROWTYPE`; internal header comment says `…245000…`). No action beyond leaving it. |
| `20260901252000_dynamicize_stored_notification_templates.sql` | yes (stale comment only) | Template rows ARE already dynamicized — 65/68 rows contain `{{org_name}}`, 56 contain `{{brand_primary}}`/`{{header_gradient}}`, 0 rows still contain `alt="Altus"`, `#0B1528`, `#C9A54D`, or `#d97706` | Intent already satisfied in DB (by some path). History row does not reflect the real file. Re-running the disk `UPDATE` is an **idempotent no-op** (all `REPLACE()` search strings are already gone). |
| `20260901260000_production_security_and_rls_lockdown.sql` | **MISSING** | Not applied | **Needs to be applied.** Safety review in §4. |

---

## 2. Colliding filenames on disk

Two version prefixes have two files each. `supabase db push` orders by the 14-digit prefix and, on a duplicate prefix, applies only the first and silently skips the second.

### Prefix `20260901250000`
- `supabase/migrations/20260901250000_phase4_harden_new_hire_automation_and_assignment_rls.sql`
  — tracked (committed in `281c93f`). **Already applied to DB under version `20260831200206`** (same name). It was renamed forward into a colliding slot.
- `supabase/migrations/20260901250000_production_remediation_and_security_lockdown.sql`
  — tracked (committed in `f6d16e1`). Applied under `20260901250000` (see §1).

### Prefix `20260901251000`
- `supabase/migrations/20260901251000_phase70_72_data_retention_and_scheduled_jobs.sql`
  — tracked (committed in `68fe5fe`). **Already applied to DB under version `20260831201346`** (same name). Renamed forward into a colliding slot.
- `supabase/migrations/20260901251000_multitenant_email_and_branding.sql`
  — tracked (committed in `f6d16e1`). Applied under `20260901251000` (see §1).

### Not a collision, just missing from DB
- `supabase/migrations/20260901260000_production_security_and_rls_lockdown.sql` — single file, no DB history row.

Working tree is currently clean (all of the above are committed as of `f6d16e1`).

---

## 3. Ordered remediation commands

Run from repo root. Requires Supabase CLI logged in and linked to `dhbfaclkfysqwfppuxxa`.

### Step 1 — Resolve the two collisions by renaming the two "phase" files back to the versions they were actually applied under

```sh
cd supabase/migrations

git mv 20260901250000_phase4_harden_new_hire_automation_and_assignment_rls.sql \
       20260831200206_phase4_harden_new_hire_automation_and_assignment_rls.sql

git mv 20260901251000_phase70_72_data_retention_and_scheduled_jobs.sql \
       20260831201346_phase70_72_data_retention_and_scheduled_jobs.sql

cd ../..
```

Rationale: those two files are already in DB history at `20260831200206` / `20260831201346` with matching names. Putting the disk filename back on the applied version makes disk == history (CLI treats them as already-applied, never re-runs them) and clears both collisions. After this, each prefix `20260901250000` and `20260901251000` has exactly one file, matching its DB row.

Do NOT try to re-apply these two — they are done.

### Step 2 — Commit the rename

```sh
git add -A supabase/migrations
git commit -m "fix(migrations): un-collide 250000/251000 — restore phase4/phase70_72 to applied versions"
```

### Step 3 — Repair the stale `20260901252000` history row, then push

The `20260901252000` history row holds only a comment, not the real `UPDATE`. To make history honest and let `db push` record the real file (the UPDATE itself is a safe no-op against current data):

```sh
supabase migration repair --status reverted 20260901252000 --project-ref dhbfaclkfysqwfppuxxa
supabase db push --project-ref dhbfaclkfysqwfppuxxa
```

`db push` will then apply, in order:
1. `20260901252000_dynamicize_stored_notification_templates.sql` — real `UPDATE public.notification_email_templates …` (idempotent; 0 rows currently match the REPLACE search strings, so it is a no-op that only refreshes `updated_at`).
2. `20260901260000_production_security_and_rls_lockdown.sql` — the one genuinely un-applied migration.

**Alternative to `migration repair`** (if you prefer not to touch history rows): copy the body of `20260901252000_dynamicize_stored_notification_templates.sql` into a new file `20260901253000_apply_dynamic_notification_templates.sql`, leave the `252000` file as a historical record, and run only `supabase db push`. `db push` then applies `20260901253000` + `20260901260000`.

### Step 4 — Verify

```sh
supabase migration list --project-ref dhbfaclkfysqwfppuxxa
```

Expected: local and remote columns identical, tail = `20260901252000` then `20260901260000` (plus `20260901253000` if the alternative was used).

### Migration files still needing to be applied to the DB

- **`20260901260000_production_security_and_rls_lockdown.sql`** — the only file with pending DDL.
- `20260901252000_dynamicize_stored_notification_templates.sql` — only if you want history to reflect the real statement (Step 3); it is a functional no-op.
- Nothing else. `250000` and `251000` content is already live.

---

## 4. Is `20260901260000_production_security_and_rls_lockdown.sql` safe to apply as-is?

**Yes — safe to apply as-is.** Every `CREATE OR REPLACE` target, every `REVOKE`/`GRANT` function signature, and every policy table/column was checked against the current live schema. All exist and all signatures match. The whole file is wrapped in a single `BEGIN … COMMIT`.

### Section-by-section verification

**§1 `CREATE OR REPLACE FUNCTION` (3 functions)** — all already exist with identical signature and return type, so these are eff0ectively idempotent no-ops:
- `_plan_rank(_code text) → integer` — matches; already has `search_path=public, pg_temp`.
- `check_and_escalate_approvals() → void` — matches; already hardened.
- `get_media_asset_with_usage(p_media_asset_id uuid) → TABLE(...)` — the returned `TABLE(...)` column list is **byte-identical** to the live definition (incl. `media_type media_type`, `category media_category`, `property_id`, `property_name`, `usages jsonb`). No "cannot change return type" risk. Body references `media_assets`, `profiles`, `hotels`, `media_asset_usages(media_asset_id, usage_type, usage_entity_id, usage_entity_title, created_at)` — all present.

**§2 `REVOKE … FROM public, anon` + `GRANT … TO authenticated, service_role`, each guarded by `IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = …)`** — note the guard only checks the *name*, so a signature mismatch inside the block would abort the whole transaction. All 27 signatures were checked explicitly and **all match** the live catalog:

| function (as written in the migration) | live signature | match |
|---|---|---|
| `can_send_tenant_email(uuid, uuid)` | `(p_user_id uuid, p_org_id uuid)` | ✓ |
| `check_password_reuse(text)` | `(plain_password text)` | ✓ |
| `clear_failed_login_attempts(text)` | `(p_email text)` | ✓ |
| `complete_password_reset()` | `()` | ✓ |
| `create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, uuid, text, uuid[], timestamptz, text, text, boolean, boolean, integer[])` | 14-arg, identical order | ✓ |
| `deploy_master_content(uuid, text, uuid)` | `(p_master_id uuid, p_content_type text, p_org_id uuid)` | ✓ |
| `enforce_ai_credit()` | `()` | ✓ |
| `enforce_hotel_entitlement()` | `()` | ✓ |
| `enforce_membership_entitlement()` | `()` | ✓ |
| `evaluate_organization_quotas(uuid)` | `(p_org_id uuid)` | ✓ |
| `get_assignable_learners(uuid, uuid, uuid, uuid, text, text, integer, integer)` | 8-arg identical | ✓ |
| `get_assignable_recipients_count(uuid, uuid, uuid, uuid, text, text, uuid[], text)` | 8-arg identical | ✓ |
| `get_caller_assignment_scopes(uuid)` | `(p_org_id uuid)` | ✓ |
| `get_platform_ai_operations()` | `()` | ✓ |
| `get_platform_global_search(text)` | `(p_query text)` | ✓ |
| `get_platform_operations_summary()` | `()` | ✓ |
| `get_platform_user_directory(text, uuid, text, integer, integer)` | 5-arg identical | ✓ |
| `get_setting(uuid, text)` | `(p_org_id uuid, p_key text)` | ✓ |
| `get_tenant_email_context(uuid)` | `(p_org_id uuid)` | ✓ |
| `match_knowledge_chunks(extensions.vector, text, integer, double precision, uuid)` | 5-arg overload exists: `(vector, text, integer, double precision, uuid)` | ✓ (see note) |
| `notification_policy_enabled(uuid, text)` | `(p_org_id uuid, p_key text)` | ✓ |
| `process_employee_transfer(uuid, uuid, uuid, text, text, uuid)` | 6-arg identical | ✓ |
| `record_failed_login_attempt(text)` | `(p_email text)` | ✓ |
| `retry_course_generation_job(uuid)` | `(p_job_id uuid)` | ✓ |
| `retry_failed_job(uuid)` | `(p_job_id uuid)` | ✓ |
| `sync_training_module_to_course()` | `()` | ✓ |
| `trigger_auto_assign_new_hire()` | `()` | ✓ |

Note on `match_knowledge_chunks`: two overloads exist in DB (4-arg and 5-arg). The migration's `EXISTS` guard matches on name (true), and the explicit 5-arg type list `(extensions.vector, text, integer, double precision, uuid)` resolves to the 5-arg overload. `extensions` is not on the default `search_path`, so the explicit `extensions.` qualification of the `vector` type resolves correctly. Low risk; if the `vector` type were relocated the `REVOKE` would raise `function … does not exist` and roll the transaction back cleanly (no partial state).

**§3 RLS policies on `media_asset_usages` and `media_collection_items`** — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` then `DROP POLICY IF EXISTS` + `CREATE POLICY` (6 policies). Verified:
- Both tables exist.
- `media_asset_usages.media_asset_id` exists; `media_collection_items.collection_id` exists.
- Referenced columns exist: `media_assets.organization_id`, `media_assets.is_public`, `media_collections.organization_id`, `organization_memberships.user_id/organization_id/is_active`, `platform_users.user_id/is_active`.
- Policies read `auth.jwt() -> 'app_metadata' ->> 'organization_id'` — consistent with other policies in this codebase.

### Statements in `20260901260000` that would *not* fail but are worth knowing

- The three `CREATE OR REPLACE` in §1 are **no-ops** — those functions already carry `SET search_path = public, pg_temp` in the live DB. Applying does no harm.
- All §2 `REVOKE … FROM public` also revoke from `authenticated`/`service_role`'s inherited `PUBLIC` grant, then immediately re-`GRANT` to `authenticated, service_role`. Net effect: `anon` and bare `PUBLIC` lose EXECUTE, `authenticated`/`service_role` keep it. Intended.
- No statement in this file targets a missing table, column, function, or policy. Nothing in it would fail against the current schema.

### Recommendation

Apply `20260901260000` via `supabase db push` (Step 3). No schema pre-work required.
