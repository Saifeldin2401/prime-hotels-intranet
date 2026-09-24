-- The public marketing site's "Request Partner Briefing" dialog (wired to 7 CTA buttons on
-- PublicHome.tsx) only showed a success toast and discarded every submission -- no network call
-- was ever made. This table gives it somewhere real to land.
CREATE TABLE public.partner_briefing_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (char_length(btrim(name)) > 0),
    email text NOT NULL CHECK (char_length(btrim(email)) > 0),
    phone text,
    organization text,
    mandate_type text,
    message text,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_briefing_requests IS
    'Anonymous public-site lead capture from the "Request Partner Briefing" dialog on PublicHome.tsx. Not part of the internal CRM pipeline (crm_leads) -- these are unauthenticated inbound inquiries awaiting triage.';

ALTER TABLE public.partner_briefing_requests ENABLE ROW LEVEL SECURITY;

-- Public unauthenticated form: anyone can submit a briefing request.
CREATE POLICY "partner_briefing_requests_insert_anon"
ON public.partner_briefing_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- This is inbound business data, not something other anonymous visitors (or non-admin staff)
-- should be able to read back. Restrict SELECT to admin-tier roles only.
CREATE POLICY "partner_briefing_requests_select_admin"
ON public.partner_briefing_requests
FOR SELECT
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

-- Admins triaging inbound requests need to update status (new -> contacted -> qualified/archived).
CREATE POLICY "partner_briefing_requests_update_admin"
ON public.partner_briefing_requests
FOR UPDATE
TO authenticated
USING (public.is_admin((SELECT auth.uid())))
WITH CHECK (public.is_admin((SELECT auth.uid())));

GRANT INSERT ON public.partner_briefing_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.partner_briefing_requests TO authenticated;
