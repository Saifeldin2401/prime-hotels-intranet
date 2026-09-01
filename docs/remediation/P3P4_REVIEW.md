# P3 / P4 tenancy migrations — adversarial review

Reviewed against live project `dhbfaclkfysqwfppuxxa` on 2026-09-01. None of the
`20260902*` migrations are applied yet (last applied = `20260901252000`).

Verdict summary:

| File | Verdict |
|---|---|
| 20260902010100_p3_tenant_direct_backfill_rls.sql | **PASS** |
| 20260902010200_p4_user_owned_remainder.sql | **FAIL** |
| 20260902010300_p4_profiles_user_roles_tenancy.sql | **FAIL** |
| 20260902010400_p4_messaging_tenancy.sql | **FAIL** |
| 20260902010500_p4_ambiguous_audit_tenancy.sql | **FAIL** |

File-version ordering (all five): unique and sort after `20260902000500`. PASS.
Helper functions referenced (`org_visible`, `is_tenant_admin`,
`is_tenant_people_admin`, `is_tenant_content_editor`, `is_platform_super_admin`,
`current_user_organization_ids`, `get_role_priority(app_role)`,
`get_user_role_priority(uuid)`, `get_user_properties`, `get_user_departments`,
`set_organization_id_from_member`): all exist with matching signatures.

---

## 20260902010100_p3_tenant_direct_backfill_rls.sql — PASS

- All 15 target tables are `TENANT_DIRECT` and carry `organization_id`; every
  backfill `UPDATE`, index and `ALTER TABLE` targets a real column.
  `notification_delivery_events.user_id` is real and `NOT NULL`.
- Every `CREATE POLICY` is preceded by a matching `DROP POLICY IF EXISTS`
  (including the new names). Idempotent, wrapped in `BEGIN/COMMIT`.
- `notification_delivery_events` / `notification_queue`: the legacy
  `admins_read_notification_delivery_events` policy and the new
  `nde_tenant_admin_read` / `nq_tenant_admin_read` policies are **already present
  in live** (created by an earlier batch). This migration re-applies them
  identically — a no-op diff, no broadening.
- `nde_tenant_admin_read` / `nq_tenant_admin_read` are org-scoped
  (`organization_id IS NOT NULL AND org_visible() AND is_tenant_admin()`), strictly
  narrower than the obsolete global-role read they nominally replace.
- `system_settings` correctly left `NULL`-able / un-backfilled.
- Minor (non-blocking): the header references
  `admins_read_notification_delivery_events`, which no longer exists;
  `DROP ... IF EXISTS` makes this harmless.

---

## 20260902010200_p4_user_owned_remainder.sql — FAIL

### FAIL 1 — not idempotent: CREATE POLICY without preceding DROP

The migration drops only the *legacy* policy names, then creates new-named
policies that are never dropped first. Re-running (or resuming after a rolled-back
partial apply) errors with "policy already exists". Affected:

- `account_action_notes_update`, `account_action_notes_delete`
- `comments_select`, `comments_insert`, `comments_update`, `comments_delete`
- `course_generation_presets_insert`, `course_generation_presets_update`, `course_generation_presets_delete`
- `data_import_logs_select`, `data_import_logs_insert`, `data_import_logs_update`, `data_import_logs_delete`
- `microlearning_content_select`, `microlearning_content_insert`, `microlearning_content_update`, `microlearning_content_delete`
- `pending_user_approvals_select`, `pending_user_approvals_insert`, `pending_user_approvals_update`, `pending_user_approvals_delete`
- `scheduled_compliance_reports_select`, `scheduled_compliance_reports_insert`, `scheduled_compliance_reports_update`, `scheduled_compliance_reports_delete`
- `training_content_templates_insert`, `training_content_templates_update`, `training_content_templates_delete`
- `user_invitations_admin_delete`

(`document_tags_*` and `user_skills_*` are correct — new names match dropped names.)

**Required fix:** add `DROP POLICY IF EXISTS <new_name> ON public.<table>;`
immediately before every `CREATE POLICY` above.

### FAIL 2 — broadening vs current live policy (rule 5)

- **`data_import_logs_select`**: new `USING (org_visible(organization_id) OR is_platform_super_admin())`.
  Live policy is `USING (has_property_access(auth.uid(), property_id))`.
  `org_visible()` is true for *every* authenticated member of the org, so every
  employee can now read every property's import logs. **Required fix:** keep the
  `has_property_access(auth.uid(), property_id)` predicate, or gate the read on
  `is_tenant_admin(organization_id)`.
- **`document_tags_insert`** and **`microlearning_content_insert`**: new
  `WITH CHECK` allows any authenticated user whose `created_by = auth.uid()`.
  Live policies require a privileged role
  (`regional_admin`/`regional_hr`/`property_manager`/`department_head` for tags;
  `super_admin`/`corporate_admin`/`regional_admin`/`property_manager`/`department_head`
  for microlearning). **Required fix:** drop the bare `created_by = auth.uid()`
  branch — require `is_tenant_content_editor(organization_id)`.
