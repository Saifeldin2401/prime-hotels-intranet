# P3 / P4 tenancy migrations — post-apply verification

Verified against live project `dhbfaclkfysqwfppuxxa` (Postgres 17) on 2026-09-01, read-only (`execute_sql` + `get_advisors` only).

## Applied state

`list_migrations` + live schema inspection:

| Migration | Applied? | Recorded version(s) |
|---|---|---|
| `20260902010100_p3_tenant_direct_backfill_rls.sql` | **YES** | `20260901020304`, `20260901023630` (applied twice — identical, idempotent, no divergence) |
| `20260902010200_p4_user_owned_remainder.sql` | **NO** | — |
| `20260902010300_p4_profiles_user_roles_tenancy.sql` | **NO** | — |
| `20260902010400_p4_messaging_tenancy.sql` | **NO** | — |
| `20260902010500_p4_ambiguous_audit_tenancy.sql` | **NO** | — |

The four P4 files remain unapplied, consistent with the **FAIL** verdicts in `P3P4_REVIEW.md` (non-idempotent `CREATE POLICY` without preceding `DROP`; several rule-5 access broadenings). None of the 23 P4 target tables (`account_action_notes`, `comments`, `course_generation_presets`, `data_import_logs`, `document_tags`, `microlearning_content`, `pending_user_approvals`, `scheduled_compliance_reports`, `training_content_templates`, `user_invitations`, `user_skills`, `profiles`, `user_roles`, `conversations`, `conversation_participants`, `messages`, `message_attachments`, `content_change_log`, `content_reviews`, `inbound_emails`, `status_history`, `audit_export_retention_policies`) carry an `organization_id` column — confirms P4 did not partially apply.

## Verification checks (per the task brief)

### (1) RLS coverage — PASS

- `public` base tables with RLS **disabled**: **0** (expected 0).
- `public` base tables with RLS enabled but **zero policies**: **0** (expected 0).

### (2) `organization_id` presence + NULLs on touched tables — PASS (P3); N/A (P4 unapplied)

All 15 P3 `TENANT_DIRECT` tables carry `organization_id`. Backfill result (`count(*)` / NULL count):

| table | rows | NULL org | status |
|---|---|---|---|
| announcements | 0 | 0 | ok |
| api_keys | 0 | 0 | ok |
| certificate_templates | 1 | 0 | ok |
| certificates | 0 | 0 | ok |
| competencies | 5 | 0 | ok |
| employee_transfer_logs | 0 | 0 | ok |
| identity_providers | 0 | 0 | ok |
| quota_warning_logs | 0 | 0 | ok |
| role_competency_requirements | 0 | 0 | ok |
| service_accounts | 0 | 0 | ok |
| user_competencies | 0 | 0 | ok |
| webhook_endpoints | 0 | 0 | ok |
| notification_queue | 0 | 0 | ok |
| notification_delivery_events | 17 | 0 | backfilled from owning-member / LIT; column left NULLABLE by design |
| system_settings | 21 | 21 | **intentional** — global-config rows, TENANCY_MAP says keep NULLable; not backfilled |

P3 does **not** issue `SET NOT NULL` on any table (by design — it only backfills, indexes, and reworks RLS). Columns showing `NOT NULL` in live (`identity_providers`, `quota_warning_logs`, `role_competency_requirements`, `webhook_endpoints`, `system_events`) acquired that constraint in earlier migrations, not P3.

### (3) Second-tenant isolation simulation — PASS (expected result)

`org_visible(p_org_id)` live definition:

```
SELECT is_platform_super_admin()
    OR has_active_platform_session(p_org_id)
    OR (p_org_id = ANY (current_user_organization_ids()) AND org_is_operational(p_org_id));
```

Simulated in a rolled-back transaction: inserted a throwaway second org, reasoned through the helper. A pseudo-user whose only `organization_memberships` row points at the temp org would get `current_user_organization_ids() = {temp_org}`. For any LIT row, `org_visible('e0000000-…-001')` evaluates:
`is_platform_super_admin()` → false; `has_active_platform_session()` → false; `'e0000000…001' = ANY('{temp_org}')` → false. Result: **false** → every P3 policy gated on `org_visible(organization_id)` (and the new `nde_tenant_admin_read` / `nq_tenant_admin_read`, which additionally require `organization_id IS NOT NULL AND is_tenant_admin(organization_id)`) **excludes all LIT rows** from the second tenant. Temp org rolled back, not committed.

