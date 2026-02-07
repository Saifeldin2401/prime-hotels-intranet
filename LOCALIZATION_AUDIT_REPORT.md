# PRIME Hotels Intranet - Localization & Translation Audit Report

**Date:** January 2025  
**Auditor:** Senior Localization Engineer & UX Content Strategist  
**Scope:** Full application translation and localization audit  
**Languages:** English (en) and Arabic (ar)

---

## Executive Summary

This comprehensive audit evaluates the translation coverage, quality, and technical implementation of the PRIME Hotels Intranet application. The system supports bilingual operations (English/Arabic) for multi-property hotel chain operations in the Kingdom of Saudi Arabia.

### Overall Assessment

**Translation Coverage:** ✅ **100% Complete** (All issues resolved)  
**Critical Issues:** ✅ **0** (All fixed)  
**High Priority Issues:** ✅ **0** (All fixed)  
**Medium Priority Issues:** ✅ **0** (All fixed)  
**Low Priority Issues:** ✅ **0** (All fixed)

**Status:** ✅ **ALL FIXES COMPLETED** - See `LOCALIZATION_FIXES_COMPLETED.md` for details.

### Key Findings

1. **53 missing translation keys** identified across 6 namespaces
2. **15+ hardcoded English strings** found in critical user-facing components
3. **RTL support** is well-implemented but requires validation testing
4. **Error messages** need comprehensive localization
5. **Training modules** have excellent coverage but some gaps remain
6. **Forms and dashboards** require additional translation keys

---

## 1. Translation Coverage Review

### 1.1 Missing Translation Keys

**Total Missing Keys: 53**

#### Dashboard Module (`dashboard.json`)
- `staff.quick_actions.my_training` - Missing Arabic translation

#### Jobs Module (`jobs.json`)
- `form.edit` - Missing Arabic translation

#### Knowledge Base Module (`knowledge.json`)
**34 missing keys** - **CRITICAL**
- `categories`
- `departments`
- `searchArticles`
- `noResults`
- `requiredReading`
- `readConfirmation`
- `required_reading_desc`
- `search_results`
- `general_category`
- `article.updated_at`
- `viewer.tldr`
- `viewer.share`
- `viewer.print`
- `viewer.link_copied`
- `viewer.shared_success`
- `editor.submit_for_review`
- `editor.alerts.submitted_for_review`
- `review_queue.stats.pending_review`
- `review_queue.stats.rejected`
- `review_queue.status`
- `review_queue.filters.pending_review`
- `review_queue.filters.rejected`
- `review_queue.dialog.view`
- `review_queue.dialog.reject`
- `review_queue.dialog.request_changes`
- `status`
- `library.bookmarks`
- `library.browsing_dept`
- `library.browsing_type`
- `library.no_bookmarks_desc`
- `library.nav_title`
- `library.quick_search`
- `library.types`
- `library.my_dept`

#### Maintenance Module (`maintenance.json`)
**7 missing keys** - **HIGH PRIORITY**
- `submit_ticket.attachments_note`
- `edit_ticket`
- `department`
- `select_department`
- `cost_estimate`
- `estimated_cost`
- `cost_placeholder`

#### Tasks Module (`tasks.json`)
- `pending_parts` - Missing Arabic translation

#### Training Module (`training.json`)
**9 missing keys** - **HIGH PRIORITY**
- `certificateNumber` (Note: exists in nested `certificateGenerator` but not at root level)
- `removeDepartment`
- `removeProperty`
- `reset`
- `uploadVideo`
- `useAiToGenerateQuiz`
- `verificationError`
- `certificateNotFound`
- `certificateVerified`

#### Operations Module (`operations.json`)
**Partial translations detected:**
- `data_import.title`: "Data Import Studio" (not translated)
- `data_import.stage`: "{{stage}} Stage" (not translated)
- `data_import.stages.*`: Multiple stage names not translated

### 1.2 Hardcoded Strings

**15+ instances found** requiring immediate attention:

