# TENANCY_MAP — authoritative tenancy classification for all `public` base tables

Generated 2026-09-01 against live project `dhbfaclkfysqwfppuxxa` (Postgres 17).
Source of truth for later remediation phases (RLS lockdown, `organization_id` backfill, NOT NULL enforcement).

- Base tables in `public`: **169** (0 partitioned, 27 views excluded).
- Canonical single org id (`organizations` has exactly 1 row): `e0000000-0000-0000-0000-000000000001` (referred to below as **LIT**).
- Row counts are exact `count(*)` at generation time.

## Classification legend

| Class | Meaning | Remediation |
|---|---|---|
| `TENANT_DIRECT` | already has `organization_id` column | verify FK + RLS `org_visible()`; backfill any NULLs from LIT |
| `TENANT_VIA_PARENT` | no org col, but a NOT-NULL-ish FK reaches a parent that has `organization_id` | add `organization_id`, backfill via parent FK join, then NOT NULL + trigger to keep in sync |
| `USER_OWNED` | has `user_id` / `created_by` / `actor_id` / `owner_id` but no path to org | add `organization_id` directly, backfill from owning user's membership or LIT |
| `PLATFORM_GLOBAL` | control-plane / shared reference data — no tenancy | RLS: platform-operator read, service-role write; **do not** add org col |
| `AMBIGUOUS` | polymorphic parent (`entity_id`) or unclear ownership — needs a human decision | backfill LIT for now, revisit when polymorphic targets are typed |

"NOT NULL safe" = can the column be made `NOT NULL` immediately after backfill without losing legitimate cross-tenant / anonymous rows.
With only one live org every populated table is mechanically safe via LIT; `NO*` marks rows where a genuine multi-tenant design should keep the column NULLable (platform-origin / anonymous events) even though the backfill itself is safe today.

---

## TENANT_DIRECT (43)

All already carry `organization_id` (FK → `organizations.id`). Action = confirm NOT NULL + RLS only; backfill NULLs from LIT.

| table | rows | notes |
|---|---|---|
| announcements | 0 | also brand_id/hotel_id/department_id |
| api_keys | 0 | |
| assessments | 21 | self-ref master_source_id |
| brands | 0 | org child (hierarchy root under org) |
| certificate_templates | 1 | |
| certificates | 0 | |
| competencies | 5 | |
| course_generation_jobs | 8 | |
| courses | 9 | self-ref master_source_id |
| departments | 60 | org + hotel_id |
| documents | 288 | self-ref master_source_id; many NULL org rows expected — backfill LIT |
| employee_transfer_logs | 0 | |
| enrollments | 0 | |
| hotels | 5 | org + brand_id |
| identity_providers | 0 | |
| knowledge_chunks | 0 | |
| learning_assignments | 0 | |
| learning_quizzes | 21 | |
| media_assets | 0 | |
| media_collections | 3 | |
| notification_delivery_events | 17 | |
| notification_queue | 0 | |
| organization_feature_overrides | 0 | |
| organization_memberships | 7 | the M:N user↔org table |
| organization_notification_overrides | 0 | |
| practical_assessments | 0 | |
| question_banks | 4 | self-ref master_source_id |
| quota_warning_logs | 0 | |
| role_competency_requirements | 0 | |
| service_accounts | 0 | |
| subscriptions | 1 | |
| system_settings | 21 | org NULLable today — global settings rows; keep NULL allowed |
| training_assignment_rules | 8 | |
| training_assignment_submissions | 0 | |
| training_modules | 8 | self-ref master_source_id |
| training_paths | 0 | |
| training_progress | 16 | |
| training_sessions | 0 | |
| unified_question_attempts | 341 | |
| unified_questions | 498 | self-ref master_source_id |
| unified_quiz_sessions | 42 | |
| user_competencies | 0 | |
| webhook_endpoints | 0 | |

---

## PLATFORM_GLOBAL (27)

No `organization_id`. Control-plane, shared reference data, or auth infra. Do **not** add tenancy.

