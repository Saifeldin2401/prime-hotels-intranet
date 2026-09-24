-- Content-gap analytics: nothing currently records when a KB search comes back empty,
-- so "N people searched X and found nothing" -- the highest-signal input to a content
-- roadmap -- was thrown away. Log zero-result searches only (not every search, to keep
-- volume low and avoid capturing normal successful-search query text at scale).

CREATE TABLE IF NOT EXISTS public.search_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    query          text NOT NULL,
    result_count   integer NOT NULL DEFAULT 0,
    department_id  uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    property_id    uuid REFERENCES public.properties(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.search_logs IS
    'Knowledge base searches that returned zero results, for content-gap analytics.';

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON public.search_logs (lower(query));

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_logs_insert ON public.search_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Read restricted to the same admin/content-management roles used elsewhere for
-- knowledge analytics; individual searches are not exposed to other regular staff.
CREATE POLICY search_logs_select ON public.search_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
    )
);

REVOKE ALL ON public.search_logs FROM PUBLIC;
GRANT SELECT, INSERT ON public.search_logs TO authenticated;
