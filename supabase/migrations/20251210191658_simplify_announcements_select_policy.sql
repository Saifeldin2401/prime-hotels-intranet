-- Relax announcements SELECT policy to avoid 500 errors and allow all authenticated users to read active announcements
DROP POLICY IF EXISTS "announcements_select_by_target" ON announcements;

CREATE POLICY "announcements_select_all_authenticated"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now()) AND
    (scheduled_at IS NULL OR scheduled_at <= now())
  );;
