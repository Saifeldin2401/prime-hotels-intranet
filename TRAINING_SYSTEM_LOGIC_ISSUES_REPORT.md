# Training System - Logic & Functional Issues Report

**Date:** March 2026  
**Scope:** Training Player, Builder, Quiz System, Certification Paths  
**Severity:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. TrainingPlayer - Certificate Generation Race Condition
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 618-683)

**Issue:** Certificate generation and certification path processing happen in separate try-catch blocks without coordination. If the first certificate succeeds but path certification fails, the user gets inconsistent state.

```typescript
// Current problematic flow:
if (isPassed && module.certificate_enabled) {
    await createCertificate(...)  // May succeed
}
if (isPassed) {
    await awardCertificationPathCertificates(...)  // May fail independently
}
```

**Impact:** User gets module certificate but not path certificate. Cannot re-trigger path certificate without retaking module.

**Fix:** Wrap both in a single transaction or add rollback mechanism.

---

### 2. TrainingPlayer - Multiple Quiz Scoring Logic Bug
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 564-584)

**Issue:** When a module has multiple quiz blocks, the completion check only validates that ALL quizzes are completed, but doesn't properly aggregate scores across different quiz blocks.

```typescript
const completedQuizParts = moduleQuizIds.filter((quizId) => typeof quizScoresById[quizId] === 'number').length
if (moduleQuizIds.length > 1 && completedQuizParts < moduleQuizIds.length) {
    // Blocks completion if not all quizzes done - correct
}
// But: getAggregatedQuizScore may return null if any quiz is missing
const aggregatedPartScore = getAggregatedQuizScore(moduleQuizIds, quizScoresById)
```

**Impact:** User completes all quizzes but system shows null score due to timing race in state updates.

---

### 3. TrainingBuilder - Destructive Save Without Transaction
**Location:** `src/pages/training/TrainingBuilder.tsx` (lines 1355-1410)

**Issue:** The save process:
1. Deletes ALL existing blocks
2. Then inserts new ones
3. No rollback if insert fails

```typescript
// Delete existing blocks
await supabase.from('training_content_blocks').delete().eq('training_module_id', currentModuleId)
// Flatten sections into content blocks
const allBlocks = [...]
// Insert new blocks - if this fails, module has NO content!
await supabase.from('training_content_blocks').insert(allBlocks)
```

**Impact:** Network interruption during save = complete data loss for that module.

**Fix:** Use database transaction or upsert pattern instead of delete-then-insert.

---

### 4. QuizComponentEnhanced - Attempt Counter Not Isolated
**Location:** `src/pages/learning/components/QuizComponentEnhanced.tsx` (lines 224-240)

**Issue:** Attempt counting uses metadata from `learning_progress` table but doesn't track which specific quiz instance the attempts belong to. If the same quiz is used in multiple modules, attempts are shared.

```typescript
const { data: progressData } = await supabase
    .from('learning_progress')
    .select('metadata')
    .eq('content_type', 'quiz')
    .eq('content_id', id)  // Only filters by quiz_id, not module context
```

**Impact:** User exceeds attempt limit in Module A, cannot take quiz in Module B even though it's a different context.

---

### 5. CertificationPathService - No Passing Score Validation
**Location:** `src/lib/certificationPathService.ts` (lines 132-140)

**Issue:** Path completion only checks if modules are marked "completed", not if the user actually passed the required score.

```typescript
const allRequiredComplete = requiredModuleIds.every((moduleId) => {
    const moduleProgress = progressByModule.get(moduleId)
    return moduleProgress?.status === 'completed'  // ❌ Doesn't check passing score!
})
```

**Impact:** User fails module quizzes (below passing score) but still gets path certificate because status is "completed".

**Fix:** Also validate `score_percentage >= passing_score_percentage`.

---

## 🟠 HIGH PRIORITY ISSUES

### 6. TrainingPlayer - Media Completion Can Be Cheated
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 1040-1047, 1115-1122)

**Issue:** Video and audio completion tracking only checks if user reached 90% of duration:

```typescript
onTimeUpdate={(e) => {
    const target = e.currentTarget
    if (target.duration && target.currentTime / target.duration >= 0.9) {
        handleMarkWatched(block.id)  // User can skip to 90% and it's marked complete
    }
}}
```

**Impact:** Users can skip to end of mandatory videos without watching.

**Fix:** Track actual watch time, not just position reached.

---

### 7. TrainingPlayer - Interactive Content Security Issue
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 1176-1182)

**Issue:** Interactive content iframe uses weak sandbox:

```typescript
<iframe
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    // Missing: no allow-scripts restriction, allows popups
/>
```

**Impact:** Malicious interactive content could redirect users or open popups.

**Fix:** Add stricter sandbox: `sandbox="allow-scripts"` only if needed, remove `allow-popups`.

---

### 8. TrainingBuilder - File Upload No Type Validation
**Location:** `src/pages/training/TrainingBuilder.tsx` (lines 1240-1284)

