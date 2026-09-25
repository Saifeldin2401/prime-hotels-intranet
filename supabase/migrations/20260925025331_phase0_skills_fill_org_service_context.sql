-- Only signed-in tenant users are forced into their organization. Trusted
-- server contexts (migrations, seeds, service-role jobs: no auth.uid()) may
-- add platform-library skills; RLS still blocks anon and tenant users.
CREATE OR REPLACE FUNCTION public.tg_skills_fill_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL AND NOT public.is_platform_operator() THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'organization_id is required for skills' USING ERRCODE = '23502';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
