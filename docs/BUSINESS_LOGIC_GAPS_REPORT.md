# Business Logic Gaps & Enhancement Opportunities Report
## Prime Hotels Intranet System

**Date:** March 2026  
**Scope:** React/TypeScript Frontend + Supabase Backend Integration  
**Focus Areas:** HR, Training, Operations, Compliance, Analytics

---

## Executive Summary

This report identifies **15 critical business logic gaps** in the Prime Hotels intranet system, categorized by severity and module. The most impactful issues relate to:

1. **Leave Management** - No balance tracking or accrual logic
2. **Shift Scheduling** - Missing conflict detection and labor law compliance
3. **Certification Paths** - Multiple quizzes don't aggregate into unified certificates
4. **Manager Visibility** - Limited employee tracking and team insights
5. **Data Integrity** - Misleading analytics and permission leaks

---

## 🔴 Critical Gaps (Fix Immediately)

### 1. Leave Balance System Missing
**Location:** `src/hooks/useLeaveRequests.ts`

**Problem:**
The system tracks leave requests but has no concept of leave entitlement, accrual, or balance validation.

**Current Code (lines 246-260):**
```typescript
// Only checks for overlapping dates - no balance validation
const { data: overlapping } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('requester_id', user.id)
    .lte('start_date', data.end_date)
    .gte('end_date', data.start_date)
// ❌ Missing: Check against leave_balance table
```

**Business Impact:**
- Employees can request unlimited leave
- No enforcement of annual entitlements
- HR cannot track remaining balances
- No carry-forward or forfeiture logic

**Recommended Fix:**
1. Create `leave_balances` table with: `user_id`, `year`, `annual_entitlement`, `used_days`, `pending_days`, `carried_forward`
2. Add RPC function `get_leave_balance(user_id, year)`
3. Validate requests against: `(used_days + pending_days + requested_days) <= (annual_entitlement + carried_forward)`
4. Update balance on: request submission, approval, rejection, cancellation

---

### 2. Shift Conflict Detection Missing
**Location:** `src/hooks/useShifts.ts`

**Problem:**
Shifts can be created with overlapping times, double-booking employees, or violating rest period requirements.

**Current Code (lines 86-110):**
```typescript
// ❌ No conflict detection before insert
if (!isRealPropertyId(input.property_id)) {
    throw new Error('A valid property_id is required')
}
// Missing: Check for overlapping shifts, rest period violations
const { data, error } = await supabase.from('shifts').insert({ ...input })
```

**Business Impact:**
- Employee scheduled for two shifts simultaneously
- Labor law violations (insufficient rest between shifts)
- Overtime threshold violations not tracked

**Recommended Fix:**
1. Pre-insert validation for:
   - Overlapping shifts for same employee
   - Minimum 11-hour rest period between shifts (labor law compliance)
   - Maximum 48-hour work week tracking
   - Overtime threshold alerts (>40 hrs/week)
2. Add `shift_conflicts` RPC function
3. UI warning when creating conflicting shifts

---

### 3. Quiz/Certificate Aggregation Missing
**Location:** `src/pages/training/TrainingPlayer.tsx`, `src/hooks/useCertificates.ts`

**Problem:**
Each training module generates an independent certificate. There's no support for "Certification Paths" where multiple modules aggregate into a single professional certification.

**Current Logic:**
```typescript
// Each module completion → separate certificate
if (module.certificate_enabled && score >= passingThreshold) {
    generateCertificate(module.id, user.id) // One cert per module
}
```

**Business Impact:**
- "Food Safety Certification" requires 3 modules (Hygiene, HACCP, Allergens) but produces 3 separate PDFs
- No concept of "Program Completion" or "Professional Certification"
- Cannot track multi-module learning paths

**Recommended Fix:**
1. Create `certification_paths` table:
   - `id`, `title`, `description`, `required_module_ids[]`, `elective_module_ids[]`, `required_elective_count`
2. Add `user_certifications` table tracking path completion
3. Certificate generation triggered when:
   - All required modules completed
   - Minimum elective count met
   - Aggregate score >= passing threshold
4. Certificates reference the path, not individual modules

---

### 4. Dashboard Metrics Compare Apples to Oranges
**Location:** `src/hooks/useDashboardMetrics.ts`

