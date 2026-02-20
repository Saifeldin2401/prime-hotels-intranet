# Codex Session Prompt - Prime Hotels Intranet Review

## Your Mission
You are reviewing the Prime Hotels Intranet system after Kimi (Moonshot AI) has made fixes. Your job is to validate everything and ensure the system is polished.

## Context
- **Project**: Prime Hotels Intranet (React + TypeScript + Vite + Supabase)
- **Location**: c:\Users\mahro\Desktop\prime-hotels-intranet-master
- **Previous Work**: Kimi fixed a derived state issue in CommandPalette.tsx
- **Status**: Build passes, TypeScript clean

## What Kimi Fixed
1. Changed state reset from render-phase to useEffect in CommandPalette.tsx
2. Verified all accessibility errors were already resolved
3. Verified all nested component issues were already resolved

## Your Tasks

### 1. Read the Handoff
Open and read: `.codex/handoff/current-task.md`

### 2. Run Validations
```bash
# TypeScript check
npx tsc --noEmit

# Build check
npm run build

# Lint check (sample files)
npx eslint src/components/common/CommandPalette.tsx
npx eslint src/pages/training/TrainingAnalytics.tsx
npx eslint src/pages/training/MyCertificates.tsx
```

### 3. Use MCP Tools
```
@supabase List all tables
@supabase Get schema for training_modules
@supabase Get policies for training_modules
```

### 4. Review Key Files
- src/components/common/CommandPalette.tsx (Kimi's fix)
- src/lib/supabase.ts (Supabase client config)
- src/routes/router.tsx (Routing)

### 5. Document Findings
Update `.codex/review/feedback.md` with:
- Validation results (pass/fail for each check)
- Any issues found
- Fixes you made (if any)
- Final recommendation

## Success Criteria
- [ ] Build passes
- [ ] TypeScript has no errors
- [ ] Lint has no critical errors
- [ ] Database schema is consistent
- [ ] No console errors in code review

## When Finished
1. Update `.codex/review/feedback.md`
2. Update `.codex/handoff/current-task.md` with your findings
3. Report back to the user that your review is complete

## Questions?
If you need clarification, document it in the feedback file.

---
**Ready to start?** Begin by reading the handoff file!
