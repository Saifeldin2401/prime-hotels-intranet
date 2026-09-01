# Fresh-Eyes Remediation — Execution Plan

Branch: `fresh-eyes-remediation`. Live project: `dhbfaclkfysqwfppuxxa` (connect v2).
Canonical org (only tenant today): `e0000000-0000-0000-0000-000000000001` (Altus Hospitality Group).
User directives: apply everything live; full multi-tenant on all business tables; domain-model
consolidation DEFERRED (both training_modules and courses trees have live rows).

## Tenant RLS helper contract (existing, reuse — do not reinvent)
- `current_user_organization_ids() uuid[]`
- `org_visible(org uuid) bool`  — super admin OR active platform session OR member+operational
- `org_is_operational(org uuid) bool`
- `is_tenant_admin(org uuid)`, `is_tenant_content_editor(org uuid)`, `is_tenant_people_admin(org uuid)`
- `has_active_platform_session(org uuid)`, `is_platform_super_admin()`

## Standard per-table tenancy migration template
1. `ALTER TABLE t ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;`
2. Backfill: from parent FK if child table, else `= 'e0000000-0000-0000-0000-000000000001'`.
3. `ALTER TABLE t ALTER COLUMN organization_id SET NOT NULL;` (skip if legit-null rows)
4. `CREATE INDEX IF NOT EXISTS idx_t_org ON t(organization_id);`
5. Trigger to auto-populate organization_id on INSERT from parent/session where practical.
6. Drop legacy permissive policies; add `t_sel/ins/upd/del` policies gated on `org_visible()` + role helper.

## Phases (each = one or more workflows; migrations applied live in order, advisors re-run between)
- P0  Drift + safety cleanup (WF: drift-safety)
- P1  Critical RLS leak fixes: lessons/lesson_blocks read, unified_question_options, course_generation_jobs
- P2  Tenancy batch A — audit/telemetry/user-owned (system_events, analytics_events, ai_usage_log, notifications, user_sessions, search_logs, ...)
- P3  Tenancy batch B — messaging + announcements tree
- P4  Tenancy batch C — documents tree + knowledge
- P5  Tenancy batch D — training/course/quiz child tables
- P6  Tenancy batch E — remaining (media items, competency, reports, events, misc)
- P7  SECDEF RPC hardening sweep (tenant + role assertions), batched
- P8  Edge function hardening (orphan deletion, process-ai-request auth, slack signatures, tenant email)
- P9  Frontend: single identity source, dead-model guardrails, role-model convergence
- P10 Full verification: simulated 2nd tenant RLS test, advisors clean, typecheck+build+test
