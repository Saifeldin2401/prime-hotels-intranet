# PRIME Hotels Intranet - Project Memory

## Project Rules
**Location**: [.agent/rules.md](file:///c:/Users/mahro/Desktop/prime-hotels%20-%20Copy%20-%20Copy/.agent/rules.md)

This project has comprehensive AI agent rules covering:
- Enterprise-first mindset (no mock data, production-ready solutions)
- Bilingual requirements (English/Arabic with RTL support)
- Database standards (RLS policies, naming conventions, `/database-changes` workflow)
- TypeScript standards (no `any` types, proper interfaces)
- Feature-specific rules (Tasks, Training, Knowledge Base, etc.)
- KSA-specific considerations (Hijri calendar, work week Sun-Thu, AST timezone)

## Critical Project Rules

### Database Changes
**ALWAYS** run `/database-changes` workflow before any schema modifications

### Deprecated References
- ❌ `training_assignments` table (use `learning_assignments`)
- ❌ `assignee_id` column (use `assigned_to_id`)
- ❌ `'global'` visibility (use `'all_properties'`)

### Prohibited Practices
- Never use placeholder text ("Coming Soon", "Lorem Ipsum")
- Never hardcode English text (use i18n)
- Never use TypeScript `any` type
- Never bypass RLS policies
- Never modify `auth.users` directly

### Required Quality Standards
- All user-facing text must be translated (en + ar)
- RTL layout support mandatory
- Property/department scoping required
- Audit trails on sensitive operations

## Recent Audit Findings

**Last Audit**: 2026-01-09  
**Report**: [system_audit_report.md](file:///C:/Users/mahro/.gemini/antigravity/brain/fed27f76-b258-4d17-9b49-11c4991a7a13/system_audit_report.md)

### Critical Issues to Address
1. RLS policy on auth tables needs verification
2. No automated testing (implement Vitest)
3. 250+ TypeScript `any` usages
4. `learning_assignments` lacks property scoping

## Active Workflows

### Database Changes
**Command**: `/database-changes`  
**File**: [.agent/workflows/database-changes.md](file:///c:/Users/mahro/Desktop/prime-hotels%20-%20Copy%20-%20Copy/.agent/workflows/database-changes.md)

Safety checklist before any schema modifications:
- Verify RLS policies
- Check foreign key constraints
- Test migrations in development
- Ensure no breaking changes

### Git Operations
**Command**: `/autopush`  
**File**: [.agent/workflows/autopush.md](file:///c:/Users/mahro/Desktop/prime-hotels%20-%20Copy%20-%20Copy/.agent/workflows/autopush.md)

Automated git staging, commit, and push workflow

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7
- **Database**: Supabase (PostgreSQL)
- **Styling**: TailwindCSS + shadcn/ui
- **State**: React Query + Context API
- **i18n**: react-i18next (25 namespaces × 2 languages)
- **Animations**: Framer Motion

## Current Architecture

```
src/
├── components/195  (shadcn/ui + feature components)
├── hooks/79        (business logic, React Query)
├── pages/114       (route-level components)
├── lib/27          (types, utilities, services)
├── i18n/51         (en/ar translation files)
└── services/8      (external API integrations)

supabase/
└── migrations/111  (schema evolution history)
```

## Key Contacts & Resources

- **Project**: PRIME Hotels Intranet (PRIME Connect)
- **Geography**: Kingdom of Saudi Arabia (KSA)
- **Users**: Hotel employees, managers, executives
- **Language**: Bilingual (Arabic primary, English secondary)