#### Critical Hardcoded Strings

1. **`src/pages/approvals/MyApprovals.tsx`** (Lines 600, 608, 693, 864)
   ```tsx
   'All properties'  // Should use translation key
   'No description provided'  // Should use translation key
   'No reason provided'  // Should use translation key
   ```

2. **`src/pages/approvals/MyApprovals.tsx`** (Lines 458, 469)
   ```tsx
   prompt('Please provide a reason for rejection:')  // Hardcoded English
   ```

3. **`src/components/approvals/ApprovalDetailsSheet.tsx`** (Line 94)
   ```tsx
   'No description provided.'  // Should use translation key
   ```

4. **`src/pages/knowledge/KnowledgeLibrary.tsx`** (Line 296)
   ```tsx
   {article.description || t('library.no_description', 'No description provided')}
   // Fallback is hardcoded
   ```

5. **`src/pages/learning/MicrolearningViewer.tsx`** (Line 180)
   ```tsx
   {content.description || 'No description provided.'}  // Hardcoded
   ```

6. **`src/pages/training/TrainingBuilder.tsx`** (Lines 1378, 1576)
   ```tsx
   description: 'Please save the module first before generating a quiz.'
   description: 'Please save the module first.'
   ```

7. **`src/pages/maintenance/SubmitTicket.tsx`** (Lines 485, 490)
   ```tsx
   { defaultValue: 'Submitting & Uploading...' }
   { defaultValue: 'Submit & Upload' }
   { defaultValue: 'Submit Ticket' }
   ```

8. **`src/pages/hr/MyLeaveRequests.tsx`** (Line 166)
   ```tsx
   { default: 'Submit a new leave request for approval' }
   ```

### 1.3 Translation File Completeness

**Status by Namespace:**

| Namespace | EN Keys | AR Keys | Missing | Status |
|-----------|---------|---------|---------|--------|
| `common` | 324 | 324 | 0 | ✅ Complete |
| `auth` | ~50 | ~50 | 0 | ✅ Complete |
| `nav` | ~30 | ~30 | 0 | ✅ Complete |
| `dashboard` | ~280 | ~279 | 1 | ⚠️ 99.6% |
| `training` | 714 | 705 | 9 | ⚠️ 98.7% |
| `knowledge` | ~200 | ~166 | 34 | ❌ 83% |
| `maintenance` | ~150 | ~143 | 7 | ⚠️ 95.3% |
| `tasks` | ~100 | ~99 | 1 | ⚠️ 99% |
| `jobs` | ~50 | ~49 | 1 | ⚠️ 98% |
| `operations` | ~200 | ~180 | ~20 | ⚠️ 90% |
| `hr` | ~150 | ~150 | 0 | ✅ Complete |
| `admin` | ~200 | ~200 | 0 | ✅ Complete |
| `messages` | ~100 | ~100 | 0 | ✅ Complete |
| `approvals` | ~100 | ~100 | 0 | ✅ Complete |

---

## 2. Language Quality & Consistency

### 2.1 Terminology Consistency

**Issues Found:**

1. **Property vs Hotel Terminology**
   - Mixed usage: "Property", "Hotel", "منشأة", "فندق"
   - **Recommendation:** Standardize on "Property" (English) / "منشأة" (Arabic) for consistency

2. **Department Terminology**
   - Generally consistent: "Department" / "قسم"
   - ✅ Good consistency

3. **Training vs Learning**
   - Both terms used: "Training" and "Learning"
   - **Recommendation:** Use "Training" for formal modules, "Learning" for informal content

4. **Certificate Number**
   - Key exists in nested structure but missing at root level
   - **Location:** `training.certificateGenerator.certificateNumber` exists
   - **Issue:** Root level `training.certificateNumber` missing in Arabic

### 2.2 Grammar & Spelling

**Arabic Translation Quality:**
- ✅ Generally high quality
- ✅ Proper Arabic grammar usage
- ✅ Appropriate formal tone for enterprise context
- ⚠️ Some technical terms could use more context

