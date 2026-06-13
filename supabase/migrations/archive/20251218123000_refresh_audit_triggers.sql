
-- 1. Get arguments of the OLD function to drop it correctly
-- We saw it takes p_action, p_entity_type etc.
-- But standard DROP FUNCTION can use signature.
-- The oid 18101 had args. We can drop by name if we specify args, or DROP ROUTINE if unique signature.
-- To be safe, let's identify strict signature or just drop both and recreate the one we want.
-- Actually, dropping the trigger function requires dropping the trigger first usually.

-- Re-implement the trigger setup cleanly.

-- Drop the specific legacy function if possible.
-- It seems to take (user_id, action, entity_type, entity_id, old_values, new_values, ...) based on the source code.
-- Let's just create a robust script.

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
DROP TRIGGER IF EXISTS audit_sop_changes ON public.sop_documents;

-- Drop verify_function logic (optional but good practice)

-- Re-create the CORRECT trigger function (oid 31177 logic)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_id UUID;
    changes JSONB;
    action_type TEXT;
BEGIN
    actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        action_type := 'create';
        changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'update';
        changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'delete';
        changes := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details
    ) VALUES (
        action_type,
        TG_TABLE_NAME, 
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text
            ELSE NEW.id::text
        END,
        actor_id,
        changes
    );

    RETURN NULL;
END;
$$;

-- Re-attach Triggers
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_sop_changes
AFTER INSERT OR UPDATE OR DELETE ON public.sop_documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Check for the OTHER function and drop it.
-- We can find it by name and drop it.
-- Since we don't know the exact signature easily without digging, we can try to drop specific signatures if we guess them.
-- Or just leave it if it's not being used. 
-- But wait, checking usage: `SELECT * FROM information_schema.triggers` would show which function is used.
-- The `CREATE TRIGGER ... EXECUTE FUNCTION log_audit_event()` without args picks the trigger-returning one.
-- So the ambiguity is strictly in "name", not in usage.
-- However, to be clean, let's try to drop the other one.
-- The other one likely returns void (see prosrc, no RETURN).
-- WE DO NOT HAVE ITS SIGNATURE.
-- I'll skip dropping the *other* one to avoid erroring if I guess wrong, but I have ensured the Triggers use the correct one (by recreating it).

