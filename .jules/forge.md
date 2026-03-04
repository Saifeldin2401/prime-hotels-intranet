## 2026-03-03 - Discrepancy between UI-managed Role Permissions and Application Logic
**Issue:** The 'Role Management' UI allowed administrators to grant/revoke permissions in a `role_permissions` table, but the rest of the application relied on a hardcoded `PERMISSION_CONFIG` in the `usePermissions` hook, rendering UI changes ineffective.
**Impact:** Administrators were unable to dynamically adjust access control, leading to potential security gaps or functional blockers that could only be resolved by code changes.
**Resolution:** Updated `usePermissions.ts` to fetch and respect dynamic overrides from the `role_permissions` table, while maintaining the hardcoded config as a robust fallback and source for metadata (like property/department requirements).
**Prevention:** Always ensure that UI-managed configuration tables have a corresponding consumer in the application logic, and provide a clear hierarchy between dynamic (DB) and static (Code) configuration.

## 2026-03-03 - Shift Scheduling Property Boundary Enforcement
**Issue:** In consolidated (cluster) scope, HR Shift Scheduling could run without a concrete property context, leading to broad data reads and writes with `property_id = null`.
**Impact:** This creates a data isolation and integrity risk in multi-property operations, where records can become orphaned or operational actions can be applied without clear property ownership.
**Resolution:** Added an explicit property selector for consolidated scope, enforced property-scoped queries, blocked create/update actions when no real property is selected, and ensured new records always write with a concrete `property_id`.
**Prevention:** Treat all operational write flows as property-bound by default, and require explicit property context whenever user scope includes multi-property or consolidated views.

## 2026-03-03 - Shift Write Hook Scope Guard
**Issue:** Shared shift write hooks (`useCreateShift` / `useUpdateShift`) accepted missing or non-real `property_id` values, while UI-level checks were the only enforcement point.
**Impact:** Any future or alternate UI path could bypass page guards and create/update shifts with invalid property scope, undermining data isolation.
**Resolution:** Added hook-level validation to require real property IDs for shift creation and for any property-scope updates, and normalized insert payload to always persist a concrete `property_id`.
**Prevention:** Enforce tenancy/scope invariants in shared data hooks (not only page components) so all callers inherit the same safety guarantees.

## 2026-03-03 - Attendance Update Property Predicate
**Issue:** Attendance update writes in Shift Scheduling targeted rows by `id` only, without enforcing the selected `property_id` at write time.
**Impact:** In a multi-property setup, a stale or leaked record identifier could allow cross-property modifications and weaken data isolation guarantees.
**Resolution:** Added property-scoped update predicates (`id` + `property_id`) and explicit error handling when a row is outside the selected property, plus employee-in-scope validation on attendance creation.
**Prevention:** Require property predicates on all operational update/delete writes and validate entity membership against current property scope before mutating data.

## 2026-03-03 - Cross-Domain Scope Drift and Ambiguous Property Writes
**Issue:** Multiple operational hooks still mixed legacy `'all'` property checks with normalized scope helpers, and several create flows could persist records without a guaranteed real `property_id` when user scope was multi-property.
**Impact:** Inconsistent scope behavior across modules causes hidden multi-property bugs, weakens data isolation expectations, and increases risk of records being created outside explicit property context.
**Resolution:** Standardized core hooks to `isRealPropertyId`-based scope checks (`maintenance`, `leave`, `expense`, `events`, `requests`, `unified approvals`) and enforced concrete-property write guards in high-risk create paths (maintenance tickets, leave requests, expense claims).
**Prevention:** Enforce property-scope resolution through shared scope helpers only, and require explicit real-property resolution before any write operation in multi-property contexts.
