# Prime Connect — Platform vs Tenant fixes (implementation log)

Companion to [`prime-connect-platform-tenant-audit.md`](./prime-connect-platform-tenant-audit.md).
Scope delivered: **CRITICAL (C1–C3) + all REQUIRED (R1–R6)**.

---

## C1 — TenantContext bootstrap now trusts the server, not localStorage

**`src/contexts/auth/AccountContext.tsx`**
- Added `resolveFailed` to the context value. When `resolve_account_context()` cannot be resolved after retries the flag is set, so downstream code can tell "resolved: plain user" apart from "resolution failed".

**`src/contexts/TenantContext.tsx`** — `fetchTenantData()` rewritten:
- **Platform operator** → tenant context comes *only* from an active `platform_access_sessions` row (audited break-glass). No session ⇒ `currentOrganization = null`, `active_tenant_id_<uid> = '__platform__'`, unconditionally. `localStorage` and `window.location.pathname` no longer grant an operator any tenant context.
- **Tenant user** → `currentOrganization` is derived from the authoritative `account.tenantMemberships` payload:
  - exactly one eligible org → auto-select it,
  - many → restore a *validated* `localStorage` choice (must still be in the membership set) or fall to the selector,
  - zero → "no active organization" state.
- **`account.resolveFailed`** → context left empty; the app does **not** guess a tenant.
- `switchOrganization()` now refuses an org the (non-operator) user is not a member of.
- All writes/reads of the non-user-scoped `altus_active_tenant_id` key replaced with `removeItem` — only `active_tenant_id_<uid>` remains.

**`src/components/auth/PublicOnlyRoute.tsx`, `src/routes/RouteComponents.tsx`**
- Stop reading the global `altus_active_tenant_id` fallback; operator redirect clears it.

## C2 — legacy Altus mapping removed (migration `remove_legacy_platform_operator_altus_memberships`)

- Deactivated the `organization_memberships` rows that the 2026-08-31 seed created making every internal operator (`system_owner` / `platform_admin`) an owner/admin of **Altus Hospitality Group** — 4 rows (`admin@prime.com`, `islam.mahrous@gmail.com`, `hsmadi2223@gmail.com`, `saifeldiinislam@gmail.com`).
- Reversible: rows are `is_active = false`, and a copy is in `public._c2_removed_operator_memberships_backup` (RLS: operator-read only — migration `c2_backup_table_rls`).
- `platform_support` operators keep their tenant memberships (that is a legitimate "person with both a platform role and a tenant membership", not the auto-mapping bug).
- **Verified:** `resolve_account_context()` as `admin@prime.com` now returns `tenant_memberships: []`, `is_platform_operator: true`, `primary_organization_id: null`, `recommended_destination: "/platform"`.

## C3 — poisoned client state

Handled by C1: an operator's first post-deploy `fetchTenantData` purges `active_tenant_id_<uid>` to `'__platform__'` and removes the global key. Sign-out already clears both (`AuthActionsContext`).

## Concurrent-session reconciliation (2026-09-08)

A second session worked the same brief in parallel and edited `navigation.ts`, the
search components, and the test files. Reconciled as follows:

- **`navigation.ts`** — kept the concurrent version: `canSeePlatformGroup` now returns
  `opts?.isPlatformOperator === true` with **no `super_admin` fallback at all**. Platform
  visibility is driven *only* by resolved platform-operator identity. My `useNavigation`
  wiring (threads `{ isPlatformOperator }` into every helper call) is unchanged and
  compatible.
- **`src/test/navigation/tenantPlatformDivergence.test.tsx`** — fixed the one stale
  assertion the concurrent edit missed (`canAccessRoute(route, 'super_admin')` now expects
  `false`; added `+ { isPlatformOperator: true } → true`). Suite green: 77/77.
- **`GlobalSearch.tsx` / `useSearch.ts`** — the concurrent session already added the
  tenant-context requirement + explicit `organization_id` filters (+ `is_master_template`
  where intended). Verified; no further change needed from this session.

## Audit cross-check (the pasted "Prime Connect" audit table)

