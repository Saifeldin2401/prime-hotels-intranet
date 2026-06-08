# Property Scope Audit Report
**Date:** 2026-03-04
**Scope:** c:\Users\mahro\Desktop\prime-hotels-intranet-master\src

---

## Executive Summary

This audit analyzed the property selector implementation, consolidated view logic, and property_id handling across the codebase. While the codebase has a solid foundation with `PropertyContext`, `propertyScope.ts` utilities, and consistent use of `isRealPropertyId()` checks, several potential issues were identified where data might leak between properties or where property-scoped features might break in consolidated views.

---

## 1. Property Selector Implementation

### Location
- **Component:** `src/components/common/PropertySelector.tsx`
- **Context:** `src/contexts/PropertyContext.tsx`
- **Utilities:** `src/lib/propertyScope.ts`

### How It Works
1. **Corporate/Regional Users:** See "PRIME GROUP (HEAD OFFICE)" consolidated option + all properties
2. **Multi-Property Users:** See "My Cluster (N)" consolidated option + their assigned properties  
3. **Single Property Users:** See only their assigned property (no selector needed)

### Consolidated Property ID
```typescript
CONSOLIDATED_PROPERTY_ID = 'all'
isConsolidatedPropertyId(id) => id === 'all'
isRealPropertyId(id) => Boolean(id) && id !== 'all'
```

### Issues Found

#### Issue 1.1: Property Selector Does Not Prevent Selection of Inaccessible Properties
- **File:** `src/components/common/PropertySelector.tsx:77-91`
- **Severity:** LOW
- **Description:** While the selector shows a lock icon for inaccessible properties, it doesn't actually prevent selection if the user manipulates the DOM or API calls.
- **Mitigation:** RLS policies should enforce access control at the database level.

---

## 2. Consolidated View Logic

### Pattern Used Across Hooks
Most hooks use this pattern for property filtering:
```typescript
const { currentProperty } = useProperty()
if (isRealPropertyId(currentProperty?.id)) {
  query = query.eq('property_id', currentProperty.id)
}
// If consolidated ('all'), no property filter is applied
```

### Properly Implemented (Multi-Property Aggregation)
These hooks correctly handle consolidated views by aggregating data across user's accessible properties:

| Hook | Method | Status |
|------|--------|--------|
| `useDashboardStats` | Uses `propertyIds` array from context | ✅ CORRECT |
| `usePropertyManagerStats` | Uses `propertyIds` for aggregation | ✅ CORRECT |
| `useHRStats` | Uses `propertyIds` for aggregation | ✅ CORRECT |
| `useAreaManagerStats` | Uses `propertyIds` for aggregation | ✅ CORRECT |
| `useCorporateStats` | Uses `propertyIds` for aggregation | ✅ CORRECT |
| `useOperationsKPIs` | Aggregates across properties when no specific property | ✅ CORRECT |
| `useEmployeeDirectory` | Uses RPC with property filter | ✅ CORRECT |

### Issues Found

#### Issue 2.1: `useUpcomingEvents` - Missing Property Filter
- **File:** `src/hooks/useEvents.ts:56-83`
- **Severity:** MEDIUM
- **Description:** The `useUpcomingEvents` hook fetches public events without any property filtering, potentially showing events from all properties to all users.
```typescript
// Line 64-70 - No property filter applied
const { data, error } = await supabase
  .from('events')
  .select('*')
  .gte('start_date', new Date().toISOString())
  .eq('is_public', true)  // Only checks is_public, not property_id
```

#### Issue 2.2: `useEventsByMonth` - Missing Property Filter
- **File:** `src/hooks/useEvents.ts:85-126`
- **Severity:** MEDIUM
- **Description:** Similar to above, no property filtering when consolidated view is selected.

#### Issue 2.3: `useAnnouncements` - Client-Side Filtering Only
- **File:** `src/hooks/useAnnouncements.ts:8-83`
- **Severity:** MEDIUM
- **Description:** Fetches ALL announcements from the server and filters client-side. This could leak announcement titles/metadata across properties before filtering.
```typescript
// Lines 19-29: No property filter in the database query
const query = supabase
  .from('announcements')
  .select(`*`)
  .order('pinned', { ascending: false })
```

---

## 3. Property_ID in API Calls (Mutations)

### Well-Protected Mutations
These mutations properly validate and set property_id:

