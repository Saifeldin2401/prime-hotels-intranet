-- Governance Phase 1 Preflight Checks
-- Run this in staging before applying any governance migration.
-- Expected behavior:
--   - Raises exception if critical prerequisites are missing
--   - Emits informational counts for data-quality visibility

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table: public.profiles';
  END IF;
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table: public.user_roles';
  END IF;
  IF to_regclass('public.properties') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table: public.properties';
  END IF;
  IF to_regclass('public.departments') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table: public.departments';
  END IF;
END $$;

DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM (VALUES
    ('corporate_admin'),
    ('regional_admin'),
    ('regional_hr'),
    ('property_manager'),
    ('property_hr'),
    ('department_head'),
    ('manager'),
    ('staff')
  ) AS required(role_name)
  WHERE required.role_name NOT IN (
    SELECT enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
  );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'app_role enum is missing one or more required legacy roles';
  END IF;
END $$;

-- Guard against accidental re-apply into already activated scope.
DO $$
BEGIN
  IF to_regclass('public.gov_feature_flags') IS NOT NULL THEN
    RAISE NOTICE 'governance tables already exist. This run is preflight-only.';
  END IF;
END $$;

-- Data quality visibility checks (informational only)
SELECT 'inactive_profiles' AS check_name, COUNT(*)::bigint AS value
FROM public.profiles
WHERE COALESCE(is_active, true) = false;

SELECT 'users_without_roles' AS check_name, COUNT(*)::bigint AS value
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

SELECT 'users_with_multi_roles' AS check_name, COUNT(*)::bigint AS value
FROM (
  SELECT user_id
  FROM public.user_roles
  GROUP BY user_id
  HAVING COUNT(*) > 1
) x;

SELECT 'active_properties' AS check_name, COUNT(*)::bigint AS value
FROM public.properties
WHERE COALESCE(is_active, true);

SELECT 'active_departments' AS check_name, COUNT(*)::bigint AS value
FROM public.departments
WHERE COALESCE(is_active, true);

SELECT 'departments_without_property' AS check_name, COUNT(*)::bigint AS value
FROM public.departments
WHERE property_id IS NULL;

SELECT 'profiles_without_reporting_to' AS check_name, COUNT(*)::bigint AS value
FROM public.profiles
WHERE reporting_to IS NULL;

COMMIT;
