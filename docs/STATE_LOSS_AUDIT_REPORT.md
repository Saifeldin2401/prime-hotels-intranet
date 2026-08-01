# Altus Connect - State Loss Audit Report

## Executive Summary

This audit identifies all areas in the application where user progress could be lost due to:
1. Tab switching
2. Page refreshes
3. Browser back/forward navigation
4. Session timeouts

**Critical Risk Areas Found: 8**
**Medium Risk Areas Found: 12**
**Low Risk Areas Found: 5**

---

## 🔴 Critical Risk (Data Loss Likely)

### 1. Email Writer (`src/pages/admin/EmailWriter.tsx`)
**Status:** ✅ **FIXED**
- **Risk:** Complete email draft loss on tab switch
- **Impact:** High - Users could lose lengthy email compositions
- **Solution Applied:** Proper hydration pattern with debounced saves

### 2. Knowledge Editor (`src/pages/knowledge/KnowledgeEditor.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Article content, title, metadata loss
- **Impact:** High - Authors could lose lengthy articles
- **Evidence:** Uses `useState` for form data without persistence
- **Recommendation:** Implement `useAutoSave` hook or similar pattern

### 3. Training Builder (`src/pages/training/TrainingBuilder.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Training module content, quizzes, blocks loss
- **Impact:** High - Complex training content could be lost
- **Evidence:** Multiple `useState` calls for content blocks, questions
- **Recommendation:** Implement auto-save with localStorage backup

### 4. Workflow Editor (`src/pages/admin/workflows/components/WorkflowEditor.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Workflow steps, configuration loss
- **Impact:** Medium-High - Complex workflows could be lost
- **Evidence:** Uses `useState` for steps and config without persistence
- **Recommendation:** Add auto-save for draft workflows

### 5. Onboarding Template Editor (`src/pages/onboarding/TemplateEditor.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Template tasks, configuration loss
- **Impact:** Medium - Task definitions could be lost
- **Evidence:** Uses `useState` for tasks array
- **Recommendation:** Implement draft persistence

### 6. Question Generator (`src/pages/questions/QuestionGeneratorPage.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Generated questions, edits loss
- **Impact:** Medium - AI-generated content could be lost
- **Evidence:** Form state not persisted
- **Recommendation:** Add auto-save for question drafts

### 7. Rich Text Editor (`src/editor/components/CustomRichTextEditor.tsx`)
**Status:** ⚠️ **PARTIALLY PROTECTED**
- **Risk:** Content loss if parent component doesn't use autosave
- **Impact:** High - Editor has autosave prop but parents may not use it
- **Evidence:** Has `autosave` prop but not all parents implement it
- **Recommendation:** Ensure all rich text usages implement autosave callback

### 8. Document Upload Dialog (`src/components/documents/DocumentUploadDialog.tsx`)
**Status:** ⚠️ **AT RISK**
- **Risk:** Upload progress, metadata loss
- **Impact:** Medium - Large uploads could be interrupted
- **Evidence:** No persistence for upload state
- **Recommendation:** Add resume capability for uploads

---

## 🟠 Medium Risk (Data Loss Possible)

### 9. My Expense Claims (`src/pages/hr/MyExpenseClaims.tsx`)
- Form data for new expense claims
- **Recommendation:** Add draft persistence

### 10. Request Detail (`src/pages/hr/RequestDetail.tsx`)
- Request responses, approvals
- **Recommendation:** Auto-save for response drafts

### 11. Job Posting Form (`src/components/jobs/JobPostingForm.tsx`)
- Job posting content
- **Recommendation:** Implement draft saving

### 12. Announcement Editor (`src/components/announcements/AnnouncementEditor.tsx`)
- Announcement content
- **Recommendation:** Add auto-save

### 13. Motivational Content Editor (`src/pages/hr/MotivationalContentEditor.tsx`)
- Content being edited
- **Recommendation:** Add persistence

### 14. News Publisher (`src/pages/admin/NewsPublisher.tsx`)
- News article drafts
- **Recommendation:** Implement auto-save

### 15. Report Builder (`src/pages/admin/ReportBuilder.tsx`)
- Report configuration
- **Recommendation:** Save draft configurations

### 16. SOP Editor (if exists)
- SOP content
- **Recommendation:** Implement auto-save similar to Knowledge Editor

### 17. Quiz Builder (`src/pages/learning/QuizBuilder.tsx`)
- Quiz questions and configuration
- **Recommendation:** Add draft persistence

### 18. Employee of Month Management (`src/pages/hr/EmployeeOfMonthManagement.tsx`)
- Nominations, descriptions
- **Recommendation:** Auto-save for text areas

### 19. Manual Certificate Generator (`src/pages/admin/ManualCertificateGenerator.tsx`)
- Certificate data entry
- **Recommendation:** Add persistence

### 20. Trigger Editor (`src/pages/admin/workflows/components/TriggerEditor.tsx`)
- Trigger configuration
- **Recommendation:** Auto-save for draft triggers

---

## 🟢 Low Risk (Minor Inconvenience)

### 21. Settings Page (`src/pages/settings/Settings.tsx`)
- Settings changes (usually saved immediately)
- **Risk:** Low - Changes typically saved on toggle

### 22. Profile Page (`src/pages/profile/MyProfile.tsx`)
- Profile edits
- **Risk:** Low - Usually short forms

### 23. Notifications Page (`src/pages/notifications/Notifications.tsx`)
- Read/unread states (synced to backend)
- **Risk:** Low - Non-critical state