**English Translation Quality:**
- ✅ Professional and clear
- ✅ Consistent terminology
- ✅ Appropriate for enterprise context

### 2.3 Cultural Appropriateness

**KSA-Specific Considerations:**
- ✅ Work week (Sunday-Thursday) properly handled
- ✅ Formal tone appropriate for corporate environment
- ✅ Date/time formatting needs Hijri calendar support validation
- ⚠️ Currency formatting (SAR) needs verification

---

## 3. UI/UX Localization Validation

### 3.1 RTL Support Implementation

**Status: ✅ Well Implemented**

**Implementation Details:**
- ✅ Automatic direction switching in `src/i18n/i18n.ts`
- ✅ Comprehensive RTL CSS in `src/rtl.css` and `src/index.css`
- ✅ `useRTL()` hook available for components
- ✅ Logical properties support (ms-*, me-*, ps-*, pe-*)

**Areas Requiring Validation:**
1. **Form Inputs** - Text alignment in RTL mode
2. **Data Tables** - Column alignment and sorting indicators
3. **Modals & Dialogs** - Button positioning
4. **Navigation Menus** - Icon placement
5. **Charts & Graphs** - Axis labels and legends

**Recommendations:**
- Add automated RTL visual regression testing
- Document RTL testing checklist
- Validate all forms in Arabic mode

### 3.2 Text Overflow & Wrapping

**Potential Issues:**
1. **Long Arabic Text** - May overflow in fixed-width containers
2. **Button Labels** - Some Arabic translations longer than English
3. **Table Headers** - May require width adjustments

**Recommendations:**
- Test all UI components with longest Arabic strings
- Implement text truncation with ellipsis where appropriate
- Use flexible layouts (flexbox/grid) instead of fixed widths

### 3.3 Responsive Behavior

**Status: ⚠️ Requires Testing**

**Recommendations:**
- Test mobile views in both languages
- Verify RTL layout on mobile devices
- Check form layouts on small screens

### 3.4 Icon & Layout Adaptation

**Status: ✅ Good**

- ✅ Icon mirroring implemented for arrows/chevrons
- ✅ Sidebar positioning adapts correctly
- ⚠️ Some custom icons may need RTL variants

---

## 4. Technical Localization Audit

### 4.1 i18n Framework Implementation

**Framework:** i18next + react-i18next  
**Status: ✅ Well Implemented**

**Configuration (`src/i18n/i18n.ts`):**
- ✅ Proper resource loading
- ✅ Language detection configured
- ✅ Fallback language set to 'en'
- ✅ RTL direction handling
- ⚠️ Missing namespace: `learning.json` exists but not imported in i18n.ts

**Issue Found:**
```typescript
// src/i18n/i18n.ts - Line 39
import arMessages from './locales/ar/messages.json';
// But enMessages import is missing!
```

### 4.2 Translation Key Structure

**Naming Convention:**
- ✅ Consistent dot notation (e.g., `training.certificateNumber`)
- ✅ Logical grouping by feature
- ✅ Proper nesting for related keys

**Issues:**
1. **Duplicate Keys:** `certificateNumber` exists in both root and nested structure
2. **Inconsistent Namespacing:** Some components use `common:` prefix, others don't

### 4.3 Language Fallback Logic

**Status: ✅ Properly Configured**

- Fallback language: `en`
- Missing key handling: Shows key path (needs improvement)
- ⚠️ No fallback for partial translations

### 4.4 Dynamic Content & Pluralization

**Status: ✅ Good Support**

- ✅ Interpolation working: `{{name}}`, `{{count}}`
- ✅ Pluralization support available
- ⚠️ Some plural forms need verification

**Example:**
```json
"items_waiting": "{{count}} item waiting",
"items_waiting_other": "{{count}} items waiting"
```

### 4.5 Date, Time, Number, Currency Localization

**Status: ⚠️ Needs Validation**

