-- Add job title and reporting line to profiles
ALTER TABLE profiles
  ADD COLUMN job_title TEXT,
  ADD COLUMN reporting_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for reporting_to lookups
CREATE INDEX idx_profiles_reporting_to ON profiles(reporting_to);

-- Create job title to role mappings table
CREATE TABLE job_title_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL UNIQUE,
  system_role app_role NOT NULL,
  category TEXT, -- e.g., 'front_office', 'housekeeping', 'food_beverage', 'management'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert common hotel job title mappings
INSERT INTO job_title_role_mappings (job_title, system_role, category) VALUES
  -- Staff Level Positions
  ('Front Desk Agent', 'staff', 'front_office'),
  ('Guest Service Agent', 'staff', 'front_office'),
  ('Night Auditor', 'staff', 'front_office'),
  ('Bellman', 'staff', 'front_office'),
  ('Concierge', 'staff', 'front_office'),
  ('Door Attendant', 'staff', 'front_office'),
  
  ('Room Attendant', 'staff', 'housekeeping'),
  ('Housekeeping Attendant', 'staff', 'housekeeping'),
  ('Laundry Attendant', 'staff', 'housekeeping'),
  ('Public Area Attendant', 'staff', 'housekeeping'),
  
  ('Server', 'staff', 'food_beverage'),
  ('Waiter', 'staff', 'food_beverage'),
  ('Bartender', 'staff', 'food_beverage'),
  ('Barista', 'staff', 'food_beverage'),
  ('Kitchen Steward', 'staff', 'food_beverage'),
  ('Commis Chef', 'staff', 'food_beverage'),
  
  ('Maintenance Technician', 'staff', 'engineering'),
  ('Engineering Attendant', 'staff', 'engineering'),
  
  ('Sales Coordinator', 'staff', 'sales'),
  ('Reservations Agent', 'staff', 'sales'),
  
  -- Department Head / Supervisor Level
  ('Front Office Supervisor', 'department_head', 'front_office'),
  ('Assistant Front Office Manager', 'department_head', 'front_office'),
  ('Front Office Manager', 'department_head', 'front_office'),
  ('Guest Relations Manager', 'department_head', 'front_office'),
  
  ('Housekeeping Supervisor', 'department_head', 'housekeeping'),
  ('Assistant Executive Housekeeper', 'department_head', 'housekeeping'),
  ('Executive Housekeeper', 'department_head', 'housekeeping'),
  ('Laundry Manager', 'department_head', 'housekeeping'),
  
  ('Restaurant Supervisor', 'department_head', 'food_beverage'),
  ('Restaurant Manager', 'department_head', 'food_beverage'),
  ('Sous Chef', 'department_head', 'food_beverage'),
  ('Chef de Partie', 'department_head', 'food_beverage'),
  ('Banquet Manager', 'department_head', 'food_beverage'),
  ('Bar Manager', 'department_head', 'food_beverage'),
  
  ('Chief Engineer', 'department_head', 'engineering'),
  ('Maintenance Manager', 'department_head', 'engineering'),
  ('Assistant Chief Engineer', 'department_head', 'engineering'),
  
  ('Sales Manager', 'department_head', 'sales'),
  ('Revenue Manager', 'department_head', 'sales'),
  
  ('Security Manager', 'department_head', 'security'),
  ('Recreation Manager', 'department_head', 'recreation'),
  ('Spa Manager', 'department_head', 'spa'),
  
  -- Food & Beverage Management
  ('Food & Beverage Manager', 'department_head', 'food_beverage'),
  ('F&B Manager', 'department_head', 'food_beverage'),
  ('Executive Chef', 'department_head', 'food_beverage'),
  
  -- Property HR Level
  ('HR Coordinator', 'property_hr', 'human_resources'),
  ('HR Officer', 'property_hr', 'human_resources'),
  ('Property HR Manager', 'property_hr', 'human_resources'),
  ('Cluster HR Manager', 'property_hr', 'human_resources'),
  ('Learning & Development Coordinator', 'property_hr', 'human_resources'),
  
  -- Property Manager Level
  ('General Manager', 'property_manager', 'management'),
  ('Hotel Manager', 'property_manager', 'management'),
  ('Resident Manager', 'property_manager', 'management'),
  ('Assistant General Manager', 'property_manager', 'management'),
  
  -- Corporate HR Level
  ('Corporate HR Manager', 'regional_hr', 'corporate'),
  ('Regional HR Manager', 'regional_hr', 'corporate'),
  ('HR Director', 'regional_hr', 'corporate'),
  ('Corporate Learning & Development Manager', 'regional_hr', 'corporate'),
  ('Corporate Talent Acquisition Manager', 'regional_hr', 'corporate'),
  
  -- Corporate Admin Level
  ('Area General Manager', 'regional_admin', 'corporate'),
  ('Regional Director', 'regional_admin', 'corporate'),
  ('Vice President of Operations', 'regional_admin', 'corporate'),
  ('Director of Operations', 'regional_admin', 'corporate'),
  ('Corporate Operations Manager', 'regional_admin', 'corporate'),
  ('Chief Operating Officer', 'regional_admin', 'corporate');

-- Create function to suggest system role based on job title
CREATE OR REPLACE FUNCTION suggest_system_role(p_job_title TEXT)
RETURNS app_role AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Try exact match first
  SELECT system_role INTO v_role
  FROM job_title_role_mappings
  WHERE LOWER(job_title) = LOWER(p_job_title)
  LIMIT 1;
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  -- Try partial match for common patterns
  IF p_job_title ILIKE '%manager%' OR p_job_title ILIKE '%chef%' OR p_job_title ILIKE '%supervisor%' THEN
    RETURN 'department_head'::app_role;
  ELSIF p_job_title ILIKE '%director%' OR p_job_title ILIKE '%vp%' OR p_job_title ILIKE '%vice president%' THEN
    RETURN 'regional_admin'::app_role;
  ELSIF p_job_title ILIKE '%hr%' AND (p_job_title ILIKE '%corporate%' OR p_job_title ILIKE '%regional%') THEN
    RETURN 'regional_hr'::app_role;
  ELSIF p_job_title ILIKE '%hr%' THEN
    RETURN 'property_hr'::app_role;
  ELSIF p_job_title ILIKE '%general manager%' OR p_job_title ILIKE '%gm%' THEN
    RETURN 'property_manager'::app_role;
  ELSE
    -- Default to staff for unknown titles
    RETURN 'staff'::app_role;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing profiles with default job titles based on their current role
-- This gives them a starting point that admins can update
UPDATE profiles p
SET job_title = CASE
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'regional_admin'
  ) THEN 'Regional Director'
  
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'regional_hr'
  ) THEN 'Regional HR Manager'
  
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'property_manager'
  ) THEN 'General Manager'
  
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'property_hr'
  ) THEN 'Property HR Manager'
  
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'department_head'
  ) THEN 'Department Manager'
  
  WHEN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'staff'
  ) THEN 'Staff Member'
  
  ELSE 'Employee'
END
WHERE job_title IS NULL;

-- Comment explaining the migration
COMMENT ON COLUMN profiles.job_title IS 'Actual hotel job title (e.g., Front Office Manager, Room Attendant) - displayed in UI';
COMMENT ON COLUMN profiles.reporting_to IS 'UUID of the employee this person reports to (supervisor/manager)';
COMMENT ON TABLE job_title_role_mappings IS 'Maps hotel job titles to system permission roles for auto-suggestion';
