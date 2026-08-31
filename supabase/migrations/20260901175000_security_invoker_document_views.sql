-- Phase 2 (security triage): documents_sop_v / documents_article_v were SECURITY DEFINER
-- (owner=postgres, no security_invoker) AND granted to anon -> unauthenticated full read of
-- every SOP and article across all tenants, bypassing documents RLS entirely.
-- Neither view is queried by app code or edge functions (only referenced as FK metadata in
-- generated types), so locking them down is zero-risk.
-- Applied to live project dhbfaclkfysqwfppuxxa as recorded migration 20260831070339.

ALTER VIEW public.documents_sop_v SET (security_invoker = true);
ALTER VIEW public.documents_article_v SET (security_invoker = true);

REVOKE ALL ON public.documents_sop_v FROM anon;
REVOKE ALL ON public.documents_article_v FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.documents_sop_v FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.documents_article_v FROM authenticated;
GRANT SELECT ON public.documents_sop_v TO authenticated;
GRANT SELECT ON public.documents_article_v TO authenticated;
