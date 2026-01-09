# AI Agent Rules for PRIME Hotels Intranet

## Project Identity & Context

- **Project Name**: PRIME Hotels Intranet (PRIME Connect)
- **Type**: Enterprise internal platform for hotel chain operations
- **Users**: Employees, managers, executives across multiple hotel properties
- **Geography**: Kingdom of Saudi Arabia (KSA) with bilingual requirements
- **Tech Stack**: React + TypeScript + Vite + Supabase + TailwindCSS + shadcn/ui

## Core Principles

### 1. Enterprise-First Mindset
- Always think in terms of internal company platforms, not public websites
- Prioritize security, scalability, maintainability, and data integrity
- Prefer production-ready solutions over theoretical suggestions
- **NEVER** use mock data, placeholders, or demo-only implementations
- Clearly warn about risks, side effects, and architectural trade-offs
- Never suggest quick hacks that compromise long-term stability

### 2. Data Integrity & Security
- Treat data consistency and access control as critical, non-negotiable concerns
- Always verify RLS (Row Level Security) policies when making database changes
- Consult `/database-changes` workflow before any schema modifications
- Never bypass authentication or authorization checks
- Assume all data operations must be auditable and traceable

### 3. Bilingual Requirements (English/Arabic)
- **All user-facing content MUST support both English and Arabic**
- Use the i18n system with proper namespace organization:
  - `common`: Shared UI elements, navigation, actions
  - `public`: Public-facing content
  - `dashboard`: Dashboard-specific content
  - Feature-specific namespaces as needed
- **RTL (Right-to-Left) support is mandatory** for Arabic
- Use `useTranslation()` hook, never hardcode English text
- Translation keys must exist in both `en` and `ar` JSON files
- Date/time formatting must respect locale (Hijri calendar awareness for KSA)

### 4. No Placeholders or Mock Data
- **CRITICAL**: Never use placeholder text like "Coming Soon", "Lorem Ipsum", "Sample Data"
- All content must be real, operationally accurate, and KSA-compliant
- If real data is needed, generate realistic, contextually appropriate content
- Knowledge base articles must be actual hotel SOPs, policies, and procedures
- User profiles, departments, and properties must reflect real hotel operations

### 5. System Architecture Respect
- Reuse existing architecture, components, and patterns
- Follow established file structure and naming conventions
- Use existing hooks, utilities, and services before creating new ones
- Respect component boundaries and separation of concerns
- Maintain consistency with shadcn/ui component patterns

## Technical Standards

### Database & Supabase

#### Schema Changes
- **Always run `/database-changes` workflow before modifying schema**
- Use migrations for all DDL operations via MCP tools
- Never modify `auth.users` directly; use `profiles` table
- Verify foreign key relationships and cascading rules
- Test RLS policies after every schema change

#### Naming Conventions
- Tables: `snake_case`, plural (e.g., `training_modules`, `notification_preferences`)
- Columns: `snake_case` (e.g., `assigned_to_id`, `created_at`, `is_active`)
- Enums: `snake_case` with descriptive values (e.g., `'all_properties'`, not `'global'`)
- Foreign keys: `{referenced_table}_id` (e.g., `property_id`, `department_id`)

#### Common Patterns
- Always include: `id` (uuid), `created_at`, `updated_at`
- **Soft Delete Patterns** (use both where applicable):
  - `is_active: boolean` = Operational status (toggle-able in UI, e.g., user status, template activation)
  - `is_deleted: boolean` = Audit trail soft delete (permanent, not reversible via UI)
- Audit trails: Include `created_by`, `updated_by` where applicable
- Multi-tenancy: Use `property_id` for property-specific data

#### Pagination Standards
- Use `usePagination` hook for paginated list views
- Always apply `.range(from, to)` for large datasets (>50 records)
- Include total count via `{ count: 'exact', head: true }` query
- Use `PaginationBar` component for consistent UI

### Frontend & React

#### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui primitives
│   └── {feature}/      # Feature-specific components
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── lib/                # Utilities, types, constants
└── i18n/               # Translation files
```

#### TypeScript Standards
- **Always define proper types**, never use `any`
- Use interfaces for data models matching Supabase schema
- Export types from `src/lib/types.ts` for reusability
- Use type guards for runtime type checking
- Prefer `interface` over `type` for object shapes

#### React Best Practices
- **Hooks must be called unconditionally** (no conditional hooks)
- Use `useQuery` from `@tanstack/react-query` for data fetching
- Implement proper loading and error states
- Use `Suspense` and `ErrorBoundary` where appropriate
- Memoize expensive computations with `useMemo`/`useCallback`

#### Styling
- Use TailwindCSS utility classes (already in use)
- Follow shadcn/ui theming system with CSS variables
- Support both light and dark modes
- RTL-aware layouts: use `start`/`end` instead of `left`/`right`
- Responsive design: mobile-first approach

### i18n Implementation

#### Translation Files
```typescript
// en/common.json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}

// ar/common.json
{
  "actions": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف"
  }
}
```

#### Usage in Components
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  return <button>{t('actions.save')}</button>;
}
```

#### RTL Handling
- Use `dir` attribute on root element
- Use logical properties: `ms-4` instead of `ml-4`
- Test all layouts in both LTR and RTL modes
- Icons and images may need mirroring in RTL

### Error Handling

