-- Lesson save + progress key regression tests (Phase 2d, 2026-09-25).
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/lesson_save_and_progress.sql
--
-- Covers: save_course_lessons keeps lesson ids (learner progress survives an
-- edit), reorders, inserts and deletes in one call, rejects unknown types and
-- unauthorized callers; untyped training_progress rows are inferred as
-- courses; a course with learner progress cannot be hard-deleted.

BEGIN;

SELECT set_config('t.org',      gen_random_uuid()::text, true),
       set_config('t.org2',     gen_random_uuid()::text, true),
       set_config('t.learner',  gen_random_uuid()::text, true),
       set_config('t.author',   gen_random_uuid()::text, true),
       set_config('t.outsider', gen_random_uuid()::text, true),
       set_config('t.course',   gen_random_uuid()::text, true),
       set_config('t.l1',       gen_random_uuid()::text, true),
       set_config('t.l2',       gen_random_uuid()::text, true),
       set_config('t.l3',       gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug) VALUES
  (current_setting('t.org')::uuid,  'Save Org',   'save-'   || left(current_setting('t.org'), 8)),
  (current_setting('t.org2')::uuid, 'Save Other', 'save-o-' || left(current_setting('t.org2'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (current_setting('t.learner')::uuid,  'l-' || left(current_setting('t.learner'), 8)  || '@save.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'learner', 'full_name', 'Learner')),
  (current_setting('t.author')::uuid,   'a-' || left(current_setting('t.author'), 8)   || '@save.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'author',  'full_name', 'Author')),
  (current_setting('t.outsider')::uuid, 'o-' || left(current_setting('t.outsider'), 8) || '@save.test',
   jsonb_build_object('organization_id', current_setting('t.org2'), 'role', 'author',  'full_name', 'Outsider'));

INSERT INTO public.courses (id, organization_id, title, status)
VALUES (current_setting('t.course')::uuid, current_setting('t.org')::uuid, 'Save Course', 'published');

INSERT INTO public.lessons (id, organization_id, training_module_id, title, block_type, block_order) VALUES
  (current_setting('t.l1')::uuid, current_setting('t.org')::uuid, current_setting('t.course')::uuid, 'One',   'text', 0),
  (current_setting('t.l2')::uuid, current_setting('t.org')::uuid, current_setting('t.course')::uuid, 'Two',   'text', 1),
  (current_setting('t.l3')::uuid, current_setting('t.org')::uuid, current_setting('t.course')::uuid, 'Three', 'text', 2);

INSERT INTO public.lesson_progress (user_id, training_module_id, block_id, completed_at)
VALUES (current_setting('t.learner')::uuid, current_setting('t.course')::uuid, current_setting('t.l1')::uuid, now());

-- A progress row written without lp_content_type is inferred from training_id.
INSERT INTO public.training_progress (user_id, training_id, status)
VALUES (current_setting('t.learner')::uuid, current_setting('t.course')::uuid, 'in_progress');

DO $$
BEGIN
  IF (SELECT lp_content_type FROM public.training_progress WHERE user_id = current_setting('t.learner')::uuid) <> 'module'
     OR (SELECT course_id FROM public.training_progress WHERE user_id = current_setting('t.learner')::uuid) <> current_setting('t.course')::uuid THEN
    RAISE EXCEPTION 'FAIL: untyped progress not inferred as a course';
  END IF;
END $$;

-- Author saves: reorder, edit, drop one, add one with a temporary id.
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v jsonb;
BEGIN
  v := public.save_course_lessons(current_setting('t.course')::uuid, jsonb_build_array(
    jsonb_build_object('id', current_setting('t.l3'), 'type', 'text', 'title', 'Three'),
    jsonb_build_object('id', current_setting('t.l1'), 'type', 'text', 'title', 'One (edited)'),
    jsonb_build_object('id', 'content-1790000000', 'type', 'video', 'title', 'New video', 'content_url', 'https://example.com/v.mp4')));
  IF (v ->> 'updated')::int <> 2 OR (v ->> 'inserted')::int <> 1 OR (v ->> 'deleted')::int <> 1 THEN
    RAISE EXCEPTION 'FAIL: unexpected save counts %', v;
  END IF;
  IF (SELECT block_order FROM public.lessons WHERE id = current_setting('t.l1')::uuid) <> 1 THEN RAISE EXCEPTION 'FAIL: order not saved'; END IF;
  IF (SELECT title FROM public.lessons WHERE id = current_setting('t.l1')::uuid) <> 'One (edited)' THEN RAISE EXCEPTION 'FAIL: edit not saved'; END IF;
  IF EXISTS (SELECT 1 FROM public.lessons WHERE id = current_setting('t.l2')::uuid) THEN RAISE EXCEPTION 'FAIL: removed lesson kept'; END IF;

  BEGIN
    PERFORM public.save_course_lessons(current_setting('t.course')::uuid, jsonb_build_array(jsonb_build_object('type', 'bogus')));
    RAISE EXCEPTION 'FAIL: unknown lesson type accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lesson_progress WHERE block_id = current_setting('t.l1')::uuid) THEN
    RAISE EXCEPTION 'FAIL: learner progress on a kept lesson was lost by a save';
  END IF;
END $$;

-- Other tenant and learner cannot save the course.
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.outsider'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.save_course_lessons(current_setting('t.course')::uuid, '[]'::jsonb);
  RAISE EXCEPTION 'FAIL: other tenant wiped a course';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  PERFORM public.save_course_lessons(current_setting('t.course')::uuid, '[]'::jsonb);
  RAISE EXCEPTION 'FAIL: learner edited a course';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- Progress is compliance evidence: a course with progress cannot be hard-deleted.
RESET ROLE;
DO $$
BEGIN
  DELETE FROM public.courses WHERE id = current_setting('t.course')::uuid;
  RAISE EXCEPTION 'FAIL: course with learner progress was hard-deleted';
EXCEPTION WHEN foreign_key_violation THEN NULL;
END $$;

SELECT 'lesson_save_and_progress: all checks passed' AS result;

ROLLBACK;
