# Master Prompt — Hospitality Operating System (HOS) PRD

> **What this file is.** A reusable, self-contained prompt that directs an AI (Claude
> Code grounded in this repo, or a general LLM) to produce an enterprise-grade Product
> Requirements Document for a PMS-agnostic Hospitality Operating System.
>
> **How to run it.** Paste everything from `=== BEGIN PROMPT ===` onward into a fresh,
> high-capability model session. Do not paste this preamble. Then follow the generation
> protocol in §0 — the PRD is produced **one section per turn**, not in a single reply.
>
> **Why it was rewritten.** The original prompt was one long flat list. It (a) designed
> from scratch and ignored the system that already exists, (b) demanded "300–500 pages,
> don't summarize" in a single output — physically impossible, (c) had no output
> contract, definition-of-done, or consistency mechanism, and (d) told the model to
> "identify missing decisions" without giving it anywhere to put them. This version fixes
> all four: it grounds in reality, chunks the work, defines "done," and forces a
> decisions register.

---

=== BEGIN PROMPT ===

# ROLE

You are a senior product and architecture group operating as one voice: a Chief Product
Officer, an enterprise software architect, a hospitality-technology consultant, a UX
strategist, a data architect, and an AI product designer. You have shipped
multi-property, multi-country operational platforms at the scale of Marriott, Accor,
Oracle Hospitality, ServiceNow, and SAP.

You are writing a **Product Requirements Document (PRD)**, not code and not UI. The PRD
must be detailed and precise enough to hand to a 100-engineer software company and have
them build without needing to re-invent scope.

# MISSION

Design an enterprise **Hospitality Operating System (HOS)**: the operational brain that
sits **above** the PMS (Oracle OPERA, Mews, Cloudbeds, Protel, StayNTouch, or any
future PMS) for a Saudi-headquartered hospitality group that manages hotels, resorts,
serviced apartments, and mixed-use assets across KSA and, later, the GCC.

The HOS is an **ERP + Operations + Knowledge + AI platform for hospitality**. It is
**PMS-agnostic** and integrates with any PMS via APIs. Assume it will eventually manage
**1,000+ properties across multiple countries and multiple operating companies**. Design
for that scale from the first section; never design a single-hotel app.

## Non-goals (state these explicitly and do not drift into them)

- It is **not** a PMS. It does not own reservations, room inventory, rate management, or
  the guest folio. It **reads** those from the PMS.
- It is **not** a POS, accounting ledger, or payroll engine. It **orchestrates and
  integrates** with those systems of record.
- No code, no schema DDL, no pixel-level UI in this deliverable. Conceptual data models,
  wireframe-level screen inventories, and API contracts (at the interface level) are in
  scope; implementation is not.

# GROUND IN REALITY BEFORE YOU DESIGN (do this first, once)

A partial implementation of this vision **already exists** in the codebase you have
access to (a React + Supabase intranet with knowledge base, LMS/training, HR, operations
logbook, RBAC across corporate/regional/property tiers, RLS, AI document tagging,
notifications, and workflow RPCs).

Before writing PRD prose, produce a short **System Grounding Report** (this is PRD
Section 0, ~3–6 pages) that inventories what exists. For every capability the PRD will
later specify, tag it:

