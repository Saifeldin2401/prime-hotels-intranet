-- issue_manual_certificate read fields of an unassigned record for
-- non-training certificates. Use scalar variables instead.
CREATE OR REPLACE FUNCTION public.issue_manual_certificate(
  p_organization_id uuid,
  p_user_id uuid,
  p_certificate_type text,
  p_title text,
  p_completion_date timestamptz,
  p_description text DEFAULT NULL,
  p_training_module_id uuid DEFAULT NULL,
  p_expiry_date timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_module_org uuid;
  v_passing_score integer;
  v_validity_days integer;
  v_profile record;
  v_cert public.certificates;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501', HINT = 'AUTH_REQUIRED';
  END IF;

  IF NOT public.can_issue_certificates(p_organization_id) THEN
    RAISE EXCEPTION 'You are not allowed to issue certificates for this organization'
      USING ERRCODE = '42501', HINT = 'CERT_NOT_ALLOWED';
  END IF;

  IF p_user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot issue a certificate to yourself'
      USING ERRCODE = '42501', HINT = 'CERT_SELF_ISSUE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
     WHERE user_id = p_user_id AND organization_id = p_organization_id AND is_active
  ) THEN
    RAISE EXCEPTION 'The recipient is not an active member of this organization'
      USING ERRCODE = 'P0001', HINT = 'CERT_RECIPIENT_NOT_MEMBER';
  END IF;

  IF p_certificate_type NOT IN ('training', 'sop_quiz', 'compliance', 'achievement') THEN
    RAISE EXCEPTION 'Unknown certificate type' USING ERRCODE = '22023', HINT = 'CERT_INVALID_TYPE';
  END IF;

  IF v_title = '' OR length(v_title) > 200 THEN
    RAISE EXCEPTION 'Title is required (max 200 characters)' USING ERRCODE = '22023', HINT = 'CERT_INVALID_TITLE';
  END IF;

  IF p_completion_date IS NULL OR p_completion_date > now() + interval '1 day' THEN
    RAISE EXCEPTION 'Completion date cannot be in the future' USING ERRCODE = '22023', HINT = 'CERT_INVALID_DATE';
  END IF;

  IF p_expiry_date IS NOT NULL AND p_expiry_date <= p_completion_date THEN
    RAISE EXCEPTION 'Expiry date must be after the completion date' USING ERRCODE = '22023', HINT = 'CERT_INVALID_DATE';
  END IF;

  IF p_certificate_type = 'training' THEN
    SELECT organization_id, passing_score_percentage, validity_period_days
      INTO v_module_org, v_passing_score, v_validity_days
      FROM public.training_modules
     WHERE id = p_training_module_id;
    IF v_module_org IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Select a course from this organization' USING ERRCODE = 'P0001', HINT = 'CERT_INVALID_COURSE';
    END IF;
  END IF;

  SELECT full_name, email INTO v_profile FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.certificates (
    user_id, organization_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, description, completion_date,
    expiry_date, passing_score, training_module_id, issued_by, status, metadata
  ) VALUES (
    p_user_id, p_organization_id,
    coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    p_certificate_type, public.generate_certificate_number(), public.generate_verification_code(),
    v_title, p_description, p_completion_date,
    coalesce(p_expiry_date,
             CASE WHEN v_validity_days > 0
                  THEN p_completion_date + make_interval(days => v_validity_days) END),
    v_passing_score,
    CASE WHEN p_certificate_type = 'training' THEN p_training_module_id END,
    v_uid, 'active',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'manual', 'issued_by', v_uid)
  )
  RETURNING * INTO v_cert;

  PERFORM public.emit_platform_event(
    'certificate.issued_manually', p_organization_id, 'certificate', v_cert.id::text,
    jsonb_build_object('recipient_id', p_user_id, 'certificate_type', p_certificate_type, 'issued_by', v_uid)
  );

  RETURN v_cert;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_manual_certificate(uuid, uuid, text, text, timestamptz, text, uuid, timestamptz, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_manual_certificate(uuid, uuid, text, text, timestamptz, text, uuid, timestamptz, jsonb) TO authenticated;
