# Full-Stack System Audit — Altus Connect (prime-hotels-intranet)

**Date:** 2026-08-16
**Target:** live Supabase project `dhbfaclkfysqwfppuxxa`, repo at commit `4c2db7b` (branch `master`)
**Scope:** React 19 frontend (124,767 LOC / 959 files), 208 Postgres tables, 642 RLS policies, 286 functions, 25 views, 143 triggers, 40+ deployed Edge Functions, 16 storage buckets.

Every finding marked **VERIFIED** was reproduced against the live database inside a `BEGIN … ROLLBACK` transaction impersonating a real low-privilege user (`ammar`, role `staff`, id `ffd0d9ae-…`). No production data was modified.

---

## 1. Executive Summary

**Overall system health: functional, well-tested at the tooling layer, but with a live, exploitable authorization hole in the database.**

The build is clean: `tsc --noEmit` passes with zero errors, ESLint reports 0 errors (1,196 warnings), and all 213 tests across 25 files pass. RLS is enabled on 100% of the 208 public tables, all 25 views are `security_invoker = true`, every table has a primary key, and there are **zero unindexed foreign keys**. The Supabase advisor reports no ERROR-level security lints. Secret hygiene is correct — only the `anon` key appears in the production bundle, no AI provider keys are exposed via `VITE_*`, and sourcemaps are `hidden` and deleted after Sentry upload.

That surface hides the core problem. **Three `property_isolation_*` RLS policies are declared `FOR ALL … USING check_property_access(property_id)` with no `WITH CHECK` clause.** Postgres falls back to the `USING` expression for the write check, and `check_property_access(NULL)` returns `TRUE` unconditionally. The result, verified live:

- a `staff`-level employee **deleted all 64 training modules** (rolled back),
- the same user **deleted 12 departments**, and
- **inserted a company-wide announcement** attributed to themselves.

Because permissive RLS policies OR together, the correctly-written `training_modules_insert_admins` / `consolidated_announcements_insert` / `departments_modify_admin_pm` policies sitting alongside them provide no protection at all. The frontend `PERMISSION_CONFIG` correctly restricts these actions to admins — which is precisely the "frontend authorization is not security" failure mode: anyone with a browser devtools console and the `anon` key (published in the bundle by design) can bypass it.

Beyond that: every authenticated employee can read every other employee's complete HR profile row including `national_id`, `iqama_number`, `date_of_birth`, `salary_grade` and account-lockout state (`profiles_select_public USING (true)`); an **unauthenticated** attacker can lock any employee's account indefinitely via the anon-executable `record_failed_login_attempt`; and any authenticated user can write forged, actor-less rows into the `system_events` audit log.

**Severity is calibrated to a pre-production dataset.** The system currently holds 7 profiles, 3,359 audit events and 183 documents; `national_id`, `iqama_number` and `salary_grade` are `NULL` for all 7 rows. The PII exposure is therefore a **latent** breach — the policy is wrong today, the data simply is not there yet. The destructive write findings are **not** latent: 64 training modules and 60 departments are real content that a staff account can destroy right now.

| Layer | Health |
|---|---|
| Security posture | **Poor** — 3 verified privilege-bypass paths, 1 unauthenticated DoS, audit log user-writable |
| Database health | **Good structurally** — full PK/FK/index coverage, RLS everywhere; **poor in policy correctness** |
| Backend / RPC | **Mixed** — 286 functions, several `SECURITY DEFINER` IDORs trusting caller-supplied `user_id`/`role` |
| Frontend (React) | **Good** — clean types, disciplined auth context, DOMPurify pipeline; 2 unsanitized XSS sinks |
| Performance | **Adequate at current scale, will not hold** — 41 N+1 sites, ~499 unbounded queries vs. `max_rows=1000` |
| Reliability | **Fragile** — roles-load failure produces a permanent spinner; 122/633 catch blocks swallow errors |
| Testing | **Insufficient** — 25 test files for 959 source files; **zero** RLS, authz or DB tests |
| Production readiness | **54 / 100 — not ready** (see §18) |

---

## 2. Architecture Map

```
Browser (React 19 + Vite 7)
 ├─ main.tsx → App.tsx → AppProviders → RouterProvider (react-router 7, createBrowserRouter)
 ├─ Auth: AuthContext split into 4 contexts
 │    AuthIdentityContext   — Supabase User, getSession() on boot, getUser() on tab resume,
 │                            refreshSession() recovery, visibility-change revalidation (500ms/2s debounce)
 │    UserDataContext       — useUserDataLoader: profile + user_roles + user_properties + user_departments
 │    AuthActionsContext    — signIn/signOut/password flows
 │    AuthSecurityContext   — session timeout, lockout
 ├─ Authorization (client-side only): usePermissions → PERMISSION_CONFIG (34 permissions)
 │                                    features/access/policy.ts → canRoleAccess()
 │                                    ProtectedRoute (allowedRoles | requiredPermission | property/dept scope)
 ├─ Routing: 14 lazily-loaded route modules (Admin, HR, Operations, Housekeeping, Commercial,
 │           Procurement, Finance, Training, Knowledge, Media, Dashboard, Misc, Auth, Public)
 ├─ Server state: @tanstack/react-query (staleTime 2m, gcTime 5m, refetchOnMount:false,
 │                refetchOnWindowFocus:false, retry only on status 0 or >=500)
 ├─ Data access: 1,508 `.from()` call sites + 140 `.rpc()` call sites, spread across
 │               18 services + ~120 hooks + inline component queries (no single data layer)
 └─ Rendering: 30 dangerouslySetInnerHTML sinks → lib/sanitize.ts → lib/security.ts sanitizeHtml()
               (DOMPurify + afterSanitizeAttributes hook: rel-hardening, javascript:/data: strip,
                iframe origin allowlist + forced sandbox, event-handler strip)

Supabase (project dhbfaclkfysqwfppuxxa)
 ├─ Auth: GoTrue, session in localStorage, detectSessionInUrl:false (manual token handling in
 │        ResetPassword.tsx / CompleteInvite.tsx: code → token_hash → access/refresh → getSession)
 ├─ Postgres 17: 208 tables · 642 policies · 286 functions · 25 views · 143 triggers · pg_cron · pg_net
 │    Authz helpers: has_role, has_any_role, is_admin, is_hr_or_admin, is_regional_admin_or_higher,
 │                   has_property_access, has_profile_access, check_property_access,
 │                   get_role_priority / get_user_role_priority (role ladder on user_roles)
 │    Role enum (app_role): super_admin > corporate_admin > regional_admin > regional_hr >
 │                          property_manager > property_hr > department_head > manager > staff
 ├─ Edge Functions: 40+ deployed. 4 public (verify_jwt=false): slack-commands, slack-events,
 │                  slack-interactive + public-forgot-password. Slack fns verify HMAC-SHA256
 │                  signature + 5-minute timestamp window (correct).
 └─ Storage: 16 buckets. Public: avatars, content-media. Private: documents, employee-documents,
             payslips, expense-receipts, requests, media, resumes, referral-cvs, reports-exports,
             task-attachments, training-content, sop-attachments, maintenance-attachments,
             announcement-attachments. All have MIME allowlists + size limits.
```

**Authorization is expressed in three places that can drift independently:** the frontend `PERMISSION_CONFIG` map, the `role_permissions` table (101 rows, world-readable), and 642 RLS policies. Nothing reconciles them. Finding SEC-01/02/03 is exactly this drift made concrete.

---

## 3. Critical Issues — P0

### SEC-01 — Any authenticated user can destroy or rewrite all global training modules