#### Frontend
- Always wrap async operations in try-catch
- Display user-friendly error messages via toast notifications
- Log errors to console for debugging (consider error tracking service)
- Provide fallback UI for error states

#### Backend/Supabase
- Check for specific error codes (400, 401, 403, 404, 500)
- Handle RLS policy violations gracefully
- Validate data before sending to Supabase
- Use Supabase error messages to guide users

## Feature-Specific Rules

### Knowledge Base
- Content types: SOP, Policy, How-to, Checklist, Quick Reference, FAQ
- All articles must be bilingual (English + Arabic)
- Visibility levels: `all_properties`, `single_property`, `department`
- Version control: Track revisions with `version` and `updated_at`
- Rich text editor: Support formatting, lists, tables, images

### Task Management
- Use `assigned_to_id` (not `assignee_id`) for task assignments
- Task statuses: `pending`, `in_progress`, `completed`, `cancelled`
- Priority levels: `low`, `medium`, `high`, `urgent`
- Due date tracking with timezone awareness
- Notification system for assignments and updates

### Training/Learning
- Use `learning_assignments` table (not deprecated `training_assignments`)
- Module categories: Onboarding, Compliance, Skills, Leadership
- Track completion status and progress percentage
- Certificate generation for completed courses
- Difficulty levels: Beginner, Intermediate, Advanced

### Notifications
- Store preferences in `notification_preferences` table
- Support email, in-app, and push notification channels
- Allow granular control per notification type
- Respect user's language preference for notification content
- Mark notifications as read/unread

### User Profiles & Auth
- Never modify `auth.users` directly
- Use `profiles` table for extended user information
- Roles: `staff`, `manager`, `admin`, `super_admin`
- Property and department associations
- Profile pictures stored in Supabase Storage

### Organizational Structure
- Multi-property support (hotel chain)
- Department hierarchy within each property
- Org chart views: by property, by department, by role
- Manager-employee relationships
- Active/inactive employee status

## Workflow & Process Rules

### Before Making Database Changes
1. Run `/database-changes` workflow checklist
2. Review existing schema and relationships
3. Plan migration with proper up/down scripts
4. Test RLS policies in development
5. Verify no breaking changes to existing queries

### Before Committing Code
1. Ensure no TypeScript errors (`npm run build`)
2. Verify all translations are present (en + ar)
3. Test in both light/dark modes
4. Test RTL layout for Arabic
5. Run `/autopush` workflow for git operations

### When Adding New Features
1. Check for existing similar functionality
2. Follow established patterns and conventions
3. Update types in `src/lib/types.ts`
4. Add translations to all relevant namespaces
5. Document complex logic with comments
6. Consider mobile responsiveness

### When Debugging
1. Check browser console for errors
2. Verify Supabase logs for backend issues
3. Confirm RLS policies are not blocking queries
4. Check network tab for failed requests
5. Validate data types match schema

## Communication & Documentation

### Code Comments
- Use JSDoc for functions and complex logic
- Explain "why" not "what" (code shows what)
- Document non-obvious business rules
- Mark TODOs with context and owner

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Be specific: "Fix task assignment notification bug" not "Fix bug"
- Reference issue numbers when applicable

### User Manual & Documentation
- Keep `user_manual.md` up to date
- Include screenshots for visual features
- Provide step-by-step instructions
- Maintain bilingual documentation

## Quality Checklist

Before considering any feature complete:

- [ ] TypeScript compiles without errors
- [ ] All user-facing text is translated (en + ar)
- [ ] RTL layout works correctly for Arabic
- [ ] Light and dark modes both work
- [ ] Mobile responsive design verified
- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] RLS policies tested and working
- [ ] No placeholder or mock data
- [ ] Code follows established patterns
- [ ] Related documentation updated

## Prohibited Practices

### ❌ NEVER Do These:
- Use placeholder text ("Coming Soon", "Lorem Ipsum", "TBD")
- Hardcode English text in components
- Modify `auth.users` table directly
- Use `any` type in TypeScript
- Call hooks conditionally
- Bypass RLS policies
- Use deprecated tables (`training_assignments`)
- Use wrong column names (`assignee_id` instead of `assigned_to_id`)
- Create quick hacks that compromise stability
- Ignore security or data integrity concerns
- Deploy without testing bilingual support
- Use `left`/`right` instead of `start`/`end` for RTL compatibility

## KSA-Specific Considerations

- **Work week**: Sunday to Thursday (Friday-Saturday weekend)
- **Calendar**: Support both Gregorian and Hijri calendars
- **Language**: Arabic is primary, English is secondary
- **Cultural sensitivity**: Respect local customs and norms
- **Compliance**: Adhere to Saudi labor laws and regulations
- **Time zone**: Arabia Standard Time (AST, UTC+3)
- **Currency**: Saudi Riyal (SAR)

## Performance & Optimization

- Lazy load routes and heavy components
- Optimize images and assets
- Use pagination for large data sets
- Implement proper caching strategies
- Minimize bundle size
- Use React Query for efficient data fetching
- Debounce search and filter inputs

## Accessibility

- Use semantic HTML elements
- Provide alt text for images
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Support screen readers
- Use ARIA labels where appropriate

---

**Remember**: This is an enterprise intranet for a hotel chain. Every decision should prioritize reliability, security, maintainability, and user experience for employees who depend on this system for their daily work.
