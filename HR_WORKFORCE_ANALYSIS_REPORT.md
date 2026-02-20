# PHG Connect - HR & Workforce Management Analysis Report

**Date:** February 19, 2026  
**System:** PHG Connect Intranet Platform  
**Analysis Scope:** HR & Workforce Management Features

---

## Executive Summary

The PHG Connect system includes a **comprehensive HR & Workforce Management module** covering most essential workforce control functions. The system is built on a modern React + TypeScript stack with Supabase backend, featuring role-based access control (RBAC) and multi-property support for hotel chains.

### Overall HR Maturity Score: **7.5/10**
- ✅ Strong: Employee management, Training/LMS, Organization hierarchy, Leave management
- ⚠️ Moderate: Attendance tracking, Shift scheduling, Recruitment
- ❌ Missing: Full payroll processing, Advanced benefits administration, Time & labor analytics

---

## 1. Employee Management ⭐⭐⭐⭐⭐ (5/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Employee Profiles | ✅ Complete | `useUsers.ts`, `useProfiles` | Full profile with contact, emergency, employment details |
| Role Assignment | ✅ Complete | `useAuth`, RBAC | regional_admin, property_manager, department_head, staff |
| Multi-Property Support | ✅ Complete | `user_properties` table | Employees can belong to multiple properties |
| Department Assignment | ✅ Complete | `user_departments` table | Multi-department support |
| Account Lifecycle | ✅ Complete | `UserManagement.tsx` | Active, suspended, locked, inactive states |
| Bulk Operations | ✅ Complete | `useUserBulkOperations` | Mass updates, role changes |
| Account Actions | ✅ Complete | `useAccountActions.ts` | Suspend, reactivate, force password reset, unlock |
| Staff ID Generation | ✅ Complete | `staff_id` field | Human-readable employee IDs (e.g., "PH-1001") |

### Key Files
- `src/hooks/useUsers.ts` - Profile fetching with filters
- `src/pages/admin/UserManagement.tsx` - User administration UI
- `src/hooks/useAccountActions.ts` - Account lifecycle management

### Data Model
```typescript
interface Profile {
  id: string
  staff_id: string | null          // Human-readable ID
  full_name: string | null
  email: string
  job_title: string | null
  reporting_to: string | null      // Manager reference
  employment_type: 'full_time' | 'part_time' | 'contract' | 'probation' | 'intern'
  hire_date: string | null
  // ... emergency contacts, nationality, blood_group, etc.
}
```

---

## 2. Attendance Tracking ⭐⭐⭐ (3/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Check-in/Check-out | ✅ Complete | `useAttendance.ts` | RPC functions for attendance tracking |
| Status Types | ✅ Complete | attendance table | present, absent, late, on_leave, sick, holiday |
| Attendance Corrections | ✅ Complete | `ShiftScheduling.tsx` | HR can correct attendance records |
| Date-based Queries | ✅ Complete | `useAttendance.ts` | Filter by date ranges |
| **Biometric Integration** | ❌ Missing | - | No fingerprint/face recognition |
| **GPS Location Tracking** | ❌ Missing | - | No geofencing for check-ins |
| **Overtime Calculation** | ⚠️ Partial | shifts table | Basic hours tracking only |

### Key Files
- `src/hooks/useAttendance.ts` - Attendance hooks with check-in/out mutations
- `src/pages/hr/ShiftScheduling.tsx` - Attendance correction UI

### Database Schema
```typescript
// attendance table
{
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'sick' | 'holiday'
  property_id: string | null
  notes: string | null
}
```

---

## 3. Leave Management ⭐⭐⭐⭐⭐ (5/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Leave Request Submission | ✅ Complete | `useSubmitLeaveRequest` | With overlap validation |
| Leave Types | ✅ Complete | LeaveRequest type | annual, sick, unpaid, maternity, paternity, personal, other |
| Approval Workflow | ✅ Complete | `useApproveLeaveRequest` | Multi-level approval with notifications |
| Smart Routing | ✅ Complete | `useTeamLeaveRequests` | Role-based request visibility |
| Cancellation | ✅ Complete | `useCancelLeaveRequest` | Self-service cancellation |
| HR Delete | ✅ Complete | `useDeleteLeaveRequest` | Soft delete for HR staff |
| Overlap Validation | ✅ Complete | W-001 validation | Prevents conflicting leave requests |
| Workflow Integration | ✅ Complete | requests table | Links to unified approval system |

