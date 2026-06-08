# Full System Audit - PHG Connect / connect v2

Date: 2026-06-08  
Supabase project: `connect v2` (`dhbfaclkfysqwfppuxxa`)  
Region: `eu-west-1`  
Database: Postgres 17.6.1  
Status: Active/healthy at time of audit

## A. Executive Summary

This system is significantly overbuilt for its current live data shape. The application has a large frontend, a very large Supabase schema, a large Edge Function surface, many overlapping workflow systems, and a migration history that clearly records rapid experimentation, repeated fixes, and feature expansion before operational consolidation.

The most important finding: the database has become the application framework. That would be acceptable for a mature product with heavy usage and stable domain boundaries, but the live `connect v2` database currently has 219 public tables, 443 public functions, 469 RLS policies, 137 triggers, 893 indexes, and 198 public tables with fewer than five estimated rows. This is far beyond what the current production data justifies.

Scores:

| Area | Score | Meaning |
| --- | ---: | --- |
| Architecture | 4/10 | Working pieces exist, but too many systems solve adjacent problems. |
| Maintainability | 3/10 | High cognitive load from 860 migrations, 443 DB functions, large hooks/components. |
| Simplicity | 2/10 | The platform is much more complex than current usage requires. |
| Security | 4/10 | RLS is broadly enabled, but privileged RPC and Edge Function exposure are serious risks. |
| Scalability | 5/10 | It can scale technically, but operational scaling is harmed by policy/function complexity. |
| Technical Debt | 8/10 | High debt; much of it is removable by consolidation. |

Bottom line: do not continue adding features on top of the current shape. Freeze feature expansion, stabilize auth/RLS/functions, then aggressively consolidate modules, tables, policies, and automation.

## B. Current State Assessment

Measured inventory:

| Area | Count |
| --- | ---: |
| TypeScript files under `src` | 833 |
| TypeScript lines under `src` | 214,482 |
| Local Supabase migration files | 860 |
| Local migration SQL lines | 88,823 |
| Local Edge Function TS files | 57 |
| Local Edge Function lines | 19,472 |
| Live public tables | 219 |
| Live near-empty public tables (`<5` est. rows) | 198 |
| Live public functions | 443 |
| Live public `SECURITY DEFINER` functions | 195 |
| Live executable `SECURITY DEFINER` grants to `anon` | 206 grant rows |
| Live executable `SECURITY DEFINER` grants to `authenticated` | 206 grant rows |
| Live RLS policies | 469 |
| Live triggers | 137 |
| Live indexes | 893 |
| Live views | 9 |
| Live materialized views | 1 |
| Storage buckets | 14 |
| Cron jobs | 19 |
| Production dependencies | 83 |

Verification:

- `npm run typecheck` passes.
- `npm audit --omit=dev` reports 2 moderate vulnerabilities through `exceljs -> uuid`, no high or critical production advisories.

## C. Critical Findings

1. Critical: too many public `SECURITY DEFINER` functions are executable by `anon` and `authenticated`.

The live database reports 195 public `SECURITY DEFINER` functions and 206 executable grant rows for both `anon` and `authenticated`. Supabase advisors explicitly warn that many sensitive RPCs can be executed by public or signed-in roles. Examples include promotion, transfer, approval, attendance, maintenance assignment, MFA, audit export, document update, and other privileged actions.

Recommended action: revoke default execute on public functions, explicitly grant only the RPCs that must be public, and move privileged functions to a private schema.

2. Critical: deployed Edge Functions report `verify_jwt = false`.

The live Edge Function list reports `verify_jwt: false` for every deployed function returned by the API, including admin/user/account functions. Some webhook functions need custom auth, but admin operations should have both platform JWT verification and in-function role checks.

Recommended action: classify functions into `public webhook`, `scheduled service-role only`, and `authenticated user/admin`. Enable JWT for user/admin functions and require service-role or signed webhook verification for scheduled/webhook functions.

