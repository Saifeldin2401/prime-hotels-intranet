-- ============================================================================
-- Make corporate_admin and super_admin true top-of-hierarchy roles.
--
-- The authz layer (role-helper functions + ~52 RLS policies) only recognized
-- regional_admin / regional_hr, so corporate_admin (enum order 0.5, the
-- designated top role) was silently locked out of nearly every manage/write
-- operation: adding/editing users, managing training, departments, etc.
--
-- This change is ADDITIVE: it only elevates the two top roles
-- (super_admin, corporate_admin) and does NOT alter the relative semantics of
-- any mid-tier role (manager/HR/department_head/staff stay exactly as before).
-- ============================================================================

-- 1. Role-helper functions ----------------------------------------------------
--    super_admin satisfies every check; corporate_admin satisfies every check
--    except an explicit super_admin check.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  )
  OR (
    _role <> 'super_admin' AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = _user_id AND role IN ('super_admin', 'corporate_admin')
    )
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin', 'corporate_admin')
      AND (
        ur.role = 'super_admin'
        OR EXISTS (SELECT 1 FROM unnest(_roles) r WHERE r <> 'super_admin')
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_admin.user_id
      AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_regional_admin_or_higher(user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = $1
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_properties WHERE user_id = _user_id AND property_id = _property_id
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  )
$function$;

-- 2. Direct-subquery policies -------------------------------------------------
--    Inject super_admin + corporate_admin next to every regional_admin role
--    literal (both ::app_role and ::text, scalar `= x` and `= ANY(ARRAY[...])`
--    forms). Skips policies already referencing corporate_admin or routing
--    through has_role/has_any_role (covered by the function fixes above).
CREATE OR REPLACE FUNCTION pg_temp._inject_admin_roles(expr text) RETURNS text
LANGUAGE sql AS $f$
  SELECT CASE WHEN expr IS NULL THEN NULL ELSE
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(expr,
      '= ''regional_admin''::app_role',
      '= ANY (ARRAY[''super_admin''::app_role, ''corporate_admin''::app_role, ''REGADMINTOKEN''::app_role])'),
      '= ''regional_admin''::text',
      '= ANY (ARRAY[''super_admin''::text, ''corporate_admin''::text, ''REGADMINTOKEN''::text])'),
      '''regional_admin''::app_role',
      '''super_admin''::app_role, ''corporate_admin''::app_role, ''regional_admin''::app_role'),
      '''regional_admin''::text',
      '''super_admin''::text, ''corporate_admin''::text, ''regional_admin''::text'),
      '''REGADMINTOKEN''::app_role', '''regional_admin''::app_role'),
      '''REGADMINTOKEN''::text', '''regional_admin''::text')
  END
$f$;

DO $do$
DECLARE
  r RECORD;
  v_using TEXT;
  v_check TEXT;
  v_sql TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS nsp, c.relname AS rel, p.polname AS pol,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (pg_get_expr(p.polqual,p.polrelid) ILIKE '%regional_admin%'
           OR pg_get_expr(p.polwithcheck,p.polrelid) ILIKE '%regional_admin%')
      AND (COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),'')) NOT ILIKE '%corporate_admin%'
      AND (COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),'')) NOT ILIKE '%has_role%'
      AND (COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),'')) NOT ILIKE '%has_any_role%'
  LOOP
    v_using := pg_temp._inject_admin_roles(r.using_expr);
    v_check := pg_temp._inject_admin_roles(r.check_expr);

    v_sql := format('ALTER POLICY %I ON %I.%I', r.pol, r.nsp, r.rel);
    IF v_using IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END $do$;
