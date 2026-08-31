# Remaining architecture work — §3, §67, §72

The other items from the "genuinely open" list (§4/§37/§38/§48/§49/§55/§59) were implemented and
verified (migrations `20260901247000`–`250000`). These three are **not code-implementable in a single
automated pass** — they are large frontend refactors or infrastructure/ops concerns. This doc scopes
each one so it can be picked up as a dedicated project.

---

## §3 — Property-model rename (architecture already correct; naming remains)

**Status: the parallel architecture is GONE.** Verified against the live DB:
- The `properties` table **does not exist** (dropped in a prior pass).
- `grep "from('properties')"` across `src/` → **0 hits**. Nothing queries a properties table.
- `PropertyContext` / `useProperty()` (`src/contexts/PropertyContext.tsx`) is a **thin adapter over
  `useTenant()`** — it maps `availableHotels → Property[]` and adds an "All Hotels" pseudo-property.
  There is no second data model.

So §3's real requirement — *"do not allow legacy property concepts to remain as a parallel
architecture"* — **is satisfied.** Hotels are organizational entities under a customer tenant, isolated
by RLS. What remains is **naming inconsistency**, which is a §67 concern, not §3.

**The cleanup (dedicated frontend refactor, ~1–2 days, needs browser regression testing):**
1. Rename `useProperty()` → `useHotel()` / `usePropertyContext` → `useHotelScope`. **42 consumer files**
   (`grep -rl "useProperty\b" src/`). Keep `useProperty` as a deprecated re-export for one release.
2. Rename `PropertyContext.tsx` → `HotelScopeContext.tsx`; `Property` type → `Hotel`.
3. Legacy `property_id` columns still exist on `documents`, `departments`,
   `course_generation_jobs`, `training_paths.target_property_id`, `training_assignment_rules` (as
   `scope_id` when `scope_type='hotel'`). **112 files reference `property_id`.** Audit each: most are
   already `hotel_id` semantically. Migrate reads to `hotel_id`, backfill where a column holds real
   data, then drop the `property_id` columns (destructive — needs the migration-safety checklist §57).
4. `/admin/properties` route + `PropertyManagement.tsx` → rename to `/admin/hotels` /
   `HotelsManagement` (a `HotelsManagement.tsx` component already exists under
   `src/pages/admin/components/` — consolidate).
5. `has_property_access()` DB function — still used by ~40 legacy RLS policies. It already routes
   through `user_companies` / hotel scope, but it should be replaced by the newer
   `org_visible()` / `is_tenant_content_editor()` helpers table-by-table (part of the ongoing RLS
   consolidation).

**Do NOT** do this piecemeal alongside other work — it touches too many files with no automated
verification path. It needs its own branch, its own PR, and a full click-through of every affected
screen (documents, tasks, announcements, dashboards, training assignment, knowledge).

---

## §67 — Design-system unification

This is a multi-week design + engineering effort, not an automated change. Scope:

**Audit first** (`docs/design-system-audit.md` — to be produced):
- Inventory every button/input/table/card/modal/badge/alert variant currently in use. The codebase
  has shadcn/ui primitives under `src/components/ui/` but many pages hand-roll spacing, colors, and
  status chips (the platform pages built this session use inline Tailwind heavily — e.g. `bg-slate-900`,
  `text-[10px]`, ad-hoc amber/emerald/rose status colors).
- Catalogue the color usage: there is a tenant-branding CSS-var system
  (`--tenant-primary/secondary/accent` in `TenantContext`) plus raw Tailwind palette colors plus the
  shadcn semantic tokens (`bg-card`, `text-muted-foreground`). Three systems.
- Empty states, loading states, error states, permission-denied states — currently inconsistent
  (some pages spinner-forever, some show retry, some silently render nothing). §68 overlaps here.

**Then standardize:**
- One `<StatusBadge status={...} />`, one `<DataTable />`, one `<PageHeader />` (partially exists),
  one `<EmptyState />`, one `<PermissionGate />`.
- Typography scale, spacing scale, elevation/shadow tokens.
- Lock the three-experience shells: `<PlatformShell>`, `<TenantShell>`, `<LearnerShell>` with
  distinct-but-consistent chrome (§6, §62–65).
- RTL pass (§15) — audit every `ms-`/`me-`/`ps-`/`pe-` vs `ml-`/`mr-`, every icon that should flip.
- Accessibility pass (§66) — focus rings, semantic controls, ARIA labels, contrast (WCAG AA).

**Recommendation:** hire/assign a design-eng owner. Produce the token set + core component library
first, then migrate screen-by-screen. Do the Platform Control Center screens last (they're newest and
least user-facing) and the Learner experience first (most users, simplest).

---

## §72 — Backup, disaster recovery, retention

**This is infrastructure/ops, not application code.** What Supabase gives you and what you must still do:

| Concern | Supabase provides | You must configure / verify |
|---|---|---|
| **Database backups** | Daily backups (Pro plan), Point-in-Time Recovery (PITR) on higher tiers | **Confirm the plan tier includes PITR.** Set PITR retention window (7–30 days). Document the RTO/RPO you're committing to customers. |
| **Storage backups** | Object storage is replicated by the provider | Supabase does **not** version/backup storage objects on a schedule. If you need file-level recovery, add your own: a nightly job copying `storage.objects` to a separate bucket/S3, or enable bucket versioning. |
| **PITR restore drill** | The mechanism | **Actually run a restore** into a fresh project at least once. An untested backup is not a backup. Document the runbook. |
| **Migration rollback** | Migration history table | Every migration in this project has a documented reverse (see the header comments). Keep that discipline. Add `supabase db reset` + replay as a CI check. |
| **Data restoration (single tenant)** | — | If one customer needs their data restored (not a full DB rollback): you need a per-tenant export/import path. `export_organization_archive(org_id)` RPC exists for export; build the matching import. |
| **DR procedure** | — | Write `docs/runbooks/disaster-recovery.md`: who declares an incident, the restore steps, the comms plan, the data-loss-window communication to customers, the post-mortem template. |
| **Retention (§70)** | — | Codify: employee departure = deactivate membership, keep `training_progress`/`certificates`/audit per policy (default: 7 years for compliance training records). Org cancellation = `lifecycle_status='archived'`, data retained for the contractual window (e.g. 90 days) then a scheduled purge job. Nothing is hard-deleted before that. `set_organization_status` already supports `archived`; the scheduled purge job does not exist yet. |
| **Audit-log retention** | — | `platform_audit_logs` + `system_events` grow unbounded. Add a retention/rollup policy (keep detail 1 year, aggregate older). An `audit_retention_policies` table already exists — wire a job to it. |

**Concrete next steps:**
1. Check the Supabase project's plan + PITR status (`get_advisors` / project settings).
2. Enable + configure PITR; document RTO/RPO.
3. Run one PITR restore drill into a throwaway project; write the runbook.
4. Build the storage backup job (nightly copy or bucket versioning).
5. Write `docs/runbooks/disaster-recovery.md` and `docs/data-retention-policy.md`.
6. Build the scheduled purge job for archived orgs (respecting the retention window) and the
   audit-log rollup job.