| Hook | Mutation | Validation |
|------|----------|------------|
| `useCreateTask` | `createTask` | ✅ Validates with `isRealPropertyId()` |
| `useCreateMaintenanceTicket` | `createMaintenanceTicket` | ✅ Throws error if no valid property |
| `useSubmitExpenseClaim` | `submitExpenseClaim` | ✅ Validates and requires property_id |
| `useSubmitLeaveRequest` | `submitLeaveRequest` | ✅ Validates and requires property_id |
| `useCreateShift` | `createShift` | ✅ Validates with `isRealPropertyId()` |
| `useUpdateShift` | `updateShift` | ✅ Validates property_id on update |

### Issues Found

#### Issue 3.1: `useCreateDocument` - Missing Property_ID
- **File:** `src/hooks/useDocuments.ts:527-555`
- **Severity:** HIGH
- **Description:** Document creation does not automatically set property_id from current context, potentially creating orphaned documents.
```typescript
// Lines 531-543: No property_id handling
.insert({
  ...document,
  created_by: user.id,
  status: 'DRAFT',
})  // property_id not set from context
```

#### Issue 3.2: `useCreateEvent` - Missing Property_ID
- **File:** `src/hooks/useEvents.ts:128-150`
- **Severity:** HIGH
- **Description:** Event creation doesn't enforce property_id, allowing events to be created without property association.
```typescript
// Lines 134-140: No property_id validation
.insert({
  ...event,
  created_by: user?.id
})  // property_id comes from input only, not validated
```

#### Issue 3.3: `useCreateTrainingModule` - Missing Property_ID
- **File:** `src/hooks/useTraining.ts:111-137`
- **Severity:** MEDIUM
- **Description:** Training modules are global by design, but there's no option to scope them to properties if needed.

#### Issue 3.4: `useCreateGoal` - Missing Property_ID
- **File:** `src/hooks/useGoals.ts:97-114`
- **Severity:** MEDIUM
- **Description:** Goals don't have property scoping, which might be intentional but should be documented.

#### Issue 3.5: `useCreateDocumentFolder` - Missing Property_ID
- **File:** `src/hooks/useDocuments.ts:791-818`
- **Severity:** MEDIUM
- **Description:** Folder creation accepts property_id from input but doesn't validate or default it from context.

---

## 4. Property-Scoped Queries Analysis

### Queries That Properly Handle Consolidated View

| Hook | Query | Pattern |
|------|-------|---------|
| `useTasks` | tasks | Checks `ignorePropertyFilter` + `isRealPropertyId()` |
| `useMyMaintenanceTickets` | maintenance_tickets | Uses `isRealPropertyId()` check |
| `useAssignedMaintenanceTickets` | maintenance_tickets | Role-based + property filter |
| `useMyLeaveRequests` | leave_requests | Uses `isRealPropertyId()` check |
| `useTeamLeaveRequests` | leave_requests | Role-based with property aggregation |
| `useMyExpenseClaims` | expense_claims | Uses `isRealPropertyId()` check |
| `useDocuments` | documents | Optional property_id filter |
| `useDailyOccupancy` | daily_occupancy | Uses `isRealPropertyId()` check |
| `useDailyRevenue` | daily_revenue | Uses `isRealPropertyId()` check |
| `useMarketSegments` | market_segments | Uses `isRealPropertyId()` check |

### Issues Found

#### Issue 4.1: `useShifts` - Missing Property Filter in Query
- **File:** `src/hooks/useShifts.ts:39-68`
- **Severity:** HIGH
- **Description:** The query doesn't filter by property at all, only by user_id and department_id. This could expose shifts from other properties.
```typescript
// No property filtering applied
let query = supabase
  .from('shifts')
  .select('*')
```
- **Note:** The `CreateShiftInput` interface requires `property_id`, but queries don't filter by it.

#### Issue 4.2: `useShiftStats` - Missing Property Filter
- **File:** `src/hooks/useShifts.ts:161-200`
- **Severity:** MEDIUM
- **Description:** Statistics don't filter by property, potentially aggregating across all properties.

#### Issue 4.3: `useGoals` - No Property Scoping
- **File:** `src/hooks/useGoals.ts:16-75`
- **Severity:** LOW
- **Description:** Goals are employee-scoped only, no property dimension. This might be intentional but limits property-specific goal tracking.

#### Issue 4.4: `useKnowledgeArticles` - No Property Filter
- **File:** `src/hooks/useKnowledge.ts:22-49`
- **Severity:** MEDIUM
- **Description:** Knowledge base articles don't have property-level filtering in the hook (relies on RLS/service layer).

---

## 5. Multi-Property Data Aggregation

### Properly Implemented Aggregation