**Problem:**
Trend calculations compare all-time metrics against last-week data, creating misleading percentage changes.

**Current Code:**
```typescript
// All-time completion rate (2 years of data)
current: safeAllTotal > 0 ? Math.round((safeAllDone / safeAllTotal) * 100) : 0,
// Last week only (1 week of data)
previous: safePrevTotal > 0 ? Math.round((safePrevDone / safePrevTotal) * 100) : 0
// Result: Comparing 85% (2 years) vs 60% (1 week) shows misleading 29% drop
```

**Business Impact:**
- Managers see false "trends" that are statistical noise
- Incorrect performance assessments
- Poor decision-making based on invalid comparisons

**Recommended Fix:**
```typescript
// Compare like-for-like periods
previous: samePeriodLastMonth || samePeriodLastYear  // Not "last week" vs "all time"
```

---

### 5. Search Returns Unpermissioned Results
**Location:** `src/hooks/useSearch.ts`

**Problem:**
Global search returns documents, SOPs, and tasks based on text match only, without checking user access permissions.

**Current Code (lines 145-160):**
```typescript
// Search Documents - no permission filter
const { data: documents } = await supabase
    .from('documents')
    .select('id, title, description')
    .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
// Missing: Filter by visibility, department, or user access rights
```

**Business Impact:**
- Staff can search and see titles of confidential documents
- Salary information visible in search results
- Document existence leaks even if content is protected

**Recommended Fix:**
1. Apply RLS-equivalent filters in search:
   - `visibility = 'all_properties'` OR
   - `visibility = 'property' AND property_id IN (user_properties)` OR
   - `visibility = 'department' AND department_id IN (user_departments)`
2. Use secure search RPC function
3. Filter at database level, not just UI

---

## 🟠 High Priority Gaps (Fix Soon)

### 6. Manager Employee Tracking Inadequate
**Location:** `src/pages/hr/MyTeam.tsx`

**Problem:**
Team view shows basic employee list but lacks critical management insights.

**Current State:**
- Basic profile cards with names and roles
- No training compliance visibility
- No skills matrix view
- No performance trends
- No leave balance overview

**Business Impact:**
- Managers cannot identify skill gaps
- Training deadlines missed due to lack of visibility
- No proactive team development planning

**Recommended Enhancement:**
Add manager dashboard sections:
1. **Training Compliance Widget:**
   - Team completion rate per required training
   - Overdue training alerts
   - Upcoming deadline timeline

2. **Skills Matrix:**
   - Grid view: Employees × Skills
   - Proficiency levels (novice, intermediate, expert)
   - Certification expiry tracking

3. **Performance Snapshot:**
   - Goal completion rates
   - Recent recognitions
   - 1:1 meeting status

4. **Leave Overview:**
   - Team calendar with approved leave
   - Pending requests requiring approval
   - Coverage gaps highlighted

---

### 7. Workflow Rollback Missing
**Location:** Various approval workflows (`useApprovals.ts`, `RequestDetail.tsx`)

**Problem:**
Multi-step workflows don't have compensation logic for failed steps.

**Example Scenario:**
1. Step 1: Create leave request ✓
2. Step 2: Deduct from balance ✓
3. Step 3: Notify manager ✓
4. Step 4: Create calendar event ✗ (fails)
5. Result: Balance deducted but no calendar entry

**Business Impact:**
- Data inconsistency across systems
- Failed workflows leave partial state
- Manual cleanup required

**Recommended Fix:**
1. Implement saga pattern for workflows
2. Store workflow state with step results
3. Compensation functions for each step:
   ```typescript
   const stepCompensations = {
     deductBalance: (ctx) => restoreBalance(ctx.userId, ctx.amount),
     createCalendarEvent: (ctx) => deleteCalendarEvent(ctx.eventId),
   }
   ```
4. On failure, execute compensations in reverse order

---

### 8. Notification Storm - No Batching
**Location:** `src/lib/notificationService.ts`

**Problem:**
Bulk actions create individual notifications without digest mode.

**Current Code:**
```typescript
// 50 tasks assigned = 50 separate notifications + 50 emails
for (const userId of userIds) {
    await createNotification({ userId, type: 'task_assigned', ... })
}
```

