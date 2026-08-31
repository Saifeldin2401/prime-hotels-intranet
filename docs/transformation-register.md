# Transformation Register

Living checklist for the pivot from the Prime/Altus hospitality intranet to a focused
**Training + Knowledge Base + Quiz** platform (the "learning-platform pivot").

Each row is classified **KEEP / TRANSFORM / MERGE / REMOVE / REBUILD** and carries a
status (`todo` / `in-progress` / `done`) and the branch or PR handling it.

- **KEEP** — stays roughly as-is; only incidental churn.
- **TRANSFORM** — survives but is reshaped around the learning domain.
- **MERGE** — folded into another surface; the standalone entry point goes away.
- **REMOVE** — deleted from the product (code, routes, nav, tables).
- **REBUILD** — replaced with a new implementation on the new domain model.

Status is updated as branches land on `master`. "in-progress" rows below are seeded
from the known in-flight branches; confirm against the PR list before relying on them.

---

## Core learning domain

| # | Area | Class | Status | Branch / PR | Notes |
|---|------|-------|--------|-------------|-------|
| 1 | Training modules + player (`/training/*`, `/learning/training/:id`) | KEEP | todo | — | Core surface. Keep; tidy nav only. |
| 2 | Learning domain model (assignments, progress, paths) | REBUILD | in-progress | `feat/learning-domain-model` | Consolidated `training_assignment_rules` / `training_progress`; retire legacy `learning_assignments` / `learning_progress`. |
| 3 | Quiz / assessment surfaces (`/learning/quizzes`, quiz player, question bank) | MERGE | in-progress | `feat/assessment-surface-consolidation` | Collapse the duplicate quiz/question entry points into one assessment surface. |
| 4 | Knowledge base (`/knowledge`, SOPs, wiki) | MERGE | in-progress | `feat/kb-surface-consolidation` | Merge `/sops`, `/operations/sops`, `/knowledge/wiki` into a single KB surface. |
| 5 | Knowledge editor (`src/editor`) | TRANSFORM | done | PR #89, PR #90 | Stabilised TipTap editor, single video path, media-library registration. |
| 6 | Certificates & skills (`/training/certificates`, `/training/skills`) | KEEP | todo | — | Keep; surface on the learner home. |
| 7 | AI course generator + capability layer | TRANSFORM | in-progress | `feat/ai-capability-layer` | Central model registry, verified-model gate, observability; wrap all AI features behind one layer. |
| 8 | Learning analytics / author dashboards | REBUILD | in-progress | `feat/learning-analytics` | Rebuild reporting on the new domain model; per-module completion + quiz performance. |
| 9 | Learner home (`/home/learner`) | REBUILD | in-progress | `feat/learner-home-and-journey-tests` | New six-section learner landing page (this branch). |
| 10 | Journey E2E scaffolding (`src/test/journeys/*`) | REBUILD | in-progress | `feat/learner-home-and-journey-tests` | Six core-journey suites; most steps `it.todo` pending consolidation branches. |

## Access control & governance

| # | Area | Class | Status | Branch / PR | Notes |
|---|------|-------|--------|-------------|-------|
| 11 | Role model → five roles (learner, author, manager, admin, super-admin) | REBUILD | in-progress | `feat/five-role-rls` | Collapse the 9-role `AppRole` hierarchy; new RLS across all learning tables. |
| 12 | Content governance (review/publish workflow, required reading) | TRANSFORM | in-progress | `feat/content-governance` | Reshape doc approval into a learning-content publishing workflow. |
| 13 | RLS `FOR ALL` without `WITH CHECK` (training_modules, departments, announcements) | TRANSFORM | todo | (tracked in `feat/five-role-rls`) | Known open audit finding; fix as part of the RLS rebuild. |
| 14 | Corporate/super-admin universal-access helpers | KEEP | done | (prior fix) | Verified; carry forward under the five-role model. |

## Domains being removed

| # | Area | Class | Status | Branch / PR | Notes |
|---|------|-------|--------|-------------|-------|
| 15 | HR (attendance, leave, payslips, performance, goals, scheduling, onboarding) | REMOVE | in-progress | `chore/purge-non-learning-domains` | Out of scope for the learning platform. |
| 16 | Operations (guest requests, incidents, logbook, VIP, lost & found) | REMOVE | in-progress | `chore/purge-non-learning-domains` | Remove routes, hooks, tables. |
| 17 | Housekeeping & Maintenance | REMOVE | in-progress | `chore/purge-non-learning-domains` | Remove. |
| 18 | Procurement / Inventory / Finance / ERP | REMOVE | in-progress | `chore/purge-non-learning-domains` | Remove; ERP module shipped with `USING (true)` everywhere — delete rather than fix. |
| 19 | Commercial / CRM (accounts, leads, contracts) | REMOVE | in-progress | `chore/purge-non-learning-domains` | Remove. |
| 20 | Messaging / announcements / social feed | REMOVE | todo | `chore/purge-non-learning-domains` | Keep only lightweight learner notifications; drop threaded messaging + social feed. |
| 21 | Public marketing site (`/about`, `/methodology`, `/vision-2030`, …) | REMOVE | todo | — | Replace with a minimal login / product landing. |
| 22 | Property / department / company hierarchy UI | TRANSFORM | todo | — | Reduce to the org grouping the five-role model and assignment targeting need. |

## Platform hygiene

| # | Area | Class | Status | Branch / PR | Notes |
|---|------|-------|--------|-------------|-------|
| 23 | Phase-0 cleanup (dead code, stale config, unused deps, TODOs) | TRANSFORM | in-progress | `cleanup/phase-0-hygiene` | Pre-pivot hygiene pass. |
| 24 | Dashboard (`src/pages/dashboard/Dashboard.tsx`, `useDashboard*`) | TRANSFORM | todo | (other agent) | Being reworked concurrently; learner home does **not** touch these files. |
| 25 | Routing (`src/routes/router.tsx`, `navigation.ts`) | TRANSFORM | in-progress | multiple | High-churn; learner-home wiring kept intentionally tiny (one route + one `RootIndex` branch). |
| 26 | Typed Supabase client adoption (~398 errors) | KEEP | todo | — | Incremental; generated types committed, `npm run db:types` wired. |
| 27 | Missing frontend-called RPCs (audit-export, submit_expense_claim, …) | REMOVE | todo | — | Most belong to domains being removed; drop with them. |

---

### How to update this register

1. When a branch merges, flip its rows to `done` and note the merge commit/PR.
2. When a new transformation branch opens, add or update its rows to `in-progress`.
3. Keep the classification stable; if an area's disposition changes, add a dated note
   rather than silently rewriting history.
