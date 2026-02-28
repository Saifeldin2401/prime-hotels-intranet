# Enterprise Governance Audit (Safe Phase 1)
Date: 2026-02-27  
System: Prime Hotels Intranet  
Audit lens: CTO + Hospitality GM + Governance/Risk Officer

## Scope And Safety Guardrails
- This phase is non-breaking by design.
- No runtime authorization path was switched.
- No existing DB table/policy/function was dropped or rewritten.
- Output of this phase:
  - One additive draft migration: `supabase/migration_drafts/2026-02-27_governance_phase1_safe_additive.sql`
  - This audit report with gap analysis, risk scoring, and rollout plan.

## Baseline Evidence (Current State)
- React quality scan: `react-doctor` score `98/100`, warnings are mostly component-size/state-structure issues.
- Role model remains legacy 8-role enum in both frontend and generated DB types.
  - `src/lib/constants.ts` (`AppRole`, hierarchy levels).
  - `src/types/supabase.ts` (`Enums.app_role`).
- Frontend access checks are primarily hardcoded role maps.
  - `src/hooks/usePermissions.ts` (`PERMISSION_CONFIG`).
  - `src/components/auth/ProtectedRoute.tsx` (level-based inheritance).
- Dynamic permissions table exists but is not the sole enforcement source.
  - `supabase/migrations/20260212094303_create_role_permissions_table.sql`.
- Reporting hierarchy utilities exist (cycle check + recursive org queries).
  - `supabase/migrations/20251219071914_20251219_org_hierarchy.sql`.
- Delegation and SLA escalation primitives exist.
  - `supabase/migrations/20260212000000_create_admin_delegations.sql`
  - `supabase/migrations/20260212000010_request_sla_escalation.sql`
  - `supabase/migrations/20260212000012_maintenance_sla_escalation.sql`
- Expense-claim workflow exists, but enterprise financial governance is incomplete.
  - `supabase/migrations/20260216111000_expense_claims_workflow.sql`
- Audit/reporting primitives exist, but governance segmentation is still broad.
  - `supabase/migrations/009_audit_schema.sql`
  - `supabase/migrations/20260206094251_20260206203000_reports_and_audits_system.sql`

## Phase-By-Phase Assessment
| Phase | Status | Findings |
|---|---|---|
| 1. Role & authority hierarchy | Gap | Current system is tiered but does not model full hospitality chain (`Supervisor`, `Assistant Manager`, `Executive Committee Member`, `General Manager`, `Area/Cluster GM`, `Corporate`) as first-class governance roles. |
| 2. Department governance | Partial | Departments exist, but cost-center ownership, budget ownership, KPI ownership, and risk-flag controls are not centralized in one governance model. |
| 3. Financial control layer | Gap | Workflow exists, but no complete role-cap matrix for capex/opex, GM override thresholds, corporate-trigger thresholds, and owner-visibility boundaries. |
| 4. Performance/accountability | Gap | No enforced RACI matrix per KPI scope; ownership can be implicit or missing. |
| 5. Property vs portfolio structure | Gap | Property scoping exists; portfolio/cluster ownership graph is not a core modeled hierarchy with assignment controls. |
| 6. Control/risk/compliance | Partial | Activity/audit infrastructure exists; still fragmented and not fully mapped to governance events (role elevation, authority delegation usage, financial override lineage). |
| 7. Crisis/escalation model | Partial | Generic escalation exists; dedicated incident domain with chain, executive alerts, and heatmap snapshots is missing. |
| 8. Executive dashboards | Gap | Existing dashboards are feature-rich but not fully backed by governance-grade executive metric model for GM vs Corporate accountability layers. |
| 9. Delegation/temporary authority | Partial | Delegation primitives exist; acting GM model and governance-role-level delegation auditing not normalized. |
| 10. Data model enforcement | Gap | Team -> Department -> Property exists; Portfolio -> Ownership chain and governance-assignment constraints are missing. |
| 11. Separation of powers | Gap | Operational, GM, Corporate, and Owner control boundaries are not fully encoded in a dedicated governance schema. |

## 1) Organizational Hierarchy Gap Analysis
- Current roles are effective for operations but insufficient for enterprise hospitality governance depth.
- Job-title mapping contains GM/Area-GM naming patterns but maps into coarse legacy roles.
- Primary conflict:
  - Business hierarchy expectations are richer than authorization primitives.
  - Policy enforcement therefore depends on conventions rather than explicit governance entities.

## 2) Authority Conflict Risks
- Risk A: Role inflation and ambiguous authority at property level (`property_manager` serving both GM and operational-manager duties).
- Risk B: Legacy role inheritance can overgrant permissions where governance should require explicit assignment.
- Risk C: Delegation and override lineage is fragmented across workflow vs admin delegation tables.
- Risk D: Owner visibility boundaries are not formalized as a dedicated read-only governance domain.

## 3) Governance Weaknesses
- No single source of truth for enterprise role catalog and crosswalk from legacy roles.
- No normalized model for ownership entity, portfolio, and cluster structure.
- Department governance attributes (cost center, budget owner, KPI owner, risk flags) are not unified.

## 4) Financial Control Gaps
- Missing dedicated authority matrix table for amount caps by governance role and action domain.
- Missing mandatory model for capex/opex segmentation and escalation ceilings.
- Missing dedicated immutable financial decision ledger tied to governance role lineage.

## 5) Compliance Gaps
- Existing logs are useful but not fully mapped to governance events:
  - role assignment changes,
  - temporary authority usage,
  - financial override use,
  - owner visibility grants and changes.

