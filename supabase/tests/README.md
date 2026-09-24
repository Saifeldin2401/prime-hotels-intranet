# Database tests

Self-contained SQL regression suites. Each builds its own tenants, users and
content inside a transaction, impersonates users the way PostgREST does
(`request.jwt.claims` + `SET LOCAL ROLE authenticated`), raises on the first
failed expectation and rolls everything back — safe to run against any
environment, including production.

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/learning_integrity.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_roles_and_assignments.sql
```

| Suite | Covers |
| --- | --- |
| `learning_integrity.sql` | forged quiz sessions, self-approved submissions, learner-editable assignments, hidden answer keys and grading oracle, cross-tenant quiz access, partial/duplicate answers, module passing score, certificate score and expiry, recertification cycles |
| `tenant_roles_and_assignments.sql` | roles derived from memberships, transfer privilege escalation, new-hire auto-assignment, tenant-scoped analytics, module review workflow |

`npm run check:migrations` parses these files in CI; running them needs a database.
