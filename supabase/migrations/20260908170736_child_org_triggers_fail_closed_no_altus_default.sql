-- Audit Critical #1 (real form): the child-organization_id triggers
-- (set_training_child_org / set_documents_child_org / set_announcement_child_org,
-- on ~30 tables) fell back to the hardcoded Altus org
-- 'e0000000-0000-0000-0000-000000000001' via COALESCE whenever the parent row's
-- organization_id could not be resolved — a single-tenant assumption in the
-- write path.
--
-- Fix: resolve strictly from the parent; if that yields NULL, FAIL the write
-- (ERRCODE 23502) instead of defaulting to a tenant.

BEGIN;

-- 1. Backfill pre-existing orphans so the stricter triggers don't break
--    legitimate follow-on writes.
UPDATE public.training_progress tp
SET organization_id = COALESCE(tm.organization_id, c.organization_id)
FROM public.training_modules tm
FULL JOIN public.courses c ON c.id = tm.id
WHERE tp.organization_id IS NULL
  AND (tm.id = tp.training_id OR c.id = tp.training_id)
  AND COALESCE(tm.organization_id, c.organization_id) IS NOT NULL;

UPDATE public.training_paths p
SET organization_id = sub.org
FROM (
  SELECT tpm.path_id, MIN(tm.organization_id::text)::uuid AS org
  FROM public.training_path_modules tpm
  JOIN public.training_modules tm ON tm.id = tpm.module_id
  WHERE tm.organization_id IS NOT NULL
  GROUP BY tpm.path_id
) sub
WHERE p.id = sub.path_id AND p.organization_id IS NULL;

-- 2. Rewrite the three trigger functions: fail closed, no tenant default.
CREATE OR REPLACE FUNCTION public.set_training_child_org()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_fk text := TG_ARGV[0];
  v_parent text := TG_ARGV[1];
  v_fkval uuid;
  v_org uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT p.organization_id FROM public.%I p WHERE p.id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve organization for % via %.% = % — parent row missing or has no organization_id',
      TG_TABLE_NAME, v_parent, v_fk, v_fkval USING ERRCODE = '23502';
  END IF;

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)',
      NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_documents_child_org()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_fk text := TG_ARGV[0];
  v_fkval uuid;
  v_org uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    SELECT d.organization_id INTO v_org FROM public.documents d WHERE d.id = v_fkval;
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve organization for % via documents.% = % — parent document missing or has no organization_id',
      TG_TABLE_NAME, v_fk, v_fkval USING ERRCODE = '23502';
  END IF;

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)',
      NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_announcement_child_org()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.announcement_id IS NOT NULL THEN
    SELECT a.organization_id INTO v_org FROM public.announcements a WHERE a.id = NEW.announcement_id;
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve organization for % — announcement % missing or has no organization_id',
      TG_TABLE_NAME, NEW.announcement_id USING ERRCODE = '23502';
  END IF;

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> v_org THEN
    RAISE EXCEPTION 'Cross-tenant violation: child organization_id (%) does not match parent (%)',
      NEW.organization_id, v_org USING ERRCODE = '42501';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;

COMMIT;
