# Prime Connect — Platform vs Tenant Architecture Audit

**Date:** 2026-09-08
**Scope:** Authentication → role resolution → tenant mapping → context → routing → navigation → data, for the `admin@prime.com` System Owner case and the broader multi-tenant model.
**Method:** Static trace of `master` (HEAD `bebfc1d`) + live inspection of Supabase project `dhbfaclkfysqwfppuxxa` (RPCs, tables, seed rows, RLS helpers). No code changed.

---

## TL;DR

The **backend is correct**. `resolve_account_context()` executed as `admin@prime.com` returns exactly what the spec demands:

```json
{
  "is_platform_operator": true,
  "platform_roles": ["system_owner"],
  "primary_organization_id": null,
  "recommended_destination": "/platform",
  "tenant_memberships": [{ "organization_name": "Altus Hospitality Group", "role": "organization_owner" }]
}
```

The identity model (`platform_users` + `platform_role_assignments`), the RLS helpers (`is_platform_operator`, `platform_operator_can`), the break-glass session model (`platform_access_sessions` + `start_platform_session`), and the `/platform/*` route guards (`PlatformRoute`) are all real and structurally sound.

**The defect is in one place: `src/contexts/TenantContext.tsx`.** It re-derives a platform operator's "current organization" on every mount from `localStorage` + `window.location.pathname` heuristics instead of trusting `resolve_account_context` (`primary_organization_id: null`). Every other symptom the brief describes — Altus branding, tenant nav, wrong dashboard, context lost on refresh — is a *downstream render* of that one wrong decision. There is also a **legacy seed-data problem**: the System Owner accounts are themselves `organization_owner` members of Altus, which is the literal "Altus = the platform" mapping the brief wants removed.

Fix the `TenantContext` bootstrap + remove the operator→Altus memberships and TEST 1–3 pass without touching route guards, RLS, or navigation.

---

## 1. Authentication Problem — *why `admin@prime.com` currently enters Altus*

**Severity: CRITICAL (frontend state) — the backend is not at fault.**

Chain as it actually runs today:

| Step | Component | Behavior | Verdict |
|---|---|---|---|
| Sign in | `LoginView.tsx` | sets `loginSuccess`, no manual navigation | ✅ clean |
| Redirect | `PublicOnlyRoute` / `RootIndex` | `isPlatformOperator && !activePlatformSession` → `/platform`, writes `active_tenant_id_<uid> = __platform__` | ✅ correct |
| `/platform` guard | `PlatformRoute` | requires `account.isPlatformOperator`; if `currentOrganization` is set, calls `returnToPlatformScope()` | ✅ self-heals |
| **Tenant context** | **`TenantContext.fetchTenantData()`** | **for an operator, decides `currentOrganization` from `localStorage` + `pathname.startsWith('/platform')`** | ❌ **root cause** |

`TenantContext.tsx` lines 118–177 (`isPlatformAdmin` branch):

```ts
const storedOrgId = safeLocalStorage.getItem(`active_tenant_id_${user.id}`)
                 || safeLocalStorage.getItem('altus_active_tenant_id')   // ← NOT user-scoped
// platform scope only if on a /platform route, or stored value is empty / '__platform__'
if (isPlatformRoute || !storedOrgId || storedOrgId === '__platform__') { /* platform scope */ }
const selectedOrg = fetchedOrgs.find(o => o.id === storedOrgId)
if (selectedOrg) { setCurrentOrganization(selectedOrg); return }        // ← silently enters a tenant
```

Failure modes that all end in "operator is inside Altus":

