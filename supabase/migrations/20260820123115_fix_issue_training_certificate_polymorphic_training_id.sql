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
