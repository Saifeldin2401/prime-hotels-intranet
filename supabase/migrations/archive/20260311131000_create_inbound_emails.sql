-- Create inbound email storage for Resend receiving webhooks

CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID,
  message_id TEXT,
  "from" TEXT,
  "to" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  cc TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  bcc TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  subject TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  received_created_at TIMESTAMPTZ,
  webhook_created_at TIMESTAMPTZ,
  event_type TEXT NOT NULL DEFAULT 'email.received',
  raw_event JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbound_emails_email_id_key ON public.inbound_emails(email_id);
CREATE INDEX IF NOT EXISTS inbound_emails_created_at_idx ON public.inbound_emails(created_at DESC);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only read access (service role bypasses RLS)
DROP POLICY IF EXISTS inbound_emails_admin_read ON public.inbound_emails;
CREATE POLICY inbound_emails_admin_read
  ON public.inbound_emails
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr')
  );
