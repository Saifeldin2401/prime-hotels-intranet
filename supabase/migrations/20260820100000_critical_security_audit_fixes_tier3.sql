-- Tier 3 of the full-system security audit remediation. Every policy/function
-- text below was re-read fresh from the live database immediately before
-- writing this file (not taken from the original audit report verbatim).

-- ============================================================================
-- 1. certificates: "Authenticated can insert certificates" lets ANY user
--    self-insert a row with certificate_type='training' and an arbitrary
--    score/title/completion_date - nothing ties it to a real, passed
--    training_progress row. Route the self-service 'training' path through a
--    new SECURITY DEFINER RPC that validates against the learner's own
--    training_progress before inserting, and remove the client's ability to
--    self-insert a 'training' cert directly. certificate_type 'sop_quiz' and
--    'achievement' still self-insert directly for now (unchanged) - closing
--    those the same way needs their own server-side validation (a passed quiz
--    session for sop_quiz; a multi-module aggregate for achievement paths)
--    that doesn't exist yet. Flagged as a known remaining gap, not silently
--    left unfixed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.issue_training_certificate(p_training_progress_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tp record;
  v_module_id uuid;
  v_module_title text;
  v_module_passing_score numeric;
  v_module_validity_days integer;
  v_module_property_id uuid;
  v_module_department_id uuid;
  v_profile record;
  v_cert public.certificates;
  v_cert_number text;
  v_verification_code text;
  v_expiry timestamptz;
BEGIN
  SELECT * INTO v_tp
  FROM public.training_progress
  WHERE id = p_training_progress_id
    AND user_id = auth.uid()
    AND coalesce(is_deleted, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training progress not found';
  END IF;

  IF v_tp.status IS DISTINCT FROM 'completed' OR coalesce(v_tp.passed, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Training not completed or not passed';
  END IF;

  SELECT * INTO v_cert
  FROM public.certificates
  WHERE training_progress_id = p_training_progress_id
    AND certificate_type = 'training'
    AND status = 'active';

  IF FOUND THEN
    RETURN v_cert;
  END IF;

  -- training_progress.training_id is polymorphic (lp_content_type distinguishes
  -- 'module' vs 'quiz' sub-sessions) - only a real training_modules row can
  -- back a 'training' certificate.
  SELECT id, title, passing_score_percentage, validity_period_days, property_id, department_id
  INTO v_module_id, v_module_title, v_module_passing_score, v_module_validity_days, v_module_property_id, v_module_department_id
  FROM public.training_modules
  WHERE id = v_tp.training_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'This progress record is not tied to a training module';
  END IF;

  SELECT id, full_name, email INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  v_cert_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_verification_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  IF v_module_validity_days IS NOT NULL AND v_module_validity_days > 0 THEN
    v_expiry := coalesce(v_tp.completed_at, now()) + make_interval(days => v_module_validity_days);
  END IF;

  INSERT INTO public.certificates (
    user_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, completion_date, expiry_date,
    score, passing_score, training_module_id, training_progress_id,
    property_id, department_id, status
  ) VALUES (
    auth.uid(), coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    'training', v_cert_number, v_verification_code, coalesce(v_module_title, 'Training Module'),
    coalesce(v_tp.completed_at, now()), v_expiry,
    v_tp.score_percentage, v_module_passing_score, v_module_id, v_tp.id,
    v_module_property_id, v_module_department_id, 'active'
  )
  ON CONFLICT (training_progress_id) WHERE training_progress_id IS NOT NULL DO NOTHING
  RETURNING * INTO v_cert;

  IF v_cert.id IS NULL THEN
    SELECT * INTO v_cert FROM public.certificates
    WHERE training_progress_id = p_training_progress_id AND certificate_type = 'training' AND status = 'active';
  END IF;

  RETURN v_cert;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_training_certificate(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can insert certificates" ON public.certificates;
CREATE POLICY "Authenticated can insert certificates" ON public.certificates
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL) AND (
      has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr','property_hr','property_manager']::public.app_role[])
      OR ((user_id = (SELECT auth.uid())) AND certificate_type <> 'training')
    )
  );

-- ============================================================================
-- 2. user_achievements: "Users can earn achievements" lets any user insert an
--    arbitrary achievement_type/points row for themselves directly, bypassing
--    check_and_award_achievement's actual qualification logic entirely - no
--    legitimate call site inserts into this table directly (useAchievements.ts
--    calls the RPC). Also fixes the 6th auth.role()='authenticated' tautology
--    instance (view-all-achievements is intentionally public/social, so this
--    is a like-for-like predicate swap, not a scoping change) and adds the
--    unique constraint check_and_award_achievement's own race-condition fix
--    (below) depends on.
-- ============================================================================
DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

DROP POLICY IF EXISTS "Users can view all achievements" ON public.user_achievements;
CREATE POLICY "Users can view all achievements" ON public.user_achievements
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

ALTER TABLE public.user_achievements
  ADD CONSTRAINT ux_user_achievements_user_type UNIQUE (user_id, achievement_type);

CREATE OR REPLACE FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_definition RECORD;
    v_already_has BOOLEAN;
    v_qualifies BOOLEAN := false;
    v_training_count INTEGER;
    v_response_time DECIMAL;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_achievements
        WHERE user_id = p_user_id
          AND achievement_type = p_achievement_type
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN false;
    END IF;

    SELECT *
    INTO v_definition
    FROM public.achievement_definitions
    WHERE achievement_type = p_achievement_type
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    CASE p_achievement_type
        WHEN 'training_master' THEN
            SELECT COUNT(*)
            INTO v_training_count
            FROM public.training_progress
            WHERE user_id = p_user_id
              AND status = 'completed';

            v_qualifies := v_training_count >= COALESCE((v_definition.criteria->>'training_count')::INTEGER, 10);

        WHEN 'perfect_completion' THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.training_progress
                WHERE user_id = p_user_id
                  AND COALESCE(score_percentage, 0) = 100
            ) INTO v_qualifies;

        WHEN 'fast_responder' THEN
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            INTO v_response_time
            FROM public.tasks
            WHERE created_by = p_user_id
              AND status = 'completed'
              AND completed_at IS NOT NULL;

            v_qualifies := v_response_time IS NOT NULL
              AND v_response_time <= COALESCE((v_definition.criteria->>'max_hours')::INTEGER, 2);

        WHEN 'streak_master' THEN
            v_qualifies := false;

        ELSE
            v_qualifies := false;
    END CASE;

    IF v_qualifies THEN
        INSERT INTO public.user_achievements (
            user_id, achievement_type, title, description, icon, color, points
        ) VALUES (
            p_user_id, p_achievement_type, v_definition.title, v_definition.description,
            v_definition.icon, v_definition.color, v_definition.points
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING;

        RETURN FOUND;
    END IF;

    RETURN false;
END;
$function$;

-- ============================================================================
-- 3. vip_guest_preferences: SELECT is USING(true) - every authenticated user
--    can read guest PII (names, dietary/medical-adjacent notes) and
--    lifetime_spend_sar for every VIP guest at every property. The table has
--    no property_id to scope by, so mirror the roles already trusted with
--    write access on this table rather than inventing a new access model.
-- ============================================================================
DROP POLICY IF EXISTS vip_guest_preferences_select ON public.vip_guest_preferences;
CREATE POLICY vip_guest_preferences_select ON public.vip_guest_preferences
  FOR SELECT USING (
    has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager']::public.app_role[])
  );

-- ============================================================================
-- 4. delegations: the regional_admin/regional_hr/property_hr branches on
--    INSERT/UPDATE place no constraint on delegator_id, so any of those roles
--    could create a delegation "from" a higher-ranked user (e.g. a
--    corporate_admin) to a delegate of their choosing. Require the delegator
--    to be at or below the caller's own rank when acting on someone else's
--    behalf; self-delegation is unaffected.
-- ============================================================================
DROP POLICY IF EXISTS delegations_insert ON public.delegations;
CREATE POLICY delegations_insert ON public.delegations
  FOR INSERT
  WITH CHECK (
    (delegator_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['regional_admin','regional_hr','property_hr']::public.app_role[])
      AND get_user_role_priority(delegator_id) >= get_user_role_priority((SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS delegations_update ON public.delegations;
CREATE POLICY delegations_update ON public.delegations
  FOR UPDATE
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['regional_admin','regional_hr','property_hr']::public.app_role[])
      AND get_user_role_priority(delegator_id) >= get_user_role_priority((SELECT auth.uid()))
    )
  )
  WITH CHECK (
    (delegator_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['regional_admin','regional_hr','property_hr']::public.app_role[])
      AND get_user_role_priority(delegator_id) >= get_user_role_priority((SELECT auth.uid()))
    )
  );

-- ============================================================================
-- 5. capex_projects / capex_expenditures: has_property_access(property_id) is
--    OR'd directly against a role check (or absent entirely), so any staff
--    member merely assigned to a property - not just its managers - can
--    read/write/delete capital-expenditure financial data there. Require the
--    role check alongside property access; ownership branches (created_by /
--    project_manager_id) are unaffected.
-- ============================================================================
DROP POLICY IF EXISTS capex_projects_select ON public.capex_projects;
CREATE POLICY capex_projects_select ON public.capex_projects
  FOR SELECT USING (
    (created_by = (SELECT auth.uid()))
    OR (project_manager_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
      AND (property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    )
  );

DROP POLICY IF EXISTS capex_projects_update ON public.capex_projects;
CREATE POLICY capex_projects_update ON public.capex_projects
  FOR UPDATE
  USING (
    (created_by = (SELECT auth.uid()))
    OR (project_manager_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
      AND property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id)
    )
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR (project_manager_id = (SELECT auth.uid()))
    OR (
      has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
      AND property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id)
    )
  );