### Key Files
- `src/hooks/useLeaveRequests.ts` - Comprehensive leave management (522 lines)
- `src/pages/hr/MyLeaveRequests.tsx` - Employee self-service UI

### Leave Types Supported
```typescript
type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity' | 'personal' | 'other'
```

---

## 4. Performance Reviews ⭐⭐⭐ (3/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Performance Records | ✅ Complete | `usePerformance.ts` | Basic CRUD for reviews |
| Review Submission | ✅ Complete | `useSubmitPerformanceReview` | Manager-initiated reviews |
| **360-Degree Feedback** | ❌ Missing | - | No peer/self/external reviews |
| **Goal Alignment** | ⚠️ Partial | `useGoals.ts` | Goals exist but not linked to reviews |
| **Review Templates** | ❌ Missing | - | No standardized review forms |
| **Competency Tracking** | ❌ Missing | - | No skill/competency matrices |

### Key Files
- `src/hooks/usePerformance.ts` - Basic performance review hooks
- `src/pages/hr/PerformanceReviewsAdmin.tsx` - Admin interface
- `src/pages/hr/MyPerformance.tsx` - Employee view

---

## 5. Training & LMS ⭐⭐⭐⭐⭐ (5/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Training Modules | ✅ Complete | `useTraining.ts` | Rich content blocks (text, video, quiz) |
| Content Blocks | ✅ Complete | `training_content_blocks` | Multiple content types |
| Quizzes & Assessments | ✅ Complete | `useCreateQuizAttempt` | MCQ, true/false, fill_blank |
| Quiz Attempts | ✅ Complete | `training_quiz_attempts` | Multiple attempts tracking |
| Pass/Fail Logic | ✅ Complete | 80% threshold | Configurable passing scores |
| Progress Tracking | ✅ Complete | `useTrainingProgress` | Percentage-based progress |
| Certificates | ✅ Complete | Auto-generated | PDF certificates on completion |
| Training Assignments | ✅ Complete | `useTrainingAssignments` | Assign to users/departments/properties |
| Learning Paths | ✅ Complete | `TrainingPath` interface | Structured learning journeys |
| Due Dates | ✅ Complete | `learning_assignments` | Deadline tracking |
| Overdue Detection | ✅ Complete | `useTrainingStats` | Automatic overdue flagging |
| Content Types | ✅ Complete | 11 types | text, image, video, audio, interactive, etc. |

### Key Files
- `src/hooks/useTraining.ts` - Comprehensive training management (744 lines)
- `src/hooks/useLearningProgress.ts` - Progress tracking

### Training Content Types
```typescript
type ContentBlockType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'interactive' 
  | 'document_link' 
  | 'quiz' 
  | 'sop_reference' 
  | 'inline_quiz' 
  | 'ai_generated'
```

---

## 6. Recruitment ⭐⭐⭐ (3/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Job Postings | ✅ Complete | `JobPostings.tsx` | Create, edit, publish, close positions |
| Job Status Workflow | ✅ Complete | JobPosting type | draft → open → closed → filled → cancelled |
| Seniority Levels | ✅ Complete | SeniorityLevel type | junior, mid, senior, manager, director, executive |
| Employment Types | ✅ Complete | EmploymentType type | full_time, part_time, contract, temporary |
| Salary Ranges | ✅ Complete | JobPosting model | Min/max salary display |
| Candidate Applications | ✅ Complete | `JobApplication` type | Full application tracking |
| Application Status | ✅ Complete | JobApplicationStatus | received → review → shortlisted → interview → offer → hired/rejected |
| CV Upload | ✅ Complete | Supabase Storage | Secure document storage |
| Employee Referrals | ✅ Complete | `EmployeeReferrals.tsx` | Full referral program |
| Referral Tracking | ✅ Complete | `referred_by` field | Tracks referrer and status |
| Candidate Profile Dialog | ✅ Complete | `CandidateProfileDialog.tsx` | Detailed candidate view |
| Interview Scheduling | ✅ Complete | `CandidateProfileDialog.tsx` | Date/time picker for interviews |
| **Applicant Tracking** | ⚠️ Partial | - | Basic status only, no pipeline stages |
| **Career Portal** | ❌ Missing | - | No public-facing careers page |
| **Interview Feedback** | ❌ Missing | - | No structured interview evaluation |
| **Offer Letter Generation** | ❌ Missing | - | No automated offer documents |