- **Severity:** P0
- **Category:** Broken access control / destructive write
- **Component:** Database — RLS
- **Location:** policy `property_isolation_training_modules` on `public.training_modules`
- **Problem:** The policy is `FOR ALL TO public USING (check_property_access(property_id))` with `with_check = NULL`. Postgres uses the `USING` expression as the `WITH CHECK` when the latter is omitted, so it governs INSERT/UPDATE/DELETE as well as SELECT. `check_property_access()` returns `TRUE` immediately when `required_property_id IS NULL`. All 64 training modules have `property_id IS NULL`.
- **Evidence (VERIFIED, rolled back):**
  ```sql
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ffd0d9ae-...","role":"authenticated"}';  -- role: staff
  with d as (delete from training_modules where property_id is null returning 1)
  select count(*) from d;   -- → 64
  with u as (update training_modules set title='HIJACKED' where property_id is null returning 1)
  select count(*) from u;   -- → 64
  ```
- **Root cause:** A "property isolation" policy written as a *read* filter was declared `FOR ALL`. `NULL` was chosen to mean "global/everyone" for reads, and that semantic silently carried into writes.
- **Impact:** Complete loss of the training catalogue by any of the ~all employees. Also a stored-content injection vector into `TrainingPlayer` (see FE-01).
- **Exploit scenario:** Employee opens devtools, takes the `anon` key from the bundle and their own session JWT, and issues `DELETE /rest/v1/training_modules?property_id=is.null`. The UI never offers this action; PostgREST does not care.
- **Recommended fix:** Split the policy. Keep `FOR SELECT USING (check_property_access(property_id))`; drop the `FOR ALL` variant so the existing `training_modules_insert_admins` / `training_modules_update_admins` policies become the only write paths, and add a matching `FOR DELETE` admin policy.
- **Regression risk:** Low-medium. Verify admins can still create/edit/delete modules and that non-admins can still read global modules after the change.
- **Verification:** Re-run the two statements above as `staff` — both must return 0 rows; re-run as `regional_admin` — must still succeed.

### SEC-02 — Any authenticated user can delete departments in their own property

- **Severity:** P0
- **Category:** Broken access control / destructive write
- **Component:** Database — RLS
- **Location:** policy `property_isolation_departments` on `public.departments`
- **Problem:** Identical defect to SEC-01. Here `check_property_access(property_id)` also returns `TRUE` for any property the caller is assigned to, so scope is not limited to `NULL` rows.
- **Evidence (VERIFIED, rolled back):** as `staff` assigned to property `37e3a84a-…`, `DELETE FROM departments WHERE property_id='37e3a84a-…'` removed **12 rows**.
- **Root cause:** Same as SEC-01.
- **Impact:** Departments are referenced by `user_departments`, `leave_requests.department_id`, `documents`, `report_definitions` and the org chart. Deletion cascades or orphans across the HR domain.
- **Recommended fix:** Same as SEC-01 — demote to `FOR SELECT`; `departments_modify_admin_pm` already covers writes correctly.
- **Verification:** `staff` DELETE → 0 rows; `regional_admin` / scoped `property_manager` DELETE → unchanged.

### SEC-03 — Any authenticated user can publish a company-wide announcement

- **Severity:** P0
- **Category:** Broken access control / content spoofing
- **Component:** Database — RLS
- **Location:** policy `property_isolation_announcements` on `public.announcements`
- **Problem:** Same defect. `property_id = NULL` passes the check, so any employee can insert an announcement with global scope.
- **Evidence (VERIFIED, rolled back):**
  ```sql
  -- as staff
  insert into announcements (title, content, property_id, created_by)
  values ('PWNED-TEST','injected by staff', null, 'ffd0d9ae-...');   -- succeeded, 1 row
  ```
- **Impact:** On an intranet, the announcements feed is the most trusted channel in the product. A staff account can post an apparently-official notice to every employee — an ideal internal phishing vector ("HR: confirm your bank details at …"). It also bypasses the `announcements.create` permission the UI enforces.
- **Recommended fix:** Same as SEC-01. `consolidated_announcements_insert` and `announcements_update_admins` already exist and are correct.
- **Verification:** `staff` INSERT must fail with `42501`; admin INSERT unchanged.

> **Shared root cause note.** SEC-01/02/03 are three instances of one anti-pattern. A grep for `cmd='ALL' AND with_check IS NULL` across all 642 policies found exactly 14 policies; the other 11 are correctly gated (`user_id = auth.uid()`, `is_hr_or_admin()`, explicit role arrays). Only these three route through `check_property_access()`, whose `NULL → TRUE` behaviour is safe for reads and unsafe for writes.

> **Anon exposure — near miss, worth knowing.** These three policies are granted to the `{public}` role, which includes `anon`. They are *not* currently reachable unauthenticated only because `anon` lacks `EXECUTE` on `check_property_access` (`acl: postgres=X | authenticated=X | service_role=X`). An anon request today fails with `ERROR 42501: permission denied for function check_property_access` — an error, not an empty result. **A single future `GRANT EXECUTE … TO anon` would turn all three findings into unauthenticated read/write.** Fix the policies; do not rely on the missing grant.

---

## 4. High Issues — P1

### SEC-04 — Every employee can read every other employee's full HR record

- **Severity:** P1 (would be P0 with production HR data loaded)
- **Category:** Sensitive data exposure / excessive RLS grant
- **Component:** Database — RLS
- **Location:** policy `profiles_select_public` on `public.profiles` — `FOR SELECT TO authenticated USING (true)`
- **Problem:** `profiles` is a 40-column table that mixes directory data (name, job title, avatar) with regulated HR data and account-security state. There is exactly one SELECT policy and it is unconditional. There is no column-level grant and no restricted view for directory use.
- **Exposed columns:** `national_id`, `iqama_number`, `iqama_expiry`, `date_of_birth`, `salary_grade`, `phone`, `emergency_contact_name`, `emergency_contact_phone`, `blood_group`, `nationality`, `contract_end_date`, `staff_id`, plus security state `failed_login_attempts`, `locked_until`, `account_status`, `is_temp_password`, `force_password_reset`, `mfa_required`, `suspend_reason`, `last_login_at`.
- **Evidence (VERIFIED):** as `staff`, `SELECT … FROM profiles WHERE id <> me` returned all 6 other rows with every column readable.
- **Current exposure:** 7 profiles; `national_id`, `iqama_number`, `salary_grade` are `NULL` for all 7; `date_of_birth` populated for 7, `phone` for 6, `emergency_contact_phone` for 2. **This is a latent breach, not an active one** — the moment real onboarding data lands, every employee can enumerate every colleague's government ID and salary band.
- **Secondary impact:** `is_temp_password`, `force_password_reset` and `locked_until` are reconnaissance for an internal attacker picking targets.
- **Recommended fix:** Replace with a two-tier model — a `profiles_directory_v` view (`security_invoker`, safe columns only) for the directory/org-chart surfaces, and narrow `profiles` SELECT to `id = auth.uid() OR has_profile_access(auth.uid(), id)` (the helper already exists and is used correctly by `consolidated_profiles_update`). Repoint the ~40 frontend `.from('profiles')` sites that only need name/avatar/job_title.
- **Regression risk:** High — 40 call sites. Stage it: add the view, migrate call sites, then tighten the policy last.
- **Verification:** as `staff`, `select national_id from profiles where id <> auth.uid()` must return 0 rows; directory page must still render.

### SEC-05 — Unauthenticated account-lockout denial of service

- **Severity:** P1
- **Category:** Authentication / availability
- **Component:** Database RPC exposed via PostgREST
- **Location:** `public.record_failed_login_attempt(p_email text)` — `SECURITY DEFINER`, ACL `=X/postgres | anon=X | authenticated=X | service_role=X`
- **Problem:** The function increments `failed_login_attempts` and, at 5, sets `locked_until = now() + 30 minutes` and `account_status = 'locked'` for any email. It has **no caller check, no proof that a login was actually attempted, and no rate limit**. It is callable by `anon` at `POST /rest/v1/rpc/record_failed_login_attempt`.
- **Exploit scenario:** `for i in 1..5: POST {"p_email":"ceo@altus-advisory.com"}` locks the account for 30 minutes; a cron loop keeps every account in the company permanently locked. No authentication, no session, no rate limit. The victim cannot self-recover — `clear_failed_login_attempts` requires an authenticated session belonging to that same email, which the lockout prevents.
- **Note:** `lock_account` was previously hardened (duration capped at 60 min) and `clear_failed_login_attempts` was given an ownership check. This sibling function was missed and is strictly worse, because it *creates* the lock rather than extending it.
- **Recommended fix:** Do not let the client assert that a login failed. Move the counter increment into a server-side path that has observed the failure — either the `public-forgot-password`-style Edge Function pattern using the service-role key, or gate the RPC behind a server-issued nonce. If it must stay anon-callable, add an IP-keyed rate limit and require the caller to present the failed credential attempt.
- **Verification:** 6 unauthenticated calls with a victim email must not set `profiles.locked_until`.

