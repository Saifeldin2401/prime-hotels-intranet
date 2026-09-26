# Architecture

Target architecture from the 2026-09-25 rebuild audit. New code follows this;
existing code moves toward it workspace by workspace (Phase 7). Guardrails in
`scripts/check-guardrails.mjs` enforce the parts that have already broken.

## Layers

```
Page / workspace         layout and composition only, no data access
  └─ feature hook        React Query: caching, loading/error state, optimistic updates
       └─ feature api    the only code that imports the Supabase client
            ├─ reads     RLS-protected tables and SECURITY INVOKER views
            ├─ commands  database command functions for any write that carries a rule
            └─ edge fns  AI, email, auth-admin, file scanning only
```

### Frontend layout

```
src/app/                   shell, providers, router
src/features/<domain>/
  api.ts                   Supabase calls for this domain (reads + command RPCs)
  hooks.ts                 React Query hooks over api.ts
  model.ts                 types and pure domain logic (no I/O)
  components/              domain components
  pages/                   route components for the domain's workspace
src/ui/                    design system (tokens, primitives); no business logic
```

Domains: `learn`, `studio`, `knowledge`, `assignments`, `certificates`,
`org`, `platform`. Until a domain is migrated its data access lives in
`src/services/*` and `src/hooks/*`, which is also acceptable; what is not
acceptable is new database access in `src/pages` or `src/components`
(guardrail 5 freezes the 85 existing files and fails on new ones).

### Rules

1. **Pages never import `@/lib/supabase`.** They call feature hooks.
2. **Writes that carry a business rule go through a command function**
   (`issue_*`, `submit_*`, `complete_*`, `assign_*`, `publish_*`). The
   browser never writes those tables directly; RLS and table grants make that
   impossible, not just discouraged.
3. **Server errors are a contract.** Command functions raise with a stable code
   in `HINT` (e.g. `CERT_SELF_ISSUE`). `getUserFriendlyError()` turns it into
   the server's human message or the translation at `errors:rules.<CODE>`.
   Raw database errors are never shown to users.
4. **Success is what the server says.** A success toast or state change happens
   only after the command returned successfully.
5. **One generated types file:** `src/types/database.generated.ts`
   (`npm run db:types`).
6. **Server state lives in React Query**, not in React context. Context holds
   only the session (who am I) and the workspace (which organization); the
   remaining contexts are collapsed as their workspaces are rebuilt.
7. **One canonical URL per job, owned by one workspace.** The route table is
   `src/config/navigation.ts` (`ROUTES`); it drives the sidebar, mobile
   navigation, breadcrumbs, search and workspace detection. Retired URLs are
   redirects only, in `src/routes/legacyRedirects.tsx`; guardrail 6 fails on
   code that links to them.
8. **Visibility follows the capability matrix.** Tenant routes and navigation
   check `get_my_capabilities` (`useCapabilities`, `requiredCapability` on
   `ProtectedRoute`, `page(..., { capability })` in route modules), never
   app-role lists. The platform console follows the operator identity.

### Route ownership

| Workspace | Home (post-login landing) | Canonical routes |
| --- | --- | --- |
| Learn | `/learn` - learners | `/learn`, `/learn/my`, `/learn/courses[/:id]`, `/learn/paths`, `/learn/player/:id`, `/learn/quizzes/:id`, `/learn/certificates`, `/knowledge[/:id]`, `/documents[/:id]` (attachments, not in navigation) |
| Studio | `/studio` - authors, knowledge managers, instructors | `/studio` (my content), `/studio/courses` (library), `/studio/create`, `/studio/articles`, `/studio/courses/:id`, `/studio/quizzes[/new\|/generate\|/:id]`, `/studio/questions/...`, `/studio/articles/new`, `/studio/articles/:id/edit`, `/studio/review[/articles]`, `/studio/media` |
| Manage | `/manage` (= `/manage/risk`) - training and department managers | `/manage/risk`, `/manage/compliance`, `/manage/tracking`, `/manage/assignments[/rules]`, `/manage/team`, `/manage/certificates[/issue]`, `/manage/reports[/builder]`, `/manage/skills` |
| Organization | `/admin/organization` (overview) - organization, brand and hotel admins | `/admin/organization`, `/admin/structure` (hotels & departments), `/admin/users[/bulk]`, `/admin/invitations`, `/admin/properties`, `/admin/settings`, `/admin/audit`, `/admin/pii-access`, `/admin/export`, `/admin/notifications`, `/admin/wizards` |
| Platform | `/platform` (exceptions) - operators | `/platform/*`, `/platform/control-center` (statistics) |

The shell lives in `src/app/shell/` (workspace rail, top bar with the
organization › hotel · role context, context switcher). New workspace pages
live in `src/features/<domain>/pages` with their `api.ts`, `hooks.ts` and
`model.ts` (examples: `features/manage`, `features/organization`,
`features/platform`, `features/studio`, `features/knowledge`, `features/learn`).
Workspace homes are exception queues backed by one read-only, permission-checked
function each: `get_risk_queue`, `get_org_setup_gaps`, `get_platform_exceptions`.

Account utilities (`/profile`, `/settings`, `/search`, `/notifications`) keep
the current workspace. `/dashboard` is not a page: it redirects to the
member's workspace home (`resolve_account_context.recommended_destination`).

## Database

- **Tenant isolation:** every tenant table has `organization_id` and RLS reading
  through `org_visible(organization_id)`; writes check a role helper scoped to
  that organization (`is_tenant_admin(org)`, `is_tenant_content_editor(org)`, …).
  Helpers that ignore the organization (`has_role`, `is_training_manager()`)
  are legacy and must not be used in new policies.
- **Command functions** are `SECURITY DEFINER` with `SET search_path = public`,
  revoked from `PUBLIC`/`anon`, granted to `authenticated`, and follow:
  authorize → validate → business rule → write → emit event → return row.
- **Side effects** (notifications, emails, AI chunking) go through
  `platform_events` (`emit_platform_event`) rather than new triggers.
  Triggers are limited to `updated_at`, organization fill and integrity guards.
- **Tests:** each rule has a self-contained suite in `supabase/tests/`.

## Environments

local → staging (Supabase branch) → production. See
[WORKING_AGREEMENT.md](WORKING_AGREEMENT.md).