## 6) Proposed Enterprise Org Architecture Diagram (Text)
```text
Ownership Entity
  -> Portfolio
     -> Cluster
        -> Property
           -> Department
              -> Team

Governance chain (authority):
Team Member
  -> Supervisor
    -> Assistant Manager
      -> Manager
        -> Department Head
          -> Executive Committee Member
            -> General Manager
              -> Cluster GM / Area GM
                -> Corporate

Owner / Investor:
Read-only financial-summary visibility through explicit grants.
```

## 7) Updated RBAC Matrix (Target Model)
| Governance Role | Typical Scope | Operational Actions | Financial Approval | Governance Policy Changes | Cross-Property Visibility |
|---|---|---|---|---|---|
| Team Member | Team | Own workflow only | None | No | No |
| Supervisor | Team | Team supervision | Low threshold (if configured) | No | No |
| Assistant Manager | Department | Department execution | Low/medium threshold | No | No |
| Manager | Department | Department operations | Medium threshold | No | No |
| Department Head | Department | Department oversight | Department budget threshold | No | No |
| Executive Committee Member | Property | Property strategic ops | Elevated property threshold | No | Property-level |
| General Manager | Property | Full property oversight | GM threshold + constrained override | No | Property-level |
| Cluster GM / Area GM | Cluster/Portfolio | Multi-property oversight | Above-GM threshold | Limited (assigned domains) | Assigned properties/portfolio |
| Corporate | Portfolio/Group | Governance oversight | Highest threshold | Yes | Portfolio/group |
| Owner Observer | Portfolio/Property | None | None | No | Financial summaries only |

## 8) Required Schema Updates (Implemented As Draft, Additive)
Added in draft migration:
- Role and mapping:
  - `gov_role_catalog`
  - `gov_legacy_role_map`
  - `gov_user_role_assignments`
- Portfolio/cluster/ownership:
  - `gov_ownership_entities`
  - `gov_portfolios`
  - `gov_property_portfolios`
  - `gov_property_clusters`
  - `gov_cluster_properties`
  - `gov_portfolio_role_assignments`
  - `gov_property_executive_assignments`
  - `gov_owner_visibility_grants`
- Department governance/KPI/RACI:
  - `gov_department_governance`
  - `gov_kpi_catalog`
  - `gov_department_kpi_targets`
  - `gov_kpi_raci_assignments`
- Financial governance:
  - `gov_budget_cycles`
  - `gov_department_budgets`
  - `gov_financial_approval_policies`
  - `gov_financial_actions_log`
- Crisis/escalation:
  - `gov_incident_reports`
  - `gov_incident_escalation_chain`
  - `gov_risk_heatmap_snapshots`
- Delegation:
  - `gov_authority_delegations`
  - `gov_delegation_audit_log`
- Executive metric model:
  - `gov_exec_metric_catalog`
  - `gov_exec_metric_facts`
- Read models:
  - `gov_v_department_accountability_gaps`
  - `gov_v_property_executive_rollup`
  - `gov_v_portfolio_executive_rollup`
  - `gov_v_kpi_raci_gaps`
- Feature flags:
  - `gov_feature_flags` (all off by default)

## 9) Migration Plan (Safe Rollout)
1. Stage-only apply of draft migration.
2. Seed governance assignments from legacy role map.
3. Validate dashboard views and RLS access in staging.
4. Backfill KPI/RACI/budget datasets.
5. Run dual-read checks (legacy auth vs governance auth).
6. Enable `governance_exec_dashboards_enabled` only.
7. Enable `governance_financial_controls_enabled` after approval testing.
8. Enable `governance_rbac_enabled` last, with fallback switch retained.

## 10) Executive Dashboard Structural Model
- GM Dashboard (property scope):
  - Department performance scorecards.
  - Revenue summary, cost ratio, budget-vs-actual.
  - Guest satisfaction, staff turnover, forecast accuracy.
  - Risk alerts and operational bottleneck indicators.
- Corporate Dashboard (portfolio scope):
  - Property comparison panel.
  - Portfolio revenue and EBITDA indicators.
  - RevPAR/GOPPAR rollups.
  - Underperforming-asset detection and trend tracking.

## 11) Risk Scoring Summary By Severity
| Severity | Count | Summary |
|---|---:|---|
| Critical | 4 | Missing enterprise hierarchy depth, incomplete financial authority matrix, no normalized portfolio/ownership model, incomplete separation-of-powers model. |
| High | 5 | KPI/RACI enforcement gap, incident model gap, delegation governance gap, owner visibility boundary gap, mixed hardcoded vs dynamic auth controls. |
| Medium | 4 | Audit/policy sprawl and migration drift risk, dashboard model not fully executive-grade, duplicate/parallel migration history complexity, role mapping ambiguity in job-title workflows. |
| Low | 3 | React component complexity warnings, localized permission helper duplication, route-level role list maintenance overhead. |

## What Was Changed In This Phase
- Added draft schema file only: `supabase/migration_drafts/2026-02-27_governance_phase1_safe_additive.sql`
- Added staged rollout assets:
  - `supabase/migration_drafts/2026-02-27_governance_phase1_preflight_checks.sql`
  - `supabase/migration_drafts/2026-02-27_governance_phase1_minimal_foundation.sql`
  - `supabase/migration_drafts/2026-02-27_governance_phase1_postapply_checks.sql`
  - `docs/ENTERPRISE_GOVERNANCE_ROLLOUT_PLAYBOOK_2026-02-27.md`
- No runtime code path switched.
- No existing migration file modified.
- No destructive DB operation introduced.
