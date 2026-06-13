BEGIN;

ALTER TABLE public.guest_reviews
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.guest_review_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_listing_url text,
  ADD COLUMN IF NOT EXISTS reviewer_location text,
  ADD COLUMN IF NOT EXISTS reviewer_avatar_url text,
  ADD COLUMN IF NOT EXISTS reviewer_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_text_normalized text,
  ADD COLUMN IF NOT EXISTS review_language text,
  ADD COLUMN IF NOT EXISTS original_rating_scale numeric(6,2),
  ADD COLUMN IF NOT EXISTS sentiment_score numeric(6,2),
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_ar text,
  ADD COLUMN IF NOT EXISTS manager_brief_ar text,
  ADD COLUMN IF NOT EXISTS positive_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS first_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dedupe_hash text,
  ADD COLUMN IF NOT EXISTS external_posting_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.guest_review_issues
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS polarity public.review_sentiment,
  ADD COLUMN IF NOT EXISTS issue_summary_ar text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.guest_review_assignments
  ADD COLUMN IF NOT EXISTS backup_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issue_categories public.guest_review_issue_category[] NOT NULL DEFAULT '{}'::public.guest_review_issue_category[],
  ADD COLUMN IF NOT EXISTS issue_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS is_secondary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routing_reason text,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notification_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.guest_review_responses
  ADD COLUMN IF NOT EXISTS selected_tone public.guest_review_tone_profile NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proof_note text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guest_review_responses_review_id_key'
  ) THEN
    ALTER TABLE public.guest_review_responses
      ADD CONSTRAINT guest_review_responses_review_id_key UNIQUE (review_id);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_reviews_dedupe_hash
  ON public.guest_reviews(dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_review_issues_review
  ON public.guest_review_issues(review_id, category);

COMMIT;
NOTIFY pgrst, 'reload schema';
