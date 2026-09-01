# P4 fix — production security & RLS lockdown — apply + verification

Applied to live project `dhbfaclkfysqwfppuxxa` (Postgres 17) on 2026-09-01.

- **Migration file:** `supabase/migrations/20260901260000_production_security_and_rls_lockdown.sql`
- **Applied via:** `mcp apply_migration` name `p4fix_production_security_and_rls_lockdown`
  (stamped version `2026090125xxxx` by MCP — see divergence note below).
- **Result:** `{"success": true}`. No regressions detected.

## What the migration does

1. `CREATE OR REPLACE` on 4 role-mutable functions with `SET search_path = public, pg_temp`:
   `_plan_rank`, `check_and_escalate_approvals`, `get_media_asset_with_usage` (SECURITY INVOKER),
   and re-defines nothing else in their bodies.
2. `REVOKE EXECUTE ... FROM public, anon` + `GRANT EXECUTE ... TO authenticated, service_role`
   on 27 privileged functions (loop rewritten to resolve identity args dynamically so the
   apply is signature-drift-proof and idempotent).
3. Re-asserts `ENABLE ROW LEVEL SECURITY` + tenant-isolated SELECT/INSERT/DELETE policies on
   `media_asset_usages` and `media_collection_items` (every `CREATE POLICY` preceded by a
   matching `DROP POLICY IF EXISTS` of the same name; INSERT policies carry `WITH CHECK`).

This migration's name (`production_security_and_rls_lockdown`) was already applied once under
history version `20260901015718`; the re-apply is idempotent and produced a no-op diff on the
parts already live (media policies + `_plan_rank`/`can_send_tenant_email`/`get_tenant_email_context`
already carried `pg_temp` and had no anon grant).

## Pre-apply baseline (verified with `pg_policy` / `pg_get_expr` / `routine_privileges`)

- `media_asset_usages` / `media_collection_items`: RLS on; 3 policies each, identical text to the
  migration → no broadening. Parent-table gate (`media_assets` / `media_collections`) unchanged.
- 25 of the 27 revoke-list functions already had no `anon`/`PUBLIC` EXECUTE.

## Post-apply verification

### (1) Base-table RLS coverage — PASS
```
rls_disabled     = 0
rls_no_policies   = 0
```
No `public` base table has RLS off or zero policies.

### (2) organization_id on the 22 required tables — PASS
All 22 (`comments`, `course_generation_presets`, `data_import_logs`, `document_tags`,
`microlearning_content`, `pending_user_approvals`, `scheduled_compliance_reports`,
`training_content_templates`, `user_invitations`, `user_skills`, `account_action_notes`,
`profiles`, `user_roles`, `conversations`, `conversation_participants`, `messages`,
`message_attachments`, `content_change_log`, `content_reviews`, `inbound_emails`,
`status_history`, `audit_export_retention_policies`) have `organization_id` present and
`NOT NULL` — so 0 NULLs by constraint.

### (3) `messages` final policies — PASS (no world-readable leak)
`consolidated_messages_select` USING:
```
(org_visible(organization_id) AND (sender_id = auth.uid() OR recipient_id = auth.uid()
   OR recipient_id IS NULL OR is_tenant_people_admin(organization_id)
   OR (property_id ... = ANY get_user_properties(...))
   OR (department_id ... = ANY get_user_departments(...))))
OR is_platform_super_admin()
```
The `recipient_id IS NULL` branch is nested **inside** the `org_visible(...) AND (...)` group —
a null-recipient message is readable only within its own org. No `is_regional_admin_or_higher`
anywhere on `messages` (replaced by `is_tenant_people_admin(organization_id)`).
INSERT/UPDATE both carry `WITH CHECK` and require `org_visible` + ownership.

### (4) `user_roles` SELECT policy — PASS (people-admin-scoped)
```
user_roles_select USING:
  user_id = auth.uid()
  OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id))
  OR is_platform_super_admin()
```
Not all-org-members. INSERT/UPDATE/DELETE keep the
`get_role_priority(role) > get_user_role_priority(auth.uid())` escalation guard.
(This matches the "Required fix" from `P3P4_REVIEW.md` §20260902010300 FAIL 1 — already
remediated in live.)

### (5) Migration-history version divergence — KNOWN follow-up, not fixed here
MCP `apply_migration` stamps versions like `20260901xxxxxx`; repo files are `20260901260000` /
`20260902xxxxxx`. Live history already contains name-duplicate rows (e.g.
`production_security_and_rls_lockdown` at `20260901015718`, `p3_tenant_direct_backfill_rls`
twice, `p4_*` at `202609010253xx`). Left as-is per instructions.

### (6) Advisor delta vs baseline (security)

| Advisor | Baseline | Now | Delta |
|---|---|---|---|
| `authenticated_security_definer_function_executable` (WARN) | 254 | 264 | +10 |
| `anon_security_definer_function_executable` (WARN) | (verify_certificate) | 4 | +3 |
| `extension_in_public` — `pg_net` (WARN) | present | present | — |
| `auth_leaked_password_protection` (WARN) | present | present | — |

- **+10 authenticated-secdef**: expected and intentional — the revoke/grant loop (and the
  broader `20260901*` tenancy sweep) moves privileged SECURITY DEFINER RPCs from
  `anon`/`public` to `authenticated`. The linter flags any SECURITY DEFINER function
  callable by `authenticated`; this is the hardening direction, not a regression.
- **4 anon-secdef** are `course_generation_jobs_default_org`, `set_organization_id_default_lit`,
  `sync_profile_primary_organization` (BEFORE-trigger functions carried in from the earlier
  P3/P4 backfill migrations — harmless as RPCs but still `anon`-executable) and
  `verify_certificate` (deliberately public). **None introduced by this migration** — it only
  revokes. Recommend a follow-up `REVOKE EXECUTE ... FROM anon, public` on the three trigger
  functions.
- No new `rls_disabled_in_public`, `policy_exists_rls_disabled`, or `security_definer_view`
  warnings.

## Residual risks

- `check_and_escalate_approvals()` and `get_media_asset_with_usage(uuid)` still carry
  `anon` + `PUBLIC` EXECUTE. The migration `CREATE OR REPLACE`s both but does **not** revoke.
  `check_and_escalate_approvals` is a no-op stub (`BEGIN RETURN; END`); `get_media_asset_with_usage`
  is SECURITY INVOKER so RLS on `media_assets`/`media_asset_usages` still applies. Low risk;
  worth revoking anon for cleanliness (neither is linter-flagged today).
- The 3 anon-executable trigger functions noted in (6).
- Migration-history version divergence (item 5) — cosmetic, tracked separately.
- `match_knowledge_chunks(vector,text,int,float8,uuid)` has `search_path` stored as the single
  quoted string `"public, extensions"` (pre-existing, not touched meaningfully by this migration).