- **`training_content_templates`** INSERT/UPDATE/DELETE: there is **no**
  authenticated write policy on this table today (SELECT-only). These are net-new
  write grants. **Required fix:** remove them, or document the deliberate grant
  and gate strictly on `is_tenant_content_editor(organization_id)`.
- **`course_generation_presets`** INSERT/UPDATE/DELETE: new policies allow
  `is_tenant_content_editor(organization_id)` — which includes `author`,
  `instructor`, `knowledge_manager`, `training_manager`, `department_manager`.
  Live `course_generation_presets_manage` allows only `super_admin` /
  `corporate_admin` (plus `created_by` self on non-system rows).
  **Required fix:** gate writes on `is_tenant_admin(organization_id)` to match the
  prior admin-only scope.
- Smaller broadenings (still rule-5 violations): `account_action_notes` gains
  UPDATE + DELETE policies (none exist today); `pending_user_approvals_select`
  adds an own-row read; `user_invitations` gains a DELETE policy. Either revert or
  document each.

### Passing checks

- `WITH CHECK` present on every INSERT/UPDATE policy; no `WITH CHECK (true)` for
  `authenticated` (only `service_role` FOR ALL, which is acceptable).
- All owner columns exist: `comments.author_id` (NN), `account_action_notes.user_id`
  (NN), `pending_user_approvals.user_id` (NN), `scheduled_compliance_reports.created_by`
  (NN), `user_skills.user_id` (NN), `user_invitations.invited_by` (NN),
  `data_import_logs.property_id` (NN); `course_generation_presets.created_by`,
  `document_tags.created_by`, `microlearning_content.created_by`,
  `training_content_templates.created_by` are nullable but backfill is
  `COALESCE(..., LIT)`, so `SET NOT NULL` is safe (rule 4 PASS).
- BEFORE INSERT triggers (`set_org_from_hotel_property`,
  `set_org_from_department_or_inviter`, `set_organization_id_from_member`) are
  `SECURITY DEFINER` with `search_path=public`; no recursion. Transactional.

---

## 20260902010300_p4_profiles_user_roles_tenancy.sql — FAIL

### FAIL 1 — broadening: `user_roles_select`

New `USING (user_id = auth.uid() OR org_visible(organization_id) OR is_platform_super_admin())`.
Because `org_visible()` is true for every authenticated member of the org, every
employee can now enumerate every role assignment in the org (who holds
`super_admin`, etc.). Live `consolidated_user_roles_select` is
`user_id = auth.uid() OR has_role(regional_admin) OR has_role(regional_hr) OR users_share_property(auth.uid(), user_id)`.

**Required fix:**
`USING (user_id = auth.uid() OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id)) OR is_platform_super_admin())`.

### Passing / acceptable

- Idempotency PASS: both the legacy names
  (`consolidated_user_roles_select`, `user_roles_modify_admin_hr_{insert,update,delete}`)
  **and** the new names (`user_roles_{select,insert,update,delete,service_role}`)
  are dropped before creation. `ADD COLUMN IF NOT EXISTS`, FK guarded via
  `pg_constraint`, `CREATE INDEX IF NOT EXISTS`, triggers `DROP...IF EXISTS`+CREATE,
  function `CREATE OR REPLACE`. Wrapped `BEGIN/COMMIT`.
- `user_roles` / `profiles` backfill is `COALESCE(membership, LIT)` → 100% filled;
  `SET NOT NULL` safe (rule 4 PASS). `user_roles.role` is `app_role`, matching
  `get_role_priority(_role app_role)`.
- INSERT/UPDATE/DELETE policies carry `WITH CHECK` where applicable; the
  `get_role_priority(role) > get_user_role_priority(auth.uid())` escalation guard
  is preserved.
- **Trigger recursion / deadlock (rule 6): OK.**
  `sync_profile_primary_organization` (AFTER INSERT OR UPDATE OF
  `is_primary,is_active,organization_id` on `organization_memberships`) issues
  `UPDATE public.profiles`. The profiles triggers that then fire
  (`trg_audit_profiles`, `update_profiles_updated_at`, `validate_reporting_chain`
  — not fired, `reporting_to` unchanged —, `trg_sync_everyone_training_progress`
  — INSERT only) do **not** write `organization_memberships`, so there is no
  trigger cycle and no guaranteed deadlock. The `organization_id IS DISTINCT FROM
  v_org` guard prevents a write storm. Residual: a theoretical lock-ordering
  deadlock only under concurrent *multi-row* membership updates touching
  overlapping users — acceptable for an admin-only operation.

### Notes (not blocking)

- The sync trigger does not fire on membership **DELETE**, so
  `profiles.organization_id` can keep pointing at an org the user has left
  (FK-valid but stale). Consider `AFTER ... OR DELETE` with an `OLD.user_id`
  recompute.
- Authority for managing `user_roles` shifts from legacy `regional_admin` /
  `regional_hr` to membership roles `organization_owner` / `organization_admin` /
  `hotel_admin` (5 users qualify in live). Confirm this is intended; otherwise
  some current role-admins are locked out.

