CREATE OR REPLACE FUNCTION public.process_certificate_expirations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_cert RECORD;
    v_rule_id uuid;
    v_processed integer := 0;
BEGIN
    FOR v_cert IN
        SELECT c.id, c.user_id, c.title, c.training_module_id, c.certificate_number
        FROM public.certificates c
        WHERE c.status = 'active'
          AND c.expiry_date IS NOT NULL
          AND c.expiry_date <= now()
    LOOP
        UPDATE public.certificates
        SET status = 'expired', updated_at = now()
        WHERE id = v_cert.id;

        INSERT INTO public.certificate_history (certificate_id, action, details)
        VALUES (v_cert.id, 'updated', jsonb_build_object('reason', 'expired', 'processed_at', now()));

        IF v_cert.training_module_id IS NOT NULL
           AND EXISTS (
               SELECT 1 FROM public.training_modules m
               WHERE m.id = v_cert.training_module_id AND m.status = 'published' AND m.is_deleted = false
           )
        THEN
            INSERT INTO public.training_assignment_rules
                (target_type, target_id, content_type, content_id, training_module_id,
                 due_date, priority, is_active, instructions, created_at)
            VALUES
                ('user', v_cert.user_id::text, 'module', v_cert.training_module_id, v_cert.training_module_id,
                 now() + interval '30 days', 'high', true,
                 'Recertification required: your certificate for "' || v_cert.title || '" has expired.', now())
            RETURNING id INTO v_rule_id;

            INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
            VALUES (v_cert.user_id, v_rule_id, v_cert.training_module_id, 'module', 'not_started'::training_status)
            ON CONFLICT (user_id, training_id) DO UPDATE SET
                assignment_id = EXCLUDED.assignment_id,
                status = 'not_started'::training_status,
                progress_percentage = 0,
                score_percentage = NULL,
                passed = NULL,
                completed_at = NULL,
                last_block_index = NULL,
                last_block_id = NULL,
                updated_at = now();

            INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
            VALUES (
                v_cert.user_id,
                'training_recertification',
                'Recertification required',
                'Your certificate for "' || v_cert.title || '" has expired. Please retake the training within 30 days.',
                '/training/hub/' || v_cert.training_module_id,
                'training_module',
                v_cert.training_module_id
            );
        ELSE
            INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
            VALUES (
                v_cert.user_id,
                'training_recertification',
                'Certification expired',
                'Your certificate for "' || v_cert.title || '" has expired.',
                'certificate',
                v_cert.id
            );
        END IF;

        v_processed := v_processed + 1;
    END LOOP;

    RETURN v_processed;
END;
$function$;

COMMENT ON FUNCTION public.process_certificate_expirations IS
    'Nightly job: expires certificates past their validity period, re-assigns the module, resets progress, and notifies the holder.';

REVOKE ALL ON FUNCTION public.process_certificate_expirations() FROM PUBLIC, authenticated, anon;

SELECT cron.schedule(
    'process-certificate-expirations-job',
    '0 6 * * *',
    $$SELECT public.process_certificate_expirations();$$
);

CREATE OR REPLACE FUNCTION public.get_expiring_certificates(
    p_within_days integer DEFAULT 90,
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL
)
RETURNS TABLE(
    certificate_id uuid,
    user_id uuid,
    recipient_name text,
    title text,
    training_module_id uuid,
    expiry_date timestamptz,
    days_until_expiry integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        c.id,
        c.user_id,
        c.recipient_name::text,
        c.title::text,
        c.training_module_id,
        c.expiry_date,
        (extract(day FROM c.expiry_date - now()))::integer
    FROM public.certificates c
    WHERE c.status = 'active'
      AND c.expiry_date IS NOT NULL
      AND c.expiry_date <= now() + make_interval(days => p_within_days)
      AND (p_department_id IS NULL OR EXISTS (
          SELECT 1 FROM public.user_departments ud WHERE ud.user_id = c.user_id AND ud.department_id = p_department_id))
      AND (p_property_id IS NULL OR EXISTS (
          SELECT 1 FROM public.user_properties up WHERE up.user_id = c.user_id AND up.property_id = p_property_id))
      AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
      )
    ORDER BY c.expiry_date ASC;
$$;

COMMENT ON FUNCTION public.get_expiring_certificates IS
    'Certificates expiring within N days, for the admin recertification view. Admin/manager roles only.';

REVOKE EXECUTE ON FUNCTION public.get_expiring_certificates(integer, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expiring_certificates(integer, uuid, uuid) TO authenticated;
