ALTER TABLE public.inbound_emails
  ADD COLUMN IF NOT EXISTS html TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS headers JSONB,
  ADD COLUMN IF NOT EXISTS reply_to TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS raw_download_url TEXT,
  ADD COLUMN IF NOT EXISTS raw_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_downloads JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS content_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_fetch_error TEXT;

CREATE INDEX IF NOT EXISTS inbound_emails_content_fetched_at_idx ON public.inbound_emails(content_fetched_at DESC);
