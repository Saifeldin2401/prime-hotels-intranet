
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
DROP TRIGGER IF EXISTS audit_sop_changes ON public.sop_documents;

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
;