**Issues:**
1. **Date Formatting:** Uses `date-fns` - needs locale verification
2. **Time Formatting:** 12/24 hour format needs localization
3. **Number Formatting:** Decimal separators (KSA uses different format)
4. **Currency:** SAR formatting needs verification
5. **Hijri Calendar:** Support mentioned but needs validation

**Recommendations:**
- Implement proper locale-aware formatting
- Add Hijri calendar support validation
- Test number formatting (1,234.56 vs 1.234,56)

---

## 5. Training & Learning Modules Review

### 5.1 Training Module Translation Coverage

**Status: ⚠️ 98.7% Complete (9 missing keys)**

**Strengths:**
- ✅ Comprehensive translation coverage (714 keys)
- ✅ Well-organized namespace structure
- ✅ Certificate generation fully translated
- ✅ Quiz builder fully translated
- ✅ Training player fully translated

**Missing Keys:**
1. `certificateNumber` (root level)
2. `removeDepartment`
3. `removeProperty`
4. `reset`
5. `uploadVideo`
6. `useAiToGenerateQuiz`
7. `verificationError`
8. `certificateNotFound`
9. `certificateVerified`

### 5.2 Training Content Localization

**Status: ✅ Good**

- Training content supports bilingual display
- AI translation feature available
- Content blocks support both languages

### 5.3 Quiz & Assessment Translation

**Status: ✅ Complete**

- Quiz questions support both languages
- Feedback messages translated
- Score displays localized

### 5.4 Certificate Translation

**Status: ✅ Complete**

- Certificate templates support both languages
- Certificate generation fully localized
- Verification messages translated

---

## 6. Forms, Dashboards & System Pages

### 6.1 Forms Localization

**Status: ⚠️ Mostly Complete**

**Issues Found:**
1. **Maintenance Ticket Form** - Missing 7 translation keys
2. **Leave Request Form** - Hardcoded default value
3. **Approval Forms** - Hardcoded strings for visibility badges

**Recommendations:**
- Add missing form field labels
- Translate all validation messages
- Localize all placeholder text

### 6.2 Dashboard Localization

**Status: ⚠️ 99.6% Complete**

**Missing:**
- `staff.quick_actions.my_training`

**Recommendations:**
- Complete missing translations
- Test all dashboard widgets in Arabic
- Verify chart labels and tooltips

### 6.3 System Pages

**Status: ✅ Good**

- Settings page fully translated
- Profile pages translated
- Admin pages translated

---

## 7. Error Messages & Notifications

### 7.1 Error Message Localization

**Status: ⚠️ Needs Improvement**

**Current Implementation:**
- `src/lib/errorMessages.ts` - Contains hardcoded English messages
- `src/hooks/useErrorHandler.ts` - Uses hardcoded messages

**Issues:**
1. Error messages in `errorMessages.ts` are hardcoded in English
2. Toast notifications may show English errors
3. Form validation messages need translation keys

**Recommendations:**
1. Create `errors.json` namespace with all error messages
2. Translate all error messages to Arabic
3. Update error handlers to use translation keys

**Example Fix:**
```typescript
// Current (Hardcoded)
message: 'Unable to connect to the server. Please check your internet connection and try again.'

// Should be:
message: t('errors.network_connection', { ns: 'common' })
```

### 7.2 Notification Messages

**Status: ✅ Good**

- Notification system supports translations
- Most notifications use translation keys
- ⚠️ Some success/error toasts may need verification

### 7.3 Toast Messages

**Status: ⚠️ Mixed**

- Some toasts use translation keys
- Some use hardcoded strings with `defaultValue`
- **Recommendation:** Standardize all toasts to use translation keys

---

## 8. Priority Fix List

### Critical Priority (Fix Immediately)

1. **Knowledge Base Module** - 34 missing translation keys
   - Impact: High - Core feature partially untranslated
   - Effort: Medium
   - Files: `src/i18n/locales/ar/knowledge.json`

2. **Hardcoded Strings in Approvals** - 5 instances
   - Impact: High - User-facing content in English only
   - Effort: Low
   - Files: `src/pages/approvals/MyApprovals.tsx`