---

## 20260902010400_p4_messaging_tenancy.sql — FAIL

### FAIL 1 — not idempotent: CREATE POLICY without preceding DROP

New-named policies are created with no `DROP POLICY IF EXISTS` for the new name
(only the legacy `"Users can ..."` names are dropped). Affected:

- `conversations_select_participant_same_org`, `conversations_insert_participant_same_org`, `conversations_update_participant_same_org`
- `conversation_participants_select_own_same_org`, `conversation_participants_insert_own_same_org`, `conversation_participants_delete_own_same_org`
- `message_attachments_select_same_org`, `message_attachments_insert_own_same_org`, `message_attachments_update_own_same_org`, `message_attachments_delete_own_same_org`

(The `consolidated_messages_{select,insert,update}` block is fine — names match.)

**Required fix:** add `DROP POLICY IF EXISTS <new_name> ...` before each.

### Passing checks

- **Rule 7 PASS.** `consolidated_messages_select` now reads
  `org_visible(organization_id) AND ( ... OR recipient_id IS NULL OR is_tenant_people_admin(organization_id) OR ... ) OR is_platform_super_admin()`.
  The `recipient_id IS NULL` branch is nested *inside* the `org_visible(...) AND`
  group, so a null-recipient message is readable only within its own org — the
  global "world-readable broadcast" leak is closed. `is_regional_admin_or_higher`
  is gone from `messages`, replaced by `is_tenant_people_admin(organization_id)`.
  `message_attachments_select_same_org` mirrors the same org gate.
- No other broadening: INSERT now additionally requires `org_visible` +
  property/department membership; UPDATE now additionally requires `org_visible`;
  SELECT adds only the `is_platform_super_admin()` escape hatch (consistent with
  the rest of the sweep).
- `WITH CHECK` present on all INSERT/UPDATE policies.
- Backfill order correct within the single transaction: `conversations` →
  `conversation_participants`, `messages` → `message_attachments`. Owner/parent
  columns (`messages.sender_id` NN, `conversations.participant_ids` NN,
  `conversation_participants.participant_id` NN, `message_attachments.message_id`
  NN, `.uploaded_by_id` NN) all exist; `COALESCE(..., LIT)` → `SET NOT NULL` safe.
- Trigger functions `SECURITY DEFINER`, `search_path=public`, BEFORE INSERT, no
  recursion (`set_messaging_org_from_parent` reads parent tables only).

---

## 20260902010500_p4_ambiguous_audit_tenancy.sql — FAIL

### FAIL 1 — not idempotent: CREATE POLICY without preceding DROP

- `status_history_insert` — created after `DROP POLICY IF EXISTS "System can insert status history"`, but the new name `status_history_insert` is not dropped first.
- `audit_export_retention_policies_select`, `_insert`, `_update`, `_delete` — only the legacy names (`auth_view_retention_policies`, `hr_admin_manage_retention_policies_{delete,insert,update}`) are dropped.

(`content_change_log_select`, `content_reviews_{select,insert,update}`,
`inbound_emails_admin_read` are fine — new names match dropped names.)

**Required fix:** add `DROP POLICY IF EXISTS <new_name> ...` before each.

### FAIL 2 — broadening: `status_history_select_scoped`

New `USING (changed_by = auth.uid() OR org_visible(organization_id) OR is_platform_super_admin())`.
Live definition is `changed_by = auth.uid() OR is_platform_operator(auth.uid()) OR EXISTS(<caller shares an org with changed_by>)`.
For rows where `changed_by IS NULL` (system rows — backfilled to LIT), the live
`EXISTS` clause is false, so today only a platform operator can read them; under
the new policy every LIT member can. **Required fix:** exclude null-`changed_by`
rows from the `org_visible` branch, or explicitly accept the exposure.

### Passing checks

- All dropped legacy names exist in live (`content_change_log_select`,
  `content_reviews_{select,insert,update}`, `"System can insert status history"`,
  `status_history_select_scoped`, `auth_view_retention_policies`,
  `hr_admin_manage_retention_policies_{delete,insert,update}`, `inbound_emails_admin_read`).
- `content_reviews.status` is enum `content_status`; `'in_review'` is a valid
  label. `submitted_by` is `NOT NULL`.
- Nullable owner columns (`content_change_log.actor`, `status_history.changed_by`,
  `audit_export_retention_policies.created_by`) fall back to `LIT` via `COALESCE`,
  so `SET NOT NULL` is safe (rule 4 PASS). All five tables are empty in live.
- `ENABLE ROW LEVEL SECURITY` issued on every table; BEFORE INSERT triggers are
  `SECURITY DEFINER` / `search_path=public`; wrapped `BEGIN/COMMIT`.
- INSERT/UPDATE policies carry `WITH CHECK`.

### Note (not blocking)

- `content_change_log` is left with a SELECT policy only ("immutable"). This is
  correct *only if* RLS already blocks authenticated INSERT today and all writes
  come via `service_role` / `SECURITY DEFINER` triggers. Confirm before relying on
  it.