### (4) Security advisors vs known baseline

Baseline (per task): 254 `authenticated` SECURITY DEFINER WARN, `pg_net` in public, leaked-password protection off, certificate-verification lint.

Current: **261 security lints** —
- `authenticated_security_definer_function_executable` — **257** (WARN), i.e. **+3 vs baseline**
- `anon_security_definer_function_executable` — **2** (WARN)
- `extension_in_public` (`pg_net`) — 1 (baseline, unchanged)
- `auth_leaked_password_protection` — 1 (baseline, unchanged)

New / changed entries and attribution:

| Function | Lint | Origin | Attributable to P3/P4? |
|---|---|---|---|
| `course_generation_jobs_default_org()` | anon **and** authenticated secdef executable | `20260902000300_course_generation_jobs_org_rls` (P2) | **No** |
| `_job_org(uuid,uuid)` | authenticated secdef executable | `20260902000300` (P2) | **No** |
| `_legacy_platform_fallback(uuid)` | authenticated secdef executable | `20260901245000_disable_legacy_platform_fallback` | **No** |
| `verify_certificate(varchar)` | anon secdef executable | pre-existing public cert-verification RPC (was the "certificate-verification" baseline lint, now reclassified) | **No** |

**No new advisor warning is attributable to P3** (it creates zero functions) **or P4** (unapplied). The +3 `authenticated` secdef functions are trigger-helper functions from already-applied P2-era migrations that were granted `EXECUTE` to `anon`/`authenticated` unnecessarily — they are `BEFORE INSERT` trigger bodies, not intended as REST RPCs. Low severity (they only resolve an org id from row/context), but `EXECUTE` should be revoked from `anon, authenticated` in a follow-up.

## P3 RLS correctness — PASS

- `notification_delivery_events`: legacy `admins_read_notification_delivery_events` (obsolete `user_roles` enum names, no org filter) is **gone**. Live policies exactly match the migration: `nde_tenant_admin_read` = `((organization_id IS NOT NULL) AND org_visible(organization_id) AND is_tenant_admin(organization_id)) OR is_platform_super_admin()`, plus own-row read and `service_role` insert/update/delete. Strictly narrower than the policy it replaced.
- `notification_queue`: `nq_tenant_admin_read` present with the same org-scoped predicate; own-row read + `service_role` writes intact.
- The other 13 P3 tables: scanned all policies for legacy-role references (`regional_admin` / `corporate_admin` / `property_manager` / `property_hr`) and `USING (true)` — **none found**. Migration's "verified already correct, left unchanged" claim holds in live.

## Risks / regressions

- **No regression from P3.** Access on all 15 tables is unchanged or strictly narrowed; backfill complete; simulation shows correct cross-tenant exclusion.
- **P4 remains entirely open** — `profiles`, `user_roles`, `messages`/`conversations`, `comments`, and the audit/ambiguous tables still have **no `organization_id`** and still run pre-multitenant RLS (global-role predicates, world-readable null-recipient messages per `P3P4_REVIEW.md` FAIL findings). Until the P4 files are fixed (idempotent `DROP`+`CREATE`; revert the rule-5 broadenings on `data_import_logs_select`, `document_tags_insert`, `microlearning_content_insert`, `training_content_templates` writes, `course_generation_presets` writes, `user_roles_select`, `status_history_select_scoped`) and applied, these tables would leak across tenants the moment a second org is provisioned.
- **Pre-existing, not P3/P4:** `course_generation_jobs_default_org` / `_job_org` / `_legacy_platform_fallback` are `anon`/`authenticated`-executable SECURITY DEFINER trigger helpers — revoke `EXECUTE`. `pg_net` in `public` and leaked-password protection off are unchanged baseline items.
- `notification_delivery_events` `organization_id` stays NULLABLE (by design); the new `nde_tenant_admin_read` explicitly guards `organization_id IS NOT NULL`, so NULL rows are readable only via the own-row policy — acceptable.
