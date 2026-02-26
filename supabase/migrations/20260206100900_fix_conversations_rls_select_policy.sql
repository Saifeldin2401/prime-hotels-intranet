DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.conversations;

CREATE POLICY "Users can view conversations they are part of"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));;
