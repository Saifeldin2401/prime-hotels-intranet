# P5 / P6 tenancy child-table migrations — post-apply verification

Verified read-only against live project `dhbfaclkfysqwfppuxxa` (Postgres 17) on 2026-09-01
via `execute_sql` + `get_advisors`.

## Applied state

All six P5/P6 migrations are recorded in `supabase_migrations.schema_migrations` and their
effects are live:

| file | live version(s) | status |
|---|---|---|
| `20260902020100_p5_announcement_children` | 20260901173258 | applied |
| `20260902020200_p5_documents_children` | 20260901173454 | applied |
| `20260902020300_p5_training_children` | 20260901172432 / 173800 | applied |
| `20260902020400_p5_quiz_assessment_children` | 20260901030331 / 173853 | applied |
| `20260902020500_p5_dept_media_misc_children` | 20260901030430 / 174004 | applied |
| `20260902020600_p6_deep_children` | 20260901174138 | applied |

(Groups 3/4/5 had partially shipped earlier per the P5P6_REVIEW; the later re-applies
completed groups 1/2/6.)

---

## (1) Public base tables — RLS + policy coverage

| check | result | expected | verdict |
|---|---|---|---|
| total `public` base tables | 169 | — | — |
| RLS-disabled base tables | **0** | 0 | PASS |
| base tables with zero policies | **0** | 0 | PASS |

No `public` base table is left with RLS off or with no policy.

## (2) Tables carrying `organization_id`

**142** of 169 distinct `public` base tables now have an `organization_id` column
(was ~120 pre-P5; TENANCY_MAP projected 43 TENANT_DIRECT + 60 TENANT_VIA_PARENT + 32
USER_OWNED + 7 AMBIGUOUS = 148 candidates, of which `master_content_deployments` and the
6 remaining AMBIGUOUS/session tables were intentionally not given a column — see below).

## (3) Base tables WITHOUT `organization_id` (27)

```
achievement_definitions      ai_agent_policies        ai_model_probes
ai_models                    ai_platform_config       ai_providers
data_retention_policies       failed_login_attempts    master_content_deployments
motivational_content         notification_email_templates  organizations
password_reset_requests       platform_access_sessions  platform_audit_logs
platform_config              platform_feature_flags    platform_notification_policies
platform_role_assignments     platform_role_map         platform_role_map_extra
platform_users               rate_limit_entries        role_permissions
skills                       subscription_plans        system_wiki
```

- 26 of these are on the TENANCY_MAP **PLATFORM_GLOBAL** list (control-plane / shared
  reference / auth infra) — correctly left unscoped.
- `master_content_deployments` is the one **AMBIGUOUS** table that TENANCY_MAP explicitly
  says to scope by its existing `target_organization_id` (cross-tenant fan-out record) and
  **not** add a column to. Correct.
- `platform_events` — listed as PLATFORM_GLOBAL in TENANCY_MAP — has since **gained** a
  NULLable `organization_id` (scoping column), so it drops off this list. Net effect: the
  unscoped set shrank by one and picked up `master_content_deployments`; count stays 27.

**No unexpected unscoped table.** Nothing on this list is a tenant-data table.

## (4) Deep-table spot check

| table | rows | `organization_id` | NULLs | RLS org anchor |
|---|---|---|---|---|
| `lesson_blocks` | 0 | NOT NULL | 0 | parent EXISTS `lessons→course_modules→courses` + `org_visible(c.organization_id)` on SELECT and WRITE (USING + WITH CHECK) |
| `lesson_progress` | 0 | NOT NULL | 0 | parent EXISTS `enrollments` (org-scoped parent) + `is_learning_editor()`; own `organization_id` not referenced by the policy — see note |
| `objective_links` | 0 | NOT NULL | 0 | SELECT via parent `learning_objectives→courses` + `org_visible`; WRITE is `is_learning_editor()` only — see note |
| `report_runs` | 0 | NOT NULL | 0 | every policy: `organization_id IS NOT NULL AND org_visible(organization_id)` (SELECT/UPDATE/DELETE + INSERT WITH CHECK) |
| `sop_comment_votes` | 0 | NOT NULL | 0 | `users_own_votes` FOR ALL: `user_id = auth.uid() AND organization_id IS NOT NULL AND org_visible(organization_id)` (USING + WITH CHECK) |