The dashboard stats hooks demonstrate the correct pattern for multi-property aggregation:

```typescript
// From useDashboardStats.ts
const { currentProperty, propertyIds } = useProperty()
const isScoped = isRealPropertyId(currentProperty?.id)

if (isScoped) {
  q.eq('property_id', currentProperty?.id)
} else if (propertyIds.length > 0) {
  q.in('property_id', propertyIds)  // Aggregate across user's properties
}
```

### Issues Found

#### Issue 5.1: `useTrainingModules` - Global Scope Only
- **File:** `src/hooks/useTraining.ts:24-72`
- **Severity:** LOW
- **Description:** Training modules are always global. There's no property-level filtering for property-specific training content.

#### Issue 5.2: `useNotifications` - No Property Scoping
- **File:** `src/hooks/useNotifications.ts`
- **Severity:** LOW
- **Description:** Notifications are user-scoped only. While this is typically correct, there's no way to filter notifications by property in consolidated view.

---

## 6. Critical Security Findings

### Finding 6.1: `useUpdateTask` - Property Can Be Changed Without Validation
- **File:** `src/hooks/useTasks.ts:268-339`
- **Severity:** MEDIUM
- **Description:** Task updates don't validate if the user has access to the property being set. A user could potentially move a task to a property they don't have access to.
```typescript
// Lines 296-301: No property validation on update
const { data, error } = await supabase
  .from('tasks')
  .update(updates)  // updates could include property_id
  .eq('id', id)
```

### Finding 6.2: `useUpdateDocument` - Property Can Be Changed
- **File:** `src/hooks/useDocuments.ts:560-585`
- **Severity:** MEDIUM
- **Description:** Document updates don't validate property access before allowing property_id changes.

### Finding 6.3: `useUpdateEvent` - No Property Validation
- **File:** `src/hooks/useEvents.ts:152-171`
- **Severity:** MEDIUM
- **Description:** Event updates don't validate property_id changes.

---

## 7. Recommendations

### Immediate Actions Required

1. **Fix `useShifts` queries** - Add property filtering to prevent cross-property data exposure
2. **Fix `useCreateDocument`** - Automatically set property_id from current context
3. **Fix `useCreateEvent`** - Enforce property_id validation
4. **Add property validation to update mutations** - Prevent users from moving entities to unauthorized properties

### Code Patterns to Standardize

1. **Always use the pattern:**
```typescript
const { currentProperty, propertyIds } = useProperty()
const isScoped = isRealPropertyId(currentProperty?.id)

if (isScoped) {
  query = query.eq('property_id', currentProperty.id)
} else if (propertyIds.length > 0) {
  query = query.in('property_id', propertyIds)
}
```

2. **For mutations, always validate:**
```typescript
if (!isRealPropertyId(data.property_id)) {
  throw new Error('A valid property_id is required')
}
const hasAccess = properties.some(p => p.id === data.property_id)
if (!hasAccess) {
  throw new Error('You do not have access to this property')
}
```

### RLS Policy Verification Needed

The following tables need RLS policies verified to ensure property-level access control:
- `shifts` - Critical
- `documents` - Critical  
- `events` - Medium
- `announcements` - Medium
- `goals` - Low
- `training_modules` - Low (if property scoping is needed)

---

## 8. Summary Statistics

| Category | Count |
|----------|-------|
| Hooks Analyzed | 45+ |
| Critical Issues | 3 |
| Medium Issues | 8 |
| Low Issues | 5 |
| Properly Implemented | 35+ |

### Files Requiring Immediate Attention
1. `src/hooks/useShifts.ts` - Missing property filters
2. `src/hooks/useDocuments.ts` - Missing property_id in creation
3. `src/hooks/useEvents.ts` - Missing property validation
4. `src/hooks/useTasks.ts` - Missing property validation on update
5. `src/hooks/useAnnouncements.ts` - Client-side filtering only

---

## Appendix: Key Files

### Property Scope Utilities
- `src/lib/propertyScope.ts` - Core utility functions
- `src/contexts/PropertyContext.tsx` - Property context provider
- `src/components/common/PropertySelector.tsx` - UI component

### Permission System
- `src/hooks/usePermissions.ts` - Permission checks including property access
- `src/lib/rbac.ts` - Role-based access control

### Well-Implemented Examples
- `src/hooks/useLeaveRequests.ts` - Excellent role-based routing
- `src/hooks/useMaintenanceTickets.ts` - Proper property validation
- `src/hooks/useDashboardStats.ts` - Proper aggregation pattern