### SEC-06 — Bulk role changes silently fail to revoke privileges

- **Severity:** P1
- **Category:** Broken access control / silent data-integrity failure
- **Component:** Frontend + RLS interaction
- **Location:** [useUserBulkOperations.ts:33](src/hooks/useUserBulkOperations.ts:33) `bulkAssignRole`
- **Problem:** The mutation upserts the new role, then deletes "stale" roles with `.delete().eq('user_id',…).in('role', staleRoles)`. The `user_roles` DELETE policy requires `get_role_priority(role) > get_user_role_priority(auth.uid())` — you may only remove roles *strictly below* your own. When the stale role outranks the actor, **the DELETE matches zero rows and returns no error**. PostgREST/Supabase treat that as success, `result.success++` fires, and the UI reports the role change as applied.
- **Evidence (VERIFIED, rolled back):** as `regional_hr`, `DELETE FROM user_roles WHERE user_id='496e2969-…' AND role='regional_admin'` → **0 rows deleted, no error raised**.
- **Impact:** An HR user "demotes" a `regional_admin` to `staff`. The UI says it worked. The target now holds **both** roles, and `primaryRole` resolution keeps the higher one. Privilege is never revoked, and nobody knows.
- **Root cause:** The same Postgres semantic that caused the historical `profiles` `WITH CHECK` bug — RLS write filters produce silent no-ops, not errors. Any code path that treats "no error" as "it happened" is unsafe against RLS.
- **Recommended fix:** Use `.delete(…).select()` and assert the returned row count matches `staleRoles.length`; on mismatch, surface an explicit "insufficient privilege to revoke role X" error and count the item as failed. Better: move the whole operation into a `SECURITY DEFINER` RPC that performs the check-and-swap atomically and raises on refusal.
- **Verification:** as `regional_hr`, attempt to demote a `regional_admin` through the UI — must show an error, not success.

### SEC-07 — Audit log is writable (and forgeable) by every authenticated user

- **Severity:** P1
- **Category:** Audit integrity
- **Component:** Database — RLS
- **Location:** policy `system_events_insert_own` on `public.system_events` — `WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL)`
- **Problem:** `system_events` is the audit table (3,359 rows, backing `audit_logs_v`, `security_audit_logs_v`, `pii_access_logs_v`, `activity_log_v`). The `actor_id IS NULL` branch lets any authenticated user insert rows with **no attributable actor** and arbitrary `event_type`, `entity_type`, `entity_id` and `metadata`.
- **Evidence (VERIFIED, rolled back):** as `staff`, inserted `{event_type:'audit', actor_id:null, entity_id:<admin uuid>, metadata:{action:'FORGED_BY_STAFF'}}` → 1 row inserted. The attacker cannot read it back (SELECT is limited to own/admin), which makes the pollution harder to notice, not harder to perform.
- **Impact:** Any incident investigation built on `system_events` can be poisoned — noise injection to bury a real event, or fabricated entries implicating another user. There is no append-only guarantee and no integrity check.
- **Recommended fix:** Restrict INSERT to `service_role` and to the `SECURITY DEFINER` logging functions (`log_security_event`, `log_pii_access`, the audit triggers) that already write it; drop the `actor_id IS NULL` branch for client callers. If clients must log, route through a definer RPC that stamps `actor_id := auth.uid()` server-side.
- **Verification:** direct `INSERT INTO system_events` as `authenticated` must fail; trigger-generated audit rows must continue to appear.

---

## 5. Medium Issues — P2

### FE-01 — Two unsanitized `dangerouslySetInnerHTML` sinks (stored XSS)

- **Location:** [BuilderCanvas.tsx:635](src/components/training/builder/BuilderCanvas.tsx:635) renders `previewingBlock.content` (DB-sourced training content block) raw; [SmartAICourseCreatorModal.tsx:882](src/components/training/hub/SmartAICourseCreatorModal.tsx:882) renders `section.rich_content` (raw LLM output) raw.
- **Context:** 28 of the 30 sinks correctly route through `sanitizeHtml()`. These two do not. `BuilderCanvas` is directly reachable from SEC-01 — a staff user who can write `training_modules`/content blocks can plant the payload.
- **Impact:** Session tokens live in `localStorage` (`persistSession: true`, `storage: createSafeStorage('local')`), so script execution on the app origin equals full account takeover of any admin who previews the block.
- **Fix:** wrap both in `sanitizeHtml()`. One-line changes.

### FE-02 — `TRUSTED_IFRAME_ORIGINS` allowlist is bypassable by prefix

