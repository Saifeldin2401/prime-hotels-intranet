# Cluster View Audit
Date: March 3, 2026
Scope: PRIME Hotels intranet (role visibility, consolidated/cluster behavior, permissions, and cluster feature coverage)

## 1) Role Differentiation (Current State)
Current app roles are technical (`corporate_admin`, `regional_admin`, `regional_hr`, `property_manager`, `property_hr`, `department_head`, `manager`, `staff`).

Business-role mapping now exists in `src/lib/organizationalRoles.ts`:

| Business Role | Mapped App Role(s) | Level | Consolidated View |
|---|---|---|---|
| Cluster General Manager | corporate_admin, regional_admin | cluster | Yes |
| Property General Manager | property_manager | property | No (unless multi-property assignment) |
| Cluster Department Head | regional_hr | cluster | Yes |
| Department Head | department_head, property_hr | department | No (unless multi-property assignment) |
| Supervisor | manager | team | No |
| Staff-level user | staff | individual | No |

## 2) Dashboard/Feature Visibility by Role
Assessed from `Dashboard`, `WidgetRegistry`, navigation/routes, and operations modules.

| Capability | Cluster GM | Property GM | Dept Head | Cluster Dept Head | Supervisor | Staff |
|---|---|---|---|---|---|---|
| Single-property dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Multi-property aggregated dashboard | Yes | Partial (if assigned multi-property) | Partial (if assigned multi-property) | Yes | Partial (assignment-driven) | Partial (assignment-driven) |
| Cross-property KPI comparison | Yes (Operations Analytics comparison) | Limited | Limited | Yes | No | No |
| Consolidated financial reports | Partial (Operations Flash/Analytics revenue rollups) | Partial | No | Partial | No | No |
| Centralized sales pipeline | No dedicated cluster sales pipeline module | No | No | No | No | No |
| Shared HR overview | Partial (HR metrics widget + HR admin pages) | Partial | Partial | Partial | No | No |

## 3) Permission Model Findings
Permissions are hybrid:
- Role-based with hierarchy inheritance (`ROLES` levels + `PERMISSION_CONFIG`)
- Property/department constrained where configured (`requiresPropertyAccess`, `requiresDepartmentAccess`)
- Consolidated scope explicitly handled in `usePermissions` and `propertyScope` utilities

Confirmed:
- Access is role-based first, then optionally property-based.
- Users can belong to multiple properties (`user_properties`; used in auth/property context).
- Cluster roles can drill down to property-level via property selector and property-scoped queries.

## 4) Cluster Feature Implementation Status
| Feature | Status | Notes |
|---|---|---|
| Multi-property filtering | Implemented (core modules), still inconsistent in legacy modules | Consolidated helper exists but legacy `'all'` checks remain outside critical paths |
| Property selector dropdown | Implemented | Header/sidebar/mobile |
| KPI comparison table (Hotel A vs Hotel B) | Implemented | Operations Analytics comparison tab |
| Consolidated P&L | Partial | Revenue/ops consolidation exists; full accounting P&L statement missing |
| Cluster-wide budget tracking | Partial | Governance/Finance Controls includes budgets and cycles, not a unified cluster dashboard |
| Shared procurement visibility | Missing | No dedicated cluster procurement visibility module |

## 5) Key Gaps
1. No dedicated cluster leadership cockpit that combines operations, finance, HR, and governance in one view.
2. Missing true consolidated P&L (income statement level with OpEx/CapEx rollups by cluster/property).
3. No centralized sales pipeline module for cross-property opportunity funneling.
4. Procurement spend/vendor visibility is not exposed as a shared cluster feature.
5. Scope mode is still represented by the `'all'` sentinel in many legacy modules, increasing drift risk.
6. Cluster structures exist in governance tables, but are not fully integrated into all day-to-day operational queries.

## 6) Recommended Architecture
1. Introduce explicit scope primitives in every domain query path:
   - `scope_type`: `property | cluster | portfolio | corporate`
   - `scope_id`: nullable by type
2. Standardize all property checks through `propertyScope` utilities:
   - `isConsolidatedPropertyId`, `isRealPropertyId`, `normalizePropertyScopeId`
3. Use business-role mapping as an abstraction boundary:
   - Keep DB/app roles stable
   - Map to business roles for product logic and UX copy
4. Add cluster-aware read models/materialized views:
   - `v_cluster_kpis_daily`
   - `v_cluster_financial_summary`
   - `v_cluster_hr_summary`
5. Enforce scope-aware RLS with claims-based filtering:
   - Role claim + allowed property/cluster IDs
   - Deny-by-default for unrelated properties

## 7) Required Permissions Matrix (Target)
Minimum target matrix for cluster operating model:

| Permission | Cluster GM | Property GM | Cluster Dept Head | Dept Head | Supervisor | Staff |
|---|---|---|---|---|---|---|
| View consolidated KPIs | Yes | No | Yes | No | No | No |
| Drill into property KPIs | Yes | Yes | Yes | Scoped | Scoped | No |
| View consolidated finance | Yes | No | No | No | No | No |
| View cluster HR overview | Yes | No | Yes | No | No | No |
| Export cluster reports | Yes | No | Scoped | No | No | No |
| Reassign/escalate cross-property tasks | Yes | No | Scoped | No | Scoped | No |

## 8) UI/UX Improvements
1. Replace mixed “All/Cluster” wording with one consistent label set:
   - “Consolidated (Cluster)” for scope
   - “Property” for drill-down
2. Add persistent scope badge in all analytics/admin pages, not only navigation/header.
3. Add explicit “Drill down” affordance from consolidated widgets to property-level detail pages.
4. Add scope-aware empty states:
   - “No data for this cluster scope”
   - “Switch to a property to edit records”

## 9) Database Adjustments
1. Formalize cluster membership usage in runtime queries:
   - Use `gov_property_clusters` + `gov_cluster_properties` in analytics/HR/finance reads.
2. Add scope metadata on major facts where absent:
   - For denormalized/reporting tables, include `cluster_id` materialized columns or indexed views.
3. Add or validate indexes:
   - `(property_id, business_date)`, `(cluster_id, business_date)`, `(department_id, property_id)`.
4. Add integrity checks:
   - Ensure records requiring property scope cannot be inserted with consolidated sentinel IDs.

## 10) Prioritized Action Plan
P0 (Immediate, 1-2 sprints):
1. Complete remaining legacy `'all'` scope normalization in core data hooks.
2. Ship consolidated scope badge + drill-down patterns across major analytics pages.
3. Lock permissions for consolidated exports and cross-property actions via explicit checks.

P1 (Near-term, 2-4 sprints):
1. Build cluster leadership dashboard (operations + finance + HR + risk cards).
2. Add cluster financial summary view (near-P&L) with property contribution breakdown.
3. Add cluster HR summary page with headcount, attendance, vacancies, and compliance rollups.

P2 (Mid-term, 4+ sprints):
1. Implement centralized sales pipeline across properties.
2. Implement shared procurement visibility (vendor spend, category breakdown, property comparison).
3. Add forecast and budget-vs-actual views at cluster and property levels.

## 11) Execution Notes (This Cleanup Pass)
Completed in code:
1. Consolidated scope helper usage expanded across high-impact hooks/components.
2. Role insights now route through explicit business-role mapping (`organizationalRoles`).
3. Sidebar/mobile/task/HR modules aligned to `propertyScope` helper semantics.

Remaining:
1. Full repo-wide replacement of legacy `'all'` checks in non-critical modules.
2. Product-level additions (cluster cockpit, P&L, procurement, sales pipeline).
