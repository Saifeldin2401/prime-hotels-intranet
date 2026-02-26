-- Migration: Kill ghost triggers on learning_assignments
-- Purpose: Remove duplicate notifications caused by a hidden/legacy trigger

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'learning_assignments'
        AND trigger_name != 'update_learning_progress_modtime' -- Keep this one, it is valid
        AND trigger_schema = 'public'
    ) LOOP
        RAISE NOTICE 'Dropping ghost trigger: %', r.trigger_name;
        EXECUTE 'DROP TRIGGER ' || quote_ident(r.trigger_name) || ' ON public.learning_assignments';
    END LOOP;
END $$;;
