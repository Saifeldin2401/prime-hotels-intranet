# Content governance

The shared lifecycle + review layer for the learning platform. One state
machine and one review queue serve all three content kinds:

| Content type | Backing table          | Lifecycle column               |
| ------------ | ---------------------- | ------------------------------ |
| `course`     | `training_modules`     | `training_modules.lifecycle_status` |
| `article`    | `documents`            | `documents.lifecycle_status`   |
| `assessment` | `learning_quizzes`     | `learning_quizzes.lifecycle_status` |

## The state machine

Source of truth: `src/lib/contentLifecycle.ts` (pure, no I/O — unit-tested in
`src/lib/contentLifecycle.test.ts`).

States (mirror the `content_status` Postgres enum):

```
draft ──submitForReview──▶ in_review ──approve──▶ approved ──publish──▶ published
  ▲                            │
  └────── requestChanges ──────┘

any of {draft,in_review,approved,published} ──archive──▶ archived ──restore──▶ draft
```

### Transition table

| Transition        | From                                        | To          | Who can perform   |
| ----------------- | ------------------------------------------- | ----------- | ----------------- |
| `submitForReview` | `draft`                                     | `in_review` | owner, manager    |
| `approve`         | `in_review`                                 | `approved`  | manager           |
| `requestChanges`  | `in_review`                                 | `draft`     | manager           |
| `publish`         | `approved`                                  | `published` | manager           |
| `archive`         | `draft`, `in_review`, `approved`, `published`| `archived`  | owner, manager    |
| `restore`         | `archived`                                  | `draft`     | manager           |

"Actor" is resolved per piece of content:

- `owner` — `owner_id` (or legacy `created_by`) matches the caller
- `manager` — caller holds a content-manager role (see below)
- `viewer` — anyone else; **no** transitions permitted

Content-manager roles (`CONTENT_MANAGER_ROLES`): `super_admin`,
`corporate_admin`, `regional_admin`, `regional_hr`, `property_manager`,
`property_hr`. In the database the same set is enforced by
`public.is_content_manager(uuid)`.

## Database (migration `20260901120000_content_lifecycle.sql`)

> Header: **APPLY ON STAGING FIRST.** Do not apply from this branch.

- **`content_status` enum** — `draft | in_review | approved | published | archived`
- **`content_reviews`** — one row per submission. Columns: `content_type`
  (`course|article|assessment`), `content_id`, `status`, `submitted_by`,
  `reviewed_by`, `review_notes`, `submitted_at`, `reviewed_at`.
  RLS: authors see their own rows; content managers see all; only managers may
  `UPDATE` (approve / request changes); no `DELETE`. A partial unique index
  keeps at most one open (`in_review`) review per piece of content.
- **Lifecycle columns** added `IF NOT EXISTS` to the three content tables:
  `lifecycle_status content_status` (default `draft`), `owner_id uuid`,
  `review_due_on date`, `expires_on date`, `last_reviewed_at timestamptz`.
  `owner_id` is backfilled from `created_by`.
- **`content_change_log`** — append-only (`content_type`, `content_id`,
  `actor`, `change_summary`, `at`). Users have **no** INSERT/UPDATE/DELETE path
  (privileges revoked, no write policy). Rows are written only by
  `public.log_content_change(...)` (SECURITY DEFINER), called from the
  `content_reviews` AFTER INSERT/UPDATE trigger.
- **`source_change_flags`** — an open row means a course's grounding document
  changed after the course was last reviewed. `public.scan_source_change_flags()`
  raises the flags (returns the count); managers or the course owner can read,
  managers can resolve.

## What's wired vs TODO

**Wired**

- State machine + exhaustive unit tests.
- `contentLifecycleService.ts`: `content_reviews` CRUD, all transitions
  (`submitForReview` / `approve` / `requestChanges` / `publish` / `archive`),
  each writes the review row **and** moves `lifecycle_status`; `approve` /
  `publish` also stamp `last_reviewed_at`. Source-change flag read/resolve and
  a `scanSourceChanges()` RPC wrapper.
- `ContentReviewQueue.tsx` at `/manage/review-queue` (route module
  `ManageRoutes.tsx`, added to `router.tsx`): pending items across all three
  types, filter by type/owner, inline approve / request-changes, source-change
  flag panel with a manual "Scan source docs" button.
- `content_change_log` auto-populated by DB trigger.

**TODO (out of this slice)**

- Schedule `scan_source_change_flags()` — pg_cron hourly job, or an
  AFTER UPDATE trigger on `documents`. Migration ships the function + a
  commented `cron.schedule(...)` example only.
- Nav entry for the "Manage" section — `src/config/navigation.ts` is churned by
  another agent; only the route is wired here.
- Producers (`TrainingBuilder`, `src/pages/knowledge/`) calling
  `submitForReview` when an author sends content for review — those files are
  owned by other agents.
- Typed Supabase client: the new tables/columns aren't in
  `database.generated.ts` yet, so the service uses a loose client handle
  (same pattern as `aiPlatformConfigService.ts`). Regenerate types
  (`npm run db:types`) after the migration lands on staging.
- Surfacing `review_due_on` / `expires_on` due dates (reminders, auto-archive).