**Issue:** File upload accepts any file type based only on extension:

```typescript
const fileExt = file.name.split('.').pop()
const fileName = `${crypto.randomUUID()}.${fileExt}`
// ❌ No validation that file content matches extension
```

**Impact:** Users could upload executable files disguised as images.

**Fix:** Validate MIME type and use magic numbers for verification.

---

### 9. QuizComponentEnhanced - Power-Ups Don't Persist
**Location:** `src/pages/learning/components/QuizComponentEnhanced.tsx` (lines 150-155)

**Issue:** Power-ups reset on every quiz load:

```typescript
const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { type: 'timeFreeze', count: 1 },  // Hardcoded initial counts
    { type: 'fiftyFifty', count: 1 },
    ...
])
```

**Impact:** User earns power-ups in Quiz A, but Quiz B doesn't know about them. No persistence across sessions.

---

### 10. LearningService - Question Order Not Deterministic
**Location:** `src/services/learningService.ts` (lines 70-76)

**Issue:** Randomization uses simple shuffle without seed:

```typescript
if (data.randomize_questions) {
    data.questions = shuffleArray(data.questions)  // Different order every refresh
}
```

**Impact:** User refreshes page mid-quiz, question order completely changes. Confusing UX.

**Fix:** Use user_id + quiz_id as seed for deterministic "random" order.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. TrainingPlayer - Progress Save Timing Issue
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 961-968)

**Issue:** Progress is saved every 45 seconds and on block change, but completion may happen between intervals:

```typescript
useEffect(() => {
    const interval = setInterval(() => {
        setTimeSpentSeconds(getCurrentSessionSeconds())
        scheduleProgressSave(0)
    }, 45000)
    ...
}, [])
```

**Impact:** If user completes module quickly (<45s), progress may not be persisted before navigation.

---

### 12. TrainingBuilder - Duplicate Module Query
**Location:** `src/pages/training/TrainingBuilder.tsx` (lines 425-443, 1512-1525)

**Issue:** Same module data fetched by two separate useQuery calls:

```typescript
// Line 425
useQuery({ queryKey: ['training-module', moduleId], ... })
// Line 1512 - DUPLICATE
useQuery({ queryKey: ['training-module', moduleId], ... })
```

**Impact:** Unnecessary duplicate network request on module edit.

---

### 13. QuizComponentEnhanced - Translation Triggers Unnecessarily
**Location:** `src/pages/learning/components/QuizComponentEnhanced.tsx` (lines 641-651)

**Issue:** Translation effect runs even when question hasn't changed:

```typescript
useEffect(() => {
    if (!translationTarget || !quiz || isTranslating) return
    const currentQ = quiz.questions?.[currentQuestionIndex]
    // Fetches translation even if user switches language back and forth
    void translateQuestion(currentQ)
}, [translationTarget, currentQuestionIndex, ...])
```

**Impact:** Wasteful API calls, unnecessary translation costs.

---

### 14. TrainingModules - Assignment Notifications Sent Regardless of Success
**Location:** `src/pages/training/TrainingModules.tsx` (lines 451-527)

**Issue:** Notifications dispatched even if assignment insert failed:

```typescript
// First: insert assignments (may fail)
const { error } = await supabase.from('learning_assignments').insert(...)
// Then: send notifications anyway
void notifyUsers()  // Called unconditionally
```

**Impact:** Users get "assigned" notification but no actual assignment exists.

---

### 15. CertificationPathService - Score Calculation Doesn't Weight Modules
**Location:** `src/lib/certificationPathService.ts` (lines 43-50, 154)

**Issue:** Path certificate shows average of all module scores, treating 5-minute module same as 2-hour module:

```typescript
const getAverageScore = (rows: LearningProgressRow[]) => {
    const scored = rows.map((row) => row.score_percentage).filter(...)
    return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
}
```

**Impact:** User aces a 2-hour course but fails a 5-minute quiz, gets mediocre path score despite effort disparity.

---

## 🟢 LOW PRIORITY ISSUES

### 16. TrainingPlayer - Unused linkedQuizId
**Location:** `src/pages/training/TrainingPlayer.tsx` (lines 1404-1407)

**Issue:** Code shows "Take Final Certification" button based on `linkedQuizId`, but this ID comes from separate query that may be stale:

```typescript
// This comes from a separate query at lines 336-341
linkedQuizId: linkedQuizzes?.[0]?.id
// But finish screen shows it even if user already passed
```

---

### 17. QuizComponentEnhanced - Timer Continues During Feedback
**Location:** `src/pages/learning/components/QuizComponentEnhanced.tsx` (lines 196-206)

**Issue:** Timer pauses during feedback overlay, but overall quiz time keeps counting:

```typescript
if (timeLeft !== null && timeLeft > 0 && !submitted && !timeFrozen && !showFeedback) {
    // Timer paused, but quizStartTime keeps ticking
}
```

**Impact:** User sees feedback for 30 seconds, their "time spent" includes that pause.