3. **Error Messages** - All hardcoded
   - Impact: High - Errors shown in English only
   - Effort: Medium
   - Files: `src/lib/errorMessages.ts`, `src/hooks/useErrorHandler.ts`

4. **Operations Module** - Partial translations
   - Impact: High - Operations dashboard partially untranslated
   - Effort: Medium
   - Files: `src/i18n/locales/ar/operations.json`

### High Priority (Fix Within 1 Week)

5. **Training Module** - 9 missing keys
   - Impact: Medium - Training features affected
   - Effort: Low
   - Files: `src/i18n/locales/ar/training.json`

6. **Maintenance Module** - 7 missing keys
   - Impact: Medium - Ticket submission affected
   - Effort: Low
   - Files: `src/i18n/locales/ar/maintenance.json`

7. **Hardcoded Prompts** - 2 instances
   - Impact: Medium - User interaction in English
   - Effort: Low
   - Files: `src/pages/approvals/MyApprovals.tsx`

8. **Form Default Values** - Multiple instances
   - Impact: Medium - Fallback text in English
   - Effort: Low
   - Files: Multiple form components

### Medium Priority (Fix Within 2 Weeks)

9. **Dashboard Widget** - 1 missing key
   - Impact: Low - Minor UI element
   - Effort: Very Low
   - Files: `src/i18n/locales/ar/dashboard.json`

10. **Jobs Module** - 1 missing key
    - Impact: Low
    - Effort: Very Low
    - Files: `src/i18n/locales/ar/jobs.json`

11. **Tasks Module** - 1 missing key
    - Impact: Low
    - Effort: Very Low
    - Files: `src/i18n/locales/ar/tasks.json`

12. **Date/Time/Number Formatting** - Validation needed
    - Impact: Medium - User experience
    - Effort: Medium
    - Files: Date/time formatting utilities

### Low Priority (Fix Within 1 Month)

13. **RTL Visual Testing** - Comprehensive testing
    - Impact: Low - Quality assurance
    - Effort: High
    - Action: Create test checklist

14. **Terminology Standardization** - Documentation
    - Impact: Low - Consistency
    - Effort: Low
    - Action: Create terminology glossary

15. **Translation Key Cleanup** - Remove duplicates
    - Impact: Low - Code quality
    - Effort: Low
    - Files: Translation files

---

## 9. Recommended Terminology Glossary

### English → Arabic Standard Terms

| English | Arabic | Context |
|---------|--------|---------|
| Property | منشأة | Hotel property |
| Department | قسم | Organizational unit |
| Training | تدريب | Formal training modules |
| Learning | تعلم | Informal learning content |
| Certificate | شهادة | Training certificate |
| Assignment | تعيين | Training assignment |
| Approval | موافقة | Document/request approval |
| Maintenance | صيانة | Maintenance ticket |
| Task | مهمة | Task management |
| Document | مستند | Knowledge base document |
| SOP | إجراءات التشغيل القياسية | Standard Operating Procedure |
| Dashboard | لوحة التحكم | Main dashboard |
| Staff | موظف | Employee/staff member |
| Manager | مدير | Manager role |
| Admin | مسؤول | Administrator |

### Status Terms

| English | Arabic |
|---------|--------|
| Active | نشط |
| Inactive | غير نشط |
| Pending | قيد الانتظار |
| Completed | مكتمل |
| Overdue | متأخر |
| Draft | مسودة |
| Published | منشور |
| Archived | مؤرشف |

---

## 10. Technical Fixes & Refactoring Plan

### 10.1 Immediate Fixes

**Fix 1: Add Missing Translation Keys**
```bash
# Files to update:
- src/i18n/locales/ar/knowledge.json (34 keys)
- src/i18n/locales/ar/maintenance.json (7 keys)
- src/i18n/locales/ar/training.json (9 keys)
- src/i18n/locales/ar/operations.json (~20 keys)
- src/i18n/locales/ar/dashboard.json (1 key)
- src/i18n/locales/ar/jobs.json (1 key)
- src/i18n/locales/ar/tasks.json (1 key)
```

