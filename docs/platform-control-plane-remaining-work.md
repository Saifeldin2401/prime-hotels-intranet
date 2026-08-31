# Platform Control Plane — Remaining Work (handoff)

You are continuing a multi-phase "System Admin control plane" rebuild. Phases 1–4 + a partial Phase 6
are already applied to the **live** Supabase project `dhbfaclkfysqwfppuxxa` as migrations
`20260901230000` → `20260901233000` (7 files in `supabase/migrations/`) plus staged frontend changes.
**Read `C:\Users\mahro\.claude\projects\C--Users-mahro-Downloads-prime-hotels-intranet\memory\platform-control-plane-phase1.md` first** — it is the authoritative state.

This document covers the 5 remaining items.

---

## Ground rules (apply to every item)

1. **Do NOT `git commit`.** Leave all frontend changes staged/unstaged. The user reviews and commits.
2. **Migrations go to the live DB** (via the Supabase MCP `apply_migration`) *and* are mirrored as
   `.sql` files in `supabase/migrations/`. `apply_migration` server-stamps the version as
   `20260831xxxxxx` (a bug) — **immediately after every apply**, run
   `UPDATE supabase_migrations.schema_migrations SET version='<YYYYMMDDHHMMSS that sorts after the
   latest>' WHERE name='<your_migration_name>'` and name the disk file to match. Latest applied is
   `20260901233000`; use `20260901234000`, `235000`, … Verify with
   `SELECT version,name FROM supabase_migrations.schema_migrations WHERE version >= '20260901230000' ORDER BY version`.
3. **All migrations must be idempotent + additive.** A parallel builder (Lovable / another agent)
   also edits this repo + DB. Use `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS <exact name>`
   before `CREATE POLICY`, `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
   `INSERT … ON CONFLICT DO NOTHING`.
4. **Verify RLS changes with rolled-back transactions**, e.g.:
   ```sql
   BEGIN;
   SELECT set_config('request.jwt.claims', json_build_object('sub','<uuid>','role','authenticated')::text, true);
   SET LOCAL role authenticated;
   SELECT ...;   -- assert
   ROLLBACK;
   ```
   Multi-statement `execute_sql` only returns the **last** statement's result — put the assertion last,
   or run one statement per call.
5. **`npm run typecheck` does not finish on this machine** (tsc runs 30+ min / hangs). Use
   **`npm run build`** (vite/esbuild, ~70s, full module resolution) as the gate instead.
   `src/types/database.generated.ts` + `src/lib/database.types.ts` are regenerated via the MCP
   `generate_typescript_types` tool (write `.types` to both files); `npm run db:types` is broken
   (`scripts/gen-db-types.mjs` missing). New `.from('<new_table>')` calls: cast `(supabase as any)`.
6. **Test personas** (real rows in `profiles`):
   - `641ac54a-7a0d-4bf8-a2d5-46845e0cabdf` admin@prime.com — `platform_admin` operator
   - `5aa53b85-30df-4acb-a638-2c7adafa07e5` islam.mahrous@gmail.com — `system_owner`
   - `496e2969-cec2-413a-966a-8e596af3efac` hsmadi2223@gmail.com — `platform_support` operator
   - `97ed68d0-725b-41e8-9467-3c5f1b113ba8` yehiaayman55@gmail.com — tenant `hotel_admin`, NOT an operator
   - `ffd0d9ae-e982-4320-be79-539527110ee0` ksa50233@gmail.com — tenant `learner`
   - Only org: `e0000000-0000-0000-0000-000000000001` (PRIME Hospitality Group, Enterprise plan).

---

## ITEM 1 — Runtime entitlement enforcement

**Goal:** creating a hotel or inviting/provisioning a user must be blocked when the org is at its
plan limit. The resolver functions already exist (migration `20260901232000`):
- `public.effective_entitlements(p_org_id uuid) → jsonb` — `{ plan, plan_code, max_hotels,
  max_learners, max_storage_gb, ai_credits_monthly, ai_credits_used, plan_features, usage:{hotels,learners} }`.
  Org-level `organizations.max_*` columns override the plan.
- `public.check_entitlement(p_org_id uuid, p_resource text) → boolean` — `p_resource` in
  `'hotel' | 'learner'`; returns `true` when there is headroom.

### 1a. DB — enforce at the write boundary (defense in depth; do this first)

New migration. Add a `BEFORE INSERT` trigger on `public.hotels`:

```sql
CREATE OR REPLACE FUNCTION public.enforce_hotel_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- platform operators (incl. inside an audited session) bypass tenant quotas
  IF public.is_platform_operator() THEN RETURN NEW; END IF;
  IF NEW.organization_id IS NOT NULL AND NOT public.check_entitlement(NEW.organization_id, 'hotel') THEN
    RAISE EXCEPTION 'Hotel limit reached for this subscription plan (%).',
      (public.effective_entitlements(NEW.organization_id)->>'max_hotels')
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_hotel_entitlement ON public.hotels;
CREATE TRIGGER trg_enforce_hotel_entitlement
  BEFORE INSERT ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hotel_entitlement();
