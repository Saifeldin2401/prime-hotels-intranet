# Pre-alignment migration drafts (archived 2026-09-24)

These are the repository's migration files before `supabase/migrations/` was
re-aligned with production's recorded history. They are kept for reference only
and are **not** applied by the Supabase CLI (it reads top-level files only).

- Most were applied to production under a different version (the platform
  assigns versions to MCP / dashboard migrations); the recorded SQL now lives in
  `supabase/migrations/` under the production version.
- 35 have no counterpart in production's history — ad-hoc applies, renamed
  re-applies or drafts that never ran. Production's actual state is captured in
  `supabase/schema/production_schema.sql`.
- A few (e.g. `20260901200000_*`, `20260901243000_*`, `20260901244000_*`) were
  corrupted by shell escaping (`\$\$`, lost `$func$` quotes) and are not valid SQL.