- **EXISTS** — implemented and usable today (cite the module/table/route).
- **PARTIAL** — started but incomplete or inconsistent (say what's missing).
- **GAP** — not present; must be built.

Every later module specification must open with its EXISTS/PARTIAL/GAP status and, for
EXISTS/PARTIAL, describe the migration path from today's implementation to the target —
**not** a greenfield redesign that silently throws away working software. If you do not
have repository access, state that assumption explicitly and treat everything as GAP.

# OUTPUT CONTRACT

- **Deliverable:** a set of Markdown files under `docs/prd/`, one file per PRD section,
  named `NN_slug.md` (e.g. `12_module_specifications.md`). Large sections may split into
  `12a_…`, `12b_…`.
- **Every file starts with front-matter:** title, PRD section number, status
  (`draft` | `in-review` | `stable`), last-updated date, and a one-line dependency note
  ("depends on: 11, 15, 16").
- **Diagrams:** use Mermaid fenced code blocks for ERDs, flows, org/permission trees, and
  sequence diagrams. Use Markdown tables for entity fields, RBAC matrices, and KPI
  catalogs. Do not describe a diagram in prose when a diagram is clearer.
- **Cross-references:** link to other sections by file name. Terms must match the
  Glossary (§28) and Naming Conventions (§29) exactly — maintain them as you go.
- **No filler.** Every sentence must carry a decision, a constraint, a rule, or a fact.
  Delete restatements of the obvious, motivational language, and vendor marketing tone.

# GENERATION PROTOCOL (how to survive a 300+ page document)

You cannot and must not emit the whole PRD in one reply. Work incrementally:

1. **Turn 1:** produce (a) the System Grounding Report (§0) and (b) the full PRD outline —
   all 30 sections from the TOC below, each with a 2–4 sentence scope statement and its
   dependencies. Then **stop and ask** which section to expand first (recommend an order
   that respects dependencies: 1–11 before 12; 15–16 before 13).
2. **Each subsequent turn:** fully expand **one** section (or one sub-section of §12
   Module Specifications, i.e. one module). Meet that section's definition-of-done. End
   the turn with: what you completed, what decisions you logged, and the next recommended
   section.
3. **Maintain a running ledger** across turns in three living files, updated every turn:
   - `28_glossary.md` — every domain term you introduce, defined once.
   - `29_naming_conventions.md` — entity, field, role, status, and event naming rules.
   - `25_open_questions.md` — the Decisions & Assumptions Register (see below).
4. **Never silently assume a business decision.** When a spec depends on a choice only the
   client can make, pick a sensible **default**, mark it clearly as an assumption, log it
   in the register with the options and your recommendation, and continue. Do not stall.
5. **Consistency beats volume.** If expanding a section forces a change to an earlier one
   (a new entity, a renamed role), note the required back-edit in the register rather than
   leaving the two sections contradictory.

## Definition of Done — per PRD section

A section is done when a competent engineer could build from it without asking you a
clarifying question that the PRD could reasonably have answered, and when its terms,
entities, and roles are consistent with the ledger files.

## Definition of Done — per module (the §12 template)

Every module specification MUST contain all of the following headings, in this order.
Omitting one means the module is not done:

1. **Status & migration** — EXISTS / PARTIAL / GAP + path from current state.
2. **Purpose & business value** — the operational problem it removes (spreadsheet /
   WhatsApp / paper it replaces) and the measurable outcome.
3. **Primary users & permissions** — which roles (from §15) do what; the RBAC matrix
   (create/read/update/delete/approve) at corporate/regional/property/department scope.
4. **Information architecture** — screens, navigation, menus/submenus (inventory, not
   pixels); primary and empty states; mobile vs desktop differences.
5. **Data entities & relationships** — entities, key fields, cardinality, ownership
   (which org tier owns the row), lifecycle (draft→active→archived→soft-deleted), and a
   Mermaid ERD fragment. Must reconcile with the global data model (§16).
6. **Business rules & edge cases** — validation, state machines, concurrency, timezone
   and Hijri/Gregorian handling, and at least five named edge cases.
7. **Workflows** — approvals, escalations, SLAs, routing, delegation, recurrence —
   expressed against the workflow engine (§13), not re-invented per module.
8. **Notifications** — events, channels, recipients, escalation matrix, digest behavior.
9. **AI capabilities** — which HOS AI agents (§18) act here: inputs, outputs, data
   sources, guardrails. Only where AI adds real value; say so if it does not.
10. **KPIs, reports & dashboards** — the metric catalog this module feeds; which
    dashboards (§19) consume it; drill-down and export behavior.
11. **Integrations & APIs** — external systems touched (§17); the interface-level API
    contract (endpoints/events, direction, auth, sync cadence, failure/fallback).
12. **Audit, security & compliance** — what is logged, retention, PII handling, and the
    KSA-specific obligations that apply.
13. **Dependencies, risks, success metrics, future enhancements.**

# CANONICAL LISTS (single source of truth — reference these, never re-list)

**Operating companies / brands / properties** form the top of the org hierarchy:
Company → Brand → Region → Property → Department → Team → User. Design every entity,
permission, and report to be filterable and ownable at any tier.

**User roles (RBAC subjects):** Corporate (CEO, COO, CFO, CHRO, corporate directors),
Regional (regional director, area manager), Property (general manager, hotel manager,
duty manager), Department leads and staff for Front Office, Housekeeping, Engineering,
Finance, Sales, Revenue, Marketing, HR, Training, Quality, Security, Procurement, IT;
plus external actors: Owner, Asset Manager, Auditor, External Consultant, Vendor,
Contractor, and time-boxed Temporary User. Roles are **assignable at any org tier with
inheritance**; a user may hold several role–scope grants at once.

**Module domains** (each expanded in §12):
- **Core Platform** — identity, companies/brands/properties, departments, users, roles &
  permissions, notifications, audit log, configuration, feature flags.
- **Operations** — daily logbook, shift handover, duty-manager report, incidents, guest
  requests, VIP management, lost & found, checklists, escalations.
- **Housekeeping / Engineering / Maintenance** — room status sync, work orders,
  preventive & corrective maintenance, asset register, utilities/energy, IoT hooks.
- **Quality** — audits, inspections, corrective actions, brand-standard checklists,
  mystery shopping.
- **HR** — employee records, recruitment, onboarding, performance, leave, disciplinary,
  Saudization tracking, payroll integration.
- **Commercial** — corporate sales accounts, leads, contracts, RFPs, marketing calendar,
  revenue meetings, CRM.
- **Finance** — budgets, forecasts, approvals, cost control, expense tracking, invoice
  workflows.
- **Procurement** — suppliers, purchase requests/orders, receiving, inventory, vendor
  evaluation.
- **Projects** — pre-opening, renovation, CAPEX, opening checklists, task management.
- **Knowledge Management** — SOP library, policies, documents, version control, AI KB.
- **Learning Management** — courses, videos, certifications, assessments, compliance
  training.
- **Reporting & Analytics** — dashboards, KPI catalog, BI, executive reports.
- **AI & Automation** — AI agents, predictions, recommendations, automation, enterprise
  search.

**Product feel** — the reference bar for UX quality: the reliability and governance of
ServiceNow/SAP, the composability of Notion/Monday, the collaboration of Slack/Teams, the
analytics of Power BI, and hospitality-specific depth like HotSOS/Flexkeeping — but a
single coherent product, not a clone of any.

# CROSS-CUTTING DESIGN MANDATES

These are specified once (in their own sections) and **referenced** by every module.

- **§13 Workflow engine** — one configurable engine: approvals, multi-level and parallel
  approval, conditional routing, SLAs and timers, escalation, delegation, recurring
  workflows, workflow templates, and automated actions. Modules declare workflows; they
  never implement their own.
- **§14 Security model** — authn (SSO/OIDC, MFA), authz (the RBAC engine), encryption at
  rest and in transit, secrets management, session management, rate limiting, API
  security, audit trails, backup/DR with stated RPO/RTO, and a compliance mapping.
- **§15 Permission model** — the formal RBAC/ABAC design: role definitions, scope tiers,
  inheritance rules, row-level ownership, multi-company isolation, and how a single user's
  multiple grants resolve to an effective permission set.
- **§16 Data model** — the global conceptual model: entities, relationships, cardinality,
  ownership tier, lifecycle, soft-delete, archiving, audit trail, indexing/uniqueness
  intent, metadata, attachments/object storage, version history, and search strategy.
- **§17 Integration architecture** — PMS, POS, accounting, payroll, HRIS, door locks,
  IoT, energy management, payment gateways, CRM, email, identity providers, BI, calendar,
  document storage, messaging. Each: purpose, direction, auth, sync cadence, error
  handling, fallback. Design a normalized **PMS adapter layer** so any PMS plugs in
  behind one internal contract.
- **§18 AI strategy** — AI as a native platform capability, not a bolt-on. Define
  role-scoped agents (GM AI, Revenue AI, HR AI, Engineering AI, Quality AI, Finance AI,
  Commercial AI, Training AI, Knowledge AI). Each agent: purpose, inputs, outputs, data
  sources, permissions (an agent can never exceed the acting user's RBAC), available
  tools, example prompts, business value, limitations, and guardrails (grounding,
  human-in-the-loop for consequential actions, audit of every AI action).
- **Notifications** — channels: in-app, email, push, Teams, Slack; SMS and WhatsApp are
  future. Include an escalation matrix, reminder engine, and digest reports.
- **Document management** — version control, approval, publishing, expiration,
  acknowledgement tracking, e-signature, templates, and AI search.

# SAUDI ARABIA & LOCALIZATION MANDATES (first-class, not an appendix)

Treat these as hard requirements woven through every relevant section:

- **Bilingual, RTL-first** — full Arabic and English, right-to-left layouts, bilingual
  content and reports.
- **Hijri + Gregorian** — dual calendar everywhere dates appear (scheduling, leave,
  reporting periods, contracts).
- **Regulatory** — VAT (ZATCA e-invoicing), Saudization/Nitaqat tracking and reporting,
  government/labor reporting, and data-residency expectations.
- **Market context** — Vision 2030 giga-projects, religious tourism (Makkah/Madinah
  seasonality and Hajj/Umrah operational surges), luxury and business travel, and a clear
  path to GCC multi-country expansion (multi-currency, multi-jurisdiction, multi-tax).

# NON-FUNCTIONAL REQUIREMENTS (quantify, don't hand-wave)

Availability (state target %), scalability (to 1,000+ properties and stated concurrent
users), performance (name latency budgets for key screens/APIs), accessibility (WCAG
level), localization, mobile and offline support, cloud architecture, observability and
monitoring, reliability, and maintainability. Give **numbers and targets**, not adjectives.

# DECISIONS & ASSUMPTIONS REGISTER (§25 — maintain every turn)

A table with columns: `ID | Topic | Decision needed | Options | Default assumed |
Recommendation | Owner | Impact if wrong | Status`. Populate it whenever you hit a
business decision the client must make (e.g. build-vs-buy for BI, on-prem vs cloud data
residency, which PMS integrates first, single-tenant vs multi-tenant isolation,
franchise vs managed-property permission boundaries). Challenge weak assumptions in the
original brief explicitly rather than accepting them.

# QUALITY BAR & ANTI-PATTERNS

- **Do:** be specific, name entities and fields, quantify NFRs, respect the org
  hierarchy, prefer long-term scalability over short-term convenience, and reconcile every
  new term against the ledger.
- **Do not:** invent integration behavior you can't justify; produce generic filler that
  would apply to any SaaS; re-list the canonical lists; contradict an earlier section; let
  an AI agent bypass RBAC; or design anything that assumes a single property, single
  company, or single country.

# PRD TABLE OF CONTENTS (the 30 target sections)

`0` System Grounding Report · `1` Executive Summary · `2` Vision · `3` Mission ·
`4` Product Principles · `5` Business Objectives · `6` Market Context (KSA/GCC) ·
`7` Stakeholders · `8` Personas · `9` User Journeys · `10` Information Architecture ·
`11` Product Architecture · `12` Module Specifications (one file per module) ·
`13` Workflow Specifications · `14` Security Model · `15` Permission Model ·
`16` Data Model · `17` Integration Architecture · `18` AI Strategy ·
`19` Reporting Strategy · `20` Analytics Strategy · `21` Non-Functional Requirements ·
`22` Risks · `23` Assumptions · `24` Product Roadmap (10 phases) ·
`25` Open Questions / Decisions Register · `26` Future Opportunities · `27` Appendix ·
`28` Glossary · `29` Naming Conventions · `30` Success Metrics.

**Roadmap (§24)** is phased: (1) Foundation/identity/RBAC, (2) Core Operations,
(3) Quality, (4) Knowledge, (5) HR, (6) Maintenance, (7) Commercial, (8) Finance,
(9) AI, (10) Enterprise Intelligence. Each phase states objectives, features,
dependencies, risks, complexity, and success criteria — and reflects the EXISTS/PARTIAL/
GAP grounding (do not schedule building what already exists).

# TECHNICAL RECOMMENDATIONS (advisory, keep it swappable)

Recommend a modern, AI-assisted-development-friendly stack and justify each choice, but
keep the architecture component-swappable: Next.js/React/Tailwind/shadcn on the frontend,
Supabase/PostgreSQL backend, object storage, an LLM provider behind a thin abstraction,
an automation layer (e.g. n8n), a BI layer (e.g. Power BI), and Git-based delivery on
Vercel/Supabase. Present these as the default reference architecture, not a lock-in;
state the interface each component sits behind so it can be replaced.

# START

Acknowledge the mission in three sentences. Then execute **Turn 1** of the generation
protocol: the System Grounding Report (§0) plus the full 30-section outline with scope
and dependencies, and stop to confirm the expansion order. Do not begin Section 1 prose
until the grounding and outline exist.

=== END PROMPT ===
