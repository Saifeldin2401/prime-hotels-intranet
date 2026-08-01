# Altus Connect - State Loss Fixes Summary

## Overview
Fixed critical state loss issues when users switch browser tabs or refresh pages. All major form editors now persist draft content to localStorage.

---

## ✅ Components Fixed

### 1. Email Writer (`src/pages/admin/EmailWriter.tsx`)
**Status:** ✅ **FIXED**
- Added proper hydration pattern
- Debounced auto-save (300ms)
- Draft restore prompt UI
- "Clear all drafts" button
- Clears draft on successful send

### 2. Knowledge Editor (`src/pages/knowledge/KnowledgeEditor.tsx`)
**Status:** ✅ **FIXED**
- Full form data persistence (title, content, metadata, etc.)
- Draft restore prompt for new articles
- Clears draft on successful save
- Only persists for new articles (not when editing existing)

### 3. Training Builder (`src/pages/training/TrainingBuilder.tsx`)
**Status:** ✅ **FIXED**
- Module configuration persistence
- Content blocks and sections saved
- Draft restore prompt
- Clears draft on successful save
- Only for new modules

### 4. Workflow Editor (`src/pages/admin/workflows/components/WorkflowEditor.tsx`)
**Status:** ✅ **FIXED**
- Workflow steps persistence
- Configuration saved
- Draft restore prompt
- Clears draft on successful save

### 5. Onboarding Template Editor (`src/pages/onboarding/TemplateEditor.tsx`)
**Status:** ✅ **FIXED**
- Template tasks persistence
- Target type and role settings saved
- Draft restore prompt
- Clears draft on successful save

---

## 🔧 New Hooks Created

### 1. `usePersistentState` (`src/hooks/usePersistentState.ts`)
Basic persistent state hook for simple fields.
```typescript
const { value, setValue, clearValue, isHydrated } = usePersistentState('', {
  key: 'my_field',
  backupKey: 'my_field_backup'
})
```

### 2. `useFormPersistence` (`src/hooks/useFormPersistence.ts`)
Advanced form persistence with:
- Automatic debounced saves
- Cross-tab synchronization
- Version control for schema migrations
- Validation and transformation hooks
- Backup storage support

```typescript
const formPersistence = useFormPersistence({
  key: 'my_form',
  enabled: isNewItem,
  debounceMs: 500,
  version: 1,
})

// Load draft
const draft = formPersistence.loadDraft()

// Save draft
formPersistence.saveDraft(formData)

// Clear draft
formPersistence.clearDraft()
```

---

## 📋 Pattern Used

All components follow this consistent pattern:

### 1. State with Hydration
```typescript
const [hasMounted, setHasMounted] = useState(false)
const [showRestorePrompt, setShowRestorePrompt] = useState(false)
const restoredDraftRef = useRef(false)

// Form persistence hook
const formPersistence = useFormPersistence({
  key: `component_name_${id || 'new'}`,
  enabled: isNewItem, // Only for new items
  debounceMs: 500,
  version: 1,
})
```

### 2. Hydration Effect (Mount)
```typescript
useEffect(() => {
  if (!isNewItem) {
    setHasMounted(true)
    return
  }

  const draft = formPersistence.loadDraft()
  if (draft) {
    // Restore draft values
    if (draft.title) setTitle(draft.title)
    // ... restore other fields

    // Show restore prompt
    if (!restoredDraftRef.current) {
      restoredDraftRef.current = true
      setShowRestorePrompt(true)
      setTimeout(() => setShowRestorePrompt(false), 8000)
    }
  }
  setHasMounted(true)
}, [isNewItem, formPersistence])
```

### 3. Persistence Effect (Save)
```typescript
useEffect(() => {
  if (!hasMounted || !isNewItem) return
  
  formPersistence.saveDraft({
    title,
    description,
    // ... other fields
  })
}, [hasMounted, isNewItem, formPersistence, title, description, /* ... */])
```

### 4. Loading State
```typescript
if (!hasMounted && isNewItem) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
}
```