**Business Impact:**
- Users overwhelmed with notification spam
- Email server overload
- Important notifications buried in noise

**Recommended Fix:**
1. Implement notification batching:
   ```typescript
   if (userIds.length > 5) {
     await createDigestNotification({
       title: '5 new tasks assigned',
       summary: 'Task A, Task B, Task C...',
       actionUrl: '/tasks/bulk-review'
     })
   }
   ```
2. Add digest scheduling (hourly summaries)
3. Priority-based immediate vs batched delivery

---

### 9. Bulk Operations - No Undo or Preview
**Location:** `src/hooks/useBulkOperations.ts`

**Problem:**
Bulk actions execute immediately without preview or undo capability.

**Current Pattern:**
1. User selects 100 employees
2. Clicks "Assign Training"
3. Immediately creates 100 assignments

**Business Impact:**
- Mistaken bulk actions cannot be undone
- No confirmation of scope before execution
- Potential for widespread data errors

**Recommended Fix:**
1. Preview dialog showing:
   - "This will affect 100 employees"
   - List of affected users (sample)
   - Estimated processing time
2. Undo capability using `useUndoableAction` pattern
3. Soft-delete pattern for bulk-created records

---

### 10. No Data Retention / GDPR Compliance
**Location:** `src/hooks/useNotifications.ts`, `src/hooks/useAuditExports.ts`

**Problem:**
Audit logs, notifications, and PII access logs accumulate forever without automated purging.

**Current State:**
```typescript
// Notifications fetched with limit but no automatic cleanup
const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) // Only fetches 50, but table grows unbounded
```

**Business Impact:**
- Database bloat
- GDPR violation (data retention limits)
- Performance degradation over time

**Recommended Fix:**
1. Implement retention policies:
   - Notifications: 90 days
   - Audit logs: 7 years (compliance)
   - PII access logs: 3 years
2. Automated daily purge job
3. Archive to cold storage before deletion
4. Configurable per-tenant retention settings

---

## 🟡 Medium Priority Gaps (Enhancement Opportunities)

### 11. Certificate Expiry Not Tracked
**Location:** `src/hooks/useCertificates.ts`

**Problem:**
Certificates are generated but there's no tracking of expiration or renewal requirements.

**Example:**
- Food Safety Certificate valid for 2 years
- System generates PDF but doesn't track expiry
- No automated renewal reminders

**Recommended Enhancement:**
1. Add `expires_at` column to certificates
2. Background job for expiry notifications (30, 14, 7 days before)
3. "Renewal Required" dashboard widget
4. Compliance report: "Expiring certifications by department"

---

### 12. Shift Swap / Coverage Request Missing
**Location:** `src/hooks/useShifts.ts`

**Problem:**
Employees cannot request shift swaps or coverage directly in the system.

**Current Workflow:**
1. Employee calls manager
2. Manager manually updates shift
3. No approval workflow for swaps

**Recommended Enhancement:**
1. Shift swap request form:
   - Requester selects shift to swap
   - Suggests colleagues with compatible shifts
   - Submits swap request
2. Approval workflow:
   - Other employee accepts
   - Manager approves
   - System updates both shifts
3. Coverage mode: "I can't work, who can cover?"

---

### 13. No Skills Proficiency Tracking Over Time
**Location:** `src/components/profile/UserSkillsDisplay.tsx`

**Problem:**
Skills are recorded but there's no history of proficiency progression.

**Current State:**
- Employee has "Excel: Intermediate"
- No record of when assessed
- No progression tracking

**Recommended Enhancement:**
1. `skill_assessments` table with history:
   - `user_id`, `skill_id`, `proficiency_level`, `assessed_by`, `assessed_at`, `assessment_method`
2. Skills timeline visualization
3. Gap analysis: "Required skills vs Current proficiency"

---

### 14. AI Document Summary Not Used for Search
**Location:** `src/hooks/useAIDocumentSummarizer.ts`

**Problem:**
Document summaries are generated but not indexed for search, missing semantic search capability.

**Current Flow:**
1. AI generates summary
2. Stored in `document_summaries` table
3. Search still uses basic text matching on title/description

**Recommended Enhancement:**
1. Index summaries in search
2. Semantic search using embeddings
3. "Related documents" based on summary similarity

---

