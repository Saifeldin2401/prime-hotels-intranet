-- Create Admin User Setup Script
-- Run this AFTER creating a user via Supabase Dashboard → Authentication → Users

-- STEP 1: First, create a user via Supabase Dashboard:
--   - Go to: https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/auth/users
--   - Click "Add User" → "Create new user"
--   - Enter email and password
--   - Check "Auto Confirm User"
--   - Click "Create User"

-- STEP 2: Update the email below and run this script:

DO $$
DECLARE
  admin_email TEXT := 'admin@primehotels.com'; -- ⚠️ CHANGE THIS to your admin email
  admin_user_id UUID;
  test_property_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '❌ User with email % not found. Please create the user first in Authentication dashboard.', admin_email;
  END IF;
  
  -- Update profile
  UPDATE profiles 
  SET full_name = 'System Administrator',
      is_active = true
  WHERE id = admin_user_id;
  
  -- Assign regional_admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (admin_user_id, 'regional_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Get or create test property
  SELECT id INTO test_property_id
  FROM properties
  WHERE name = 'Prime Hotel - Main'
  LIMIT 1;
  
  IF test_property_id IS NULL THEN
    INSERT INTO properties (name, address, phone, is_active)
    VALUES ('Prime Hotel - Main', '123 Hotel Street', '+1234567890', true)
    RETURNING id INTO test_property_id;
  END IF;
  
  -- Assign property to admin
  INSERT INTO user_properties (user_id, property_id)
  VALUES (admin_user_id, test_property_id)
  ON CONFLICT (user_id, property_id) DO NOTHING;
  
  -- Create departments if they don't exist
  INSERT INTO departments (property_id, name, is_active)
  SELECT test_property_id, dept_name, true
  FROM (VALUES 
    ('Front Office'),
    ('Housekeeping'),
    ('Food & Beverage'),
    ('Maintenance'),
    ('Security'),
    ('Management')
  ) AS depts(dept_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM departments 
    WHERE property_id = test_property_id AND name = dept_name
  );
  
  RAISE NOTICE '✅ Admin user setup complete!';
  RAISE NOTICE '   User ID: %', admin_user_id;
  RAISE NOTICE '   Property ID: %', test_property_id;
  RAISE NOTICE '   Email: %', admin_email;
END $$;

-- Verify setup
SELECT 
  p.email,
  p.full_name,
  ur.role,
  pr.name as property_name,
  COUNT(DISTINCT d.id) as department_count
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN user_properties up ON up.user_id = p.id
LEFT JOIN properties pr ON pr.id = up.property_id
LEFT JOIN departments d ON d.property_id = pr.id
WHERE ur.role = 'regional_admin'
GROUP BY p.email, p.full_name, ur.role, pr.name;