| table | rows | notes |
|---|---|---|
| organizations | 1 | tenant root |
| ai_models | 50 | model registry |
| ai_providers | 7 | |
| ai_agent_policies | 14 | global AI routing policy |
| ai_model_probes | 19 | model verification results |
| ai_platform_config | 1 | singleton |
| achievement_definitions | 10 | shared gamification catalog |
| data_retention_policies | 5 | |
| failed_login_attempts | 5 | auth infra (keyed by email/ip) |
| password_reset_requests | 16 | auth infra |
| rate_limit_entries | 5 | infra |
| role_permissions | 101 | shared RBAC matrix |
| skills | 46 | shared skills taxonomy |
| subscription_plans | 3 | billing catalog |
| system_wiki | 7 | internal ops docs |
| notification_email_templates | 68 | **stored templates** — being dynamicized per-tenant in migration `20260901252000`; treat as global fallback layer |
| motivational_content | 44 | shared content pool (created_by only) |
| platform_access_sessions | 0 | operator impersonation sessions |
| platform_audit_logs | 0 | operator audit (has target_organization_id as data, not tenancy) |
| platform_config | 1 | singleton |
| platform_events | 0 | has NULLable organization_id for scoping; platform-owned stream |
| platform_feature_flags | 10 | |
| platform_notification_policies | 5 | |
| platform_role_assignments | 4 | operator roles |
| platform_role_map | 9 | |
| platform_role_map_extra | 4 | |
| platform_users | 4 | operator identity |

---

## TENANT_VIA_PARENT (60)

Add `organization_id uuid`, backfill via the parent path, add FK → `organizations(id)`, sync trigger on insert, then NOT NULL. All are NOT-NULL-safe (parent org is NOT NULL or falls back to LIT). Populated ones flagged.

| table | rows | backfill source (parent FK → org) |
|---|---|---|
| announcement_acknowledgments | 0 | `announcement_id` → announcements.organization_id |
| announcement_attachments | 0 | `announcement_id` → announcements.organization_id |
| announcement_comments | 0 | `announcement_id` → announcements.organization_id |
| announcement_reads | 0 | `announcement_id` → announcements.organization_id |
| announcement_targets | 0 | `announcement_id` → announcements.organization_id |
| assessment_questions | 0 | `assessment_id` → assessments.organization_id |
| categories | 1 | `department_id` → departments.organization_id; NULL dept → LIT |
| certificate_history | 0 | `certificate_id` → certificates.organization_id |
| competency_levels | 0 | `competency_id` → competencies.organization_id |
| conversation_participants | 0 | `conversation_id` → conversations.organization_id (conversations resolved as AMBIGUOUS→LIT) |
| course_competencies | 0 | `course_id` → courses.organization_id |
| course_modules | 0 | `course_id` → courses.organization_id |
| course_source_documents | 0 | `training_module_id` → training_modules.organization_id |
| course_visual_assets | 16 | `course_id` → training_modules.organization_id; NULL/`temp_course_id` rows → LIT |
| document_acknowledgments | 0 | `document_id` → documents.organization_id |
| document_approvals | 0 | `document_id` → documents.organization_id |
| document_bookmarks | 0 | `document_id` → documents.organization_id |
| document_categories | 0 | `department_id` → departments.organization_id; NULL → LIT |
| document_comments | 1 | `document_id` → documents.organization_id |
| document_department_access | 0 | `document_id` → documents.organization_id |
| document_favorites | 0 | `document_id` → documents.organization_id |
| document_feedback | 0 | `document_id` → documents.organization_id |
| document_folders | 0 | `department_id` → departments.organization_id; NULL → LIT |
| document_notification_rules | 0 | `folder_id` → document_folders.organization_id (after folders backfilled) |
| document_tag_assignments | 0 | `document_id` → documents.organization_id |
| document_versions | 0 | `document_id` → documents.organization_id |
| events | 0 | `department_id` → departments.organization_id; NULL → LIT |
| knowledge_related_articles | 0 | `document_id` → documents.organization_id |
| knowledge_required_reading | 0 | `document_id` → documents.organization_id |
| learning_events | 0 | `enrollment_id` → enrollments.organization_id (or `course_id` → courses) |
| learning_objectives | 0 | `course_id` → courses.organization_id |
| lesson_blocks | 0 | `lesson_id` → lessons → course_modules → courses.organization_id |
| lesson_progress | 0 | `enrollment_id` → enrollments.organization_id |
| lessons | 0 | `course_module_id` → course_modules → courses.organization_id |
| media_asset_usages | 0 | `media_asset_id` → media_assets.organization_id |
| media_collection_items | 0 | `collection_id` → media_collections.organization_id |
| message_attachments | 0 | `message_id` → messages.organization_id (after messages resolved) |
| module_skills | 0 | `module_id` → training_modules.organization_id |
| objective_links | 0 | `objective_id` → learning_objectives → courses.organization_id |
| practical_submissions | 0 | `assessment_id` → practical_assessments.organization_id |
| related_articles | 0 | `source_document_id` → documents.organization_id |
| report_definitions | 0 | `department_id` → departments.organization_id; NULL → LIT (also created_by) |
| report_runs | 0 | `report_id` → report_definitions.organization_id |
| scheduled_report_executions | 0 | `report_id` → scheduled_compliance_reports.organization_id (parent is USER_OWNED→LIT) |
| sop_comment_votes | 0 | `comment_id` → sop_comments → documents.organization_id |
| sop_comments | 0 | `document_id` → documents.organization_id |
| source_change_flags | 0 | `document_id` → documents.organization_id (or `training_module_id`) |
| training_block_progress | 12 | `training_module_id` → training_modules.organization_id |
| training_certificate_settings | 0 | `module_id` → training_modules.organization_id |
| training_certificates | 0 | `training_progress_id` → training_progress.organization_id |
| training_module_prerequisites | 0 | `module_id` → training_modules.organization_id |
| training_module_versions | 9 | `training_module_id` → training_modules.organization_id |
| training_path_modules | 0 | `path_id` → training_paths.organization_id |
| training_session_attendees | 0 | `session_id` → training_sessions.organization_id |
| unified_question_options | 1699 | `question_id` → unified_questions.organization_id |
| unified_question_usages | 0 | `question_id` → unified_questions.organization_id |
| unified_question_versions | 0 | `question_id` → unified_questions.organization_id |
| unified_quiz_questions | 92 | `quiz_id` → learning_quizzes.organization_id |
| user_path_enrollments | 0 | `path_id` → training_paths.organization_id |
| webhook_deliveries | 0 | `endpoint_id` → webhook_endpoints.organization_id |

