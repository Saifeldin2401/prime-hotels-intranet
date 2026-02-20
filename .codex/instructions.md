# Codex CLI Instructions for Prime Hotels Intranet

## Project Overview
- **Name**: Prime Hotels Intranet
- **Stack**: React 19 + TypeScript + Vite + Supabase + Tailwind CSS + shadcn/ui
- **Location**: `c:\Users\mahro\Desktop\prime-hotels-intranet-master`

## Your Role as Codex CLI
You are collaborating with **Kimi (Moonshot AI)** to polish this system. Kimi will make changes and hand them to you for review.

## MCP Access
You have full Supabase MCP access configured in `.codex/mcp.json`:
- Query database schema
- Check migrations
- Validate RLS policies
- Review functions

## Collaboration Workflow (Ping-Pong)

### When Kimi Hands Off to You:
1. **Review** the changes made by Kimi
2. **Test** using MCP tools:
   ```
   @supabase List tables
   @supabase Execute SQL: SELECT * FROM ...
   ```
3. **Validate** TypeScript, build, and lint
4. **Fix** any issues you find
5. **Report** back to Kimi with:
   - What you reviewed
   - What you fixed
   - What's ready for next iteration

### Your Responsibilities:
1. **Database Validation**: Use MCP to verify Supabase changes
2. **Code Quality**: Fix TypeScript errors, lint issues
3. **Build Verification**: Ensure `npm run build` passes
4. **Security Review**: Check RLS policies, input validation

## Commands You Can Run
```bash
# Validation
npm run build
npm run lint
npm run test:run

# Database
supabase migration list
supabase db pull

# Type check
npx tsc --noEmit
```

## Collaboration Files
- `.codex/handoff/current-task.md` - Current task details from Kimi
- `.codex/handoff/completed/` - Archive of completed tasks
- `.codex/review/feedback.md` - Your feedback for Kimi

## Critical Files
- `src/lib/supabase.ts` - Supabase client
- `src/lib/database.types.ts` - Generated types
- `supabase/migrations/` - Database migrations
- `src/routes/router.tsx` - Main routing

## Style Guide
- Use TypeScript strict mode
- Follow existing shadcn/ui patterns
- Use React Query for data fetching
- Use Zod for validation
- Follow accessibility best practices

## When You Finish
1. Update `.codex/handoff/current-task.md`
2. Run all validation commands
3. Report back to Kimi with results
