-- Knowledge documents have an approval workflow before going live; training modules did not
-- -- any of the four builder-access roles (corporate_admin, regional_admin, regional_hr,
-- property_manager) could publish directly with no second set of eyes. This adds an optional
-- pending_review status: property_manager (the "on the ground" tier of the four) can submit
-- for review instead of publishing directly, and the other three roles can approve (publishes
-- + snapshots a version, reusing snapshot_training_module_version from the versioning work) or
-- reject (returns to draft with a reason, notifies the author). Direct publish is left
-- available to everyone with builder access -- this is an option, not a mandatory gate.

CREATE OR REPLACE FUNCTION public.submit_training_module_for_review(p_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.training_modules m
        WHERE m.id = p_module_id
          AND (m.created_by = auth.uid() OR m.updated_by = auth.uid()
               OR EXISTS (
                   SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = auth.uid()
                     AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager'])
               ))
    ) THEN
        RAISE EXCEPTION 'Not authorized to submit this module for review';
    END IF;

    UPDATE public.training_modules
    SET status = 'pending_review', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id
    RETURNING title INTO v_title;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
    SELECT
        ur.user_id,
        'training_review_requested',
        'Training module awaiting review',
        '"' || v_title || '" was submitted for review before publishing.',
        '/training/hub/' || p_module_id,
        'training_module',
        p_module_id
    FROM public.user_roles ur
    WHERE (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr']);
END;
$function$;

COMMENT ON FUNCTION public.submit_training_module_for_review IS
    'Moves a module to pending_review and notifies reviewer-tier roles, instead of publishing directly.';

REVOKE EXECUTE ON FUNCTION public.submit_training_module_for_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_training_module_for_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_training_module(p_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_author uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
    ) THEN
        RAISE EXCEPTION 'Not authorized to approve training modules';
    END IF;

    UPDATE public.training_modules
    SET status = 'published', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    PERFORM public.snapshot_training_module_version(p_module_id);

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
        VALUES (
            v_author,
            'training_review_approved',
            'Training module approved',
            '"' || v_title || '" was approved and is now published.',
            '/training/hub/' || p_module_id,
            'training_module',
            p_module_id
        );
    END IF;
END;
$function$;

COMMENT ON FUNCTION public.approve_training_module IS
    'Approves a pending_review module: publishes it, snapshots a version, notifies the author. Reviewer-tier roles only.';

REVOKE EXECUTE ON FUNCTION public.approve_training_module(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_training_module(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_training_module(p_module_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_author uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
    ) THEN
        RAISE EXCEPTION 'Not authorized to reject training modules';
    END IF;

    UPDATE public.training_modules
    SET status = 'draft', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id, metadata)
        VALUES (
            v_author,
            'training_review_rejected',
            'Training module needs changes',
            '"' || v_title || '" was sent back to draft.' || CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
            '/training/hub/' || p_module_id || '?view=builder',
            'training_module',
            p_module_id,
            jsonb_build_object('reason', p_reason)
        );
    END IF;
END;
$function$;

COMMENT ON FUNCTION public.reject_training_module IS
    'Sends a pending_review module back to draft with an optional reason, notifies the author. Reviewer-tier roles only.';

REVOKE EXECUTE ON FUNCTION public.reject_training_module(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_training_module(uuid, text) TO authenticated;