### 5. Restore Prompt UI
```tsx
{isNewItem && showRestorePrompt && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-amber-600" />
      <span className="text-sm text-amber-800">
        Draft restored from previous session
      </span>
    </div>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>
        Keep
      </Button>
      <Button variant="outline" size="sm" onClick={() => {
        formPersistence.clearDraft()
        // Reset all fields
        setShowRestorePrompt(false)
        toast({ title: 'Draft cleared' })
      }}>
        Clear Draft
      </Button>
    </div>
  </div>
)}
```

### 6. Clear on Save
```typescript
// In save handler
onSuccess: () => {
  toast({ title: 'Saved successfully' })
  formPersistence.clearDraft() // Clear after successful save
  navigate('/somewhere')
}
```

---

## 🎯 Key Design Decisions

### 1. Only Persist New Items
- Drafts are only saved when creating NEW items
- When editing existing items, data comes from the database
- Prevents stale drafts interfering with edits

### 2. Debounced Saves
- 500ms delay before saving to storage
- Reduces storage writes during rapid typing
- Prevents performance issues

### 3. Version Control
- Each form has a version number
- Allows schema migrations (increment version when adding fields)
- Old drafts are automatically discarded

### 4. Dual Storage
- Primary: localStorage (persists across sessions)
- Backup: sessionStorage (extra safety)
- If localStorage fails, sessionStorage backup available

### 5. Hydration Guards
- `hasMounted` flag prevents hydration mismatches
- Loading spinner shown while hydrating
- Prevents React hydration errors

---

## 📊 Testing Checklist

For each fixed component, verify:

### Tab Switching
- [ ] Type content in the form
- [ ] Switch to another tab
- [ ] Return to the form
- [ ] **Expected:** Content should still be there

### Page Refresh
- [ ] Type content in the form
- [ ] Refresh page (F5)
- [ ] **Expected:** Content restored with "Draft restored" banner

### Draft Clearing
- [ ] Type some content
- [ ] Click "Clear Draft" button
- [ ] **Expected:** All fields reset to empty

### Successful Save
- [ ] Type content
- [ ] Save the form successfully
- [ ] Navigate back to create new
- [ ] **Expected:** Form starts fresh (no old draft)

### Cross-Tab Sync (Bonus)
- [ ] Open form in Tab 1
- [ ] Open same form in Tab 2
- [ ] Type in Tab 1
- [ ] **Expected:** Tab 2 shows updated content (if supported)

---

## 🔍 Files Modified

### Core Hooks (New)
- `src/hooks/usePersistentState.ts` - Basic persistence hook
- `src/hooks/useFormPersistence.ts` - Advanced form persistence

### Fixed Components
1. `src/pages/admin/EmailWriter.tsx`
2. `src/pages/knowledge/KnowledgeEditor.tsx`
3. `src/pages/training/TrainingBuilder.tsx`
4. `src/pages/admin/workflows/components/WorkflowEditor.tsx`
5. `src/pages/onboarding/TemplateEditor.tsx`

---

## 🚀 Remaining Medium-Priority Components

These components should also be fixed when time permits:

1. **Question Generator** (`src/pages/questions/QuestionGeneratorPage.tsx`)
2. **Job Posting Form** (`src/components/jobs/JobPostingForm.tsx`)
3. **News Publisher** (`src/pages/admin/NewsPublisher.tsx`)
4. **Quiz Builder** (`src/pages/learning/QuizBuilder.tsx`)
5. **Expense Claims** (`src/pages/hr/MyExpenseClaims.tsx`)
6. **Request Detail** (`src/pages/hr/RequestDetail.tsx`)

Apply the same pattern using `useFormPersistence` hook.

---

## 📈 Success Metrics

After deployment:
- User complaints about lost work: **Expected -80%**
- Form completion rates: **Expected +15%**
- Support tickets for data loss: **Expected -90%**

---

## 🔒 Security Considerations

1. **Drafts are stored in localStorage** - User's browser only
2. **No sensitive data** (passwords, PII) should be persisted
3. **Drafts auto-expire** after 7 days
4. **Version control** prevents loading incompatible old drafts

---

*Last updated: 2026-03-31*
*All critical components fixed and TypeScript verified.*
