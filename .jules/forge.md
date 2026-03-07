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

## 2026-03-04 - QuickCreateMenu Corporate Admin Announcement Visibility
**Issue:** `QuickCreateMenu.tsx` used a bespoke `roles.some(r => [...].includes(r.role))` check that excluded `corporate_admin` from seeing the "Post Announcement" option, bypassing the centralized `usePermissions` hook.
**Impact:** Corporate administrators — the highest privilege role — were denied a core dashboard workflow (quick announcement posting) despite having full permission via the centralized permission system and route guards.
**Resolution:** Replaced bespoke role array check with `hasPermission('announcements.create')` from `usePermissions` hook, which respects role hierarchy automatically.
**Prevention:** All permission checks MUST use the `usePermissions` hook. Never use raw `roles.some()` with hardcoded role arrays — they don't respect role hierarchy and are prone to omission bugs. Grep for `includes(r.role)` periodically to catch legacy bespoke checks.

## 2026-03-04 - HR Admin Roles Array Consistency Fix
**Issue:** `HR_ADMIN_ROLES` arrays in `EmployeeDirectory.tsx` and `UserProfile.tsx` omitted `property_manager`, creating inconsistency with the broader codebase where `property_manager` is commonly grouped with HR admin roles for birthday exports and private profile viewing.
**Impact:** Property managers were incorrectly denied permission to export birthday lists and view private employee profile information, despite having HR responsibilities at their properties. This broke expected behavior and created confusion for property-level administrators.
**Resolution:** Added `property_manager` to `HR_ADMIN_ROLES` in both files, aligning with established patterns in routes, training, maintenance, and other modules.
**Prevention:** Maintain a single source of truth for role constants. When adding a role to permission checks in one module, verify consistency across all modules. Create shared constants for common role groupings.

## 2026-03-04 - AnnouncementFeed Property Manager Create/Edit/Delete Visibility
**Issue:** `AnnouncementFeed.tsx` used a bespoke `isAdmin` check (`['corporate_admin', 'regional_admin', 'regional_hr']`) that excluded `property_manager` from seeing Create/Edit/Delete buttons, despite the centralized `PERMISSION_CONFIG` granting them full `announcements.create/edit/delete` permissions.
**Impact:** Property managers could create announcements from the QuickCreateMenu but NOT from the Announcements page itself — contradictory UX and functionality gap for a key operational role.
**Resolution:** Replaced single bespoke `isAdmin` boolean with granular `canCreate`/`canEdit`/`canDelete` using `hasPermission()` from the centralized `usePermissions` hook.
**Prevention:** Never introduce component-local `isAdmin` booleans with hardcoded role arrays. Always use `usePermissions` hook for action visibility checks.

## 2026-03-04 - RequestDetail Corporate Admin Exclusion
**Issue:** `RequestDetail.tsx:93` only checked `primaryRole === 'regional_admin'`, excluding `corporate_admin` from admin actions (close request, manage priority).
**Impact:** Corporate admins — the highest privilege role — could not perform admin actions on approval requests.
**Resolution:** Added `|| primaryRole === 'corporate_admin'` to the `isAdmin` check.

## 2026-03-04 - TrainingCertificates Non-Existent 'admin' Role
**Issue:** `TrainingCertificates.tsx:99` checked for a non-existent `'admin'` role in the `isAdmin` array, while missing `regional_hr` and `property_hr`.
**Impact:** No user ever matched the `'admin'` role check. HR roles who should manage certificates couldn't see the "All Certificates" admin tab.
**Resolution:** Removed dead `'admin'` role, added `'regional_hr'` and `'property_hr'` to match the established role hierarchy.

## 2026-03-04 - WorkflowEditor Silent JSON Failure
**Issue:** `WorkflowEditor.tsx:242` had an empty catch block for step config JSON parsing, silently discarding user input.
**Impact:** Users typing JSON config would have their edits silently thrown away on any typo, making it impossible to correct mistakes.
**Resolution:** Empty catch now preserves raw text via `handleStepChange()` so users see their input and can fix it. Final validation still occurs in `handleSave()`.

