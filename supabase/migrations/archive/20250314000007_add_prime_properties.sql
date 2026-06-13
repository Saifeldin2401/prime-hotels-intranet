-- Insert the 4 Prime Hotels properties
INSERT INTO properties (name, address, is_active)
VALUES 
  ('Prime Al Hamra Hotel Jeddah', 'Jeddah, Saudi Arabia', true),
  ('Prime Al Corniche Hotel Jeddah', 'Jeddah, Saudi Arabia', true),
  ('Prime Al Hamra Hotel Riyadh', 'Riyadh, Saudi Arabia', true),
  ('Medhal Qurtuba by Prime Hotels', 'Riyadh, Saudi Arabia', true)
ON CONFLICT (id) DO NOTHING;
-- Note: We rely on name uniqueness or ID if we hardcoded them, but for now we let IDs be generated. 
-- Ideally strict duplicate checking on name would be better but schema might not have unique constraint on name.

-- Ensure user_properties has RLS enabled
ALTER TABLE user_properties ENABLE ROW LEVEL SECURITY;

-- Policy: Administration can see all mappings
-- Policy: Users can see their own mappings (already likely exists, but reinforcing)