DROP POLICY IF EXISTS capex_projects_delete ON public.capex_projects;
CREATE POLICY capex_projects_delete ON public.capex_projects
  FOR DELETE USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id)
      AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager']::public.app_role[]))
    OR (property_id IS NULL AND has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin']::public.app_role[]))
  );

DROP POLICY IF EXISTS capex_expenditures_select ON public.capex_expenditures;
CREATE POLICY capex_expenditures_select ON public.capex_expenditures
  FOR SELECT USING (
    (created_by = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
            AND (p.property_id IS NULL OR has_property_access((SELECT auth.uid()), p.property_id))
          )
        )
    )
  );

DROP POLICY IF EXISTS capex_expenditures_insert ON public.capex_expenditures;
CREATE POLICY capex_expenditures_insert ON public.capex_expenditures
  FOR INSERT
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
            AND (p.property_id IS NULL OR has_property_access((SELECT auth.uid()), p.property_id))
          )
        )
    )
  );

DROP POLICY IF EXISTS capex_expenditures_update ON public.capex_expenditures;
CREATE POLICY capex_expenditures_update ON public.capex_expenditures
  FOR UPDATE
  USING (
    (created_by = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
            AND (p.property_id IS NULL OR has_property_access((SELECT auth.uid()), p.property_id))
          )
        )
    )
  );