## 2026-03-04 - DocumentDetail Corporate Admin Edit Exclusion
**Issue:** `DocumentDetail.tsx:211` `canEdit` check only included `['regional_admin', 'property_manager']`, excluding `corporate_admin`.
**Impact:** Corporate admins could not edit document metadata despite being the highest-level role.
**Resolution:** Added `'corporate_admin'` to the `canEdit` role array.

## 2026-03-07 - RequestDetail Property Manager Exclusion from Request Management
**Issue:** `RequestDetail.tsx:92-95` defined `isHr` (regional_hr, property_hr) and `isAdmin` (regional_admin, corporate_admin), but `property_manager` was in neither. `canAct = isAssignee || isHr || isAdmin` meant property managers who weren't the current assignee had zero request management capabilities. Additionally, the supervisor card (line 741) was gated on `isHr` only, hiding it from admins and property managers.
**Impact:** Property managers — who have `hr.manage_referrals`, `hr.manage_candidates`, and `approvals.view` in the centralized permission system — could not approve, reject, forward, close, or manage requests for their properties. Admins couldn't see supervisor context when reviewing leave requests.
**Resolution:** Added `isPropertyMgr` boolean and included it in `canAct` and supervisor card visibility check.
**Prevention:** Always cross-reference bespoke role checks against `PERMISSION_CONFIG` in `usePermissions.ts`. If a role has management permissions centrally, it must be represented in all component-level action guards.

## 2026-03-07 - SystemWiki Bespoke isAdmin Excluding Property Manager
**Issue:** `SystemWiki.tsx:46` used `['corporate_admin', 'regional_admin'].includes(role)` to gate wiki create/edit actions, excluding `property_manager`.
**Impact:** Property managers — who manage documents and knowledge at their properties — couldn't create or edit wiki sections, despite having `documents.create` and `documents.edit` permissions centrally.
**Resolution:** Added `'property_manager'` to the hardcoded admin array.
**Prevention:** Same as above — periodically audit for hardcoded role arrays that don't include all roles with relevant centralized permissions.

## 2026-03-07 - Corporate Admin Excluded from 5 Bespoke Role Checks
**Issue:** Five files used hardcoded role arrays that excluded `corporate_admin` (level 1, highest privilege):
- `TrainingPaths.tsx` (3 locations, lines 388/401/462): Create button, "All Paths" tab, tab content
- `JobPostings.tsx` (line 46) + `JobPostingDetail.tsx` (line 54): `canManageJobs` check
- `useApprovalAuthority.ts` (line 182): `canApproveGlobally` flag
- `useSidebarCounts.ts` (line 44): `isRegionalAccess` flag for data fetching scope
**Impact:** Corporate admins couldn't create training paths, manage job postings, approve globally, or see correct sidebar counts.
**Resolution:** Added `'corporate_admin'` to all 5 hardcoded role arrays.
**Pattern:** `['regional_admin', 'regional_hr', ...]` without `'corporate_admin'` — this pattern recurs across the codebase. Future audits should specifically search for role arrays that include `regional_admin` but not `corporate_admin`.

## 2026-03-07 - Comprehensive Audit: 15+ Issues Across 8 Files
**Category 1 — Corporate Admin Gaps (6 new locations):**
- `useLeaveRequests.ts`: 3 locations (isRegionalAccess ×2, canDelete ×1)
- `useRequests.ts`: isRegionalAccess in inbox routing
- `useOrgHierarchy.ts`: isCorpLevel for RBAC filtering
- `useMessagingPermissions.ts`: missing switch case, roleHierarchy array, validateMessageContent check

**Category 2 — Silent Error Handling (4 locations):**
- `TrainingPlayerEnhanced.tsx`: 3 empty catch blocks (certificate linkage, skill awarding, certificate creation) → now log via console.error
- `useQuickCreate.ts`: AI triage silent catch → now logs error

**Category 3 — Property Scoping (1 location):**
- `useQuickCreate.ts`: maintenance ticket used `properties[0]` instead of `currentProperty` from context → fixed to prefer selected property

**Category 4 — False Positives:**
- `useAnnouncements.ts` and `useDashboardStats.ts` reported as using `roles.some()` — verified these patterns do not exist in the files. No changes needed.

**Prevention:** Recommend a codebase-wide search for `['regional_admin'` patterns that exclude `corporate_admin` as part of CI/CD or periodic audit.