### Key Files
- `src/pages/jobs/JobPostings.tsx` - Job listing management
- `src/pages/jobs/CreateJobPosting.tsx` - Job creation
- `src/pages/hr/EmployeeReferrals.tsx` - Referral program (574 lines)
- `src/components/hr/CandidateProfileDialog.tsx` - Candidate management (440 lines)

---

## 7. Onboarding ⭐⭐⭐⭐ (4/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Onboarding Templates | ✅ Complete | `useOnboardingTemplates` | Role-based templates |
| Task Definitions | ✅ Complete | `OnboardingTaskDefinition` | Configurable task lists |
| Task Assignment | ✅ Complete | `assignee_role` | self, manager, it, hr |
| Due Date Offsets | ✅ Complete | `due_day_offset` | Relative to start date |
| Progress Tracking | ✅ Complete | `progress_percent` | Overall completion percentage |
| Task Status | ✅ Complete | `OnboardingTask` | pending, in_progress, completed |
| Link Integration | ✅ Complete | `link_type`, `link_id` | Training, document, or URL links |
| **Automated Workflows** | ⚠️ Partial | - | Basic task sequencing only |
| **Document Collection** | ❌ Missing | - | No e-signature integration |
| **Equipment Provisioning** | ❌ Missing | - | No IT asset tracking |

### Key Files
- `src/hooks/useOnboarding.ts` - Onboarding hooks (178 lines)

### Template Structure
```typescript
interface OnboardingTemplate {
  title: string
  role: AppRole | null
  job_title: string | null
  department_id: string | null
  tasks: OnboardingTaskDefinition[]
  required_training_ids: string[]
}
```

---

## 8. Organization Hierarchy ⭐⭐⭐⭐⭐ (5/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Reporting Lines | ✅ Complete | `reporting_to` field | Manager-employee relationships |
| Org Chart Visualization | ✅ Complete | `OrgChartTree` component | Interactive tree view |
| Department View | ✅ Complete | `OrgByDepartment` component | Department-based grouping |
| Hierarchy View | ✅ Complete | `useOrgHierarchy` | Full reporting chain display |
| Job Title Hierarchy | ✅ Complete | `JOB_TITLE_HIERARCHY` | 110+ job titles with ranks |
| Role Classification | ✅ Complete | classifyEmployeeLevel | head, supervisor, staff |
| Direct Reports | ✅ Complete | `useDirectReports` | Manager's team view |
| Reporting Chain | ✅ Complete | `useReportingChain` | Path to top management |
| Potential Managers | ✅ Complete | `usePotentialManagers` | Dropdown for manager assignment |
| Update Reporting | ✅ Complete | `useUpdateReportingLine` | With circular reference protection |
| Bulk Updates | ✅ Complete | `useBulkUpdateReportingLines` | Mass reassignment |
| Property Filtering | ✅ Complete | property-based views | Multi-property org charts |
| **Succession Planning** | ❌ Missing | - | No succession matrix |
| **Org Modeling** | ❌ Missing | - | No "what-if" scenarios |

### Key Files
- `src/hooks/useOrganization.ts` - Organization hooks (250 lines)
- `src/hooks/useOrgHierarchy.ts` - Enhanced hierarchy with job title ranking (487 lines)
- `src/pages/admin/OrganizationalControlCenter.tsx` - Full org management (696 lines)

### Job Title Hierarchy (Sample)
```typescript
const JOB_TITLE_HIERARCHY = {
  'founder': 1,
  'ceo': 2,
  'cfo': 4,
  'general manager': 31,
  'property manager': 41,
  'department head': 51,
  'manager': 62,
  'supervisor': 72,
  'staff': 101,
  // ... 110+ titles
}
```

---