3. Critical: cron jobs reference a different Supabase project ref.

Several active cron jobs post to `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/...`, while the audited project is `dhbfaclkfysqwfppuxxa`. This suggests copied migrations or stale cron definitions that may trigger another environment or simply fail silently.

Recommended action: immediately audit all `cron.job` commands and replace or disable jobs targeting the old project ref.

4. High: database surface area is not justified by current live data.

198 of 219 public tables estimate fewer than five rows. Many feature families have zero data: governance, PMS imports, HR payroll/attendance, social feed, messaging, job applications, quiz variants, document analytics, EOM history, audit exports, media usage, and more.

Recommended action: disable unfinished modules in UI, quarantine their tables/functions, then drop or archive them after a data-retention check.

5. High: migration history is operationally unmanageable.

860 migration files with many repeated names (`fix_*`, `retry`, `v2`, `final`, `final_fixed`, duplicate feature creation) makes rebuilds, review, rollback, and onboarding unnecessarily difficult.

Recommended action: create a clean baseline migration for `connect v2`, archive historical migrations, and treat future migrations as reviewed product changes.

6. High: RLS policy sprawl harms both security review and performance.

469 RLS policies exist. Supabase performance advisors report multiple permissive policies on many tables. Security advisors report RLS-enabled tables with no policies and permissive `WITH CHECK (true)` insert policies.

Recommended action: define one access model per domain and consolidate policies to role/property/ownership primitives.

7. High: storage bucket configuration is inconsistent.

`employee-documents` is public. Several buckets have no file size or MIME restrictions. `avatars` is public and has a broad listing policy. The `media` bucket permits SVG uploads, which need especially careful sanitization and serving rules.

Recommended action: make employee documents private, add explicit MIME/size limits to every bucket, remove broad public listing, and serve private assets through signed URLs or checked proxy functions.

## D. Database Audit Report

The current database should be treated as a feature graveyard plus an application backend. It contains useful core concepts, but they are mixed with experimental systems, duplicate workflow models, multiple learning/quiz/document models, governance enterprise scaffolding, AI automation, reporting, PMS imports, Slack, media, compliance, and HR modules.

Core tables to keep:

| Table family | Keep? | Reason |
| --- | --- | --- |
| `profiles`, `user_roles`, `role_permissions` | Keep, simplify | Core identity and permissions. |
| `properties`, `departments`, `user_properties`, `user_departments` | Keep, simplify | Multi-property hotel access model. |
| `documents`, `document_versions`, `document_folders`, `document_tags` | Keep, consolidate | Core intranet knowledge/document use case. |
| `training_modules`, `training_content_blocks`, `learning_assignments`, `learning_progress` | Keep, consolidate | Core LMS capability. |
| `announcements`, `notifications`, `notification_*` | Keep minimal | Useful internal comms, but email/queue layers should be reduced. |
| `requests`, `request_steps`, `request_events`, `request_comments`, `request_attachments` | Keep if active | Good generic workflow base. |
| `audit_logs`, `security_audit_logs` | Keep one canonical audit system | Needed for admin/security. |
| `user_settings`, `notification_preferences` | Keep | Small user preference model. |

Tables I Would Delete Today, after confirming no product owner depends on them:

