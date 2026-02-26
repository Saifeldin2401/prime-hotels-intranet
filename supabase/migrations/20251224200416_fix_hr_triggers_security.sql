-- ============================================
-- FIX HR TRIGGERS (PROMOTIONS, TRANSFERS, ROLE ASSIGNMENTS)
-- Make functions SECURITY DEFINER so they bypass RLS
-- ============================================

-- 1. Secure apply_promotion
CREATE OR REPLACE FUNCTION apply_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Fixes RLS blocking HR from updating user roles
SET search_path = public
AS $$
BEGIN
  IF NEW.effective_date <= CURRENT_DATE THEN
    -- Update Role
    IF NEW.to_role IS NOT NULL AND NEW.to_role != NEW.from_role THEN
      UPDATE user_roles 
      SET role = NEW.to_role::text 
      WHERE user_id = NEW.employee_id;
    END IF;
    
    -- Update Department
    IF NEW.to_department_id IS NOT NULL AND NEW.to_department_id != NEW.from_department_id THEN
      -- Delete old department first (to be safe with constraints)
      DELETE FROM user_departments WHERE user_id = NEW.employee_id;
      -- Insert new
      INSERT INTO user_departments (user_id, department_id, is_primary)
      VALUES (NEW.employee_id, NEW.to_department_id, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Secure apply_transfer
CREATE OR REPLACE FUNCTION apply_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Fixes RLS blocking HR from updating user properties
SET search_path = public
AS $$
BEGIN
  IF NEW.effective_date <= CURRENT_DATE THEN
    -- Update Property
    UPDATE user_properties 
    SET property_id = NEW.to_property_id 
    WHERE user_id = NEW.employee_id;
    
    -- Update Department
    IF NEW.to_department_id IS NOT NULL THEN
       DELETE FROM user_departments WHERE user_id = NEW.employee_id;
       INSERT INTO user_departments (user_id, department_id, is_primary)
       VALUES (NEW.employee_id, NEW.to_department_id, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Secure handle_new_user_training
CREATE OR REPLACE FUNCTION handle_new_user_training()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Allows assignment creation regardless of invoker
SET search_path = public
AS $$
BEGIN
  -- Insert learning assignments for the new user based on their role
  INSERT INTO public.learning_assignments (
    target_type,
    target_id,
    content_type,
    content_id,
    due_date,
    assigned_by,
    created_at
  )
  SELECT
    'user',
    NEW.user_id::text,
    'module',
    tar.training_module_id,
    (NOW() + interval '30 days'),
    -- Use a system ID or the user themselves as 'assigned_by' to avoid foreign key issues
    -- Ideally this should be the system admin UUID, but we'll use the user for now 
    -- or NULL if allowed (it is nullable)
    NULL, 
    NOW()
  FROM public.training_assignment_rules tar
  WHERE tar.target_role = NEW.role::text 
    AND tar.is_active = true
    AND tar.training_module_id IS NOT NULL;

  RETURN NEW;
END;
$$;;