## 9. Shift Scheduling ⭐⭐⭐⭐ (4/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Shift Creation | ✅ Complete | `useCreateShift` | Full shift scheduling |
| Shift Types | ✅ Complete | Shift interface | Custom shift type labels |
| Date/Time Management | ✅ Complete | ISO timestamps | Full datetime support |
| Location Tracking | ✅ Complete | `location` field | Shift location notes |
| Break Duration | ✅ Complete | `break_duration_minutes` | Paid break tracking |
| Shift Status | ✅ Complete | Shift['status'] | scheduled, in_progress, completed, cancelled, no_show |
| Department Filtering | ✅ Complete | `department_id` filter | Department-specific schedules |
| Property Filtering | ✅ Complete | `property_id` filter | Multi-property support |
| Shift Stats | ✅ Complete | `useShiftStats` | Hours calculation by status |
| User Shifts | ✅ Complete | `useUserShifts` | Employee schedule view |
| Next Shift | ✅ Complete | `useNextShift` | Upcoming shift display |
| Shift Editing | ✅ Complete | `useUpdateShift` | Modify existing shifts |
| Shift Deletion | ✅ Complete | `useDeleteShift` | Remove shifts |
| **Shift Swapping** | ❌ Missing | - | No employee shift trade |
| **Shift Bidding** | ❌ Missing | - | No open shift marketplace |
| **Labor Forecasting** | ❌ Missing | - | No predictive scheduling |
| **Compliance Rules** | ❌ Missing | - | No break/labor law enforcement |

### Key Files
- `src/hooks/useShifts.ts` - Shift management (190 lines)
- `src/hooks/useUserShifts.ts` - User-specific shifts (121 lines)
- `src/pages/hr/ShiftScheduling.tsx` - Scheduling UI (565 lines)

### Shift Status Types
```typescript
type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
```

---

## 10. Vacation Balance ⭐⭐⭐⭐ (4/5)

### Capabilities
| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| Balance Tracking | ✅ Complete | `useVacationBalance` | RPC function for calculations |
| Year-based Balance | ✅ Complete | `year_filter` parameter | Annual entitlement |
| Default Entitlement | ✅ Complete | 25 days default | Configurable per user |
| Used Days | ✅ Complete | `used_days` field | Approved leave counting |
| Pending Days | ✅ Complete | `pending_days` field | Awaiting approval |
| Remaining Days | ✅ Complete | `remaining_days` field | Available balance |
| Balance Initialization | ✅ Complete | `useInitializeVacationBalance` | Set up new employee |
| Carry Over | ✅ Complete | `carried_over` field | Year-to-year transfer |
| **Accrual Rules** | ⚠️ Partial | - | Fixed annual only |
| **Negative Balance** | ❌ Missing | - | No overdraw policy |
| **Prorated Calculation** | ❌ Missing | - | No hire-date based proration |

### Key Files
- `src/hooks/useVacationBalance.ts` - Vacation tracking (108 lines)

### Balance Calculation
```typescript
interface VacationBalance {
  totalDays: number      // Annual entitlement (default: 25)
  usedDays: number       // Approved leave days
  pendingDays: number    // Awaiting approval
  remainingDays: number  // Available to use
}
```

---

## Additional HR Features

### 11. Goals Management ⭐⭐⭐⭐ (4/5)
- **Files:** `src/hooks/useGoals.ts`, `src/pages/hr/GoalsAdmin.tsx`
- **Features:** Individual goals, training-linked goals, target dates
- **Missing:** OKR alignment, goal cascading, progress check-ins

### 12. Payslip Management ⭐⭐⭐ (3/5)
- **Files:** `src/hooks/usePayslips.ts`, `src/pages/hr/PayslipsAdmin.tsx`
- **Features:** Payslip storage, historical access, month/year filtering
- **Missing:** Payroll integration, tax calculations, direct deposit

### 13. Promotion & Transfer ⭐⭐⭐⭐ (4/5)
- **Files:** `src/pages/hr/PromotionWorkflow.tsx`, `src/pages/hr/TransferWorkflow.tsx`
- **Features:** Future-dated promotions, property transfers, approval workflows
- **Data:** `EmployeePromotion`, `EmployeeTransfer` interfaces
- **Integration:** Organizational Control Center for pending changes

### 14. Expense Claims ⭐⭐⭐⭐ (4/5)
- **Files:** `src/hooks/useExpenseClaims.ts`, `src/pages/hr/MyExpenseClaims.tsx`
- **Features:** Multi-category claims, receipt uploads, approval workflows
- **Categories:** travel, meals, accommodation, transport, supplies, training, medical, other