| Candidate | Why |
| --- | --- |
| `gov_*` tables | Enterprise governance scaffold has many zero-row tables and should not live in core until real workflows exist. |
| `pms_systems`, `pms_field_mappings`, `daily_occupancy`, `daily_revenue`, `market_segments`, `room_inventory`, `rate_summary`, `data_import_logs` | PMS/operations import system appears unused; keep only if an active integration is live this month. |
| `feed_comments`, `feed_reactions`, `kudos`, `kudos_likes`, `events`, `activity_log` | Social/intranet extras with zero data; likely distraction from core workflows. |
| `conversations`, `conversation_participants`, `messages`, `message_attachments` | Messaging is expensive to maintain and competes with Slack/email; remove unless actively used. |
| `job_postings`, `job_applications`, `employee_referrals`, `referral_history` | Recruiting/referral module appears unused. |
| `attendance`, `shifts`, `user_shifts`, `holidays`, `salary_components`, `payslips`, `performance_reviews`, `goals`, `designations`, `leave_types`, `leaves` | HR suite is broad and mostly empty; keep only `leave_requests` if actively used. |
| `employee_promotions`, `employee_transfers`, `promotions`, `transfers` | Duplicate promotion/transfer models. Collapse to generic `requests`. |
| `sop_*` tables that duplicate `documents` | SOP system and document system overlap. Keep one content/document model. |
| `quizzes`, `quiz_*`, `training_quizzes`, `learning_quizzes`, `knowledge_quiz_sessions` | Multiple quiz systems exist. Collapse to one quiz/question schema. |
| `knowledge_question_*` if not reused by current LMS | Good idea, but too many tables for current zero data. Keep only if it becomes the single quiz source. |
| `eom_*`, `employee_of_the_month` | Nice-to-have automation with zero history; defer until core data quality improves. |
| `media_asset_usages`, `media_collections`, `media_collection_items` | Keep only if the media library is a first-class workflow. Otherwise storage metadata can live on documents/training. |
| `inbound_emails`, `password_reset_requests`, `push_subscriptions` | Specialized systems; keep only if wired and monitored. |

Do not physically drop all of these in one migration. First hide UI routes, revoke public access, export a schema/data snapshot, and drop in batches.

## E. Supabase Audit Report

Supabase is the right platform for this product, but this project is using too many Supabase features at once:

- Auth
- PostgREST/RPC
- RLS
- Storage
- Edge Functions
- Cron
- Vault
- Realtime
- Database triggers
- Materialized views
- Extensions

This is not automatically wrong, but the combination has created too many execution paths for business logic.

Keep Supabase for:

- Auth.
- Postgres as the source of truth.
- RLS for direct client reads/writes where simple.
- Storage with private buckets and signed URLs.
- Edge Functions only for secrets, webhooks, scheduled jobs, and privileged admin actions.

Stop using Supabase for:

- Every business action as an RPC.
- Dozens of trigger-driven side effects.
- Multiple automation engines.
- AI self-governance or schema-changing automation.
- Publicly executable privileged functions.

Advisor findings to fix:

- RLS enabled with no policies: `password_reset_requests`, `rate_limit_entries`, `sop_access_logs`, `sop_review_reminders`.
- Extensions in `public`: `pg_net`, `btree_gist`.
- Materialized view exposed in API: `public.sop_document_search`.
- Permissive insert policies with `WITH CHECK (true)`: `job_applications`, `media_access_logs`, `media_asset_usages`, `notifications`.
- Public bucket broad listing: `avatars`.
- Leaked password protection disabled.
- Many unindexed foreign keys.
- Multiple permissive policies on many tables.
- Duplicate indexes on `admin_delegations` and `shifts`.

## F. Codebase Audit Report

Frontend architecture:

- Vite + React + React Router is a good foundation.
- TanStack Query is appropriate.
- Radix/shadcn style primitives are appropriate.
- i18n is justified because English/Arabic is a real requirement.
- The provider stack is understandable but too broad: Auth, Property, UserSettings, Presence, Notification, Theme, Query, runtime bridges, Sentry, service-worker recovery.

The codebase is too large for the current product maturity:

- 214k lines under `src`.
- Many hooks are full domain services: `useDocuments.ts`, `useAITrainingContent.ts`, `useDashboardStats.ts`, `useSearch.ts`, `useBulkOperations.ts`, `useTraining.ts`, `useMedia.ts`.
- Many components are too large: `SmartModuleWizard.tsx`, `UserForm.tsx`, `AIQuestionGenerator.tsx`, `MobileDashboard.tsx`, `ContentTypeBuilders.tsx`, `EOMAutomationSettings.tsx`, `SidebarNavigation.tsx`.
- Services duplicate logic that also exists in hooks, RPCs, and Edge Functions.
- Routes include many modules that appear ahead of real production adoption.