DROP POLICY IF EXISTS capex_expenditures_delete ON public.capex_expenditures;
CREATE POLICY capex_expenditures_delete ON public.capex_expenditures
  FOR DELETE USING (
    (created_by = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.capex_projects p
      WHERE p.id = capex_expenditures.project_id
        AND (
          p.created_by = (SELECT auth.uid())
          OR p.project_manager_id = (SELECT auth.uid())
          OR (
            has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','property_manager','department_head']::public.app_role[])
            AND (p.property_id IS NULL OR has_property_access((SELECT auth.uid()), p.property_id))
          )
        )
    )
  );

-- ============================================================================
-- 6. shifts: insert/update/delete grant on bare property access (any staff
--    assigned to a property), OR'd with a management role list that's then
--    redundant. Any front-line staff member could create, retime, or delete
--    ANY colleague's shift at their property. Require property access AND a
--    management role; keep the existing self-edit branch on UPDATE.
-- ============================================================================
DROP POLICY IF EXISTS shifts_insert ON public.shifts;
CREATE POLICY shifts_insert ON public.shifts
  FOR INSERT
  WITH CHECK (
    check_property_access(property_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
    )
  );

DROP POLICY IF EXISTS shifts_update ON public.shifts;
CREATE POLICY shifts_update ON public.shifts
  FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()))
    OR (
      check_property_access(property_id)
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
          AND role = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
      )
    )
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR (
      check_property_access(property_id)
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
          AND role = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
      )
    )
  );

DROP POLICY IF EXISTS shifts_delete ON public.shifts;
CREATE POLICY shifts_delete ON public.shifts
  FOR DELETE
  USING (
    check_property_access(property_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::public.app_role[])
    )
  );

-- ============================================================================
-- 7. log_document_view / log_document_download: actor_id in the audit trail
--    was the caller-supplied p_user_id, not auth.uid() - any authenticated
--    user could attribute a document view/download to someone else. Derive
--    the actor from the session; the parameter is kept (signature-compatible
--    with existing call sites) but no longer trusted.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_view_id uuid; BEGIN
  INSERT INTO public.system_events(event_type, actor_id, entity_type, entity_id, metadata)
  VALUES ('doc_view', auth.uid(), 'document', p_document_id, '{}')
  RETURNING id INTO v_view_id;
  RETURN v_view_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet DEFAULT NULL::inet)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_log_id uuid; BEGIN
  INSERT INTO public.system_events(event_type, actor_id, entity_type, entity_id, ip_address, metadata)
  VALUES ('doc_download', auth.uid(), 'document', p_document_id, p_ip_address, '{}')
  RETURNING id INTO v_log_id;
  PERFORM public.increment_document_download_count(p_document_id);
  RETURN v_log_id;