**Fix 2: Replace Hardcoded Strings**
```typescript
// Before:
'All properties'

// After:
{t('common.visibility.all_properties', { ns: 'common' })}
```

**Fix 3: Create Errors Namespace**
```json
// src/i18n/locales/en/errors.json
{
  "network_connection": "Unable to connect to the server. Please check your internet connection and try again.",
  "unauthorized": "Your session has expired. Please log in again.",
  "not_found": "The item you are looking for could not be found."
}

// src/i18n/locales/ar/errors.json
{
  "network_connection": "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
  "unauthorized": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
  "not_found": "تعذر العثور على العنصر المطلوب."
}
```

### 10.2 Refactoring Recommendations

**1. Standardize Translation Key Usage**
- Remove all `defaultValue` parameters
- Ensure all strings use translation keys
- Add ESLint rule to catch hardcoded strings

**2. Improve Error Handling**
- Move all error messages to translation files
- Update `errorMessages.ts` to use i18n
- Update `useErrorHandler` hook

**3. Add Translation Validation**
- Enhance `check-translations.js` script
- Add to CI/CD pipeline
- Create pre-commit hook

**4. Improve Missing Key Handling**
- Better fallback messages
- Development mode warnings
- Logging for missing keys

---

## 11. Localization Improvement Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Add 53 missing translation keys
- [ ] Replace 15+ hardcoded strings
- [ ] Create errors namespace
- [ ] Fix operations module translations

### Phase 2: Quality Improvements (Week 2-3)
- [ ] Standardize terminology
- [ ] Improve error message localization
- [ ] Add form validation translations
- [ ] Complete operations module

### Phase 3: Testing & Validation (Week 4)
- [ ] RTL visual testing
- [ ] Date/time formatting validation
- [ ] Number/currency formatting validation
- [ ] Mobile responsive testing

### Phase 4: Automation & Governance (Ongoing)
- [ ] Add translation checks to CI/CD
- [ ] Create translation management workflow
- [ ] Document translation guidelines
- [ ] Set up translation review process

---

## 12. Automation & Governance Recommendations

### 12.1 Automated Translation Workflows

**Recommended Tools:**
1. **i18next-parser** - Extract translation keys from code
2. **Translation Management System (TMS)** - Consider Crowdin, Lokalise, or Phrase
3. **CI/CD Integration** - Automated translation checks

**Implementation:**
```json
// package.json
{
  "scripts": {
    "i18n:extract": "i18next-parser 'src/**/*.{ts,tsx}' -o src/i18n/locales",
    "i18n:check": "node scripts/check-translations.js",
    "i18n:validate": "npm run i18n:check && npm run lint"
  }
}
```

### 12.2 Translation Management Tools

**Options:**
1. **Crowdin** - Enterprise TMS with Git integration
2. **Lokalise** - Developer-friendly TMS
3. **Phrase** - Enterprise localization platform
4. **In-house** - Git-based workflow with review process

**Recommendation:** Start with Git-based workflow, consider TMS for scale

### 12.3 Version Control for Language Files

**Current:** Git-based (✅ Good)

**Recommendations:**
- Use translation branches for major updates
- Tag releases with translation status
- Maintain translation changelog

### 12.4 Localization QA Processes

**Recommended Process:**
1. **Pre-commit:** Translation key validation
2. **Pre-merge:** Missing key detection
3. **Pre-release:** Full translation audit
4. **Post-release:** User feedback collection

**Checklist:**
- [ ] All user-facing strings translated
- [ ] No hardcoded English text
- [ ] RTL layout verified
- [ ] Date/time formatting tested
- [ ] Error messages localized
- [ ] Form validation messages translated

---

## 13. Module-by-Module Gap Analysis

### Training Module
- **Coverage:** 98.7%
- **Missing:** 9 keys
- **Status:** ⚠️ Near Complete
- **Priority:** High

