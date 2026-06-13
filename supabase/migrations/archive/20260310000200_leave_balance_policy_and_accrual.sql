-- Leave balance policies + accrual-aware balance calculation
BEGIN;

CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type public.leave_type NOT NULL UNIQUE,
  entitlement_days numeric NOT NULL DEFAULT 25,
  accrual_method text NOT NULL DEFAULT 'monthly',
  accrual_rate numeric NULL,
  allow_carry_forward boolean NOT NULL DEFAULT false,
  max_carry_forward_days numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_policies'
      AND policyname = 'leave_policies_select'
  ) THEN
    CREATE POLICY leave_policies_select ON public.leave_policies
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_policies'
      AND policyname = 'leave_policies_admin_write'
  ) THEN
    CREATE POLICY leave_policies_admin_write ON public.leave_policies
      FOR ALL TO authenticated
      USING (
        public.has_role_optimized('corporate_admin'::public.app_role) OR
        public.has_role_optimized('regional_admin'::public.app_role) OR
        public.has_role_optimized('regional_hr'::public.app_role)
      )
      WITH CHECK (
        public.has_role_optimized('corporate_admin'::public.app_role) OR
        public.has_role_optimized('regional_admin'::public.app_role) OR
        public.has_role_optimized('regional_hr'::public.app_role)
      );
  END IF;
END $$;

INSERT INTO public.leave_policies (
  leave_type,
  entitlement_days,
  accrual_method,
  accrual_rate,
  allow_carry_forward,
  max_carry_forward_days
)
SELECT
  'annual'::public.leave_type,
  25,
  'monthly',
  NULL,
  true,
  5
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_policies WHERE leave_type = 'annual'::public.leave_type
);

