-- Advisor: materialized_view_in_api. The sop_document_search matview (internal SOP
-- search index) was granted full access to anon and authenticated. SOPs are internal
-- content and the index is queried via a SECURITY DEFINER RPC, so anon needs no access.
REVOKE ALL ON public.sop_document_search FROM anon;
REVOKE ALL ON public.sop_document_search FROM authenticated;
GRANT SELECT ON public.sop_document_search TO authenticated;