```

Do the equivalent for **user provisioning**. Users are created by the **`create-user` edge function**
(`supabase/functions/create-user/`), which is invoked from `src/hooks/useInvitations.ts`
(`createInvitation` → `supabase.functions.invoke('create-user', …)`) and from
`src/pages/admin/BulkUserProvisioning.tsx`. Two options:
  - **Preferred:** in the `create-user` edge function, before creating the auth user / membership,
    call `check_entitlement(orgId, 'learner')` via the service-role client and return a 4xx with a
    clear message if it fails. Add a `SKIP_ENTITLEMENT` allowance only for a platform-operator caller.
  - Also acceptable: a `BEFORE INSERT` trigger on `public.organization_memberships` mirroring the
    hotel trigger, keyed on `'learner'` (counts active memberships). This catches *all* paths
    including `platform_set_membership`.

Verify (rolled back): temporarily `UPDATE organizations SET max_hotels = 5` (current hotel count is 5)
then attempt an insert as `yehiaayman55` → must raise; attempt as `admin@prime.com` (operator) →
must succeed; `ROLLBACK`.

### 1b. Frontend — surface it before the user submits

- `src/pages/admin/components/HotelsManagement.tsx` — `handleSaveHotel` (≈line 99). Before the
  `.from('hotels').insert(...)`, call a new `platformService`/`tenantService` helper
  `getEffectiveEntitlements(orgId)` (thin wrapper over `supabase.rpc('effective_entitlements', {p_org_id})`)
  and, when `usage.hotels >= max_hotels`, disable the "Add hotel" button + show a message
  ("Plan limit reached — contact your platform administrator to upgrade"). Keep the DB trigger as the
  real guard; this is UX only.
- Same treatment on the invite form(s): `src/pages/admin/UserInvitations.tsx`,
  `src/pages/admin/UserManagement.tsx` (add-user dialog), `src/pages/admin/BulkUserProvisioning.tsx`
  (show remaining seats; block the batch if it would exceed `max_learners`).
- Show the numbers on `src/pages/admin/components/SubscriptionEntitlementsCard.tsx` — it already
  renders subscription info; feed it `effective_entitlements` so "X / Y hotels", "X / Y seats" are
  live.
- The platform-side view already exists: `OrganizationProfile.tsx` renders `effective_entitlements`.

**Definition of done:** hotel #6 and learner #(max+1) are rejected by the DB for a tenant admin,
allowed for a platform operator; the tenant UI greys the control out with an explanation before submit.

---

## ITEM 2 — Full RLS suspension sweep

**Context:** `org_is_operational(p_org_id)` returns `false` for `lifecycle_status IN ('suspended','archived')`.
`org_visible()` and `has_tenant_access()` now AND-in `org_is_operational` on the *membership* branch
(operators + audited sessions still pass). `documents` + `courses` bespoke policies were fixed in
`20260901233000`. **Gap:** ~29 other tenant tables' policies gate on
`current_user_organization_ids()` / `is_tenant_content_editor()` / `is_tenant_admin()` /
`is_tenant_people_admin()` **without** the operational check, so a suspended org's members can still
read progress, assignments, quiz sessions, etc.

### Recommended approach — fix the helpers, not 30 policies

`is_tenant_content_editor`, `is_tenant_admin`, `is_tenant_people_admin` all have the shape
`is_platform_super_admin() OR has_active_platform_session(p_org_id) OR EXISTS(<membership check>)`.
Add `AND public.org_is_operational(p_org_id)` to **only the membership `EXISTS(...)` clause** in each
(leave the operator / session terms untouched). Get the current bodies with:
```sql
SELECT proname, pg_get_functiondef(oid) FROM pg_proc
WHERE pronamespace='public'::regnamespace
  AND proname IN ('is_tenant_content_editor','is_tenant_admin','is_tenant_people_admin');
