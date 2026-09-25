-- Capability model regression tests (Phase 3, 2026-09-25).
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/capabilities.sql
--
-- Covers: role -> capability mapping per tenant role, capabilities never leak
-- to another organization, the role helpers used by RLS agree with the
-- matrix, a platform_support operator cannot manage people / billing / config
-- without a session, and users cannot forge audit events.

BEGIN;

SELECT set_config('t.org',     gen_random_uuid()::text, true),
       set_config('t.org2',    gen_random_uuid()::text, true),
       set_config('t.owner',   gen_random_uuid()::text, true),
       set_config('t.tm',      gen_random_uuid()::text, true),
       set_config('t.author',  gen_random_uuid()::text, true),
       set_config('t.learner', gen_random_uuid()::text, true),
       set_config('t.support', gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org')::uuid,  'Caps Org',   'caps-'   || left(current_setting('t.org'), 8)),
       (current_setting('t.org2')::uuid, 'Caps Other', 'caps-o-' || left(current_setting('t.org2'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT u.id::uuid, u.email, jsonb_build_object('organization_id', current_setting('t.org'), 'role', u.role, 'full_name', u.email)
  FROM (VALUES
    (current_setting('t.owner'),   'owner-'   || left(current_setting('t.owner'), 8)   || '@caps.test', 'organization_owner'),
    (current_setting('t.tm'),      'tm-'      || left(current_setting('t.tm'), 8)      || '@caps.test', 'training_manager'),
    (current_setting('t.author'),  'author-'  || left(current_setting('t.author'), 8)  || '@caps.test', 'author'),
    (current_setting('t.learner'), 'learner-' || left(current_setting('t.learner'), 8) || '@caps.test', 'learner')
  ) AS u(id, email, role);

-- A platform_support operator with no tenant membership.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (current_setting('t.support')::uuid, 'support-' || left(current_setting('t.support'), 8) || '@caps.test', '{}'::jsonb);
INSERT INTO public.platform_users (user_id, is_active) VALUES (current_setting('t.support')::uuid, true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = true;
INSERT INTO public.platform_role_assignments (platform_user_id, platform_role)
VALUES (current_setting('t.support')::uuid, 'platform_support');

CREATE TEMP TABLE expect (user_key text, capability text, allowed boolean) ON COMMIT DROP;
INSERT INTO expect VALUES
  ('t.owner',   'org.settings', true),  ('t.owner',   'people.manage', true), ('t.owner', 'certificate.issue', true),
  ('t.tm',      'assignment.manage', true), ('t.tm', 'certificate.issue', true), ('t.tm', 'content.publish', true),
  ('t.tm',      'people.manage', false), ('t.tm', 'org.settings', false),
  ('t.author',  'content.author', true), ('t.author', 'content.publish', false), ('t.author', 'certificate.issue', false),
  ('t.learner', 'learning.take', true),  ('t.learner', 'knowledge.read', true), ('t.learner', 'content.author', false),
  ('t.learner', 'reports.view', false);
GRANT SELECT ON expect TO authenticated;

SET LOCAL ROLE authenticated;

DO $$
DECLARE r record; v boolean;
BEGIN
  FOR r IN SELECT * FROM expect LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting(r.user_key), 'role', 'authenticated')::text, true);
    v := public.tenant_can(current_setting('t.org')::uuid, r.capability);
    IF v IS DISTINCT FROM r.allowed THEN
      RAISE EXCEPTION 'FAIL: % %: expected %, got %', r.user_key, r.capability, r.allowed, v;
    END IF;
    IF public.tenant_can(current_setting('t.org2')::uuid, r.capability) THEN
      RAISE EXCEPTION 'FAIL: % holds % in another organization', r.user_key, r.capability;
    END IF;
  END LOOP;

  -- The RLS helpers agree with the matrix.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text, true);
  IF NOT public.is_tenant_content_editor(current_setting('t.org')::uuid) OR public.is_tenant_admin(current_setting('t.org')::uuid) THEN
    RAISE EXCEPTION 'FAIL: author helper results disagree with the matrix';
  END IF;
  IF NOT ('content.author' = ANY (public.get_my_capabilities(current_setting('t.org')::uuid))) THEN
    RAISE EXCEPTION 'FAIL: get_my_capabilities misses content.author for an author';
  END IF;

  -- platform_support: no tenant-wide people management, billing or config.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.support'), 'role', 'authenticated')::text, true);
  IF public.is_tenant_people_admin(current_setting('t.org')::uuid) THEN RAISE EXCEPTION 'FAIL: platform_support manages tenant people'; END IF;
  IF public.platform_operator_can('billing.manage') OR public.platform_operator_can('config.manage') THEN
    RAISE EXCEPTION 'FAIL: platform_support has billing/config powers';
  END IF;
  IF NOT public.platform_operator_can('tenant.enter') THEN RAISE EXCEPTION 'FAIL: platform_support lost tenant.enter'; END IF;

  -- Users cannot write audit entries directly.
  BEGIN
    PERFORM public.log_audit_event('forged', 'x', gen_random_uuid(), '{}'::jsonb, '{}'::jsonb);
    RAISE EXCEPTION 'FAIL: user forged an audit event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SELECT 'capabilities: all checks passed' AS result;

ROLLBACK;
