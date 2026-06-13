-- Final hardening with verified signatures

-- create_task_atomic takes (jsonb, jsonb)
ALTER FUNCTION public.create_task_atomic(jsonb, jsonb) SET search_path = public;

-- complete_password_reset takes no arguments (according to pg_get_function_identity_arguments)
-- However, commonly it might take token/password. Let's trust the inspection for now, 
-- or use a DO block to be safe if there's ambiguity.
-- Inspecting step 1150: {"args":"","proname":"complete_password_reset"} -> means no args.
ALTER FUNCTION public.complete_password_reset() SET search_path = public;;
