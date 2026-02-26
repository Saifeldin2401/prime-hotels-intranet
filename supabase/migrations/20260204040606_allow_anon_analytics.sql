/*
  Allow anonymous users to insert analytics events.
  This is required for tracking events before login (validation errors, failures, landing page visits).
*/

CREATE POLICY "Anonymous users can insert events" 
  ON analytics_events 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);
;
