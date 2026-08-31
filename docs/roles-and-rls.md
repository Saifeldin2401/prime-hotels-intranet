# Five-Role Platform Model & RLS Rewrite

Status: **authored, not applied.** Migrations live in `supabase/migrations/2026090111*.sql`
and must be run on a staging branch first. Nothing here has touched production.

## 1. The five roles

The Training + Knowledge Base + Quiz product collapses the 9 hospitality roles
into 5 platform roles with **additive** permissions (each role has everything the
role below it has):

| Role | Rank | What it can do |
|------|------|----------------|
| `learner` | 0 | View training & KB, take quizzes, see own progress/certificates/submissions. Every authenticated user is at least a learner. |
| `author` | 1 | + Create/edit training modules, quizzes, questions, skills, course visuals (own content). Cannot assign training or manage users. |
| `knowledge_manager` | 1 | + Create/edit/approve/delete Knowledge Base documents and media. Sibling of `author` (KB curation instead of course authoring). |
| `training_manager` | 2 | + Assign training (rules/paths), review everyone's progress & submissions, issue training certificates, run analytics, edit/delete any course content. |
| `administrator` | 3 | + Manage users and role grants, platform settings, logs, data export, delete departments. Full access. |

`author` and `knowledge_manager` share a rank: neither inherits the other, both
inherit `learner`, both are inherited by `training_manager`.

## 2. Mapping from the 9 hospitality roles

Mirrored in `public.platform_role_map` (+ `platform_role_map_extra` for secondary
grants) and in `LEGACY_ROLE_MAP` in `src/lib/constants.ts`.

| Legacy role | Platform role | Notes |
|-------------|---------------|-------|
| `staff` | `learner` | |
| `manager` | `learner` | no distinct manager tier in the learning product |
| `department_head` | `author` | authors content for their scope |
| `property_hr` | `training_manager` (+ `knowledge_manager`) | |
| `regional_hr` | `training_manager` (+ `knowledge_manager`) | |
| `property_manager` | `training_manager` | **business call** – curate/assign learning, *not* platform admin |
| `regional_admin` | `training_manager` | **business call** – curate/assign learning, *not* platform admin |
| `corporate_admin` | `administrator` (+ `training_manager`) | |
| `super_admin` | `administrator` (+ `training_manager`) | |

Business call on `regional_admin` / `property_manager` → `training_manager`
(not `administrator`): in a learning product these roles need to build and assign
curricula for their region/property but must not hold platform-wide user and
role administration. Promote specific individuals to `administrator` explicitly.

### The 7 live users (backfill target)

| Email | Legacy | Resolves to |
|-------|--------|-------------|
| admin@prime.com | corporate_admin | administrator |
| yousef.buobaid@gmail.com | regional_admin | training_manager |
| hsmadi2223@gmail.com | regional_admin + property_manager | training_manager |
| yehiaayman55@gmail.com | property_manager | training_manager |
| islam.mahrous@gmail.com | regional_hr | training_manager (+ knowledge_manager) |
| saifeldiinislam@gmail.com | department_head | author |
| ksa50233@gmail.com | staff | learner |

## 3. Helper functions (migration 20260901110000)

`app_role` gains the 5 values (additive – legacy values stay). Helpers are
rewritten so **legacy and platform role names are interchangeable**:

- `roles_satisfying(role)` → array of roles that satisfy a request (the role
  itself, its legacy equivalents, its platform equivalents, plus additive
  inheritance and the historic super/corporate-admin escalation).
- `has_role(uid, role)` / `has_any_role(uid, roles[])` → `EXISTS` against
  `user_roles` using `roles_satisfying`.
- `is_platform_admin()`, `is_training_manager()`, `is_content_author()`,
  `is_knowledge_manager()` → thin `has_role` wrappers used by the RLS rewrite.

## 4. RLS rewrite (migration 20260901110100)

Every learning table gets **four separate per-operation policies** (`p5_<table>_<op>`):
`SELECT`, `INSERT`, `UPDATE`, `DELETE` — never `FOR ALL` — and **every write
policy has a `WITH CHECK`**.

Tables covered: `training_modules`, `training_progress`, `learning_quizzes`,
`learning_quiz_questions`, `unified_questions`, `unified_question_options`,
`documents`, `certificates`, `skills`, `training_paths`, `training_path_modules`,
`training_assignment_rules`, `training_assignment_submissions`, `media_assets`,
`course_visual_assets`, `departments`.

### Permission matrix (writes)

