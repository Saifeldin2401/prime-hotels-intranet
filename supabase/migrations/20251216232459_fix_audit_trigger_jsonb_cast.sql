CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    old_row JSONB := NULL;
    new_row JSONB := NULL;
    op TEXT := TG_OP;
BEGIN
    IF TG_OP = 'INSERT' THEN
        new_row = to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_row = to_jsonb(OLD);
        new_row = to_jsonb(NEW);
        
        -- Correctly check for soft delete using JSONB checks
        -- The ? operator works on jsonb, so we use the converted variables
        IF (old_row ? 'is_deleted') AND (new_row ? 'is_deleted') THEN
            IF (old_row->>'is_deleted' = 'false') AND (new_row->>'is_deleted' = 'true') THEN
                op = 'SOFT_DELETE';
            END IF;
            IF (old_row->>'is_deleted' = 'true') AND (new_row->>'is_deleted' = 'false') THEN
                op = 'RESTORE';
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        old_row = to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), op, old_row, new_row, auth.uid());
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;;
