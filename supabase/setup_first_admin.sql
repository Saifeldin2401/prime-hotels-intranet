-- Setup Script for First Admin User
-- Run this in Supabase SQL Editor after creating a user via Authentication dashboard

-- Step 1: Create a user via Supabase Dashboard → Authentication → Users → Add User
-- Use email: admin@primehotels.com (or your preferred email)
-- Set a password

-- Step 2: Update the email below and run this script
DO $$
DECLARE
  admin_email TEXT := 'admin@primehotels.com'; -- CHANGE THIS to your admin email
  admin_user_id UUID;
  test_property_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please create the user first in Authentication dashboard.', admin_email;
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
  
  -- Create a test property
  INSERT INTO properties (name, address, phone, is_active)
  VALUES ('Prime Hotel - Main', '123 Hotel Street', '+1234567890', true)
  RETURNING id INTO test_property_id;
  
  -- Assign property to admin
  INSERT INTO user_properties (user_id, property_id)
  VALUES (admin_user_id, test_property_id)
  ON CONFLICT (user_id, property_id) DO NOTHING;
  
  -- Create some test departments
  INSERT INTO departments (property_id, name, is_active)
  VALUES 
    (test_property_id, 'Front Office', true),
    (test_property_id, 'Housekeeping', true),
    (test_property_id, 'Food & Beverage', true),
    (test_property_id, 'Maintenance', true)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Admin user setup complete! User ID: %, Property ID: %', admin_user_id, test_property_id;
END $$;