### 15. Employee of the Month ⭐⭐⭐ (3/5)
- **Files:** `src/pages/hr/EmployeeOfMonthManagement.tsx`
- **Features:** Recognition program, photo uploads, announcement integration

---

## HR Control Centers

### HR Control Center
**File:** `src/pages/hr/HRControlCenter.tsx`
- Performance Management
- Goals Management
- Payslips Management
- Expenses
- Scheduling
- Approvals
- Directory
- Operations
- Employee of the Month

### Organizational Control Center
**File:** `src/pages/admin/OrganizationalControlCenter.tsx`
- Org Chart (By Department / By Hierarchy)
- Employee Assignments
- Pending Changes (Promotions/Transfers)
- Change History

---

## Missing Features for Complete Workforce Control

### High Priority
| Feature | Impact | Complexity |
|---------|--------|------------|
| Payroll Processing | Critical | High |
| Benefits Administration | High | Medium |
| Time & Labor Analytics | High | Medium |
| Compliance Reporting | High | High |
| Shift Swapping/Marketplace | Medium | Medium |

### Medium Priority
| Feature | Impact | Complexity |
|---------|--------|------------|
| 360-Degree Performance Reviews | Medium | Medium |
| Competency Matrix | Medium | Medium |
| Career Pathing | Medium | High |
| Succession Planning | Medium | High |
| Biometric Attendance | Medium | High |

### Lower Priority
| Feature | Impact | Complexity |
|---------|--------|------------|
| Public Career Portal | Low | Medium |
| Interview Evaluation Forms | Low | Low |
| Offer Letter Generation | Low | Medium |
| Org Modeling (What-if) | Low | High |
| E-Signature Integration | Low | Medium |

---

## Technical Architecture

### Database Tables (HR-related)
```
Core HR:
- profiles (employees)
- user_roles, user_properties, user_departments
- job_postings, job_applications

Time & Attendance:
- attendance, shifts, user_shifts
- vacation_balance, leave_requests

Performance & Development:
- performance_reviews, goals
- training_modules, training_progress, training_quiz_attempts
- certificates

Organization:
- departments, properties
- employee_promotions, employee_transfers

Onboarding:
- onboarding_templates, onboarding_process, onboarding_tasks
```

### Hooks Architecture
```
Data Fetching: useQuery (TanStack Query)
State Management: React Context (Auth, Property)
Backend: Supabase (PostgreSQL + Realtime)
File Storage: Supabase Storage
```

### Role-Based Access Control
```typescript
type AppRole = 
  | 'regional_admin'    // Full access
  | 'regional_hr'       // HR across properties
  | 'property_manager'  // Property-level access
  | 'property_hr'       // Property HR functions
  | 'department_head'   // Department management
  | 'staff'             // Employee self-service
```

---

## Recommendations

### Immediate Actions (0-3 months)
1. **Enhance Attendance Tracking** - Add GPS location for mobile check-ins
2. **Improve Performance Reviews** - Add 360-degree feedback capability
3. **Shift Swapping** - Implement employee-to-employee shift trade

### Short-term (3-6 months)
1. **Payroll Integration** - Connect to external payroll provider APIs
2. **Time Analytics** - Build labor cost and productivity dashboards
3. **Career Portal** - Public-facing job application page

### Long-term (6-12 months)
1. **AI-Powered Scheduling** - Optimize shifts based on demand forecasting
2. **Learning Recommendations** - AI-suggested training based on performance gaps
3. **Predictive Analytics** - Attrition risk, performance predictions

---

## Conclusion

The PHG Connect HR module provides a **solid foundation** for workforce management in a multi-property hotel environment. The system excels in:
- **Employee data management** with flexible property/department assignments
- **Training & LMS** with rich content capabilities
- **Organization hierarchy** with sophisticated reporting structures
- **Leave management** with robust approval workflows

The main gaps are in **payroll processing**, **advanced benefits administration**, and **predictive workforce analytics**. These would require either third-party integrations or significant custom development.

**Overall Assessment:** Production-ready for core HR operations with room for enhancement in workforce optimization features.

---

*Report generated by PHG Connect Code Analysis Agent*