| Pasted finding | Verdict after checking live DB + code |
|---|---|
| Critical: quiz/session migrations assign missing records to a hardcoded org **column default** | **No column defaults** reference the Altus UUID on the live DB (already removed by `20260902040000`). The staged local migration `20260908165714_remove_legacy_tenant_defaults.sql` is a **no-op** — its `information_schema` loop matches nothing. **The real issue** was 3 trigger functions (`set_training_child_org` / `set_documents_child_org` / `set_announcement_child_org`, on ~30 child tables) that `COALESCE`d an unresolved parent org to Altus. **Fixed** — see below. |
| Critical: `GlobalSearch.tsx` doesn't scope to org | **Already fixed** by the concurrent session (requires tenant context, filters every query by `organization_id`). |
| High: `navigation.ts` `super_admin` fallback | **Fixed** (reconciliation above). |
| High: legacy hotel/Altus layer; High: duplicate search; Medium: E2E session test; Medium: learner journey tests; Medium: feature retention inventory | Valid backlog. Not addressed here (broader scope / needs product input; matches audit §16 "don't delete on naming alone"). |

## C1b — child-org triggers fail closed (migration `child_org_triggers_fail_closed_no_altus_default`)

- The 3 `trg_set_org` trigger functions now `RAISE EXCEPTION` (ERRCODE 23502) when the
  parent row's `organization_id` can't be resolved, instead of defaulting to
  `e0000000-…-001`. Cross-tenant mismatch check (42501) retained.
- Backfilled the pre-existing orphans this exposed: `training_progress` `8 → 1` NULL,
  `training_paths` `1 → 1` NULL. The 2 remaining are genuinely unresolvable (a progress
  row for a deleted training; a path with no modules) and are **left NULL on purpose** for
  an explicit human tenant decision — exactly as the audit recommends.
- **Verified:** no `set_*_child_org` function body still contains the Altus UUID.

## R1 — platform-console visibility decoupled from `user_roles`

**`src/config/navigation.ts`** — `canAccessRoute` / `canSeeGroup` / `getRoutesForRole` / `getFlatRoutesForRole` take an optional `{ isPlatformOperator }`. The platform group is visible when that flag is set, regardless of tenant `app_role`; the legacy `role === 'super_admin'` check remains only as a fallback for un-threaded callers and existing tests.

**`src/hooks/useNavigation.ts`** — threads `{ isPlatformOperator: account.isPlatformOperator }` into every navigation-config call. A platform operator whose tenant `app_role` is `learner` / `null` now still gets the Platform Control Center; a non-operator never does.

Regression test added in `src/test/navigation/tenantPlatformDivergence.test.tsx`.

## R2 — tenant context in the URL (lightweight)

**`src/components/auth/TenantContextGuard.tsx`** — honours an explicit `?org=<id>` deep link: a shared tenant URL restores that tenant for a user who is a member of it (operators excluded — they enter via break-glass). This is the URL *carrying* context, never a hardcoded default.

> The full `/t/:orgId/*` route-namespace restructure was **deliberately not done**. C1 already makes refresh and tenant-switch deterministic (context is resolved from the server, not reconstructed), so the router restructure's marginal benefit did not justify touching every tenant route on a live app with no staging — see audit §16 "do not over-engineer". Revisit only if shareable per-tenant deep links become a hard requirement.

## R3 — authoritative context banner

**`src/components/platform/PlatformImpersonationBanner.tsx`** (already mounted in `AppLayout`):
- Live TTL countdown for the break-glass session (turns red under 5 min).
- Also renders as a safety net if an operator ever has a tenant context *without* a session, with a "Return to Platform" action (`returnToPlatformScope`).
- Label changed to "Return to Platform".

## R4 — Platform User Directory: tenant-membership management

**`src/pages/platform/PlatformUserDirectory.tsx`**
- New **"Manage Tenant Memberships"** modal per user: list current memberships with an inline role selector, remove (set `is_active=false`), and add to another tenant (org + role). Backed by `platform_set_membership` (operator- or people-admin-gated, audited) via `platformService.setTenantMembership`.
- "Move between tenants" = add to new + remove from old (explained in the modal).
- New **Status** filter (active / suspended) and **Sort** (name / newest / most tenants), applied client-side over the RPC's search/org/role filters.
- Removed the `navigate('/platform/organizations')` and `navigate('/admin/users')` bounces — membership actions are now in-place at the platform level.

> Not added (would need a new auth-admin edge function, out of scope for "minimum required"): self-service password reset / session revoke from the directory. Flagged as a follow-up.

## R5 — Master LMS (revised after user feedback)

