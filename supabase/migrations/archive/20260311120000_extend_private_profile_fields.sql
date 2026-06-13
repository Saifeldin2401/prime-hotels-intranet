-- Extend private profile RPC to include additional sensitive fields for reporting and HR views.

CREATE OR REPLACE FUNCTION public.get_employee_private_profile(
  p_profile_id uuid,
  p_reason text DEFAULT 'profile_private_view'
)
RETURNS TABLE (
  date_of_birth date,
  employee_id text,
  emergency_contact_name text,
  emergency_contact_phone text,
  national_id text,
  salary_grade text,
  phone text,
  nationality text,
  blood_group text,
  iqama_number text,
  iqama_expiry date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF v_uid <> p_profile_id AND NOT public.is_hr_or_admin(v_uid) THEN
    RAISE EXCEPTION 'Access denied to private profile data' USING ERRCODE = '42501';
  END IF;

  IF v_uid <> p_profile_id THEN
    PERFORM public.log_pii_access(
      p_profile_id,
      ARRAY[
        'date_of_birth',
        'staff_id',
        'emergency_contact_name',
        'emergency_contact_phone',
        'national_id',
        'salary_grade',
        'phone',
        'nationality',
        'blood_group',
        'iqama_number',
        'iqama_expiry'
      ]::text[],
      p_reason
    );
  END IF;

  RETURN QUERY
  SELECT
    p.date_of_birth,
    p.staff_id AS employee_id,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.national_id,
    p.salary_grade,
    p.phone,
    p.nationality,
    p.blood_group,
    p.iqama_number,
    p.iqama_expiry
  FROM public.profiles p
  WHERE p.id = p_profile_id
    AND COALESCE(p.is_deleted, false) = false;
END;
$$;

NOTIFY pgrst, 'reload schema';