Recommended frontend simplification:

- Move data access into domain query modules, not giant hooks.
- Keep hooks small: compose query/mutation functions and local UI state only.
- Split large components by state machine and presentation.
- Remove inactive routes from navigation and route modules.
- Treat mobile-specific components as responsive variants only when they are truly needed.
- Keep one dashboard path and one analytics model.

## G. Security Audit Report

Highest-risk items:

1. Revoke public execution on privileged `SECURITY DEFINER` functions.
2. Enable JWT verification for non-webhook Edge Functions.
3. Fix cron jobs that target an old project ref.
4. Make `employee-documents` private.
5. Remove public broad storage listing on `avatars`.
6. Move `pg_net` and `btree_gist` out of `public`.
7. Remove or restrict `WITH CHECK (true)` write policies.
8. Enable leaked password protection.
9. Audit service-role usage in Edge Functions.
10. Remove any schema-changing automation endpoints from deployed functions.

Auth model concerns:

- `enable_signup = true` and email confirmations disabled may be acceptable only for controlled invite flows. For a corporate intranet, open signup should usually be disabled.
- Authorization should not depend on client-side role checks; RLS and server functions must enforce.
- Role names have likely grown beyond necessity.

Simplest secure permission model:

- `super_admin`: platform break-glass only.
- `corporate_admin`: all properties, most admin operations.
- `property_manager`: one or more properties, operational management.
- `department_manager`: one property plus department scope.
- `hr_manager`: HR workflows scoped by property/department.
- `employee`: self-service and assigned content.
- Optional `auditor`: read-only audit/compliance access.

Avoid role explosion. Use role + property + department + explicit permission only when a product workflow proves it needs an exception.

## H. Performance Audit Report

Database performance risks:

- 469 RLS policies means common queries may execute multiple policy predicates.
- Many policies call helper functions; this can turn simple reads into repeated function calls.
- 137 triggers increase write cost and debugging difficulty.
- 893 indexes likely include unused or duplicate indexes.
- Advisors report many unindexed foreign keys.
- Advisors report duplicate indexes on `admin_delegations` and `shifts`.
- Multiple permissive policies exist on many tables.

Frontend performance risks:

- Heavy libraries are present: TipTap, Mermaid, PDF.js, jsPDF, ExcelJS, Recharts, Framer Motion, Lottie.
- Vite manual chunking already tries to mitigate this, which is useful, but it also signals dependency weight.
- Large components and hooks increase render/debug cost.
- Search/dashboard hooks likely perform broad data fetching.

Estimated performance gains:

- RLS consolidation: 15-40% improvement for common authenticated queries.
- Dropping unused indexes/triggers: 10-30% improvement for writes and migrations.
- Removing inactive routes and heavy deps: 10-25% bundle improvement depending on actual imports.
- Dashboard/query consolidation: potentially 30-60% fewer network requests on dashboard pages.

## I. Technical Debt Report

Severity ranking:

| Debt | Severity | Evidence |
| --- | --- | --- |
| Migration sprawl | Critical | 860 files, repeated fixes/retries/final names. |
| Privileged RPC exposure | Critical | Public executable `SECURITY DEFINER` functions. |
| Edge Function auth drift | Critical | Live `verify_jwt = false` across listed functions. |
| Cron environment drift | Critical | Jobs targeting old Supabase ref. |
| Schema overgrowth | High | 219 tables, 198 near-empty. |
| RLS sprawl | High | 469 policies, advisor warnings. |
| Duplicate domain models | High | Documents/SOP/knowledge/training/quiz/request overlap. |
| Giant React hooks/components | Medium | Several files 30-96 KB. |
| Heavy dependency set | Medium | 83 prod deps, 1,150 installed deps total in audit output. |
| Prior audit/security docs proliferation | Medium | Many docs suggest repeated hardening without consolidation. |