- **Location:** [security.ts:83](src/lib/security.ts:83) — `TRUSTED_IFRAME_ORIGINS.some(origin => src.startsWith(origin) || src.startsWith(origin.replace('https:','http:')))`
- **Problem:** The list holds bare origins with no trailing `/`, so `https://vimeo.com.attacker.tld/login` satisfies `startsWith('https://vimeo.com')`. The hook then *adds* `sandbox="allow-scripts allow-same-origin"` and `allowfullscreen` to the attacker's frame.
- **Impact:** Arbitrary attacker-controlled content embedded inside the trusted intranet chrome — a pixel-perfect fake login prompt. Not same-origin XSS (the frame runs in the attacker's origin), but a strong phishing primitive.
- **Fix:** parse with `new URL(src)` and compare `url.origin` exactly against the allowlist; drop the `http:` downgrade branch.

### SEC-08 — `SECURITY DEFINER` RPCs trust caller-supplied identity and role

- **Locations:** `get_sidebar_counts(p_user_id, p_role, p_property_ids, p_department_ids, p_current_property_id)`, `get_dashboard_summary(p_user_id, p_scope_property_ids, p_roles, p_department_ids, p_property_ids)`, `get_vacation_balance(user_uuid, year)`, `get_user_pins_with_details(p_user_id)`, `get_task_completion_metrics(p_user_id, …)`, `get_next_shift(user_uuid)`, `get_comment_replies`, `get_document_comments_thread`, `get_document_viewers_by_department`, `get_expiring_documents`.
- **Problem:** All are `SECURITY DEFINER` (so RLS does not apply inside) and none compares its `p_user_id` argument to `auth.uid()` or validates the caller's actual role. `get_sidebar_counts` and `get_dashboard_summary` go further: they take the caller's **role and property scope as parameters**, so passing `p_role => 'regional_admin'` widens the query server-side.
- **Evidence (VERIFIED):** as `staff`, `get_sidebar_counts('641ac54a-…' /* corporate_admin */, 'regional_admin', null, null, null)` returned that admin's private counters: `{"unreadNotifications":3,"pendingApprovals":2,"pendingTraining":4,…}`.
- **Impact:** Cross-user information disclosure. Mostly counts and titles rather than record bodies — but `get_user_pins_with_details` returns document/task/announcement **titles** from tables the caller may not be able to read, and `get_vacation_balance` returns any employee's leave balance.
- **Fix:** For each, add `IF p_user_id IS DISTINCT FROM auth.uid() AND NOT is_hr_or_admin(auth.uid()) THEN RAISE EXCEPTION …`. For the two role-parameterised functions, derive role and scope from `auth.uid()` inside the function and ignore the parameters (keep the signature for compatibility, or drop the params in a follow-up).

### SEC-09 — Client-controlled rate limiting

- **Location:** `public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)`
- **Problem:** The caller supplies both the bucket key and the limit. A client wanting to bypass the limit passes a fresh key or a large `p_max_requests`. Conversely, an attacker who guesses another user's key (e.g. `login:victim@…`) can burn that bucket and deny them the feature.
- **Fix:** derive the key server-side from `auth.uid()` and a caller-supplied *action name* only; hold the limits in a server-side config table keyed by action.

### SEC-10 — Message recipients can rewrite message content and forge the sender

- **Location:** policy `consolidated_messages_update` on `public.messages`
- **Problem:** The expression ends with `… OR ((sender_id = auth.uid()) OR (recipient_id = auth.uid()))` in **both** `USING` and `WITH CHECK`. That trailing clause subsumes every preceding status-specific guard, making them dead. A recipient can therefore UPDATE any column of a message addressed to them.
- **Impact:** A user can rewrite the body of a message they received and change `sender_id`, fabricating a message "from" a manager to themselves — evidence fabrication in an HR dispute. Blast radius is limited to messages they are party to.
- **Fix:** remove the trailing catch-all; restrict recipient UPDATE to `status`/`read_at` via a column-limited definer RPC.

### REL-01 — Roles-load failure produces a permanent "Verifying access…" spinner

- **Location:** [useUserDataLoader.ts](src/contexts/auth/useUserDataLoader.ts) + [ProtectedRoute.tsx:64](src/components/auth/ProtectedRoute.tsx:64)
- **Problem:** When the `user_roles` query errors or exceeds its 10 s timeout, the loader logs a warning and calls `setRolesLoading(false)` while `roles` stays `[]`, so `primaryRole` is `null`. `ProtectedRoute` then evaluates `if (rolesLoading || !primaryRole) return <spinner/>` — `rolesLoading` is now false but `primaryRole` is still null, so the spinner renders **forever**, with no error, no retry and no way out but a manual reload.
- **Trigger:** one dropped request on a flaky connection, or a slow cold start.
- **Fix:** distinguish "loading" from "failed". Add a `rolesError` state, render an error panel with a retry button, and give `loadUserData` bounded retry with backoff.

### REL-02 — Permission-gated routes bounce authenticated users during the roles-load window

- **Location:** [ProtectedRoute.tsx:82](src/components/auth/ProtectedRoute.tsx:82)
- **Problem:** The `rolesLoading` guard sits *inside* the `if (allowedRoles && …)` block. A route declared with only `requiredPermission` skips it entirely and calls `hasPermission()`, which returns `false` whenever `primaryRole` is null. During the roles-load window the user is redirected to `/dashboard`.
- **Symptom:** hard-refresh or bookmark on a permission-only route intermittently kicks the user to the dashboard.
- **Fix:** hoist the `rolesLoading || !primaryRole` check above both branches.

### DATA-01 — Non-transactional multi-step bulk operations

- **Location:** [useUserBulkOperations.ts](src/hooks/useUserBulkOperations.ts) — 5 separate `for (const userId of userIds)` loops (role assign, property assign, department assign, activate/deactivate, delete).
- **Problem:** Each iteration performs 2–4 dependent round-trips (read current roles → upsert → delete stale → insert audit) with no transaction. A failure between steps leaves a half-applied state. Worse, the audit insert is *inside* the try, so a failed audit write increments `result.failed` for a user whose role change **already committed** — the reported outcome is wrong in both directions.
- **Fix:** move each bulk operation into a single `SECURITY DEFINER` RPC that runs per user inside one transaction and returns a per-user status array.

### PERF-01 — 41 confirmed N+1 query sites

- **Worst cases:** [useLeaveCoverage.ts:124](src/hooks/useLeaveCoverage.ts:124) issues `1 + 3N` **sequential** awaits (with 60 departments = 181 serial round-trips per widget render); [useDepartmentKPIs.ts:57](src/hooks/useDepartmentKPIs.ts:57) and [useKnowledgeCompliance.ts:85](src/hooks/useKnowledgeCompliance.ts:85) follow the same shape; `AnnouncementEditor` resolves audience by looping roles, then departments, then properties (3 loops × N).
- **Fix:** replace per-department count loops with one grouped query (`select department_id, count(*) … group by 1`) or a single RPC returning the whole coverage matrix.

### PERF-02 — ~499 unbounded list queries against a 1,000-row PostgREST ceiling

- **Evidence:** a static scan of all `.from(...).select(...)` chains lacking `.limit()`, `.range()`, `.single()`, `.maybeSingle()` or a count-head found 499 sites; the heaviest tables are `documents` (44), `profiles` (40), `user_properties` (29), `departments` (28), `training_modules` (19), `training_progress` (19). `supabase/config.toml` sets `max_rows = 1000`.
- **Impact:** Past 1,000 rows these queries **silently truncate**. Any client-side `.length`, `.filter().length` or `.reduce()` aggregate built on them becomes quietly wrong — no error, no warning. At today's row counts (largest table 3,359) this is already crossed by `system_events` and `analytics_events`.
- **Fix:** paginate with `.range()`, or push aggregates into RPCs / `count: 'exact', head: true`.

### SEC-11 — Auth tokens accepted from the query string

- **Location:** [ResetPassword.tsx:65](src/pages/auth/ResetPassword.tsx:65) and [CompleteInvite.tsx:90](src/pages/auth/CompleteInvite.tsx:90) — `hashParams.get('access_token') || queryParams.get('access_token')`.
- **Problem:** Supabase delivers these in the URL **fragment** precisely so they never leave the browser. Accepting them from the query string means that when such a link is used, the access and refresh tokens are transmitted in the HTTP request line — logged by the CDN/host, retained in browser history, and leaked via `Referer` to any third-party asset on the page. The later `history.replaceState` cleanup cannot undo a transmission that already happened.
- **Fix:** read `access_token`/`refresh_token` from the fragment only.

### OPS-01 — Dead migration-executing Edge Functions still deployed

- **Deployed and ACTIVE:** `apply-migrations`, `apply-slack-migration` (both one-shot helpers; the latter's own header says *"Run once then delete"*), plus `dummy-func` and `password-reminders-test`.
- **Assessment:** both migration functions correctly require `Bearer <SERVICE_ROLE_KEY>`, so they are **not** currently exploitable. They remain permanently-reachable endpoints that execute DDL, cron rescheduling and RLS-policy creation. `apply-migrations` also contains a fallback that POSTs raw SQL to `/rest/v1/` — a path that will not work as written and would fail confusingly if the primary path ever errored.
- **Fix:** delete all four deployments.

### OPS-02 — Repo/config drift will silently open two private functions

- **Problem:** `supabase/config.toml` declares 27 functions; 40+ are deployed. 22 functions on disk have no config block. Critically, config.toml marks **`send-email` and `security-monitor` as `verify_jwt = false`** while both are deployed with `verify_jwt = true`. A routine `supabase functions deploy` from this repo would flip production to the unsafe setting.
- **`send-email` today** checks only for the *presence* of an `Authorization` header, not its validity — it relies entirely on the platform's JWT gate. Losing that gate makes it an open mail relay sending from the company's verified Resend domain.
- **Fix:** set `verify_jwt = true` for both in config.toml, add blocks for the 22 unlisted functions, and add an in-handler role check to `send-email` rather than trusting the header's existence.

---

## 6. Low Issues — P3

| ID | Finding | Location |
|---|---|---|
| LOW-01 | Redirect cookie domain check hardcodes the retired `remal-connect.com`; on the live domains no `domain` attribute is ever set, so cross-subdomain post-login redirect preservation is silently inert | [authRedirect.ts](src/lib/authRedirect.ts) `cookies.set` |
| LOW-02 | `X-CSRF-Token` is captured once at module load and frozen into the Supabase client's global headers — never rotates, and is meaningless against bearer-token auth (no cookie-based session to protect) | [supabase.ts:68](src/lib/supabase.ts:68) |
| LOW-03 | Edge-function CORS returns any `http://localhost`, `127.0.0.1` or `192.168.x.x` origin as allowed **in production** | [_shared/cors.ts](supabase/functions/_shared/cors.ts) `resolveCorsOrigin` |
| LOW-04 | Public `content-media` bucket permits `image/svg+xml` up to 500 MB — SVG is an active-content format (executes on the Supabase storage origin, not the app origin) | `storage.buckets` |
| LOW-05 | Public `avatars` bucket makes every employee photo world-readable by URL, unauthenticated | `storage.buckets` |
| LOW-06 | 456 unused indexes (mostly on empty tables — largely benign noise, but real write cost on `system_events`/`analytics_events`) | perf advisor |
| LOW-07 | 18 `multiple_permissive_policies` warnings — every OR'd policy is evaluated per row. The `announcements`/`departments` entries are the P0s above; the rest are pure cost | perf advisor |
| LOW-08 | 13 `auth_rls_initplan` warnings — `auth.uid()` re-evaluated per row on `user_roles`, `search_logs`, `unified_question_options`, `leave_requests`, `purchase_requests`, `training_module_versions` | perf advisor |
| LOW-09 | 1,196 ESLint warnings; 130 `as any` casts | repo-wide |
| LOW-10 | `vendor-mermaid` chunk is 2.61 MB and `index` is 2.13 MB uncompressed (mermaid *is* correctly dynamic-imported in [lib/mermaid.ts:46](src/lib/mermaid.ts:46), so it is not on the critical path) | `dist/assets` |
| LOW-11 | Brand drift across the codebase: `phg-connect.com`, `remal-connect.com`, `altus-advisory.com` and `prime-hotels-intranet` all appear as live defaults (e.g. `send-email` falls back to `notifications@phg-connect.com`) | `send-email`, `cors.ts`, `authRedirect.ts`, `supabase.ts` |
| LOW-12 | `pg_net` extension installed in the `public` schema | security advisor |
| LOW-13 | Supabase leaked-password protection (HaveIBeenPwned) is disabled | security advisor |
| LOW-14 | 122 of 633 `catch` blocks are empty, comment-only, or `console.*`-only — failures never reach the user | repo-wide |
| LOW-15 | `check_password_reuse(plain_password text)` remains `anon`-executable (it raises "Not authenticated" internally, so it is harmless — but the grant is still wrong) | security advisor |

---

## 7. Security Audit

| ID | Sev | Vulnerability | Attack surface | Evidence | Impact | Fix |
|---|---|---|---|---|---|---|
| SEC-01 | P0 | Broken access control — destructive write | `PATCH/DELETE /rest/v1/training_modules` | VERIFIED: staff deleted 64 rows, updated 64 rows | Loss of entire training catalogue | Demote policy to `FOR SELECT` |
| SEC-02 | P0 | Broken access control — destructive write | `DELETE /rest/v1/departments` | VERIFIED: staff deleted 12 rows | Org-structure destruction, FK orphans | Demote policy to `FOR SELECT` |
| SEC-03 | P0 | Content spoofing / authz bypass | `POST /rest/v1/announcements` | VERIFIED: staff inserted global announcement | Internal phishing from a trusted channel | Demote policy to `FOR SELECT` |
| SEC-04 | P1 | Sensitive data exposure (BOLA-adjacent) | `GET /rest/v1/profiles` | VERIFIED: staff read all 6 other profiles, all columns | Gov IDs, DOB, salary band, lockout state to all staff | Directory view + `has_profile_access` |
| SEC-05 | P1 | Authentication DoS | `POST /rest/v1/rpc/record_failed_login_attempt` (anon) | Function body: 5 calls ⇒ `locked_until = now()+30m`; ACL grants `anon` | Any/all accounts locked out indefinitely, unauthenticated | Server-side attribution + rate limit |
| SEC-06 | P1 | Privilege revocation silently no-ops | `DELETE /rest/v1/user_roles` via bulk UI | VERIFIED: regional_hr delete of regional_admin → 0 rows, no error | Demotions never applied; UI reports success | Assert affected-row count / atomic RPC |
| SEC-07 | P1 | Audit-log forgery | `POST /rest/v1/system_events` | VERIFIED: staff inserted actor-less audit row | Incident evidence poisoning | Restrict INSERT to definer fns/service_role |
| FE-01 | P2 | Stored XSS | Training builder preview / AI course modal | 2 raw `dangerouslySetInnerHTML` sinks | Session theft (tokens in localStorage) | Wrap in `sanitizeHtml()` |
| FE-02 | P2 | Iframe allowlist bypass → phishing | `sanitizeHtml` iframe hook | `startsWith('https://vimeo.com')` matches `vimeo.com.evil.tld` | Attacker page inside trusted chrome | Exact `URL().origin` compare |
| SEC-08 | P2 | IDOR / caller-asserted role | 10 `SECURITY DEFINER` RPCs | VERIFIED: staff read a corporate_admin's counters | Cross-user info disclosure | `auth.uid()` check; derive role server-side |
| SEC-09 | P2 | Rate-limit bypass + poisoning | `rpc/check_rate_limit` | Caller supplies key and max | Limits are advisory only | Derive key/limit server-side |
| SEC-10 | P2 | Message tampering / sender forgery | `PATCH /rest/v1/messages` | Trailing catch-all subsumes all guards | Fabricated internal correspondence | Remove catch-all clause |
| SEC-11 | P2 | Token leakage via URL | `/reset-password`, `/complete-invite` | Reads `access_token` from `searchParams` | Tokens in logs/history/Referer | Fragment only |
| OPS-01 | P2 | Latent DDL endpoints | `apply-migrations`, `apply-slack-migration` | Deployed ACTIVE; service-role gated (not exploitable today) | Standing DDL surface | Delete deployments |
| OPS-02 | P2 | Config drift opens private functions | `config.toml` vs deployed | `send-email`/`security-monitor` `verify_jwt=false` locally, `true` in prod | Next deploy ⇒ open mail relay | Fix config; add handler-side authz |

**Explicitly checked and found sound:** no authentication bypass; no SQL injection (no dynamic SQL concatenation found in the 286 functions; `sanitize_search_input`/`validate_uuid_array` helpers exist); no service-role key in the frontend bundle (only the `anon` JWT for the correct project ref); no AI/provider keys in `VITE_*`; `user_roles` privilege escalation is correctly blocked by the `get_role_priority` ladder (self-promotion is not possible — the historical vuln is fixed); all 25 views are `security_invoker`; open-redirect handling in `sanitizeRedirectPath` is correct (rejects `//`, cross-origin, and auth routes); Slack webhooks verify HMAC-SHA256 with a 5-minute replay window and a length-checked timing-safe compare.

---

## 8. Supabase / RLS Audit

- **Coverage:** 208/208 public tables have RLS enabled. **Zero** tables have RLS enabled with no policies (no accidental deny-all). 642 policies total.
- **Grant hygiene:** 230 policies are attached to the `{public}` role rather than `{authenticated}`. All but ~10 embed an `auth.uid()` predicate, so `anon` fails naturally; the remainder rely on `auth.role() = 'authenticated'` or `service_role` string checks. This works but is fragile — `{public}` includes `anon`, and the three `property_isolation_*` policies show what happens when the predicate does not implicitly exclude anonymous callers.
- **Blanket `USING (true)`:** 33 policies. 32 are `FOR SELECT TO authenticated` on reference/lookup data (`brands`, `job_titles`, `skills`, `categories`, `chart_of_accounts`, `escalation_rules`, `workflow_definitions`, …) — defensible, though `chart_of_accounts`, `suppliers`, `supplier_scorecards` and `vip_guest_preferences` are business-sensitive and deserve scoping. **`profiles_select_public` is the outlier and is SEC-04.** The one non-SELECT case, `notifications_insert_system WITH CHECK (true)`, is correctly restricted to `{service_role}`.
- **`FOR ALL` with no `WITH CHECK`:** 14 policies. 11 correctly gate on `user_id = auth.uid()` / `is_hr_or_admin()` / explicit role arrays. 3 are SEC-01/02/03.
- **Role hierarchy:** the `super_admin`/`corporate_admin` universal-access fix is in place and holds — helper functions treat those roles as satisfying every check, and `user_roles` writes are correctly constrained by role priority.
- **Advisors:** 225 security lints — **0 ERROR**, 218 `authenticated_security_definer_function_executable` (expected for this architecture), 5 `anon_security_definer_function_executable` (`check_password_reuse`, `clear_failed_login_attempts`, `complete_password_reset`, `record_failed_login_attempt`, `verify_certificate` — the first three self-guard, `verify_certificate` is intentionally public, `record_failed_login_attempt` is **SEC-05**), 1 `extension_in_public`, 1 `auth_leaked_password_protection`.
- **Blind spot:** ~218 `SECURITY DEFINER` functions are executable by `authenticated`. This audit read ~15 in full and pattern-matched the rest for the absence of any `auth.uid()`/`has_role`/`is_hr_or_admin` reference (47 matched that filter; the majority are legitimate boolean helpers used *inside* policies). **A complete function-by-function review has still not been done** — SEC-08 shows the pattern is live.

---

## 9. Database Audit

**Structurally strong:**
- 208/208 tables have a primary key.
- **Zero unindexed foreign keys** (verified two ways: a hand-written `pg_constraint`/`pg_index` prefix-match query and the Supabase performance advisor, which reports no `unindexed_foreign_keys` lint).
- All 25 views are `security_invoker = true`, so RLS is not bypassed through them.
- 143 non-internal triggers; the historical duplicate-trigger problems (`profiles`, `leave_requests`) are resolved.
- Postgres 17; `pg_cron` + `pg_net` present and in use for scheduled work.

**Problems:**
- **Policy correctness**, not schema shape, is the weak point — see §8.
- `system_events` (3,359 rows) and `analytics_events` (3,016) are the only tables with meaningful volume and both are append-heavy with several indexes; they will dominate write cost. `system_events` is also user-writable (SEC-07).
- 456 `unused_index` lints. Most sit on empty tables and are false-positive noise, but the ones on the two high-write tables are real overhead.
- 13 `auth_rls_initplan` lints — policies that call `auth.uid()` / `current_setting()` per row instead of wrapping in `(SELECT …)`. Most of the codebase already uses the wrapped form; these 6 tables were missed.
- **Migration provenance is unreliable.** 151 files in `supabase/migrations/`, but prior sessions applied ~30 migrations directly against production via MCP with no local file, and ~39 local files have no matching live version. `db_schema.txt` at the repo root is stale (captured 2026-06-14). **`src/types/database.generated.ts` and the live DB are the only trustworthy schema references.**
- No orphan-record risk identified: FK coverage is complete and referential integrity is enforced at the DB level.

---

## 10. React Frontend Audit

**Strong:**
- `tsc --noEmit` clean; the Supabase client is properly typed (`createClient<Database>`), closing the previously-noted gap.
- Auth is split into four focused contexts with genuinely careful session handling: `getUser()` revalidation on tab resume, `refreshSession()` recovery before giving up, throttling (5 s) and debouncing (500 ms desktop / 2 s mobile), `mounted` guards, a `loadSeqRef`/`activeUserIdRef` stale-response guard, and retry classification via `classifyAuthError`.
- Timer and listener cleanup is disciplined: 62 `removeEventListener` for 71 `addEventListener`, 18 `removeChannel`/`unsubscribe` for 12 `.channel()`.
- 28 of 30 `dangerouslySetInnerHTML` sinks route through a well-built DOMPurify pipeline (tag/attr allowlists, `ALLOW_DATA_ATTR: false`, an `afterSanitizeAttributes` hook that force-adds `rel="noopener noreferrer"`, strips `javascript:`/`data:`/`vbscript:` hrefs, strips 17 event-handler attributes, and sandboxes iframes).
- Open-redirect handling (`sanitizeRedirectPath`) is correct and unit-tested.

**Weak:**
- **Authorization is duplicated in three unreconciled places** — `PERMISSION_CONFIG` (frontend), the `role_permissions` table, and 642 RLS policies. SEC-01/02/03 are that drift made concrete: the UI restricts announcement creation to admins while the database allows anyone.
- REL-01 (permanent spinner) and REL-02 (spurious redirect) — both in the route-guard/roles-load interaction.
- **No single data-access layer.** 1,508 `.from()` and 140 `.rpc()` call sites are scattered across 18 services, ~120 hooks, and inline component code, so cross-cutting concerns (pagination limits, error surfacing, PII column selection) cannot be enforced in one place. This is the structural reason PERF-02 and SEC-04's 40-call-site blast radius exist.
- **Very large components:** `TrainingPlayer.tsx` 2,726 lines, `KnowledgeEditor.tsx` 2,285, `KnowledgeViewer.tsx` 2,102, `TrainingBuilderContext.tsx` 2,001, `QuizComponentEnhanced.tsx` 1,897, `UserForm.tsx` 1,266. These mix data fetching, business rules and presentation.
- **Stale-data window:** `refetchOnMount: false` + `refetchOnWindowFocus: false` + `staleTime: 2m` means a screen can show up-to-2-minute-old data after a mutation elsewhere, unless every mutation invalidates precisely. With 1,508 scattered query sites, precise invalidation is unlikely to be complete.
- 122/633 catch blocks swallow errors; the user sees nothing when a save silently fails.
- 130 `as any` casts; 1,196 lint warnings.

---

## 11. Backend / API Audit

- **Edge Functions:** 40+ deployed, 27 declared in `config.toml`. Four are intentionally public (`slack-commands`, `slack-events`, `slack-interactive`, `public-forgot-password`); the Slack three verify HMAC-SHA256 signatures with a 5-minute timestamp window and a timing-safe comparison — **correct**.
- **`send-email`** validates only the *presence* of an `Authorization` header, delegating all real authentication to the platform's `verify_jwt` gate. Combined with OPS-02 (config says `false`, prod says `true`) this is one deploy away from an open mail relay on the company's verified sending domain. Even with the gate, **any authenticated employee can call it** to send arbitrary HTML from `notifications@…` to arbitrary recipients — it should check the caller's role.
- **`apply-migrations` / `apply-slack-migration`:** correctly service-role gated, but permanently deployed DDL endpoints that should have been deleted after their single use (OPS-01).
- **CORS:** exact-origin matching against a 9-entry allowlist, with a blanket localhost/LAN exception that is active in production (LOW-03).
- **RPC surface:** 286 functions, ~218 `SECURITY DEFINER` and executable by `authenticated`. The IDOR class (SEC-08) is confirmed present; a full review is still outstanding.
- **Error surfaces:** Edge functions return `error.message` verbatim to clients in several handlers (e.g. `apply-migrations`), which can leak internal SQL and schema details.

---

## 12. Performance Audit

| Area | Finding |
|---|---|
| N+1 | 41 confirmed sites where `await supabase` runs inside a loop. `useLeaveCoverage` = `1 + 3N` sequential round-trips (181 at today's 60 departments). |
| Unbounded reads | ~499 `.select()` chains with no `.limit()`/`.range()`. `max_rows = 1000` ⇒ silent truncation; client-side aggregates become wrong past that. Already crossed on `system_events` (3,359) and `analytics_events` (3,016). |
| Bulk ops | 5 loops in `useUserBulkOperations` issue 2–4 serial requests per user. A 200-user bulk action ≈ 600 sequential requests. |
| RLS cost | 18 tables evaluate multiple permissive policies per row; 13 policies re-evaluate `auth.uid()` per row. |
| Indexes | FK coverage complete; 456 unused indexes add write amplification on the two high-write tables. |
| Bundle | `index` 2.13 MB and `vendor-mermaid` 2.61 MB uncompressed. Mermaid *is* dynamically imported, so it stays off the critical path; the 2.13 MB main chunk is the real cost. 17 MB of JS assets total. |
| Build config | Good — terser with `drop_console: true`, manual vendor chunking, `sourcemap: 'hidden'` with post-upload deletion. |

**Scale projection.** Everything above is invisible at 7 users / 183 documents. At 1,000 employees and 100,000 `training_progress` rows: the leave-coverage widget becomes a multi-second serial waterfall; every unbounded `profiles`/`documents` list silently caps at 1,000 and dashboards start reporting wrong numbers with no error; the per-row RLS `auth.uid()` re-evaluation on `leave_requests` and `user_roles` becomes measurable.

---

## 13. Reliability & Error Handling Audit

- **Swallowed errors:** 122 of 633 catch blocks are empty, comment-only, or `console.*`-only. Representative: [AnnouncementEditor.tsx:419](src/components/announcements/AnnouncementEditor.tsx:419) logs "Failed to create bulk notifications" and continues — the announcement is created, nobody is notified, and the UI reports success. [CandidateProfileDialog.tsx:147](src/components/hr/CandidateProfileDialog.tsx:147) swallows a failed note save the same way.
- **Silent RLS no-ops:** the SEC-06 class. Any `update`/`delete` whose RLS filter matches nothing returns success. Given 1,508 write-capable call sites and no repo-wide convention of asserting affected rows, **this class almost certainly exists beyond the one instance verified**.
- **Permanent spinner:** REL-01.
- **Retry policy:** react-query retries only on status 0 or ≥500, max 2 — sensible; it will not retry a 401, which the auth layer handles separately.
- **Timeouts:** `withTimeout` wraps profile/roles/properties/departments loads at 10 s and auth-link operations separately. Good, but timeout ⇒ REL-01.
- **Offline:** `navigator.onLine` is checked before resume validation and the session is deliberately kept on network errors — correct behaviour.
- **Duplicate submission:** no repo-wide idempotency convention was found. The bulk-operation paths are explicitly non-idempotent (DATA-01).
- **Service worker:** update flow has a 3-second fallback timeout and forces reload — reasonable.

---

## 14. Data Integrity Audit

- **Enforced well at the schema level:** full PK coverage, complete FK coverage with supporting indexes, no orphan risk identified.
- **Not enforced at the transaction level:** every multi-step write in the frontend runs as independent PostgREST calls. `bulkAssignRole` (upsert → delete → audit), `UserForm` property/department assignment loops, and `AnnouncementEditor`'s audience resolution + notification fan-out can all half-complete.
- **Success/failure reporting is unreliable** in exactly the places it matters most (SEC-06, DATA-01): the UI reports success for a role revocation that did not happen, and reports failure for a role change that did.
- **Audit trail is not trustworthy** (SEC-07) — `system_events` accepts unattributed rows from any authenticated user.
- **Stale UI:** `refetchOnMount: false` + 2-minute `staleTime` across 1,508 uncoordinated query sites means "record deleted but still on screen" and "record updated but showing old values" are structurally likely, not hypothetical.

---

## 15. Testing Gaps

25 test files / 213 tests against 959 source files (~2.6% of files). Coverage is concentrated in pure functions: `authRedirect`, `authErrorUtils`, `authFlowState`, `validation`, `statusTransitions`, `trainingCompletion`, `procurementCalculations`, `financeValidation`, `questionOrderingMatching`, `policy`, `queryKeys`, `utils` — genuinely the right things to unit-test, and they pass.

**Missing, in priority order:**
1. **RLS policy tests — none exist.** Every P0/P1 in this report would have been caught by a table of `(role, table, operation) → expected` assertions run against a shadow database. This is the single highest-value test investment here.
2. **Authorization tests for `SECURITY DEFINER` RPCs** — assert that passing another user's UUID raises rather than returns data (SEC-08).
3. **Route-guard tests** for the roles-loading window (REL-01, REL-02) — currently untested and both are user-visible.
4. **Sanitization tests** — assert every `dangerouslySetInnerHTML` sink receives sanitized input, and that the iframe allowlist rejects `https://vimeo.com.evil.tld` (FE-01, FE-02).
5. **Bulk-operation integrity tests** — assert affected-row counts and partial-failure reporting (SEC-06, DATA-01).

Do **not** add breadth tests for the 934 uncovered files to raise a coverage number; the five items above cover the actual risk.

---

## 16. Master Bug Register

| ID | Sev | Category | Component | Problem | Root cause | Impact | Recommended action | Status |
|---|---|---|---|---|---|---|---|---|
| SEC-01 | P0 | Access control | RLS `training_modules` | `FOR ALL` policy w/o `WITH CHECK`; `check_property_access(NULL)=true` | Read filter declared `FOR ALL` | Staff can delete/rewrite all 64 modules | Demote to `FOR SELECT` | Open — VERIFIED |
| SEC-02 | P0 | Access control | RLS `departments` | Same | Same | Staff deleted 12 departments | Demote to `FOR SELECT` | Open — VERIFIED |
| SEC-03 | P0 | Access control | RLS `announcements` | Same | Same | Staff can post company-wide notices | Demote to `FOR SELECT` | Open — VERIFIED |
| SEC-04 | P1 | Data exposure | RLS `profiles` | `USING (true)` on a 40-col HR table | No directory/HR column split | All staff read gov IDs, DOB, salary band, lockout state | Directory view + `has_profile_access` | Open — VERIFIED |
| SEC-05 | P1 | Auth DoS | RPC `record_failed_login_attempt` | anon-callable, no attribution, no rate limit | Client asserts "a login failed" | Any account locked out indefinitely, unauthenticated | Server-side attribution + rate limit | Open |
| SEC-06 | P1 | Access control | `useUserBulkOperations` | RLS-filtered DELETE returns 0 rows silently | "no error ⇒ it happened" | Demotions reported as applied but never applied | Assert row counts / atomic RPC | Open — VERIFIED |
| SEC-07 | P1 | Audit integrity | RLS `system_events` | `WITH CHECK (… OR actor_id IS NULL)` | Client-side logging path | Forged/unattributable audit entries | Restrict INSERT to definer fns | Open — VERIFIED |
| FE-01 | P2 | XSS | BuilderCanvas, SmartAICourseCreatorModal | 2 raw HTML sinks | Missed in the sanitize sweep | Session theft via localStorage tokens | Wrap in `sanitizeHtml()` | Open |
| FE-02 | P2 | Phishing | `security.ts` iframe hook | Prefix match on bare origins | `startsWith` instead of origin compare | Attacker page in trusted chrome | Exact `URL().origin` compare | Open |
| SEC-08 | P2 | IDOR | 10 `SECURITY DEFINER` RPCs | No `auth.uid()` check; role passed as a param | Definer bypasses RLS | Cross-user counters, balances, titles | Add self-or-admin guard | Open — VERIFIED |
| SEC-09 | P2 | Rate limiting | `check_rate_limit` | Caller supplies key and max | Client-trusted parameters | Limits bypassable; buckets poisonable | Derive server-side | Open |
| SEC-10 | P2 | Tampering | RLS `messages` UPDATE | Trailing catch-all subsumes all guards | Policy accretion | Recipients rewrite content, forge sender | Remove catch-all | Open |
| SEC-11 | P2 | Token leakage | ResetPassword, CompleteInvite | Tokens read from query string | Over-broad fallback | Tokens in logs/history/Referer | Fragment only | Open |
| REL-01 | P2 | Reliability | ProtectedRoute + loader | Roles-load failure ⇒ permanent spinner | `rolesLoading=false` with `roles=[]` | App unusable until manual reload | Add `rolesError` + retry | Open |
| REL-02 | P2 | Reliability | ProtectedRoute | Permission-only routes evaluated pre-load | Loading guard nested in wrong branch | Spurious redirect on refresh | Hoist the guard | Open |
| DATA-01 | P2 | Data integrity | `useUserBulkOperations` | 5 non-transactional multi-step loops | No RPC boundary | Half-applied state; wrong success counts | Move to per-user RPC | Open |
| PERF-01 | P2 | Performance | 41 hooks/components | `await supabase` inside loops | Per-item fetching | 181 serial requests on one widget | Grouped queries / RPCs | Open |
| PERF-02 | P2 | Performance | ~499 query sites | No `.limit()`/`.range()` vs `max_rows=1000` | No pagination convention | Silent truncation ⇒ wrong aggregates | Paginate or aggregate in SQL | Open |
| OPS-01 | P2 | Attack surface | 4 Edge Functions | Dead one-shot DDL fns still deployed | Never cleaned up | Standing DDL endpoints | Delete deployments | Open |
| OPS-02 | P2 | Config drift | `config.toml` | `send-email`/`security-monitor` `verify_jwt=false` locally | Repo/deploy divergence | Next deploy ⇒ open mail relay | Fix config + handler authz | Open |
| LOW-01…15 | P3 | Various | See §6 | — | — | — | — | Open |

---

## 17. Recommended Fixes

**One migration closes all three P0s.** They share a root cause and a fix shape:

```sql
-- Replace the FOR ALL read-filter with a SELECT-only policy on all three tables.
-- The existing admin INSERT/UPDATE policies already cover writes correctly.
drop policy property_isolation_training_modules on public.training_modules;
create policy training_modules_select_scope on public.training_modules
  for select to authenticated using (check_property_access(property_id));

drop policy property_isolation_departments on public.departments;
-- departments_select_authenticated already covers SELECT; departments_modify_admin_pm covers writes.

drop policy property_isolation_announcements on public.announcements;
-- announcements_select_all_authenticated covers SELECT; consolidated_announcements_insert /
-- announcements_update_admins cover writes. Add a DELETE policy for admins if one is needed.
```

Before applying: confirm no legitimate flow depends on the write side of these policies (grep for non-admin create/delete of departments and training modules). After applying: re-run the three verification queries in §3 as `staff` — all must return 0 rows or raise `42501` — and re-run them as `regional_admin` to confirm admin flows are intact.

Then, in order: SEC-05 (one function), SEC-07 (one policy), SEC-06 (one hook + assertion), SEC-04 (staged: view → migrate call sites → tighten policy), FE-01 (two one-line changes), FE-02 (one function), SEC-08 (add a guard clause to 10 functions).

---

## 18. Production Readiness Score

# 54 / 100 — not production-ready

| Dimension | Score | Rationale |
|---|---|---|
| Functionality | 8/10 | Broad, coherent feature set; builds and tests pass; two user-visible route-guard defects |
| Security | 3/10 | Three verified destructive-write bypasses, one unauthenticated DoS, forgeable audit log, full-PII read for all staff |
| Reliability | 5/10 | Careful auth-session handling, but a single failed query can permanently wedge the app; 19% of catch blocks swallow errors |
| Performance | 5/10 | Fine at 7 users; 41 N+1 sites and ~499 unbounded queries against a 1,000-row ceiling will not survive real load |
| Scalability | 4/10 | Silent truncation produces *wrong numbers* rather than slow ones — a correctness cliff, not a performance one |
| Maintainability | 5/10 | Clean types and lint, but authorization is duplicated in three unreconciled places and six files exceed 1,800 lines |
| Database integrity | 7/10 | Excellent schema hygiene (PK/FK/index/RLS coverage complete); policy correctness and transaction boundaries are the gap |
| Testing | 3/10 | 213 tests all pass, but zero cover RLS, authorization, or any of the P0/P1 findings |
| Observability | 6/10 | Sentry wired, `recordAuthEvent` telemetry, structured `system_events` — undermined by that log being user-writable |
| Deployment readiness | 5/10 | Solid build config and CSP-clean bundle; repo/deploy drift on function JWT settings and unreconciled migration history |

**Why not lower:** the engineering fundamentals are genuinely good — clean typecheck, passing tests, no secret leakage, RLS enabled everywhere, complete FK/index coverage, a well-built sanitization pipeline, and a thoughtfully-structured auth context. This is not a sloppy codebase.

**Why not higher:** a `staff` account can delete the entire training catalogue and post as the company. That is not a hardening gap; it is a live break in the primary security boundary, and it is reachable today with nothing more than the browser console.

---

## 19. Remediation Roadmap

**Phase 1 — Critical security & data integrity (do before any production exposure)**
1. SEC-01/02/03 — one migration, three policies. Highest impact, lowest effort in the report.
2. SEC-05 — remove the anonymous lockout primitive.
3. SEC-07 — make `system_events` server-write-only.
4. SEC-06 — assert affected-row counts on every RLS-filtered write; start with `bulkAssignRole`.
5. SEC-04 — staged: add `profiles_directory_v`, migrate the ~40 call sites, then tighten the policy.
6. Audit the remaining ~200 `authenticated`-executable `SECURITY DEFINER` functions for the SEC-08 pattern. This is the known unaudited surface.

**Phase 2 — Critical functional bugs**
7. REL-01 — roles-load failure must produce an error with retry, not a permanent spinner.
8. REL-02 — hoist the roles-loading guard in `ProtectedRoute`.
9. FE-01, FE-02 — close the two XSS sinks and the iframe allowlist bypass.
10. OPS-01, OPS-02 — delete the four dead functions; reconcile `config.toml` with the deployed `verify_jwt` settings before the next deploy.

**Phase 3 — Reliability**
11. DATA-01 — move bulk operations into per-user transactional RPCs with honest per-item status.
12. Sweep the 122 swallowing catch blocks; at minimum, surface a toast and report to Sentry.
13. SEC-10, SEC-11, SEC-09.
14. Establish the "no error ≠ it happened" convention repo-wide for RLS-filtered writes.

**Phase 4 — Performance**
15. PERF-01 — replace the per-department loops in `useLeaveCoverage`, `useDepartmentKPIs`, `useKnowledgeCompliance` with grouped queries.
16. PERF-02 — introduce a pagination convention and apply it to the top tables (`documents`, `profiles`, `system_events`, `analytics_events`) first.
17. Resolve the 13 `auth_rls_initplan` lints and the 18 redundant permissive policies.

**Phase 5 — Architecture & maintainability**
18. Introduce a single typed data-access layer so pagination, error surfacing and PII column selection can be enforced in one place. This is the structural fix behind PERF-02 and SEC-04's blast radius.
19. Collapse the three authorization sources into one generated source of truth.
20. Reconcile migration history with the live database (blocked on a DB password — see the infra notes).
21. Decompose the six 1,800+ line files.

**Phase 6 — UX / polish**
22. LOW-01 (dead `remal-connect.com` cookie domain), LOW-02 (frozen CSRF token), LOW-11 (brand drift across four domains), LOW-13 (enable leaked-password protection), lint-warning cleanup.

**Testing runs alongside, not after:** add the RLS assertion suite (§15 item 1) *as part of Phase 1*, so the P0 fixes land with regression coverage rather than acquiring it later.

---

## 20. Final Verdict

**Do not deploy to production, and do not load real employee data, until Phase 1 is complete.**

The system is architecturally sound and clearly built with security in mind — the auth context, the sanitization pipeline, the role-priority ladder on `user_roles`, the Slack signature verification, and the complete PK/FK/index/RLS coverage are all evidence of real care. Several previously-identified vulnerability classes have been correctly fixed and stayed fixed.

But the primary security boundary is broken in three places, verified by execution rather than inference: an ordinary `staff` account deleted 64 training modules, deleted 12 departments, and published a company-wide announcement. The frontend forbids all three; the database permits them; and the `anon` key needed to talk to the database directly ships in the bundle by design. That gap between what the UI enforces and what the database enforces is the defining risk in this codebase, and every P0 and P1 here is an instance of it.

The good news is proportionate: the three P0s share one root cause and one small migration closes them. The P1s are each a single function, policy or hook. **The distance from 54/100 to a defensible production posture is roughly one focused day of work on Phase 1, plus the RLS test suite to keep it closed.**

The honest caveat: ~200 `SECURITY DEFINER` functions executable by `authenticated` have still not been read line by line, and SEC-08 confirms the vulnerable pattern is live in that population. Treat the security findings here as a floor, not a ceiling.