Initial assessment was wrong: `MasterContentLibrary` only did **authoring + content deploy** — the operator's complaint ("it only lets me *create* courses, what about tracking and assignment?") was correct. Deploy just *copies* the course into a tenant; it creates no assignment, enrolment, due date, or progress, and there was no cross-tenant tracking view.

**Added (reusing the existing engines, no parallel LMS — §16):**
- **`platform_assign_master_content(master_id, org_ids[], scope, role, user_ids, due_date, …)`** (migration `20260908172016`) — for each target tenant: deploys the course if not already there, then calls the existing tenant assignment engine `create_scoped_training_assignment` (which snapshots the rule, seeds `training_progress` + `enrollments`, notifies learners, and audits). Operator + `tenant.manage` gated, per-tenant errors captured (batch doesn't abort).
- **`get_master_content_adoption(master_id)`** (same migration) — per-tenant rollup: deployed copy, assignment-rule count, learners, in-progress, completed, avg score, certificates issued. Operator + `tenant.read` gated.
- **`MasterContentLibrary` "Assign & Track" action** per master course — pick tenants, scope (everyone / by role), due date, instructions → runs the assignment; shows a per-tenant result list and a live **cross-tenant adoption table** (assigned / in-progress / completed / avg score / certs).
- `platformService.assignMasterContent` / `getMasterContentAdoption`.

**Pre-existing bug found and fixed along the way** — `create_scoped_training_assignment` (called by the *tenant* "Assign Training" UI too) had **never executed successfully**: three latent errors on the happy path (undefined `p_eligible_users` identifier; invalid `'enrolled'::enrollment_status`; write into the now-`GENERATED` `notifications.is_read`). `training_assignment_rules` only ever got rows from the auto-assign trigger / direct writes. Fixed in migration `20260908172341` — same failure class as the historical `create_task_atomic` / `apply_request_step_sla` bugs. **Verified live** (rolled back): org-wide + individual assignment into Altus now succeed; adoption rollup returns correct counts.

Minor data-hygiene note unchanged: a junk master-template course titled `"test"` exists and is visible cross-tenant — delete it.

## R6 — verification

- **Build:** `npx vite build` green (exit 0) — after reconciliation with the concurrent session.
- **Tests:** full `src/test/` suite — **77 passing** / 34 todo (incl. the new R1 test, post-reconciliation).
- **`resolve_account_context()` as `admin@prime.com`** (live, JWT-claims impersonation): `is_platform_operator: true`, `recommended_destination: "/platform"`, `tenant_memberships: []` → **TEST 1 ✅**.
- **Tenant isolation (TEST 9)** — synthetic Riyadh (`org 2`) `organization_admin`, rolled back: sees `0` of Altus's training_progress / hotels / knowledge_chunks / other-org memberships / `platform_users` / `platform_audit_logs`, cannot read the Altus `organizations` row. The only cross-tenant-visible Altus rows are the 2 `is_master_template` courses + 1 master document (by design) and the user's own membership row. **✅**
- **`get_advisors` (security):** the one new ERROR (`rls_disabled` on the C2 backup table) was fixed by migration `c2_backup_table_rls`. Remaining WARNs are all pre-existing (SECURITY DEFINER executable notices — functions self-authorize; `auth_leaked_password_protection` is a dashboard toggle).

### Open follow-ups (not blocking the acceptance tests)

1. **Operator content-read without a session.** A platform operator (no membership, no break-glass session) can still `SELECT` tenant `courses` / `documents` / `training_progress` / `organization_memberships` because those policies grant operators direct read via `is_platform_operator()` / `is_platform_super_admin()`. Isolation *between tenants* holds; this is only the operator's own reach. The audited break-glass model was meant to be the boundary for operator↔tenant-data. Decision needed: gate operator content-reads on an active `platform_access_session` (≈40 policies) vs. accept it as "the platform owner may manage a tenant" (spec §2). Left as-is for now — changing 40 policies without staging is riskier than the finding.
2. Self-service password reset / session revoke in the Platform User Directory (needs an auth-admin edge function).
3. Delete the junk `"test"` master-template course.
4. Cosmetic: rename the `altus_*` `localStorage`/`sessionStorage` key prefix to `prime_*`; rebrand "Altus Advisory" chrome strings to Prime Connect (Altus stays a tenant name only).