## J. Simplification Opportunities

High-impact simplifications:

1. Collapse SOP and documents into one document/content model.
2. Collapse all quiz/question tables into one question bank and one attempt model.
3. Collapse promotion/transfer/leave/expense/approval workflows into generic `requests`.
4. Remove governance tables until real governance workflows exist.
5. Replace many RPCs with direct Supabase queries protected by simple RLS.
6. Replace many triggers with explicit application actions.
7. Keep one notification pipeline: `notifications` table plus one email processor.
8. Keep one analytics/dashboard aggregation path.
9. Remove AI governance/optimizer/rollback automation from production.
10. Baseline migrations and stop carrying historical experimentation as deploy history.

## K. Things I Would Delete Immediately

Immediate means: remove from navigation/deployment or disable first, then drop data structures after backup and verification.

- AI governance functions: `ai-admin`, `ai-optimizer`, `ai-policy-applier`, `ai-rollback-engine`, `ai-safety-validator`, `ai-metrics-collector` unless there is a hard business owner.
- `apply-migrations` Edge Function. Schema changes should not be exposed as an Edge Function.
- Test or one-off functions: `password-reminders-test`, migration helpers, bulk scripts not needed in production.
- Duplicate Slack functions if Slack is not a core launch integration.
- Governance (`gov_*`) tables and route/UI surfaces.
- PMS/import analytics tables if no live PMS feed exists.
- Social extras (`kudos`, feed reactions/comments, events) until core intranet workflows are stable.
- Duplicate HR suite tables not used by current workflows.
- Duplicate quiz systems.
- Duplicate SOP tables once document consolidation is planned.
- Public employee document storage.

## L. Things I Would Keep

- React + Vite.
- Supabase Auth + Postgres + Storage.
- TanStack Query.
- i18next English/Arabic support.
- Radix/shadcn UI foundation.
- Sentry, but with PII defaults kept off unless explicitly required.
- Core multi-property model.
- Core document library.
- Core training/LMS.
- Core request workflow.
- Core notifications.
- Audit logs, but consolidate to one audit model.

## M. Ideal Future Architecture

Target folder structure:

```text
src/
  app/
    providers/
    router.tsx
  domains/
    auth/
    properties/
    users/
    documents/
    training/
    requests/
    notifications/
    dashboard/
  components/
    ui/
    layout/
  lib/
    supabase/
    security/
    i18n/
  styles/
```

Target Supabase structure:

```text
public/
  profiles
  properties
  departments
  user_property_assignments
  user_department_assignments
  role_assignments
  documents
  document_versions
  document_access
  training_modules
  training_content_blocks
  training_assignments
  training_progress
  question_bank
  question_options
  quiz_attempts
  requests
  request_events
  request_comments
  notifications
  notification_preferences
  audit_events

private/
  admin helpers
  privileged RPCs
  service job internals
```

Function architecture:

- `admin-users`: create/update/invite/delete users.
- `send-notifications`: one email/push processor.
- `scheduled-jobs`: one service-role scheduled dispatcher.
- `webhooks-slack`: only if Slack is active.
- `webhooks-resend`: only if inbound email is active.
- `media-proxy` / `signed-url`: only for protected file access.
- No schema migration function in production.
- No AI schema governance in production.

Deployment architecture:

- Vercel or Netlify for frontend, one platform only.
- Supabase migrations from CI only.
- Edge Function deployment from CI only.
- Separate dev/staging/prod projects.
- Cron jobs templated per environment, never hard-coded project refs.

## N. Step-by-Step Refactoring Plan

1. Security freeze.

Current state: privileged functions and jobs are too exposed.  
Solution: revoke execute grants, enable JWT where appropriate, fix cron refs, make sensitive buckets private.  
Risk: medium because existing flows may rely on permissive access.  
Effort: 2-4 days.

2. Product surface freeze.

