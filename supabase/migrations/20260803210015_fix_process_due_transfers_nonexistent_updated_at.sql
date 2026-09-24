-- Caught by the end-to-end test of the previous migration: process_due_transfers
-- sets user_properties.updated_at, but user_properties has only (id, user_id,
-- property_id). This bug was inherited verbatim from the original function --
-- it would have failed on the first real transfer regardless of the table-name
-- issue. Removing the phantom column write.
CREATE OR REPLACE FUNCTION public.process_due_transfers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_transfer IN
        SELECT et.*
        FROM public.employee_transfers et
        JOIN public.requests r
          ON r.entity_id = et.id AND r.entity_type = 'transfer'
        WHERE r.status = 'approved'
          AND et.applied_at IS NULL
          AND et.effective_date <= CURRENT_DATE
    LOOP
        UPDATE public.user_properties
        SET property_id = v_transfer.to_property_id
        WHERE user_id = v_transfer.employee_id AND property_id = v_transfer.from_property_id;

        IF NOT FOUND THEN
             INSERT INTO public.user_properties (user_id, property_id)
             VALUES (v_transfer.employee_id, v_transfer.to_property_id)
             ON CONFLICT (user_id, property_id) DO NOTHING;
        END IF;

        IF v_transfer.to_department_id IS NOT NULL THEN
             UPDATE public.user_departments
             SET department_id = v_transfer.to_department_id
             WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;

             IF NOT FOUND THEN
                INSERT INTO public.user_departments (user_id, department_id)
                VALUES (v_transfer.employee_id, v_transfer.to_department_id)
                ON CONFLICT (user_id, department_id) DO NOTHING;
             END IF;
        ELSIF v_transfer.from_department_id IS NOT NULL THEN
            DELETE FROM public.user_departments
            WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
        END IF;

        UPDATE public.employee_transfers
        SET applied_at = NOW(), updated_at = NOW()
        WHERE id = v_transfer.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$;
