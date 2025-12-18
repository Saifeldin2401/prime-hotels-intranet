
-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'workflow_executed'
    entity_type TEXT NOT NULL, -- 'user', 'document', 'role', 'shift', etc.
    entity_id TEXT, -- UUID as string
    user_id UUID REFERENCES public.profiles(id),
    details JSONB DEFAULT '{}'::jsonb, -- Store specific changes or metadata
    ip_address TEXT
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Only Admins and HR can view logs
CREATE POLICY "Admins and HR can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- 4. RLS Policy: System can insert (handled by triggers/functions with SECURITY DEFINER)
-- No direct insert policy needed for users usually, as it's done via triggers.

-- 5. Generic Trigger Function for Logging
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
    
    -- Determine Action
    IF (TG_OP = 'INSERT') THEN
        action_type := 'create';
        changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'update';
        -- Store only changed fields for cleanliness, or full data?
        -- For simplicity, let's store the diff if possible, or just the new data.
        -- Constructing diff is expensive in PL/PGSQL. Let's just store "changes" as a map of what changed.
        -- Simplified: Just store the new row for now.
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
        TG_TABLE_NAME, -- e.g. 'profiles'
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text
            ELSE NEW.id::text
        END,
        actor_id,
        changes
    );

    RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$;

-- 6. Attach Triggers to Key Tables

-- Profiles
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- SOP Documents (Knowledge Base)
DROP TRIGGER IF EXISTS audit_sop_changes ON public.sop_documents;
CREATE TRIGGER audit_sop_changes
AFTER INSERT OR UPDATE OR DELETE ON public.sop_documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 7. Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