END;
$function$;

-- ============================================================================
-- 8. create_notification: any authenticated user can send any other user a
--    notification with an arbitrary action_url - usable to phish a colleague
--    with a link that looks like it came from the app itself. Legitimate
--    call sites (bulk account actions, maintenance updates, request/task
--    flows) only ever pass relative in-app paths, so drop anything else
--    rather than gating who may call it (many real cross-user flows depend
--    on that staying open).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text,
  p_metadata jsonb DEFAULT NULL::jsonb, p_action_url text DEFAULT NULL::text,
  p_related_entity_type text DEFAULT NULL::text, p_related_entity_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id uuid;
  v_action_url text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_action_url := CASE WHEN p_action_url IS NOT NULL AND p_action_url LIKE '/%' THEN p_action_url ELSE NULL END;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, metadata, entity_type, entity_id
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, v_action_url,
    COALESCE(p_metadata, '{}'::jsonb), p_related_entity_type, p_related_entity_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;

-- ============================================================================
-- 9. Cron-only maintenance functions were granted to `authenticated`, letting
--    any logged-in user trigger a full audit-log purge, PII-log purge, or
--    document reindex on demand. These only ever run on a schedule
--    (pg_cron / service_role); no frontend call site invokes them.
-- ============================================================================
REVOKE ALL ON FUNCTION public.rebuild_document_search_index() FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs() FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_pii_access_logs() FROM authenticated;
REVOKE ALL ON FUNCTION public.archive_expired_documents() FROM authenticated;
REVOKE ALL ON FUNCTION public.auto_reactivate_suspended_accounts() FROM authenticated;
REVOKE ALL ON FUNCTION public.process_notification_batch(integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.rebuild_document_search_index() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_expired_documents() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_reactivate_suspended_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_notification_batch(integer) TO service_role;

-- ============================================================================
-- 10. disable_mfa: accepts p_password but never checks it against the user's
--     real password - the "confirm your password to disable MFA" step was
--     fake, so the self-only auth.uid() check was the entire protection.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.disable_mfa(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $function$
DECLARE v_user_record auth.users%ROWTYPE;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN false; END IF;
    SELECT * INTO v_user_record FROM auth.users WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN false; END IF;
    IF v_user_record.encrypted_password IS NULL
       OR extensions.crypt(p_password, v_user_record.encrypted_password) IS DISTINCT FROM v_user_record.encrypted_password THEN
        RETURN false;
    END IF;
    DELETE FROM public.mfa_secrets WHERE user_id = p_user_id;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'mfa', p_user_id,
        jsonb_build_object('security_event_type', 'mfa.disabled', 'severity', 'warning'));
    RETURN true;
END;
$function$;

-- ============================================================================
-- 11. fuzzy_search_documents: missing parens meant `title % query OR
--     (description % query AND is_archived = false AND <visibility>)` - a
--     title-only trigram match skipped BOTH the archived filter and the
--     entire visibility gate, returning archived and otherwise-inaccessible
--     documents to anyone. search_path lacked `extensions`, where
--     similarity()/`%` actually live.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, title text, description text, similarity real)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.description,
        GREATEST(
            similarity(d.title, p_query),
            similarity(COALESCE(d.description, ''), p_query)
        )::REAL AS similarity
    FROM documents d
    WHERE (d.title % p_query OR d.description % p_query)
      AND d.is_archived = FALSE
      AND (
          public.has_role(auth.uid(), 'regional_admin') OR
          public.has_role(auth.uid(), 'regional_hr') OR
          d.created_by = auth.uid() OR
          d.owner_id = auth.uid() OR
          (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id))
      )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$function$;

-- ============================================================================
-- 12. verify_certificate: matched on certificate_number as well as
--     verification_code. certificate_number is a predictable, displayed
--     identifier (CERT-YYYYMMDD-XXXXXX); allowing it to also authenticate a
--     verification lookup makes brute-forcing/enumerating live certificates
--     meaningfully easier than the random verification_code alone.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_certificate(verification_code_param character varying)
RETURNS TABLE(is_valid boolean, certificate_number character varying, verification_code character varying, recipient_name character varying, title character varying, certificate_type character varying, completion_date timestamp with time zone, expiry_date timestamp with time zone, status character varying, issued_at timestamp with time zone, property_name text, department_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.verification_code,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at,
    p.name as property_name,
    d.name as department_name
  FROM certificates c
  LEFT JOIN properties p ON p.id = c.property_id
  LEFT JOIN departments d ON d.id = c.department_id
  WHERE upper(c.verification_code) = upper(verification_code_param);
END;
$function$;
