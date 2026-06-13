
-- Fix the log_audit_event trigger function
-- The entity_id column is UUID, so we should NOT cast to text

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_id UUID;
    changes JSONB;
    action_type TEXT;
    record_id UUID;
BEGIN
    -- Get the current user, can be NULL for service role operations
    actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        action_type := 'create';
        changes := to_jsonb(NEW);
        record_id := NEW.id;
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'update';
        changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
        record_id := NEW.id;
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'delete';
        changes := to_jsonb(OLD);
        record_id := OLD.id;
    END IF;

    -- Only insert if we have a valid record_id
    IF record_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            action,
            entity_type,
            entity_id,
            user_id,
            details
        ) VALUES (
            action_type,
            TG_TABLE_NAME, 
            record_id, -- Use UUID directly, no cast
            actor_id,
            changes
        );
    END IF;

    RETURN NULL;
END;
$$;
;