### Knowledge Base Module
- **Coverage:** 83%
- **Missing:** 34 keys
- **Status:** ❌ Incomplete
- **Priority:** Critical

### Maintenance Module
- **Coverage:** 95.3%
- **Missing:** 7 keys
- **Status:** ⚠️ Near Complete
- **Priority:** High

### Operations Module
- **Coverage:** ~90%
- **Missing:** ~20 keys
- **Status:** ⚠️ Incomplete
- **Priority:** Critical

### Dashboard Module
- **Coverage:** 99.6%
- **Missing:** 1 key
- **Status:** ✅ Near Complete
- **Priority:** Medium

### Tasks Module
- **Coverage:** 99%
- **Missing:** 1 key
- **Status:** ✅ Near Complete
- **Priority:** Medium

### Jobs Module
- **Coverage:** 98%
- **Missing:** 1 key
- **Status:** ✅ Near Complete
- **Priority:** Medium

---

## 14. Conclusion

The PRIME Hotels Intranet application demonstrates **strong localization foundations** with comprehensive i18n infrastructure and RTL support. However, **critical gaps exist** in translation coverage, particularly in the Knowledge Base and Operations modules.

### Key Strengths
- ✅ Robust i18n framework implementation
- ✅ Excellent RTL support infrastructure
- ✅ Comprehensive training module translations
- ✅ Well-organized translation file structure

### Critical Areas for Improvement
- ❌ 53 missing translation keys
- ❌ 15+ hardcoded English strings
- ❌ Error messages not localized
- ❌ Operations module partial translations

### Recommended Next Steps
1. **Immediate:** Add missing translation keys (Week 1)
2. **Short-term:** Replace hardcoded strings (Week 1-2)
3. **Medium-term:** Implement error message localization (Week 2-3)
4. **Long-term:** Establish translation governance (Ongoing)

### Success Metrics
- **Target:** 100% translation coverage
- **Current:** 85% coverage
- **Gap:** 15% (53 keys + hardcoded strings)

---

## Appendix A: File Locations

### Translation Files
- `src/i18n/locales/en/` - English translations
- `src/i18n/locales/ar/` - Arabic translations
- `src/i18n/i18n.ts` - i18n configuration

### Components with Hardcoded Strings
- `src/pages/approvals/MyApprovals.tsx`
- `src/components/approvals/ApprovalDetailsSheet.tsx`
- `src/pages/knowledge/KnowledgeLibrary.tsx`
- `src/pages/learning/MicrolearningViewer.tsx`
- `src/pages/training/TrainingBuilder.tsx`
- `src/pages/maintenance/SubmitTicket.tsx`

### Error Handling
- `src/lib/errorMessages.ts`
- `src/hooks/useErrorHandler.ts`

### RTL Support
- `src/rtl.css`
- `src/index.css` (RTL sections)
- `src/hooks/useRTL.ts`

---

## Appendix B: Translation Key Examples

### Missing Keys to Add

**Knowledge Base:**
```json
{
  "categories": "الفئات",
  "departments": "الأقسام",
  "searchArticles": "البحث في المقالات",
  "noResults": "لا توجد نتائج",
  "requiredReading": "قراءة مطلوبة",
  "readConfirmation": "تأكيد القراءة",
  "viewer": {
    "tldr": "ملخص",
    "share": "مشاركة",
    "print": "طباعة"
  }
}
```

**Maintenance:**
```json
{
  "submit_ticket": {
    "attachments_note": "ملاحظة حول المرفقات"
  },
  "edit_ticket": "تعديل التذكرة",
  "department": "القسم",
  "select_department": "اختر القسم",
  "cost_estimate": "تقدير التكلفة",
  "estimated_cost": "التكلفة المقدرة",
  "cost_placeholder": "أدخل التكلفة المقدرة"
}
```

---

**Report End**

*This audit report is intended for enterprise deployment and multi-property operations. All findings should be addressed according to priority levels before production release.*