```
`CREATE OR REPLACE` each with the added guard. This propagates to every policy that uses them.

### Then handle the tables that gate on raw `current_user_organization_ids()`

Confirmed still-leaking SELECT/ALL policies (as of this handoff), for a **member of a suspended org**:
`assessments` (`multitenant_assessments_select`), `brands` (`brands_tenant_isolation_select`),
`enrollments` (`multitenant_enrollments_select`, `_update`), `hotels` (`hotels_tenant_isolation_select`),
`master_content_deployments` (`master_content_deployments_policy`),
`training_assignment_rules` (`multitenant_tar_select`, `_update`, `_delete`),
`training_modules` (`multitenant_training_modules_select`, `_write`),
`unified_questions` (`multitenant_unified_questions_select`, `_update`, `_delete`).
`subscriptions` (`subscriptions_tenant_read`) — **leave this one** (a suspended tenant should still see
its own subscription/billing).

Re-derive the full list yourself (do not trust this list blindly — the parallel builder changes policies):
```sql
WITH tt AS (SELECT table_name FROM information_schema.columns
            WHERE table_schema='public' AND column_name='organization_id')
SELECT p.tablename, p.policyname, p.cmd, p.qual
FROM pg_policies p JOIN tt ON tt.table_name = p.tablename
WHERE p.schemaname='public' AND p.cmd IN ('SELECT','ALL')
  AND p.qual NOT LIKE '%org_is_operational%'
ORDER BY p.tablename, p.policyname;
```
For each, wrap the membership branch: replace
`(organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))`
with
`((organization_id IN (SELECT unnest(current_user_organization_ids())) AND public.org_is_operational(organization_id)) OR has_active_platform_session(organization_id))`.
Keep any `is_master_template` / `is_platform_super_admin()` OR-branches as-is.

### Verification — synthetic suspended-org sweep (rolled back)

```sql
BEGIN;
UPDATE organizations SET lifecycle_status='suspended', is_active=false
 WHERE id='e0000000-0000-0000-0000-000000000001';
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','ffd0d9ae-e982-4320-be79-539527110ee0','role','authenticated')::text, true); -- learner
SELECT
  (SELECT count(*) FROM training_progress)        AS tp,        -- expect 0 (was >0)
  (SELECT count(*) FROM training_assignment_rules) AS tar,       -- expect 0
  (SELECT count(*) FROM enrollments)               AS enr,       -- expect 0
  (SELECT count(*) FROM assessments)               AS asm,       -- expect 0
  (SELECT count(*) FROM training_modules)          AS tm,        -- expect 0 (non-master)
  (SELECT count(*) FROM subscriptions)             AS subs;      -- expect >=1 (deliberately still visible)
RESET role;
-- and confirm an operator is unaffected
SELECT set_config('request.jwt.claims',
  json_build_object('sub','641ac54a-7a0d-4bf8-a2d5-46845e0cabdf','role','authenticated')::text, true);