| Table | INSERT / UPDATE | DELETE | SELECT |
|-------|-----------------|--------|--------|
| training_modules | author+ (own) / tm+ | tm+ | published or own or author+ |
| learning_quizzes | author+ (own) / tm+ | own or tm+ | published or own or author+ |
| unified_questions(+options) | author+ (own) / tm+ | own or tm+ | published or own or author+ |
| training_progress | learner (own) | administrator | own or tm+ |
| training_assignment_submissions | learner (own) / tm+ | administrator | own or tm+ |
| training_paths / path_modules | tm+ | tm+ | active or tm+ |
| training_assignment_rules | tm+ (own on insert) | tm+ | tm+ or targeted-at-me |
| documents | knowledge_manager+ / author+ (own) | own or km+ | published or own or km/author+ |
| media_assets | author/km+ (own) | own or administrator | public or own or author/km+ |
| certificates | tm+ (training certs) / self (non-training) | administrator | own or tm+ |
| skills | author+ | tm+ | all authenticated |
| course_visual_assets | author+ (own) | own or tm+ | all authenticated |
| departments | **administrator only** | **administrator only** | active or tm+ |

("tm+" = training_manager or administrator; "km+" = knowledge_manager or above;
"author+" = author or above. A plain `learner` has **no** write path to any
authoring or configuration table.)

### Holes closed

| ID | Old state | Fix |
|----|-----------|-----|
| H1 | `training_assignment_rules` "manageable by admins" was `FOR ALL` with `WITH CHECK = NULL` → any admin-ish user could write forgeable rows, and non-admins fell through. | Per-op policies, `WITH CHECK` on every write, `created_by = auth.uid()` pinned on INSERT. |
| H2 | `training_paths` `paths_manage` was `FOR ALL` with `WITH CHECK = NULL`. | Per-op + `WITH CHECK`; gated to training_manager+. |
| H3 | `departments_modify_admin_pm` was `FOR ALL`; a staff/learner with no matching branch could still reach writes through other permissive policies (known audit finding: "staff can delete all departments / training_modules"). | Departments are administrator-only for writes, per-op + `WITH CHECK`. `training_modules` DELETE restricted to training_manager+. |
| H4 | `training_modules` / `learning_quizzes` / `unified_*` INSERT policies did not pin `created_by`, so rows could be attributed to other users. | Every INSERT `WITH CHECK` pins `created_by = auth.uid()` (or parent ownership for link/option tables). |
| H5 | `certificates` INSERT allowed a user to self-issue `certificate_type = 'training'` certs. | Training certificates now require `training_manager`/`administrator`; self-serve limited to non-training types. |
| H6 | Multiple learning tables (`learning_quiz_questions`, `training_path_modules`) had RLS effectively unmanaged. | `ENABLE ROW LEVEL SECURITY` + explicit per-op policies. |

### Known tradeoff

`documents` SELECT previously encoded department / property / role-scoped
visibility for the hospitality intranet. The rewrite replaces it with a simpler
*published-or-owner-or-manager* read appropriate to the learning product. If
scoped KB visibility is reintroduced, extend `p5_documents_select`.

## 5. Regression gate (migration 20260901110200)

Pure-SQL `ASSERT` blocks (no pgTAP dependency), safe to run in CI on a staging
branch. Verifies: no `FOR ALL` remains; every INSERT/UPDATE policy has
`WITH CHECK`; all four ops exist per table; RLS enabled; `roles_satisfying`
inheritance invariants; the 7 live users resolved to the correct tier;
`authenticated` retains table-level DML grants.

## 6. Cutover order

1. Staging branch: run `20260901110000`, `20260901110100`, `20260901110200` in
   order. The gate migration must pass.
2. Smoke-test the app against staging as each of the 5 roles.
3. Ship the frontend (`src/lib/constants.ts`, `src/features/access/policy.ts`) —
   it is backward compatible (legacy role strings still type-check and resolve).
4. Production: run the three migrations in the same order during a low-traffic
   window. Enum-value adds are not transactional; the rest is.
5. After a bake period, a follow-up migration can drop the legacy `user_roles`
   rows and legacy enum handling. **Out of scope here.**

## 7. Frontend notes / expected conflicts

- `src/lib/constants.ts`: `AppRole = PlatformRole | LegacyRole`. New exports:
  `PlatformRole`, `LegacyRole`, `PLATFORM_ROLES`, `LEGACY_ROLE_MAP`,
  `toPlatformRole()`, `LEGACY_ROLE_HIERARCHY`. `ROLE_HIERARCHY` now lists the 5
  platform roles (was the 9 legacy roles) — callers that iterated it for legacy
  roles should switch to `LEGACY_ROLE_HIERARCHY`.
- `src/features/access/policy.ts`: `canRoleAccess()` now also bridges legacy ↔
  platform names. New: `roleHasPermission()`, `isAtLeastPlatformRole()`.
- `src/config/navigation.ts` is being churned by other branches; role wiring
  there was intentionally left untouched. Nav `allowedRoles` lists that name
  legacy roles keep working via the bridge in `canRoleAccess()`, but should be
  migrated to platform role names in a dedicated nav pass.
