CREATE TABLE IF NOT EXISTS public.platform_role_map (
  legacy_role   public.app_role PRIMARY KEY,
  platform_role public.app_role NOT NULL,
  notes         text
);

INSERT INTO public.platform_role_map (legacy_role, platform_role, notes) VALUES
  ('staff',            'learner',          'consume training + KB, take quizzes'),
  ('manager',          'learner',          'no distinct manager tier in the learning product'),
  ('department_head',  'author',           'authors modules/quizzes/questions for own scope'),
  ('property_hr',      'training_manager', 'assigns training, reviews progress; also knowledge_manager subset'),
  ('regional_hr',      'training_manager', 'assigns training org-wide, reviews progress'),
  ('property_manager', 'training_manager', 'business call: curates/assigns learning, not platform admin'),
  ('regional_admin',   'training_manager', 'business call: curates/assigns learning, not platform admin'),
  ('corporate_admin',  'administrator',    'full platform + user/role administration'),
  ('super_admin',      'administrator',    'full platform + user/role administration')
ON CONFLICT (legacy_role) DO UPDATE
  SET platform_role = EXCLUDED.platform_role, notes = EXCLUDED.notes;

CREATE TABLE IF NOT EXISTS public.platform_role_map_extra (
  legacy_role   public.app_role NOT NULL,
  platform_role public.app_role NOT NULL,
  PRIMARY KEY (legacy_role, platform_role)
);
INSERT INTO public.platform_role_map_extra (legacy_role, platform_role) VALUES
  ('property_hr', 'knowledge_manager'),
  ('regional_hr', 'knowledge_manager'),
  ('super_admin', 'training_manager'),
  ('corporate_admin', 'training_manager')
ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_role_map        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_map_extra  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_role_map_read       ON public.platform_role_map;
DROP POLICY IF EXISTS platform_role_map_extra_read ON public.platform_role_map_extra;
CREATE POLICY platform_role_map_read       ON public.platform_role_map       FOR SELECT TO authenticated USING (true);
CREATE POLICY platform_role_map_extra_read ON public.platform_role_map_extra FOR SELECT TO authenticated USING (true);

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, m.platform_role
FROM public.user_roles ur
JOIN public.platform_role_map m ON m.legacy_role = ur.role
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, x.platform_role
FROM public.user_roles ur
JOIN public.platform_role_map_extra x ON x.legacy_role = ur.role
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, 'learner'::public.app_role
FROM public.user_roles ur
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.roles_satisfying(_role public.app_role)
RETURNS public.app_role[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT ARRAY(
    SELECT DISTINCT r FROM (
      SELECT _role AS r
      UNION ALL SELECT legacy_role   FROM platform_role_map        WHERE platform_role = _role
      UNION ALL SELECT legacy_role   FROM platform_role_map_extra  WHERE platform_role = _role
      UNION ALL SELECT platform_role FROM platform_role_map        WHERE legacy_role   = _role
      UNION ALL SELECT 'administrator'::app_role
      UNION ALL SELECT 'training_manager'::app_role
        WHERE _role IN ('author','knowledge_manager','learner')
      UNION ALL SELECT 'knowledge_manager'::app_role WHERE _role = 'learner'
      UNION ALL SELECT 'author'::app_role            WHERE _role = 'learner'
      UNION ALL SELECT 'super_admin'::app_role
      UNION ALL SELECT 'corporate_admin'::app_role WHERE _role <> 'super_admin'
    ) s
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY (public.roles_satisfying(_role))
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(_roles) req
    WHERE public.has_role(_user_id, req)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(_user_id, 'administrator'::public.app_role); $$;

CREATE OR REPLACE FUNCTION public.is_training_manager(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(_user_id, 'training_manager'::public.app_role); $$;

CREATE OR REPLACE FUNCTION public.is_content_author(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(_user_id, 'author'::public.app_role); $$;

CREATE OR REPLACE FUNCTION public.is_knowledge_manager(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(_user_id, 'knowledge_manager'::public.app_role); $$;

GRANT EXECUTE ON FUNCTION public.roles_satisfying(public.app_role)      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid)               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_training_manager(uuid)             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_content_author(uuid)              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_knowledge_manager(uuid)           TO authenticated, anon;