SET LOCAL role authenticated;
SELECT (SELECT count(*) FROM training_progress) AS operator_tp;  -- expect >0
ROLLBACK;
```

**Definition of done:** a suspended org's members read **0** rows of every tenant table except
`subscriptions` (and their own profile); operators and `has_active_platform_session` holders are
unaffected; `npm run build` still green; `get_advisors` security shows **0 ERROR**.

---

## ITEM 3 — Phase 5: master-content deployment hardening + notification policy + AI ops view

### 3a. Master-content deployment

Current code: `src/services/platformService.ts` — `deployMasterSop`, `deployMasterCourse`,
`syncContentWithMaster`, `getMasterContentDiff`, `notifyMasterUpdateAvailable`; UI in
`src/pages/platform/MasterContentLibrary.tsx`. It is already substantial (per-org loop with a live
progress callback, `master_content_deployments` tracking table, version bump + retraining reset).

Harden:
1. **Per-org atomicity.** Each org's deploy currently runs as several separate `supabase` calls in a
   JS loop — a mid-loop failure leaves a half-deployed org. Move each org's deploy into a
   `SECURITY DEFINER` RPC `deploy_master_content(p_master_id uuid, p_content_type text, p_org_id uuid)`
   that does the clone + `master_content_deployments` upsert in one transaction, gated on
   `is_platform_operator() AND platform_operator_can('master_content.manage')`, and writes a
   `platform_audit_logs` row. The JS layer just calls it per org and reports progress.
2. **Drift detection UI.** `get_master_content_diff` exists; add a "Updates available" column to the
   deployments table in `MasterContentLibrary.tsx` (compare `deployed_version` vs
   `current_master_version` on `master_content_deployments`) and a bulk **"Push update to N tenants"**
   button that iterates `deploy_master_content` for every deployment flagged
   `has_update_available = true`, with the existing progress terminal.
3. **`master_content_deployments` RLS** — it currently has `master_content_deployments_policy` gating
   on `current_user_organization_ids()`; make writes operator-only
   (`is_platform_operator() AND platform_operator_can('master_content.manage')`), reads =
   `org_visible(target_organization_id) OR is_platform_operator()`.

Verify: as `admin@prime.com`, deploy a master SOP to the one org, confirm a `documents` row is created
with `master_source_id` set + a `master_content_deployments` row + a `platform_audit_logs` entry; bump
the master version, confirm the deployment flags `has_update_available`, push the update, confirm the
tenant doc content matches and the flag clears. Roll back if testing against real data, or create a
throwaway master doc.

### 3b. Notification policy config

There is a notification system in `src/services/notificationService.ts` + `create_notification_batch`
RPC + `src/pages/admin/notifications/NotificationBatches.tsx`. Add **platform-level policy**:

New migration:
```sql
CREATE TABLE IF NOT EXISTS public.platform_notification_policies (
  key         text PRIMARY KEY,          -- 'training_assigned' | 'training_reminder' | 'assessment_result'
                                         -- | 'invitation' | 'certification'
  label       text NOT NULL,
  description text,
  enabled     boolean NOT NULL DEFAULT true,
  channels    text[]  NOT NULL DEFAULT ARRAY['in_app'],  -- 'in_app' | 'email'
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.organization_notification_overrides (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key             text NOT NULL REFERENCES public.platform_notification_policies(key) ON DELETE CASCADE,
  enabled         boolean NOT NULL,
  channels        text[],
  PRIMARY KEY (organization_id, key)
);
```
RLS: read = `authenticated` for `platform_notification_policies`, `org_visible` for overrides; write =
`is_platform_operator() AND platform_operator_can('config.manage')` (policies) /
`platform_operator_can('tenant.manage')` (overrides). Add
`notification_policy_enabled(p_org_id uuid, p_key text) → boolean` (override → policy default) mirroring
`feature_enabled`. Seed the 5 keys. Wire `notificationService` (or the edge functions that send
training/assessment/cert notifications) to check `notification_policy_enabled` before enqueuing.
Add a "Notifications" card to `src/pages/platform/PlatformSettings.tsx` with toggles per key +
channel checkboxes (pattern: copy the feature-flag section already there).

### 3c. AI operations view

`src/pages/platform/PlatformOperationsHub.tsx` currently reads only `get_platform_operations_summary`
(which covers `course_generation_jobs`). Extend:
1. New RPC `get_platform_ai_operations() → jsonb` (operator + `ops.manage`) returning, **per org and
   in total**: job counts by status, avg `duration_ms`, failure reasons (`error_message` grouped),
   models used (`models_used`), and — if `ai_platform_config` / any usage table has token or cost
   columns — token/cost aggregates. Inspect `ai_platform_config` and any `ai_*` usage tables first
   (`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ai_%'`).
2. **Never expose customer content** — only counts, statuses, timings, model names, error strings.
   Respect tenant boundaries (group by `organization_id`, no course titles / prompts).
3. Add a "Document processing" panel: `documents` rows where a processing-status column indicates
   pending/failed (check `information_schema.columns` for `documents` — look for
   `processing_status` / `embedding_status` / similar) with a per-row **Retry** that flips the status
   back to `pending` (guard: operator + `ops.manage`, audited).
4. Surface `pg_cron` job health if reachable: `SELECT * FROM cron.job` (may need a `SECURITY DEFINER`
   wrapper). List jobname, schedule, last run status from `cron.job_run_details`.

**Definition of done:** the Operations Hub shows real document-processing + AI-job + cron health with
working per-job Retry; PlatformSettings has a real Notifications section; master deploy is
transaction-safe per org with drift detection + bulk push. `npm run build` green, advisors 0 ERROR.

---

## ITEM 4 — Scripted Section-45 end-to-end test

Produce **`supabase/tests/e2e_platform_scenario.sql`** — a single script wrapped in
`BEGIN … ROLLBACK` that runs the whole operator → tenant → learner journey and `RAISE EXCEPTION` on
any assertion failure (so a non-zero exit = failure). It must not commit anything.

Steps (each preceded by `SET LOCAL role authenticated` + `set_config('request.jwt.claims', …)` for the
acting user; use `RESET role` between actors):

1. **As `admin@prime.com` (platform_admin):** `INSERT` a new org `ACME Test` (or call whatever the
   real create-org path is — `platformService.createOrganization` inserts directly; replicate that).
   Assert it appears in `get_platform_usage_analytics()->'organizations'`.
2. Create a brand, a hotel (assert `check_entitlement` passes), a department under that hotel.
3. Create 2 auth users (use `auth.users` insert with a service-role context, or reuse spare test
   uuids) and `platform_set_membership(acme_id, u1, 'training_manager', hotel_id)` /
   `platform_set_membership(acme_id, u2, 'learner', hotel_id, dept_id)`.
4. As the platform admin, create a master course + `deploy_master_content` to ACME. Assert a
   `courses` row exists for ACME with `master_source_id`.
5. **As u1 (training_manager) of ACME:** assert `resolve_account_context()->>'recommended_destination'`
   = `/training`. Assert they can `SELECT` the ACME course but **0** rows of
   `e0000000-…-001`'s courses/documents (cross-tenant isolation).
6. As u1, open "assign training": assert the eligible-learner query only returns ACME members in the
   hotel scope (find the query in `src/services/trainingAssignmentEngineService.ts` /
   `assignmentService`; call the same RPC). Assign the course to u2.
7. **As u2 (learner):** assert `recommended_destination` = `/home/learner`. Assert they see the
   assignment + can read the course. Insert a `training_progress` row `status='completed'`.
8. **As platform admin:** assert `get_platform_usage_analytics()` totals now reflect the new org /
   completion.
9. `start_platform_session(acme_id, 'E2E scenario verification run', 'organization_admin', 30)` —
   assert a `platform_access_sessions` row + a `platform_audit_logs` `enter_tenant` row.
10. While the session is active, assert the operator can `SELECT` ACME's `training_progress`.
11. `end_platform_session(<id>)` — assert `is_active=false` + an `exit_tenant` audit row + that
    `resolve_account_context()->>'active_platform_session'` is now null.
12. `set_organization_status(acme_id, 'suspended', 'E2E suspension check')` — assert u2's
    `org_visible(acme_id)` is now false and `resolve_account_context()->>'recommended_destination'`
    for u2 is `/suspended`.
13. `ROLLBACK`.

Wrap each assertion as `IF NOT (<cond>) THEN RAISE EXCEPTION 'STEP N failed: <detail>'; END IF;`.
Also add a lightweight runner note in the file header: run via the Supabase MCP `execute_sql` (whole
file in one call) or `psql -f`. Keep it re-runnable (it rolls back).

**Definition of done:** the script runs clean end-to-end and, if you deliberately break one assertion
(e.g. comment out a policy), it fails loudly at the right step.

---

## ITEM 5 — Phase 4: three-UX audit + `<OrgStructureTree>` + global-search context

### 5a. `<OrgStructureTree>` shared component

RPC already exists: `get_org_structure(p_org_id uuid) → jsonb`
(`{ organization:{id,name,lifecycle_status}, brands:[{id,name}], hotels:[{id,name,brand_id,city,departments:[{id,name}],member_count}] }`).
Build **`src/components/org/OrgStructureTree.tsx`**: a collapsible tree
Organization → Brands → Hotels → Departments, with member counts and (prop-driven) row actions.
Props: `{ organizationId: string; onSelectNode?: (node) => void; showMemberCounts?: boolean }`.
Use it in **two places**:
- `src/pages/platform/OrganizationProfile.tsx` — replace the flat "Structure" card list with the tree.
- `src/pages/admin/OrganizationalControlCenter.tsx` — it already has an "org chart / structure" tab
  (`grep -n "OrgChart\|structure\|reporting" src/pages/admin/OrganizationalControlCenter.tsx`);
  add the tree there, scoped to `useTenant().currentOrganization.id`.

### 5b. Global search — org context on every result row

RPC `get_platform_global_search(p_query text)` (in `platformService.getPlatformGlobalSearch`, used by
`src/pages/platform/PlatformControlCenter.tsx`). Get its body
(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='get_platform_global_search'`) and rewrite
so **every** result object carries `organization_id`, `organization_name`, and where relevant
`brand_name` / `hotel_name` / `department_name`:
- Users: join `organization_memberships` → org / hotel / department (a user may have several — return
  the primary, plus `membership_count`).
- Courses / documents / SOPs / assessments / question banks: include `organization_id` +
  `organization_name` (NULL org ⇒ label `"Platform (master)"`).
- Add the missing entity types the brief lists: **assessments**, **question_banks**, **learning_paths**
  (search `title` / `name` ILIKE, `is_deleted=false`).
Then update the results dropdown in `PlatformControlCenter.tsx` to render the org/brand/hotel/dept
breadcrumb under each hit (e.g. `Ahmed Hassan — ACME Test · Hotel Riyadh · Front Office`).

### 5c. Three-UX audit (report + targeted fixes)

Produce **`docs/three-experiences-audit.md`** and fix the clear violations:

- **Platform** (`/platform/*`): already gated by `PlatformRoute`. Confirm no tenant-scoped data
  bleeds in without an org filter; confirm every page needs an explicit permission.
- **Tenant Admin** (`/admin/*`): for **each** route in `src/routes/modules/AdminRoutes.tsx` verify the
  page scopes every query to `useTenant().currentOrganization.id` (or relies on `org_visible` RLS) and
  shows **nothing** cross-tenant, no platform config, no global audit. Known issue:
  `src/pages/admin/SystemSettings.tsx` + `src/hooks/useSystemSettings.ts` read/write the **global**
  `system_settings` table with no `organization_id` — a tenant admin editing `app_name` changes it
  platform-wide. Fix: add a nullable `organization_id` to `system_settings` (NULL = platform default),
  a `get_setting(p_org_id, p_key)` resolver (org row → platform row), scope the tenant page to
  `organization_id = currentOrganization.id`, and move the truly-global keys
  (`maintenance_mode`, security policy, `company_profile`) to platform-operator-only on
  `/platform/settings` (that page already has the infra).
- **Learner** (`/home/learner`, `/learn/*` if present): confirm the surface is only My Learning /
  Courses / Assignments / Knowledge / Quizzes / Certificates / Progress. Strip any admin affordances
  (links to `/admin`, `/training/hub`, builder, analytics) that render for `learner`. Check
  `src/config/navigation.ts` `allowedRoles` on every entry and the learner landing page components.

**Definition of done:** the audit doc lists every `/admin/*` page with its scoping status; the
`system_settings` global/tenant split is implemented and verified (a tenant admin can no longer change
a platform-global key); `<OrgStructureTree>` renders in both the platform and tenant surfaces from the
same component; global-search results all show their organization. `npm run build` green.

---

## Suggested migration sequence

| # | file | contents |
|---|---|---|
| `20260901234000` | `phase3_entitlement_enforcement_triggers` | Item 1a triggers/functions |
| `20260901235000` | `phase2_suspension_helper_gates` | Item 2 — `is_tenant_*` helper guards |
| `20260901236000` | `phase2_suspension_policy_sweep` | Item 2 — remaining per-table policy rewrites |
| `20260901237000` | `phase5_master_deploy_rpc_and_rls` | Item 3a |
| `20260901238000` | `phase5_notification_policies` | Item 3b |
| `20260901239000` | `phase5_ai_ops_and_doc_processing` | Item 3c RPCs |
| `20260901240000` | `phase4_global_search_org_context` | Item 5b RPC rewrite |
| `20260901241000` | `phase4_system_settings_org_scope` | Item 5c settings split |

Run `npm run build` + `get_advisors` (security) after each frontend batch. Regenerate the DB types
file after every schema-changing migration. Keep the memory file
(`…\memory\platform-control-plane-phase1.md`) updated as you complete each item.
