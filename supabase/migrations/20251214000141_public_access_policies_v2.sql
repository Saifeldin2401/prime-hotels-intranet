
-- Allow public read access to published announcements based on date
CREATE POLICY "announcements_select_public" ON "public"."announcements"
AS PERMISSIVE FOR SELECT
TO public
USING (
  ((expires_at IS NULL) OR (expires_at > now())) 
  AND ((scheduled_at IS NULL) OR (scheduled_at <= now()))
);

-- Allow public read access to profiles
CREATE POLICY "profiles_select_public" ON "public"."profiles"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Allow public read access to properties
CREATE POLICY "properties_select_public" ON "public"."properties"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
;
