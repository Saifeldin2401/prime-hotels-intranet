# Enterprise Governance Rollout Playbook
Date: 2026-02-27  
Mode: Safe staged rollout (non-breaking first)

## Objective
Ship enterprise governance architecture without destabilizing existing auth, RLS, approvals, or dashboards.

## Artifacts
- Audit baseline:
  - `docs/ENTERPRISE_GOVERNANCE_PHASE1_SAFE_AUDIT_2026-02-27.md`
- Latest readiness execution:
  - `docs/ENTERPRISE_GOVERNANCE_READINESS_RUN_2026-02-27.md`
- Preflight checks:
  - `supabase/migration_drafts/2026-02-27_governance_phase1_preflight_checks.sql`
- Post-apply checks:
  - `supabase/migration_drafts/2026-02-27_governance_phase1_postapply_checks.sql`
- Minimal foundation migration:
  - `supabase/migration_drafts/2026-02-27_governance_phase1_minimal_foundation.sql`
- Full additive draft:
  - `supabase/migration_drafts/2026-02-27_governance_phase1_safe_additive.sql`

## Rollout Sequence
### Stage 0: Baseline Snapshot (No DB changes)
1. Export migration list and schema status.
2. Capture row counts for core tables (`profiles`, `user_roles`, `properties`, `departments`, `requests`, `audit_logs`).
3. Save current app behavior snapshots (auth + approvals + dashboards).

### Stage 1: Preflight Validation (Read-only SQL)
Run:
```sql
\i supabase/migration_drafts/2026-02-27_governance_phase1_preflight_checks.sql
```
Stop if:
- Any exception appears.
- `users_without_roles` is unexpectedly high.
- `departments_without_property` is non-zero (unless intentionally supported).

### Stage 2: Minimal Foundation Apply
Run:
```sql
\i supabase/migration_drafts/2026-02-27_governance_phase1_minimal_foundation.sql
```
Expected impact:
- New governance tables and helper function only.
- Feature flags remain OFF.
- No runtime access-path changes.

### Stage 3: Post-Apply Validation
Checks:
1. Confirm all flags exist and are `false`.
2. Confirm `gov_role_catalog` seeded with hierarchy roles.
3. Confirm no change in login/route behavior.
4. Confirm existing approvals and request actions still work.

Validation SQL:
```sql
\i supabase/migration_drafts/2026-02-27_governance_phase1_postapply_checks.sql
```

### Stage 4: Full Additive Governance Apply (Optional, Staging First)
Run only after Stage 3 passes:
```sql
\i supabase/migration_drafts/2026-02-27_governance_phase1_safe_additive.sql
```
Expected impact:
- Adds financial governance, KPI/RACI, incident, delegation, exec metric models.
- Still no runtime cutover; flags remain OFF.

### Stage 5: Controlled Activation (One Flag At A Time)
Order:
1. `governance_exec_dashboards_enabled`
2. `governance_financial_controls_enabled`
3. `governance_incident_engine_enabled`
4. `governance_rbac_enabled` (last)

Example:
```sql
UPDATE public.gov_feature_flags
SET is_enabled = true, updated_at = now()
WHERE flag_key = 'governance_exec_dashboards_enabled';
```

## Rollback Strategy
### Immediate functional rollback
- Set all governance flags to `false`.
- This restores legacy runtime behavior (assuming feature-flagged integration path).

### Data rollback
- Not required for emergency app stability.
- Governance tables are additive and can remain dormant.

## Go / No-Go Gates
Go only if all are true:
1. No auth regressions.
2. No RLS access errors in existing modules.
3. No request workflow regressions.
4. Dashboard loads unchanged for legacy paths.
5. Preflight and post-apply SQL checks pass.

No-Go triggers:
1. Any login/session instability after apply.
2. Existing route authorization mismatch.
3. Existing workflow action failures.
4. Unexpected policy denials in legacy tables.

## Ownership Model For Execution
- CTO track: schema integrity, index and policy safety.
- GM track: organizational hierarchy and KPI ownership fit.
- Risk track: auditability, override control, separation-of-duties.

## Next Build Iteration (After This Playbook)
1. Add read-only governance admin pages (no write actions yet).
2. Add dual-read comparators (legacy vs governance role resolution).
3. Introduce policy simulation mode before enabling governance RBAC.