> Deep-path tables (`lessons`, `lesson_blocks`, `lesson_progress`, `learning_events`, `objective_links`, `sop_comment_votes`) must be backfilled **after** their intermediate parents get `organization_id`. Order phases parent-first.

---

## USER_OWNED (32)

No parent path to org. Add `organization_id uuid` directly. Backfill = owning user's org via `organization_memberships` (single membership per user today) → in practice **LIT**. NOT NULL safe after backfill unless flagged.

| table | rows | owning col | backfill | NOT NULL safe |
|---|---|---|---|---|
| account_action_notes | 0 | user_id / created_by | LIT | YES |
| ai_usage_log | 1185 | user_id (+ course_id → training_modules) | `course_id` → training_modules.organization_id else LIT | YES |
| analytics_events | 7112 | user_id (NULLable — anon) | membership of user_id, else LIT | NO* (keep NULLable for anonymous traffic) |
| audit_export_retention_policies | 0 | created_by | LIT | YES (consider PLATFORM_GLOBAL if retention is operator-set) |
| comments | 0 | author_id (+ polymorphic entity_id) | LIT | YES |
| course_generation_presets | 4 | created_by | LIT | YES |
| data_import_logs | 0 | imported_by (+ property_id) | `property_id` → hotels.organization_id else LIT | YES |
| document_tags | 0 | created_by | LIT | YES |
| learning_assignment_exemptions | 0 | user_id / created_by | membership of user_id, else LIT | YES |
| learning_assignment_user_overrides | 1 | user_id / created_by | membership of user_id, else LIT | YES |
| messages | 2 | sender_id / recipient_id (+ department_id) | `department_id` → departments.organization_id else sender membership else LIT | YES |
| microlearning_content | 0 | created_by | LIT | YES |
| mfa_secrets | 0 | user_id | membership, else LIT (auth infra — org col optional) | YES |
| notification_batches | 1 | created_by | LIT | YES |
| notification_preferences | 7 | user_id | membership of user_id, else LIT | YES |
| notifications | 156 | user_id (+ polymorphic entity_id) | membership of user_id, else LIT | YES |
| password_history | 3 | user_id | membership, else LIT (auth infra — org col optional) | YES |
| pending_user_approvals | 0 | user_id / reviewed_by | LIT | YES |
| profiles | 7 | id → auth.users | `organization_memberships.organization_id` for that user, else LIT | YES (this becomes the user's *primary* org; membership table stays the M:N authority) |
| push_subscriptions | 0 | user_id | membership, else LIT | YES |
| scheduled_compliance_reports | 0 | created_by | LIT | YES |
| scheduled_reminders | 0 | user_id (+ polymorphic entity_id) | membership of user_id, else LIT | YES |
| search_logs | 47 | user_id (+ department_id/property_id) | `department_id`→departments / `property_id`→hotels else LIT | YES |
| training_content_templates | 0 | created_by | LIT (or PLATFORM_GLOBAL if templates are shared) | YES |
| user_achievements | 2 | user_id | membership of user_id, else LIT | YES |
| user_dashboard_preferences | 0 | user_id | membership, else LIT | YES |
| user_invitations | 0 | auth_user_id / invited_by (+ department_id) | `department_id` → departments.organization_id else LIT | YES |
| user_pins | 0 | user_id | membership, else LIT | YES |
| user_roles | 24 | user_id | membership of user_id, else LIT | YES — **flag:** multi-tenant RBAC likely needs `(user_id, organization_id)` scoping, not global roles |
| user_sessions | 492 | user_id | membership of user_id, else LIT | NO* (session rows may outlive membership; NULLable acceptable) |
| user_settings | 7 | user_id | membership of user_id, else LIT | YES |
| user_skills | 0 | user_id (+ skill_id) | membership of user_id, else LIT | YES |

`mfa_secrets` and `password_history` are borderline auth-infra and could instead be treated PLATFORM_GLOBAL — noted inline.

---

## AMBIGUOUS (7)

Polymorphic parent or unclear ownership. Backfill **LIT** now; revisit when polymorphic `entity_id` targets are typed or the feature is confirmed live.

| table | rows | why ambiguous | interim |
|---|---|---|---|
| conversations | 1 | no FK, no user col; DM thread container | add org, backfill LIT; long-term derive from participants |
| content_change_log | 0 | `content_id` polymorphic, no FK | add org, LIT |
| content_reviews | 0 | `content_id` polymorphic; submitted_by/reviewed_by → auth.users | add org, LIT |
| inbound_emails | 0 | `email_id`/`message_id` are text; routing table | add org (route target) or leave PLATFORM_GLOBAL; LIT |
| status_history | 0 | `entity_id` polymorphic, `changed_by` → profiles | add org, LIT |
| system_events | 18777 | `entity_id`/`property_id`/`department_id` polymorphic; `actor_id` NULLable (system rows) | add NULLable org, backfill LIT for actor-bearing rows, keep NULL for system-origin |
| master_content_deployments | 0 | has `target_organization_id` (cross-tenant fan-out record) — tenancy is the *target*, not the row | RLS by `target_organization_id`; no new col |

---

## Phase ordering for backfill

1. `TENANT_DIRECT` — backfill NULL org from LIT, enforce NOT NULL where the flag allows, attach RLS.
2. `USER_OWNED` — add col, backfill from `organization_memberships` / LIT.
3. `TENANT_VIA_PARENT` **level 1** (parent already in group 1): announcements/documents/courses/training_modules/assessments/competencies/media_* children.
4. `TENANT_VIA_PARENT` **level 2+**: course_modules→lessons→lesson_blocks→lesson_progress→learning_events; report_definitions→report_runs; sop_comments→sop_comment_votes; document_folders→document_notification_rules; messages→message_attachments; conversations→conversation_participants.
5. `AMBIGUOUS` — LIT backfill, NULLable, tracked as tech debt.
6. `PLATFORM_GLOBAL` — RLS only, never add org.

## Counts

| class | count |
|---|---|
| TENANT_DIRECT | 43 |
| PLATFORM_GLOBAL | 27 |
| TENANT_VIA_PARENT | 60 |
| USER_OWNED | 32 |
| AMBIGUOUS | 7 |
| **total** | **169** |
