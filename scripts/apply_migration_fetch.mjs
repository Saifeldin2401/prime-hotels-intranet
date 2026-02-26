const url = "https://htsvjfrofcpkfzvjpwvx.supabase.co/rest/v1/rpc/exec_sql";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c3ZqZnJvZmNwa2Z6dmpwd3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzk1MTQsImV4cCI6MjA4MDk1NTUxNH0.fzBLdH8oSWiFpNEY3g3Nm5kazuRZufbFuANot7z50sE";
const sql = `-- Migration: Enhance Update Request Details RPC
-- Purpose: Support editing all relevant fields for promotion and transfer requests.

CREATE OR REPLACE FUNCTION public.update_request_details(
    p_request_id UUID,
    p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID;
    v_current_metadata JSONB;
    v_requester_id UUID;
    v_user_role public.app_role;
    v_new_meta JSONB;
BEGIN
    -- Get request info
    SELECT entity_type, entity_id, metadata, requester_id
    INTO v_entity_type, v_entity_id, v_current_metadata, v_requester_id
    FROM public.requests WHERE id = p_request_id;

    IF v_entity_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    -- Check permissions: Only Requester or Admin/HR can edit
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF auth.uid() != v_requester_id AND v_user_role NOT IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'corporate_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized to edit this request.');
    END IF;

    -- Update Promotion
    IF v_entity_type = 'promotion' THEN
        UPDATE public.promotions SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            new_role = CASE WHEN p_updates ? 'new_role' THEN (p_updates->>'new_role')::public.app_role ELSE new_role END,
            new_job_title = CASE WHEN p_updates ? 'new_job_title' THEN (p_updates->>'new_job_title') ELSE new_job_title END,
            new_department_id = CASE WHEN p_updates ? 'new_department_id' THEN (p_updates->>'new_department_id')::UUID ELSE new_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

         -- Update metadata to reflect changes in UI
         UPDATE public.requests
         SET metadata = v_current_metadata || p_updates,
             updated_at = NOW()
         WHERE id = p_request_id;

    -- Update Transfer
    ELSIF v_entity_type = 'transfer' THEN
        UPDATE public.transfers SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            to_property_id = CASE WHEN p_updates ? 'to_property_id' THEN (p_updates->>'to_property_id')::UUID ELSE to_property_id END,
            to_department_id = CASE WHEN p_updates ? 'to_department_id' THEN (p_updates->>'to_department_id')::UUID ELSE to_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

        -- Update metadata
        v_new_meta := v_current_metadata || p_updates;

        -- Special sync for target property name in metadata
        IF p_updates ? 'to_property_id' THEN
             v_new_meta := v_new_meta || jsonb_build_object(
                'target_property', (SELECT name FROM public.properties WHERE id = (p_updates->>'to_property_id')::UUID)
             );
        END IF;

        UPDATE public.requests
        SET metadata = v_new_meta,
            updated_at = NOW()
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';`;

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql_statement: sql })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error(e);
}