CREATE OR REPLACE FUNCTION public.calculate_leave_days_in_year(
  start_date date,
  end_date date,
  year integer
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  range_start date := make_date(year, 1, 1);
  range_end date := make_date(year, 12, 31);
  bounded_start date;
  bounded_end date;
BEGIN
  IF start_date IS NULL OR end_date IS NULL THEN
    RETURN 0;
  END IF;

  bounded_start := GREATEST(start_date, range_start);
  bounded_end := LEAST(end_date, range_end);

  IF bounded_end < bounded_start THEN
    RETURN 0;
  END IF;

  RETURN (bounded_end - bounded_start) + 1;
END;
$$;

DROP FUNCTION IF EXISTS public.get_vacation_balance(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_vacation_balance(
  user_uuid uuid,
  year_filter integer DEFAULT NULL
) RETURNS TABLE(
  total_days numeric,
  used_days numeric,
  pending_days numeric,
  remaining_days numeric,
  carried_over numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_year integer := COALESCE(year_filter, EXTRACT(YEAR FROM CURRENT_DATE)::int);
  year_start date := make_date(target_year, 1, 1);
  year_end date := make_date(target_year, 12, 31);
  today date := CURRENT_DATE;
  policy_entitlement numeric := 25;
  policy_allow_carry boolean := false;
  policy_max_carry numeric := NULL;
  override_total numeric := NULL;
  override_carry numeric := NULL;
  hire_date date := NULL;
  accrual_start date := year_start;
  effective_date date := today;
  months_elapsed integer := 0;
  accrued_days numeric := 0;
  computed_carry numeric := 0;
  prev_total numeric := 0;
  prev_carry numeric := 0;
  prev_used numeric := 0;
  prev_pending numeric := 0;
  prev_remaining numeric := 0;
BEGIN
  -- policy defaults
  SELECT entitlement_days, allow_carry_forward, max_carry_forward_days
    INTO policy_entitlement, policy_allow_carry, policy_max_carry
  FROM public.leave_policies
  WHERE leave_type = 'annual'::public.leave_type
  LIMIT 1;

  policy_entitlement := COALESCE(policy_entitlement, 25);
  policy_allow_carry := COALESCE(policy_allow_carry, false);

  -- user overrides for the year
  SELECT total_days, carried_over
    INTO override_total, override_carry
  FROM public.user_vacation_balance
  WHERE user_id = user_uuid AND year = target_year;

  total_days := COALESCE(override_total, policy_entitlement);

  IF override_carry IS NOT NULL THEN
    computed_carry := override_carry;
  ELSIF policy_allow_carry THEN
    SELECT total_days, carried_over
      INTO prev_total, prev_carry
    FROM public.user_vacation_balance
    WHERE user_id = user_uuid AND year = target_year - 1;

    prev_total := COALESCE(prev_total, policy_entitlement);
    prev_carry := COALESCE(prev_carry, 0);

    SELECT
      COALESCE(SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status IN (
        'pending',
        'submitted',
        'pending_supervisor_approval',
        'pending_hr_review',
        'returned_for_correction'
      ) THEN days ELSE 0 END), 0)
      INTO prev_used, prev_pending
    FROM (
      SELECT
        status,
        public.calculate_leave_days_in_year(start_date, end_date, target_year - 1) AS days
      FROM public.leave_requests
      WHERE requester_id = user_uuid
        AND type = 'annual'::public.leave_type
        AND is_deleted = false
        AND start_date <= make_date(target_year - 1, 12, 31)
        AND end_date >= make_date(target_year - 1, 1, 1)
    ) prev_rows;

    prev_remaining := GREATEST(0, (prev_total + prev_carry) - prev_used - prev_pending);
    IF policy_max_carry IS NOT NULL THEN
      computed_carry := LEAST(prev_remaining, policy_max_carry);
    ELSE
      computed_carry := prev_remaining;
    END IF;
  ELSE
    computed_carry := 0;
  END IF;

  -- accrual start date
  SELECT hire_date INTO hire_date FROM public.profiles WHERE id = user_uuid;
  IF hire_date IS NOT NULL AND hire_date > year_start THEN
    accrual_start := hire_date;
  ELSE
    accrual_start := year_start;
  END IF;

  IF target_year < EXTRACT(YEAR FROM today)::int THEN
    effective_date := year_end;
  ELSIF target_year = EXTRACT(YEAR FROM today)::int THEN
    effective_date := today;
  ELSE
    effective_date := year_start - 1;
  END IF;

  IF effective_date < accrual_start THEN
    months_elapsed := 0;
  ELSE
    months_elapsed :=
      (EXTRACT(YEAR FROM effective_date)::int - EXTRACT(YEAR FROM accrual_start)::int) * 12 +
      (EXTRACT(MONTH FROM effective_date)::int - EXTRACT(MONTH FROM accrual_start)::int) + 1;
  END IF;

  accrued_days := ROUND((total_days / 12.0) * months_elapsed, 2);
  IF accrued_days > total_days THEN
    accrued_days := total_days;
  END IF;
  IF target_year < EXTRACT(YEAR FROM today)::int THEN
    accrued_days := total_days;
  END IF;
  IF target_year > EXTRACT(YEAR FROM today)::int THEN
    accrued_days := 0;
  END IF;

  -- used / pending within year
  SELECT
    COALESCE(SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN (
      'pending',
      'submitted',
      'pending_supervisor_approval',
      'pending_hr_review',
      'returned_for_correction'
    ) THEN days ELSE 0 END), 0)
    INTO used_days, pending_days
  FROM (
    SELECT
      status,
      public.calculate_leave_days_in_year(start_date, end_date, target_year) AS days
    FROM public.leave_requests
    WHERE requester_id = user_uuid
      AND type = 'annual'::public.leave_type
      AND is_deleted = false
      AND start_date <= year_end
      AND end_date >= year_start
  ) current_rows;

  carried_over := COALESCE(computed_carry, 0);
  remaining_days := GREATEST(0, (accrued_days + carried_over) - used_days - pending_days);

  RETURN NEXT;
END;
$$;

COMMIT;
