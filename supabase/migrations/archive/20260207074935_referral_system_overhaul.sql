-- Centralized referral tracking, CV storage, and history

-- 1) Extend job_applications to store secure CV metadata
ALTER TABLE IF EXISTS public.job_applications
  ADD COLUMN IF NOT EXISTS cv_bucket text,
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS cv_filename text,
  ADD COLUMN IF NOT EXISTS cv_mime text,
  ADD COLUMN IF NOT EXISTS cv_size integer,
  ADD COLUMN IF NOT EXISTS referral_source text;

-- 2) Referral history for full traceability
CREATE TABLE IF NOT EXISTS public.referral_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_history_referral_id_idx
  ON public.referral_history(referral_id);

CREATE INDEX IF NOT EXISTS referral_history_created_at_idx
  ON public.referral_history(created_at);

ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_history_select" ON public.referral_history;
CREATE POLICY "referral_history_select"
  ON public.referral_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_applications ja
      WHERE ja.id = referral_id
        AND (
          ja.referred_by = auth.uid()
          OR is_hr(auth.uid())
          OR is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "referral_history_insert" ON public.referral_history;
CREATE POLICY "referral_history_insert"
  ON public.referral_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.job_applications ja
      WHERE ja.id = referral_id
        AND (is_hr(auth.uid()) OR is_admin(auth.uid()))
    )
  );

-- 3) Private storage bucket for referral CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('referral-cvs', 'referral-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for referral CVs (owner or HR)
DROP POLICY IF EXISTS "referral_cvs_insert_own" ON storage.objects;
CREATE POLICY "referral_cvs_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'referral-cvs'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

DROP POLICY IF EXISTS "referral_cvs_select_owner_or_hr" ON storage.objects;
CREATE POLICY "referral_cvs_select_owner_or_hr"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'referral-cvs'
    AND (
      split_part(name, '/', 2) = auth.uid()::text
      OR is_hr(auth.uid())
      OR is_admin(auth.uid())
    )
  );

-- 4) Trigger to log history + notifications for referrals
CREATE OR REPLACE FUNCTION public.handle_referral_history_and_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_title text;
BEGIN
  -- Only for referrals (employee-submitted)
  IF COALESCE(NEW.referred_by, OLD.referred_by) IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'Referral submitted');

    SELECT title INTO job_title FROM public.job_postings WHERE id = NEW.job_posting_id;

    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    SELECT DISTINCT ur.user_id,
      'referral_status_update',
      'New referral submitted',
      COALESCE(NEW.applicant_name, 'Candidate') || ' was referred for ' || COALESCE(job_title, 'a role') || '.',
      'job_application',
      NEW.id,
      jsonb_build_object('status', NEW.status, 'job_posting_id', NEW.job_posting_id)
    FROM public.user_roles ur
    WHERE ur.role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager');

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
      VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);

      IF NEW.referred_by IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
        VALUES (
          NEW.referred_by,
          'referral_status_update',
          'Referral status updated',
          COALESCE(NEW.applicant_name, 'Candidate') || ' status changed to ' || NEW.status || '.',
          'job_application',
          NEW.id,
          jsonb_build_object('status', NEW.status, 'job_posting_id', NEW.job_posting_id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referral_history_after_insert ON public.job_applications;
CREATE TRIGGER referral_history_after_insert
AFTER INSERT ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_referral_history_and_notifications();

DROP TRIGGER IF EXISTS referral_history_after_update ON public.job_applications;
CREATE TRIGGER referral_history_after_update
AFTER UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_referral_history_and_notifications();;
