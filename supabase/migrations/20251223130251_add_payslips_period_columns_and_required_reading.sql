-- Add period_start and period_end to payslips (derived from month/year)
ALTER TABLE public.payslips
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date;

-- Backfill period_start and period_end from month/year if they exist
UPDATE public.payslips
SET 
  period_start = make_date(year, month, 1),
  period_end = (make_date(year, month, 1) + interval '1 month - 1 day')::date
WHERE period_start IS NULL AND month IS NOT NULL AND year IS NOT NULL;

-- Create knowledge_required_reading table
CREATE TABLE IF NOT EXISTS public.knowledge_required_reading (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Enable RLS
ALTER TABLE public.knowledge_required_reading ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own required reading"
  ON public.knowledge_required_reading FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage required reading"
  ON public.knowledge_required_reading FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('regional_admin', 'regional_hr', 'property_hr')
    )
  );

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_required_reading_user 
  ON public.knowledge_required_reading(user_id, acknowledged_at);;