1. **Stale/polluted `localStorage`.** Any historical value in `active_tenant_id_<uid>` (from before the operator model, or a prior break-glass session that didn't clean up) is restored as `currentOrganization` on any non-`/platform` route (`/`, `/dashboard`, `/training`, a deep link, a stale nav link).
2. **Cross-user global key.** `altus_active_tenant_id` is **not** user-scoped and is read as a fallback. Two users on one browser (kiosk, shared laptop, QA) → the operator inherits the previous user's tenant selection.
3. **`resolve_account_context` transient failure.** `AccountContext` retries 3× then falls back to `EMPTY` (`is_platform_operator: false`). The operator is then processed as **step 4 "Tenant Users Handling"**: one membership (Altus) → `isMultiTenant` false → `initialOrg = Altus`, and `active_tenant_id_<uid>` is **written to Altus's id** (line 212) — poisoning every subsequent load per failure mode 1.
4. **Landing on `/` or `/dashboard` first** (SPA deep-link, bookmark, refresh) instead of `/login`: `RootIndex` still routes correctly, but `TenantContext` runs in parallel and can set Altus before/around the redirect; the operator briefly (or persistently, given 1) sees tenant chrome.

**Why it's not the backend:** `resolve_account_context()` is `SECURITY DEFINER`, `EXECUTE` granted to `authenticated`, and returns `is_platform_operator: true` / `recommended_destination: '/platform'` / `primary_organization_id: null` for `641ac54a…` (verified by direct execution with `request.jwt.claims.sub` set). `is_platform_operator('641ac54a…')` = `true` (`platform_users` row, `is_active`, plus an un-revoked `system_owner` assignment).

---

## 2. Role Problem — *how platform/system roles are currently resolved*

**Severity: REQUIRED (cleanup) — model is correct, legacy residue remains.**

- **Platform roles** live in `platform_role_assignments.platform_role` (enum: `system_owner`, `platform_admin`, `platform_training_manager`, `platform_knowledge_manager`, `platform_support`, `platform_operations`, `platform_instructor`). Resolution: `is_platform_operator()` (any active `platform_users` row) + `platform_operator_has_role()` / `platform_operator_can()` (static permission matrix). `legacy_role_fallback_enabled = false` in `platform_config`, so `user_roles` no longer grants operator status. ✅
- **Tenant roles** live in `organization_memberships.role` (enum `membership_role`: `organization_owner` … `learner`). Resolved by `is_tenant_admin` / `is_tenant_content_editor` / `is_tenant_people_admin` + `org_visible()`. ✅
- **Legacy `user_roles`** (`app_role` enum: `super_admin`, `corporate_admin`, `administrator`, `training_manager`, …) still exists and still drives: `ProtectedRoute` `allowedRoles`, `usePermissions`, `src/config/navigation.ts` `canAccessRoute`/`canSeeGroup` (both hard-code `role !== 'super_admin'` for the platform group), and every `/admin/*` (tenant-admin) page.

**Residue that matters:**
- `admin@prime.com` `user_roles` = `{administrator, training_manager, learner, super_admin}`. `super_admin` here is what makes `primaryRole` resolve high enough for `/admin/*` tenant screens and for the `navigation.ts` legacy platform-group gate. A platform operator's ability to see the console should not depend on a *tenant* `app_role` row.
- `navigation.ts:645` & `:655` still gate the platform nav group on the string `'super_admin'`. `useNavigation` *also* gates on `account.isPlatformOperator` (and maps operators to `effectiveRole='super_admin'`), so today the redundant check passes — but a platform operator who is **not** `super_admin` in `user_roles` (e.g. `platform_support` seed users, or `2dc33cc2` the fresh `platform_admin`) would be filtered out by the legacy check inside `getRoutesForRole`. Fragile.

---

## 3. Tenant Problem — *how tenant membership is currently represented*

**Severity: REQUIRED.**

- `organization_memberships` **is** a proper join table: `(user_id, organization_id, role, brand_id, hotel_id, department_id, is_primary, is_active)`. Multi-tenant membership is already expressible. ✅ (matches brief §8)
- **But the System Owner is seeded as a tenant member.** Both `admin@prime.com` (`ab88557a…`) and `islam.mahrous@gmail.com` (`2fef058f…`) have `organization_memberships` rows → Altus, `role = organization_owner`, `is_primary = true`, created `2026-08-31T01:28:23`. This is the "Altus = default org" assumption in seed form. `resolve_account_context` correctly *ignores* it for routing (operator branch forces `primary_organization_id = null`), but `TenantContext` does not, and the row makes the operator a legitimate RLS-level owner of Altus data with no audit trail.
- Only **2 organizations** exist: Altus (`…001`) and Riyadh Luxury Hospitality Group (`…002`). Both `active`.

---

## 4. Context Problem — *how current tenant context is established*

**Severity: CRITICAL — this is the fix site.**

Three parallel sources of truth for "what org am I in":

| Source | Authoritative? | Used by |
|---|---|---|
| `resolve_account_context().primary_organization_id` (server) | ✅ should be | `AccountContext`, route redirects |
| `platform_access_sessions` (server, break-glass) | ✅ | `TenantContext` impersonation branch, `resolve_account_context` |
| `localStorage['active_tenant_id_<uid>']` + `['altus_active_tenant_id']` + `window.location.pathname` | ❌ heuristic | **`TenantContext.fetchTenantData` — decides `currentOrganization` for operators** |

`TenantContext` never consults `account.primaryOrganizationId`. For a non-operator it uses `account.isMultiOrg` / `account.primaryOrganizationId` as *hints* but still lets `localStorage` win. For an operator it uses `localStorage`/`pathname` **only**. Result: context is reconstructed, not resolved, and it drifts on every navigation and every refresh (brief §15 "refreshing loses context", "switching tenants leaves stale info", "URLs don't represent context").

There is also **no tenant id in the URL**. `/platform/*` = platform; everything else = "whatever `TenantContext` last decided". A refresh on `/training` cannot know which tenant it meant.

---

## 5. Routing Problem — *how routes and redirects determine the destination*

**Severity: UX (mostly correct) + one CRITICAL interaction.**

Correct today:
- `PublicOnlyRoute`, `RootIndex`, `LegacyAnalyticsRedirect` all branch on `account.isPlatformOperator && !account.activePlatformSession` → `/platform`. ✅
- `PlatformRoute` gates `/platform/*` on `account.isPlatformOperator` + coarse permission, and force-exits a stray tenant context. ✅
- `ProtectedRoute` lets `operatorInSession` (operator with active break-glass session) through org/role guards without weakening them for anyone else. ✅ (matches brief §12)

Problems:
- **`/dashboard` is context-ambiguous.** It renders a tenant/corporate cockpit (`CorporateExecutiveBento` → links to `/admin/organization`, `/admin/audit-logs`) whenever `currentOrganization` is set — which for a mis-bootstrapped operator is Altus. `PlatformOverviewCockpit` exists but only shows in platform scope.
- **No tenant-scoped route namespace.** Tenant pages (`/training`, `/knowledge`, `/admin/*`) are not under `/t/:orgId/…`, so the router can't validate or restore tenant context, and can't stop an operator's stale Altus context from "bleeding" onto them.
- `TenantContextGuard` treats `/training/player/*` as auto-"master mode" for any operator (`isMasterMode` line 68) — a reasonable shortcut but it means an operator hitting a tenant deep link to the player silently gets master-content semantics rather than being told to enter a tenant.

---

## 6. LMS Problem — *what's missing for platform-level LMS administration*

**Severity: REQUIRED (partially built).**

Exists at platform level (`/platform/master-library`, `MasterContentLibrary.tsx`, guarded `master_content.manage`):
- `deploy_master_content(master_id, type, org_id)` atomic RPC + `master_content_deployments` (operator-only RLS).
- Master templates flagged on `documents` / `courses` (`is_master_template`), cross-tenant SELECT closed (migration `…233000`).

Missing / thin for a real "Master LMS Administration environment":
- **No master authoring surface for the full LMS graph.** `MasterContentLibrary` manages master *documents/SOPs* and deploy actions; there is no platform-level editor for master **courses → modules → lessons → lesson blocks → quizzes/assessments → learning paths → certificates**. The tenant `TrainingBuilder` is the only editor and it writes tenant-scoped rows.
- **No cross-tenant assignment UI.** `deploy_master_content` copies content into a tenant; there is no "assign this master course to Tenant A / Tenant B with due dates" flow, and no platform view of `training_assignment_rules` across tenants (brief §6).
- **No platform LMS reporting.** `get_platform_usage_analytics()` gives per-org rollups (learners, completions); there is no platform view of *a specific master course's* adoption/progress/results across tenants.
- **Ownership model for deployed content is copy-on-deploy** (each tenant gets its own rows). That satisfies "each tenant has its own ownership, progress, reporting" (brief §5) but there is **no link back** from a deployed course to its master, so "master changed → propagate" is impossible. Decide explicitly: copy-only (simplest, matches brief's "don't over-engineer") vs. linked.

---

## 7. User Directory Problem — *what administrative capabilities are missing*

**Severity: REQUIRED.**

`/platform/users` (`PlatformUserDirectory.tsx`, guarded `operator.manage`) + `get_platform_user_directory()` RPC exist. Present: list, search, view, platform-role assign/revoke (`assign_platform_role`/`revoke_platform_role`), `set_platform_user_active`.

Missing vs brief §7:
- **Tenant membership management** — add / remove / move a user between tenants, set per-tenant role, manage "tenant administrator" status. `platform_set_membership()` RPC exists (operator or tenant people-admin, non-destructive) but is **not wired** into the directory UI.
- Filter / sort (status, tenant, platform role, last active).
- Per-user learning status / activity view at platform level.
- Reset/revoke access (password reset trigger, session revoke) from the directory.
- The directory `navigate('/admin/users')` links (lines 901, 1017) bounce the operator into the **tenant** user-management screen — a platform/tenant mixing (brief §15).
- Directory currently lists **all** `auth.users`; needs an explicit "platform staff vs tenant users" facet.

---

## 8. Security Problem — *tenant-isolation / authorization risks*

**Severity: mixed. No new CRITICAL found in this pass; prior battery passed.**

- **Operator-as-tenant-owner (REQUIRED).** The seeded `organization_owner` memberships for `admin@prime.com` / `islam` mean those two accounts pass tenant-owner RLS on Altus **without a break-glass session and without audit**. Break-glass (`start_platform_session`, ≥10-char reason, TTL, immutable `platform_audit_logs`) is the intended path and is bypassed by the membership row.
- **`platform_role_assignments` self-grant history.** `641ac54a` shows self-`granted_by` rows (`system_owner` granted by itself `2026-09-05`). Confirm `assign_platform_role` cannot be called by a non-`platform_admin`, and that the initial seed is the only self-grant. (Prior work claims `assign_platform_role` is `platform_admin`-gated and audited — re-verify post-divergence.)
- **Tenant isolation (previously verified, NOT re-run here).** The 2026-08-31 "§74 battery" (synthetic Org B, rolled back) passed: 0 cross-tenant reads on orgs/hotels/courses/docs/progress/memberships/audit/subscriptions/knowledge_chunks/certs/questions; cannot self-insert `platform_users`/`platform_role_assignments`/`user_roles`; cannot swap `membership.organization_id`; every privileged RPC blocked. **Recommend re-running against current `master` before sign-off** — the commit history diverged from the documented control-plane branch (HEAD is `bebfc1d "Add multi-tenant platform features…"`, not the documented `281c93f`).
- **`get_advisors` (security)** last known 0 ERROR; re-run.
- Legacy `_legacy_platform_fallback` is disabled by config but still *exists* and is wired into `is_platform_super_admin` / `is_platform_user`. Flipping `platform_config.legacy_role_fallback_enabled = true` silently re-grants operator status to every `super_admin`/`corporate_admin`/`administrator` in `user_roles`. Keep disabled; consider dropping the fallback entirely once confident.

---

## 9. Legacy Architecture — *what still assumes Altus is primary/default*

**Severity: REQUIRED.**

| Location | Assumption | Action |
|---|---|---|
| `organization_memberships` seed rows for `641ac54a` + `5aa53b85` | System Owners are `organization_owner` of Altus | **Delete** (or convert to explicit, audited grants) |
| `TenantContext.tsx` | operator "current org" from `localStorage`/`pathname` | rebuild on `account.primaryOrganizationId` (§4) |
| `localStorage` key `altus_active_tenant_id` (global, not user-scoped) | one active tenant per browser | replace with `active_tenant_id_<uid>` only; delete the global key |
| `localStorage`/`sessionStorage` prefix `altus_*` (≈20 keys) | product is "Altus" | cosmetic; rename to `prime_*` opportunistically, keep a read-fallback |
| Branding strings: "Altus Advisory", "Altus Copilot", `AltusCopilotDrawer`, `AltusCopilotTrigger`, login logo alt text, `PublicNavbar` "About Altus" | product = Altus | cosmetic rebrand to Prime Connect; **Altus should be just a tenant name**, surfaced only inside tenant context |
| `AltusCopilotDrawer.tsx:114` `profile?.property?.name \|\| 'Altus Luxury Hotel'` | default property | replace hardcoded default |
| `src/hooks/useCompanies.ts` + `/admin/companies` | old `companies` tier | dead code per prior notes; delete |
| `navigation.ts` platform-group gate `role !== 'super_admin'` | operator == tenant super_admin | gate on `isPlatformOperator` |

No hardcoded `e0000000-…-001` in application code (only in one test file). Good.

---

## 10. Required Changes — *minimum to correct the architecture*

### CRITICAL — do first (makes TEST 1, 2, 3 pass)

**C1. Rebuild `TenantContext` bootstrap around the server result.**
- Operator, no active `platform_access_session` → `currentOrganization = null`, unconditionally. Ignore `localStorage` for operators except an explicit in-session tenant.
- Operator with active session → `currentOrganization` = the session's `target_organization` (already handled).
- Non-operator → `currentOrganization` from `account.primaryOrganizationId` when single-org; require explicit selection when `account.isMultiOrg` and no valid stored choice. `localStorage` may only *cache* a choice that is re-validated against `account.tenantMemberships` every load.
- Delete reads/writes of the global `altus_active_tenant_id`; user-scope only.
- On `resolve_account_context` failure, render an explicit error state — **never** fall through to "treat as tenant user".

**C2. Remove the legacy Altus mapping for System Owners.**
- `DELETE FROM organization_memberships WHERE user_id IN ('641ac54a…','5aa53b85…') AND organization_id = 'e0000000-…-001';` (migration).
- Confirm `resolve_account_context` for both now returns `tenant_memberships: []`, `is_platform_operator: true`, `recommended_destination: '/platform'`.

**C3. Clear poisoned client state on deploy.** One-time: on app boot, if `isPlatformOperator` and no active session, purge `active_tenant_id_<uid>` and `altus_active_tenant_id`.

### REQUIRED — architecture completion

- **R1. Decouple platform-console visibility from `user_roles`.** `navigation.ts` `canAccessRoute`/`canSeeGroup`: gate `platform_operations` on an `isPlatformOperator` flag passed in, not `role === 'super_admin'`.
- **R2. Tenant-scoped route namespace.** Introduce `/t/:orgId/*` (or a validated `?org=` on tenant routes) so context is in the URL, survives refresh, and the router can reject a mismatched stale context. Redirect legacy `/training` etc. through a resolver that supplies the operator's/session's org.
- **R3. Context banner + "Return to Platform".** Persistent, unmissable "Current context: Altus Hospitality Group (break-glass session, expires 14:32)" bar whenever an operator has a tenant context; one-click return. (`FacetedScopeCapsule` is close — make it authoritative and always-visible in tenant scope.)
- **R4. Wire `platform_set_membership` into `PlatformUserDirectory`** — add/remove/move tenant membership, per-tenant role, tenant-admin toggle. Add status/tenant/role filters + sort. Replace `navigate('/admin/users')` with in-place platform actions.
- **R5. Master LMS.** Extend `MasterContentLibrary` (or a new `/platform/master-lms`) to author the master course graph using the **existing** builder components in a `master` mode; add a cross-tenant assignment action (`master course → select tenant(s) → due date`), reusing `deploy_master_content` + `training_assignment_rules`. Add a platform view of a master course's cross-tenant adoption from existing analytics RPCs. **Do not** build a new LMS or a propagation engine unless the product decision in §6 requires it.
- **R6. Re-run tenant-isolation battery + `get_advisors` against current `master`** (history diverged from the documented control-plane branch).

### UX

- U1. `/dashboard` for an operator with no tenant context → redirect to `/platform` (or render `PlatformOverviewCockpit` only).
- U2. Platform User Directory: "Platform staff" vs "Tenant users" facet.
- U3. Rebrand Altus → Prime Connect in chrome; keep "Altus Hospitality Group" strictly as tenant data.
- U4. Stale-context cleanup: `queryClient.clear()` already happens on switch/exit — add it on operator boot-purge (C3) too.

### OPTIONAL — DO NOT IMPLEMENT NOW

- Linked (non-copy) master content with change propagation.
- SSO/SCIM/`identity_providers` runtime (scaffold only exists).
- Per-tenant sub-domains / custom domains.
- A dedicated impersonation product beyond the existing break-glass session.
- Collapsing `user_roles` into `membership_role` (large, risky, low value now).

---

## Acceptance Test forecast (post C1–C3 unless noted)

| Test | Today | After C1–C3 | Needs |
|---|---|---|---|
| **1. System Owner → Platform** | ❌ intermittent (lands in Altus) | ✅ | C1, C2, C3 |
| **2. System Owner → Tenant (break-glass)** | ✅ works (`start_platform_session`) | ✅ | — |
| **3. Return to Platform** | ⚠️ works but stale chrome/context lingers | ✅ | C1 + R3 |
| **4. Tenant Admin → their tenant** | ✅ (`resolve_account_context` → `/admin`) | ✅ | verify a real tenant-admin account exists |
| **5. Multi-tenant user switch** | ⚠️ selection works; stale data risk on switch | ✅ | C1 + R2 |
| **6. Platform → Master LMS** | ⚠️ partial (docs/deploy only) | ⚠️ | R5 |
| **7. Cross-tenant assignment** | ❌ no UI | ❌ | R5 |
| **8. Platform user management** | ⚠️ roles only, no membership mgmt | ⚠️ | R4 |
| **9. Tenant isolation (A cannot see B)** | ✅ per prior battery (not re-run) | ✅ | R6 to confirm |

---

## Appendix — verified facts (live DB, 2026-09-08)

- `platform_users`: 5 rows incl. `641ac54a` ("Designated Platform Owner / System Owner", `is_active`) and `5aa53b85`.
- `platform_role_assignments` (active): `5aa53b85`→`system_owner`; `641ac54a`→`system_owner` (granted `2026-09-05`, `platform_admin` revoked same day); `496e2969`→`system_owner`+`platform_support`; `2dc33cc2`→`platform_admin`; `48ca233f`→`platform_support`.
- `platform_config.legacy_role_fallback_enabled = false`.
- `admin@prime.com` `user_roles` = `{administrator, training_manager, learner, super_admin}`; `organization_memberships` = 1 row → Altus `organization_owner` `is_primary`.
- `resolve_account_context()` as `641ac54a`: `is_platform_operator=true`, `platform_roles=["system_owner"]`, `platform_permissions=` all 8, `primary_organization_id=null`, `recommended_destination="/platform"`, `active_platform_session=null`, `tenant_memberships=[Altus/organization_owner]`.
- `platform_access_sessions`: no active row for `641ac54a`; history shows successful break-glass entries into both orgs as recently as `2026-09-08 16:24` (the operator *can* reach the console and enter tenants today).
- Organizations: Altus (`…001`, active), Riyadh Luxury Hospitality Group (`…002`, active).
- Route guards (`PlatformRoute`, `ProtectedRoute`, `PublicOnlyRoute`, `RootIndex`) branch on `account.isPlatformOperator` correctly.
- `useNavigation` gates the platform nav group on `account.isPlatformOperator`; `navigation.ts` helpers still also hard-check `role === 'super_admin'` (redundant today, fragile).