### 15. Form Validation Schema Gaps
**Location:** `src/lib/validationSchemas.ts`

**Problem:**
Several validation rules are missing or incomplete:

**Missing Validations:**
- Phone number format not enforced consistently
- No server-side uniqueness checks for email/staff_id
- Date range validation doesn't account for weekends/holidays
- File upload doesn't scan content (only extension check)

**Recommended Enhancement:**
1. Add async validation for uniqueness
2. Business day calculation for leave requests
3. Content-based file validation (magic numbers, not just extensions)

---

## Technical Debt Items

### React Hooks Rule Violations
Three files violate React hooks rules and should be fixed:

1. **`src/components/profile/UserSkillsDisplay.tsx`** (line 110)
   - `useTranslation` called inside `getSkillIcon()` helper
   - **Fix:** Pass `t` as parameter from component level

2. **`src/pages/hr/RequestDetail.tsx`** (line 46)
   - `StatusBadge` component using `useTranslation`
   - **Fix:** Convert to proper component or pass translated labels as props

3. **`src/pages/training/QuizComponentEnhanced.tsx`** (line 760)
   - Hook called in callback
   - **Fix:** Extract to custom hook or move to component level

---

## Implementation Priority Matrix

| Gap | Business Impact | Implementation Effort | Priority |
|-----|----------------|----------------------|----------|
| Leave Balance System | High | Medium | P0 |
| Shift Conflict Detection | High | Medium | P0 |
| Search Permission Leaks | High | Low | P0 |
| Dashboard Metric Fix | High | Low | P0 |
| Certificate Aggregation | High | High | P1 |
| Manager Team Visibility | High | Medium | P1 |
| Workflow Rollback | Medium | High | P1 |
| Notification Batching | Medium | Medium | P1 |
| Bulk Operations Undo | Medium | Medium | P1 |
| Data Retention | Medium | Low | P2 |
| Certificate Expiry | Medium | Low | P2 |
| Shift Swap | Low | Medium | P2 |
| Skills Tracking | Low | High | P3 |
| AI Search Enhancement | Low | High | P3 |
| Validation Improvements | Low | Low | P3 |

---

## Next Steps

1. **Immediate (This Week):**
   - Fix React hooks violations
   - Implement search permission filtering
   - Correct dashboard trend calculations

2. **Short Term (Next 2 Weeks):**
   - Design and implement leave balance system
   - Add shift conflict detection
   - Create data retention policies

3. **Medium Term (Next Month):**
   - Build certification path aggregation
   - Enhance manager team dashboard
   - Implement notification batching

4. **Long Term (Next Quarter):**
   - Workflow saga pattern implementation
   - Skills proficiency tracking
   - AI-powered semantic search

---

## Appendix: Database Schema Recommendations

### New Tables Required

```sql
-- Leave Balance System
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    year INTEGER NOT NULL,
    annual_entitlement DECIMAL(5,2) DEFAULT 21.0,
    carried_forward DECIMAL(5,2) DEFAULT 0.0,
    used_days DECIMAL(5,2) DEFAULT 0.0,
    pending_days DECIMAL(5,2) DEFAULT 0.0,
    UNIQUE(user_id, year)
);

-- Certification Paths
CREATE TABLE certification_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    passing_score_percentage INTEGER DEFAULT 80,
    validity_months INTEGER,
    required_module_ids UUID[] DEFAULT '{}',
    elective_module_ids UUID[] DEFAULT '{}',
    required_elective_count INTEGER DEFAULT 0
);

-- User Certifications (Aggregated)
CREATE TABLE user_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    certification_path_id UUID REFERENCES certification_paths(id) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    aggregate_score INTEGER,
    certificate_url TEXT,
    UNIQUE(user_id, certification_path_id)
);

-- Skills Assessment History
CREATE TABLE skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency_level TEXT CHECK (proficiency_level IN ('novice', 'beginner', 'intermediate', 'advanced', 'expert')),
    assessed_by UUID REFERENCES profiles(id),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessment_method TEXT,
    notes TEXT
);

-- Data Retention Configuration
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    archive_before_delete BOOLEAN DEFAULT true,
    last_purged_at TIMESTAMP WITH TIME ZONE
);
```

---

*Report generated by Code Analysis Agent*  
*For questions or clarifications, contact the development team*