Current state: too many modules are visible/maintained.  
Solution: mark modules as core/active/experimental/delete. Hide inactive routes.  
Risk: low to medium.  
Effort: 2-3 days.

3. Migration baseline.

Current state: 860 migrations are not maintainable.  
Solution: generate a clean baseline for current schema, archive old migrations, keep only forward migrations after baseline.  
Risk: medium.  
Effort: 3-5 days.

4. RLS consolidation.

Current state: 469 policies and many helper functions.  
Solution: consolidate policies around role/property/department/self access.  
Risk: high; test thoroughly.  
Effort: 1-3 weeks.

5. Table consolidation.

Current state: overlapping domain tables.  
Solution: consolidate documents/SOP, quiz systems, request variants, notification systems.  
Risk: high if data exists; lower because most tables are empty.  
Effort: 2-6 weeks.

6. Frontend domain rewrite.

Current state: giant hooks and components.  
Solution: move query/mutation logic into domain modules; shrink hooks and components.  
Risk: medium.  
Effort: ongoing, domain by domain.

## O. 30-Day Stabilization Plan

Week 1:

- Fix cron jobs targeting old Supabase ref.
- Revoke public execute from privileged functions.
- Enable leaked password protection.
- Make employee document storage private.
- Disable/remove `apply-migrations` function.
- Classify all Edge Functions and redeploy with correct JWT settings.

Week 2:

- Disable inactive navigation/routes.
- Freeze non-core feature work.
- Add tests for core auth, document access, training assignment, request workflow.
- Fix RLS no-policy and permissive write-policy advisor findings.

Week 3:

- Consolidate duplicate indexes and missing FK indexes from advisors.
- Remove public materialized view exposure.
- Move extensions out of `public`.
- Audit service-role usage in Edge Functions.

Week 4:

- Produce clean migration baseline.
- Create deletion backlog with owner approval.
- Start document/SOP and quiz consolidation design.

## P. 90-Day Simplification Plan

Days 1-30: stabilize security and deployment.

Days 31-60:

- Collapse request workflows.
- Collapse notification/email pipelines.
- Remove inactive Edge Functions.
- Remove inactive frontend modules.
- Begin dropping zero-row unused tables.

Days 61-90:

- Consolidate documents/SOP.
- Consolidate quizzes/questions.
- Simplify auth roles.
- Rewrite top 10 largest hooks/components.
- Add CI checks for migration linting, advisor results, typecheck, tests, and audit.

## Q. Estimated Complexity Reduction

If the recommended plan is executed:

- Database object count reduction: 35-55%.
- Edge Function count reduction: 40-60%.
- RLS policy count reduction: 40-65%.
- Migration review complexity reduction: 80% after baseline.
- Frontend domain complexity reduction: 25-40%.

Overall complexity reduction estimate: 45%.

## R. Estimated Maintenance Cost Reduction

Expected maintenance cost reduction:

- Short term after security/deployment cleanup: 15-25%.
- After domain/table/function consolidation: 35-50%.
- After frontend hook/component cleanup: 45-60%.

## S. Estimated Performance Improvement

Expected performance improvement:

- Common DB reads: 15-40% from RLS and index cleanup.
- Writes: 10-30% from trigger/index reduction.
- Dashboard load: 30-60% fewer requests if consolidated around dedicated summary queries.
- Frontend bundle: 10-25% if unused heavy dependencies/routes are removed.

## Final Judgment

If rebuilding today, I would keep the product idea and the core stack, but I would not keep the current architecture. The simplest maintainable version is:

- one React/Vite app;
- one Supabase project per environment;
- one core document model;
- one core training model;
- one generic request workflow;
- one notification pipeline;
- one audit model;
- a small role model;
- few privileged Edge Functions;
- private storage by default;
- explicit CI-managed migrations.

The current system is recoverable, but only if simplification becomes the product priority. Continuing to add modules on top of this structure will make every future feature slower, riskier, and harder to secure.
