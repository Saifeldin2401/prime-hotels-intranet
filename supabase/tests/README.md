# Database tests

Self-contained SQL regression suites. Each builds its own tenants, users and
content inside a transaction, impersonates users the way PostgREST does
(`request.jwt.claims` + `SET LOCAL ROLE authenticated`), raises on the first
failed expectation and rolls everything back — safe to run against any
environment, including production.

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/learning_integrity.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_roles_and_assignments.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/certificates_and_skills.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/lessons.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/lesson_save_and_progress.sql
```

| Suite | Covers |
| --- | --- |
| `learning_integrity.sql` | forged quiz sessions, self-approved submissions, learner-editable assignments, hidden answer keys and grading oracle, cross-tenant quiz access, partial/duplicate answers, module passing score, certificate score and expiry, recertification cycles |
| `tenant_roles_and_assignments.sql` | roles derived from memberships, transfer privilege escalation, new-hire auto-assignment, tenant-scoped analytics, module review workflow |
| `certificates_and_skills.sql` | no direct certificate writes (forgery), quiz/path certificates only when earned and idempotent, manual issuance rules (role, never self, recipient in org, no future dates), cross-tenant skills isolation |
| `lessons.sql` | lessons readable only for visible (published) courses, tenant isolation, editor writes, duplicate copies lessons, completion + certificate over lessons, no orphan lessons |
| `lesson_save_and_progress.sql` | atomic lesson save keeps ids (progress survives edits), type validation, unauthorized save blocked, progress type inference, no hard delete of courses with progress |
| `business_rules.sql` | four-eyes course approval, knowledge publishing access & attribution, published-only course assignment, server-side department compliance |

`npm run check:migrations` parses these files in CI; running them needs a database.
