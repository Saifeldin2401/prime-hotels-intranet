# Remediation Closeout — P11 + advisor follow-ups

Date: 2026-09-03 · Project `dhbfaclkfysqwfppuxxa` · branch `master` (commit `644f921`)

Independent verification of the P0–P10 work plus the residual fixes. All items
below were confirmed against the **live** database, not the summary docs.

## Verified holding

| Check | Result |
|---|---|
| Tables with RLS disabled | **0** |
| Tables with RLS on but zero policies | **0** |
| Tables carrying `organization_id` + tenant RLS | **142** (remaining 27 platform-global by design) |
| Cross-tenant isolation (live sim: non-member user) | `org_visible(other-org)` = false, `is_tenant_admin(other-org)` = false |
| Security advisors | 210 total · **0 ERROR** · **0 RLS findings** · **0 `function_search_path_mutable`** |
| Migration history vs repo | all `20260902*` + `20260903000000` files present; DB stamps a few under timestamp versions (MCP apply) — repo files are idempotent, `db reset` is safe |

## Fixes applied in this pass (live + committed)

**`20260902161527_p11_legacy_role_bridge_cleanup.sql`**
- `is_tenant_admin(NULL)` / `is_tenant_content_editor(NULL)` no longer pass for any
  tenant admin — NULL org now resolves to platform-super-admin only. This closed a
  bypass reachable through ~40 RLS policies and the `publish_document_to_kb` /
  `remove_document_from_kb` / `set_document_internal` KB RPCs.
- `brands`: dropped the redundant `brands_modify_admin_*` policies that bypassed
  `brands_tenant_isolation_admin`'s org scoping.
- 9 platform-global config tables (`system_wiki`, `ai_models`, `ai_agent_policies`,
  `role_permissions`, `achievement_definitions`, `motivational_content`,
  `failed_login_attempts`, `notification_email_templates`, `password_reset_requests`)
  → management locked to `is_platform_super_admin()`. Fixes both the dead
  legacy-role policies (management locked out entirely) and the `has_role()` checks
  that still resolved true for any tenant `administrator`.

**`20260903000000_pin_search_path_role_helpers.sql`**
- Pinned `search_path` on `is_admin`, `get_user_role`, `get_role_priority`,
  `is_content_manager`, `is_hr_or_admin` → advisor `function_search_path_mutable`
  cleared (5 → 0).

**`process-ai-request` edge function (v39, `verify_jwt` stays false — in-code auth)**
- Rejects bare anon / publishable-key calls; requires a verified end-user JWT or
  the service-role key, so the org credit / rate-limit gate can no longer be
  skipped by a logged-out client SDK falling back to the anon key.

## Confirmed intentional / left as-is

- `verify_certificate(verification_code)` anon-executable — public credential
  verification. Requires an exact per-cert code (non-enumerable); returns only
  recipient name + course + dates + status. Standard pattern, **safe**.
- `auth_leaked_password_protection` WARN — Supabase Auth dashboard toggle, not a
  schema issue. Enable in project Auth settings.
- 208 `authenticated_security_definer_function_executable` WARN — expected for an
  app with many SECURITY DEFINER RPCs; each was reviewed to do its own tenant/role
  checks. No further action unless a specific RPC is found lacking.
- `app_role` enum still carries the 8 legacy values (data migrated, enum not
  pruned) — cosmetic; dropping enum values is riskier than the benefit.
- `roles_satisfying()` still maps `administrator` up to `super_admin`/`corporate_admin`
  for `has_role()` — deliberate bridge kept so ~150 legacy-role policies keep
  working. Its reachable high-privilege targets (the 9 global config tables) were
  removed in P11, so the remaining effect is intra-tenant only.

## Not part of this work (left uncommitted in the tree)

`src/components/layout/AppLayout.tsx`, `src/pages/assessments/AssessmentPlayer.tsx`,
`src/pages/learning/MicrolearningViewer.tsx`, `src/pages/learning/components/QuizComponentEnhanced.tsx`,
`src/pages/training/TrainingPlayer.tsx`, `src/components/training/player/shell/` —
an in-progress training-player refactor, unrelated to the security remediation.