---

### 18. TrainingBuilder - Template Apply Confirms Even If Empty
**Location:** `src/pages/training/TrainingBuilder.tsx` (lines 641-711)

**Issue:** Template with empty sections shows error toast but still clears current content:

```typescript
if (templateSections.length === 0) {
    toast({ title: t('builder.templateEmpty'), variant: 'destructive' })
    return  // Returns early, good
}
// But if called from confirmApplyTemplate, sections already cleared
```

---

### 19. LearningService - Progress Overwrite Without Check
**Location:** `src/services/learningService.ts` (lines 360-378)

**Issue:** `submitQuizProgress` uses upsert without checking if existing progress is better:

```typescript
await supabase.from('learning_progress').upsert(progressData, {
    onConflict: 'user_id,content_type,content_id'
})
// ❌ Could replace 100% score with 50% score on retake
```

**Impact:** User retakes quiz and gets worse score, overwrites their best result.

---

### 20. QuizComponentEnhanced - Missing Accessibility Attributes
**Location:** `src/pages/learning/components/QuizComponentEnhanced.tsx` (lines 946-1140)

**Issue:** Quiz options use clickable divs without proper ARIA attributes:

```typescript
<motion.div
    onClick={() => setAnswers(...)}
    // Missing: role="radio", aria-checked, tabIndex
>
```

**Impact:** Screen readers can't properly announce quiz options to visually impaired users.

---

## RECOMMENDED FIX PRIORITIES

| Issue | Severity | Effort | Impact |
|-------|----------|--------|--------|
| #1 Certificate Race Condition | 🔴 | Medium | High |
| #2 Multiple Quiz Scoring | 🔴 | Low | High |
| #3 Destructive Save | 🔴 | Medium | Critical |
| #4 Attempt Counter | 🔴 | Medium | Medium |
| #5 Path Passing Validation | 🔴 | Low | High |
| #6 Media Cheating | 🟠 | Medium | Medium |
| #7 iframe Security | 🟠 | Low | Medium |
| #8 File Validation | 🟠 | Low | Medium |
| #9 Power-Up Persistence | 🟠 | High | Low |
| #10 Question Randomization | 🟠 | Medium | Medium |
| #11 Progress Save Timing | 🟡 | Low | Low |
| #12 Duplicate Query | 🟡 | Low | Low |
| #13 Translation Efficiency | 🟡 | Medium | Low |
| #14 Notification Logic | 🟡 | Low | Medium |
| #15 Score Weighting | 🟡 | High | Low |

---

## CODE FIX EXAMPLES

### Fix for Issue #3 (Destructive Save)

```typescript
// BEFORE: Delete then insert
await supabase.from('training_content_blocks').delete().eq('training_module_id', id)
await supabase.from('training_content_blocks').insert(blocks)

// AFTER: Use transaction or soft-delete + insert pattern
const { error } = await supabase.rpc('save_training_blocks', {
    p_module_id: id,
    p_blocks: blocks
})

// Or at minimum, wrap in try-catch with restore
```

### Fix for Issue #5 (Path Passing Validation)

```typescript
// BEFORE
const allRequiredComplete = requiredModuleIds.every((moduleId) => {
    const moduleProgress = progressByModule.get(moduleId)
    return moduleProgress?.status === 'completed'
})

// AFTER
const allRequiredComplete = requiredModuleIds.every((moduleId) => {
    const moduleProgress = progressByModule.get(moduleId)
    const modulePassed = moduleProgress?.score_percentage 
        ? moduleProgress.score_percentage >= (moduleProgress.passing_score_percentage || 80)
        : true  // If no score required, just completion
    return moduleProgress?.status === 'completed' && modulePassed
})
```

### Fix for Issue #6 (Media Cheating)

```typescript
// BEFORE
onTimeUpdate={(e) => {
    if (target.currentTime / target.duration >= 0.9) {
        handleMarkWatched(block.id)
    }
}}

// AFTER
const [watchedTime, setWatchedTime] = useState(0)
const [lastTime, setLastTime] = useState(0)

onTimeUpdate={(e) => {
    const current = e.currentTarget.currentTime
    // Only count time if not skipping forward
    if (current <= lastTime + 2) {  // Allow small jumps (buffer)
        setWatchedTime(prev => prev + (current - lastTime))
    }
    setLastTime(current)
    
    // Require 90% actual watch time
    if (watchedTime >= e.currentTarget.duration * 0.9) {
        handleMarkWatched(block.id)
    }
}}
```

---

## TESTING RECOMMENDATIONS

1. **Network Interruption Testing:** Simulate network failure during module save
2. **Race Condition Testing:** Complete module and immediately navigate away
3. **Security Testing:** Upload files with mismatched extensions
4. **Accessibility Testing:** Use screen reader on quiz component
5. **Multi-Quiz Module:** Create module with 3+ quizzes, verify aggregation

---

*Report generated by Code Analysis Agent*  
*For questions or clarifications, contact the development team*