All five: column present, `NOT NULL`, zero rows, zero NULLs. `report_runs` and
`sop_comment_votes` `FOR ALL` policies carry the `WITH CHECK` the P5P6_REVIEW flagged as
previously missing — confirmed fixed.

Notes (not regressions, pre-existing policy shape carried forward by P6):
- `lesson_progress` / `objective_links` WRITE policies gate on the learner's enrollment or
  on the global `is_learning_editor()` role rather than on the row's own
  `organization_id`. The column is `NOT NULL` and the trigger fills it, but a
  cross-tenant `is_learning_editor()` could in principle write `objective_links` rows for
  any course. Low risk today (single tenant, 0 rows); worth tightening the
  `objective_links_write` policy to add `org_visible(organization_id)`.

## (5) Security advisors vs baseline

Baseline (P4FIX_VERIFY): 264 `authenticated_security_definer_function_executable` (WARN),
4 `anon_security_definer_function_executable` (WARN), `pg_net` in public, leaked-password
protection off. No ERROR-level lints.

Now:

| advisor | baseline | now | delta |
|---|---|---|---|
| `authenticated_security_definer_function_executable` (WARN) | 264 | **279** | **+15** |
| `anon_security_definer_function_executable` (WARN) | 4 | 4 | — |
| `extension_in_public` (`pg_net`) (WARN) | 1 | 1 | — |
| `auth_leaked_password_protection` (WARN) | 1 | 1 | — |
| ERROR-level (`rls_disabled_in_public`, `policy_exists_rls_disabled`, `security_definer_view`) | 0 | **0** | — |

The +15 are the P5/P6 `BEFORE INSERT` trigger-helper functions
(`set_announcement_child_org`, `set_documents_child_org`, `set_training_child_org`,
`p6_set_org_from_*` ×10, `p6_set_org_learning_events`) which are `SECURITY DEFINER` and
still hold `EXECUTE` for `anon` / `authenticated`. Same class of finding as the P3/P4
sweep: they only resolve an org id from the parent row and are never meant to be called as
REST RPCs. **Low severity — recommend a follow-up migration that
`REVOKE EXECUTE ... FROM public, anon, authenticated` on all 15** (groups 1–5 already do
this for their trigger fns; group 6 omitted it — matches the P5P6_REVIEW minor note).

No new advisor warning changes tenant-isolation posture. No ERROR-level advisor.

---

## Verdict

P5/P6 applied cleanly. Tenant-isolation invariants hold: 0 RLS-off tables, 0 zero-policy
tables, 142/169 tables org-scoped, and every remaining unscoped table is a legitimate
platform-global or fan-out record. Deep child tables are `NOT NULL` on `organization_id`
with org-anchored RLS and the previously-missing `WITH CHECK` clauses now in place.

### Risks / open items

1. **15 P5/P6 SECURITY DEFINER trigger helpers are `anon`/`authenticated`-executable**
   (advisor WARN, +15 vs baseline). Follow-up `REVOKE EXECUTE`. Low severity.
2. **`objective_links_write` / `lesson_progress_write`** gate on role/enrollment, not on
   `org_visible(organization_id)`. A cross-tenant learning editor could write rows for
   another tenant's course. Zero rows today; tighten the write policy.
3. **`platform_events`** gained a NULLable `organization_id` — reclassify from
   PLATFORM_GLOBAL in TENANCY_MAP so the map stays authoritative.
4. Pre-existing, not P5/P6: `pg_net` in `public`, leaked-password protection disabled,
   4 `anon` SECURITY DEFINER executables — unchanged baseline items.