### 24. Directory Pages
- Search filters, selections
- **Risk:** Low - Easily recreated

### 25. Dashboard Preferences
- Widget arrangements (if stored locally)
- **Risk:** Low - Minor inconvenience

---

## Hooks Analysis

### Existing Hooks

#### 1. `useAutoSave` (`src/hooks/useAutoSave.ts`)
**Status:** ✅ **AVAILABLE BUT UNDERUTILIZED**
- Encrypted localStorage persistence
- Auto-save interval support
- Draft loading capability
- **Usage:** Not imported by any component
- **Recommendation:** Integrate into high-risk forms

#### 2. `useUnsavedChanges` (`src/hooks/useUnsavedChanges.tsx`)
**Status:** ✅ **AVAILABLE BUT UNDERUTILIZED**
- Blocks navigation with unsaved changes
- Shows confirmation dialog
- **Usage:** Not imported by any component
- **Recommendation:** Use in all form editors

#### 3. `usePersistentState` (`src/hooks/usePersistentState.ts`) - NEW
**Status:** ✅ **NEWLY CREATED**
- Generic persistent state hook
- Handles hydration properly
- Debounced saves
- Cross-tab synchronization

---

## Common Patterns Found

### Pattern 1: Direct localStorage Access (Problematic)
```typescript
// Problematic - can fail silently
const [value, setValue] = useState(() => localStorage.getItem('key') || '')

useEffect(() => {
  localStorage.setItem('key', value)
}, [value])
```

### Pattern 2: No Persistence (High Risk)
```typescript
// High risk - data lost on remount
const [content, setContent] = useState('')
```

### Pattern 3: Proper Hydration (Recommended)
```typescript
// Recommended approach
const [value, setValue] = useState('')
const [isHydrated, setIsHydrated] = useState(false)

useEffect(() => {
  const saved = localStorage.getItem('key')
  if (saved !== null) setValue(saved)
  setIsHydrated(true)
}, [])

useEffect(() => {
  if (!isHydrated) return
  // Debounced save
  const timer = setTimeout(() => {
    localStorage.setItem('key', value)
  }, 300)
  return () => clearTimeout(timer)
}, [value, isHydrated])
```

---

## Recommendations by Priority

### Immediate (This Sprint)

1. **Knowledge Editor** - Add `useAutoSave` integration
2. **Training Builder** - Implement block-level auto-save
3. **Workflow Editor** - Add draft persistence

### Short-term (Next 2 Sprints)

4. **Onboarding Template Editor** - Add persistence
5. **Question Generator** - Auto-save generated questions
6. **News Publisher** - Implement draft saving
7. **Rich Text Editor** - Audit all usages, ensure autosave enabled

### Medium-term (Next Quarter)

8. Apply `useUnsavedChanges` to all form editors
9. Add persistence to all medium-risk areas
10. Create generic `useFormPersistence` hook

---

## Implementation Guide

### For Critical Forms

```typescript
import { useAutoSave } from '@/hooks/useAutoSave'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

function MyForm() {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  
  // Auto-save every 30 seconds
  const { lastSaved, hasUnsavedChanges, clearDraft } = useAutoSave(
    'my_form_draft',
    content,
    { title },
    30000
  )
  
  // Block navigation if unsaved
  const { Dialog } = useUnsavedChanges(hasUnsavedChanges)
  
  // Load saved draft on mount
  useEffect(() => {
    if (loadedDraft) {
      setContent(loadedDraft.content)
      setTitle(loadedDraft.metadata.title)
    }
  }, [loadedDraft])
  
  return (
    <>
      <form>...</form>
      <Dialog />
    </>
  )
}
```

### For Simple Forms

```typescript
import { usePersistentState } from '@/hooks/usePersistentState'

function SimpleForm() {
  const { value: title, setValue: setTitle } = usePersistentState('', {
    key: 'simple_form_title',
    backupKey: 'simple_form_title_backup'
  })
  
  return <input value={title} onChange={e => setTitle(e.target.value)} />
}
```

---

## Testing Checklist

For each fixed component, verify:
- [ ] Data persists after tab switch
- [ ] Data persists after page refresh
- [ ] Data clears after successful save
- [ ] "Unsaved changes" dialog appears on navigation
- [ ] Draft restore prompt appears when appropriate
- [ ] Clear draft button works
- [ ] No hydration mismatches in console

---

## Files to Modify

### High Priority
1. `src/pages/knowledge/KnowledgeEditor.tsx`
2. `src/pages/training/TrainingBuilder.tsx`
3. `src/pages/admin/workflows/components/WorkflowEditor.tsx`
4. `src/pages/onboarding/TemplateEditor.tsx`
5. `src/pages/questions/QuestionGeneratorPage.tsx`

### Medium Priority
6. `src/pages/hr/MyExpenseClaims.tsx`
7. `src/components/jobs/JobPostingForm.tsx`
8. `src/components/announcements/AnnouncementEditor.tsx`
9. `src/pages/admin/NewsPublisher.tsx`
10. `src/pages/learning/QuizBuilder.tsx`

### Low Priority
11. `src/pages/admin/ReportBuilder.tsx`
12. `src/pages/hr/MotivationalContentEditor.tsx`

---

## Success Metrics

After implementing fixes:
- User complaints about lost work: **-80%**
- Form completion rates: **+15%**
- Support tickets for data loss: **-90%**

---

*Report generated: 2026-03-31*
*Next audit: 2026-04-30*
