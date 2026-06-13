-- Create promotion and transfer tracking tables
-- Migration: 20250211110000_create_promotion_transfer_system

-- Employee Promotions Table
CREATE TABLE IF NOT EXISTS employee_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_role TEXT,
  to_role TEXT NOT NULL,
  from_title TEXT,
  to_title TEXT NOT NULL,
  from_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Transfers Table
CREATE TABLE IF NOT EXISTS employee_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  to_property_id UUID REFERENCES properties(id) NOT NULL,
  from_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_promotions_employee ON employee_promotions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_effective_date ON employee_promotions(effective_date);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee ON employee_transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_effective_date ON employee_transfers(effective_date);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_from_property ON employee_transfers(from_property_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_to_property ON employee_transfers(to_property_id);

-- Enable Row Level Security
ALTER TABLE employee_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_promotions

-- Users can view their own promotion history
CREATE POLICY "Users can view own promotions"
  ON employee_promotions
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Regional admin and regional HR can view all promotions
CREATE POLICY "Regional admin/HR can view all promotions"
  ON employee_promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Property HR can view promotions for their property employees
CREATE POLICY "Property HR can view property promotions"
  ON employee_promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN user_properties emp_up ON emp_up.user_id = employee_promotions.employee_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'property_hr'
      AND up.property_id = emp_up.property_id
    )
  );

-- Regional admin and regional HR can create promotions
CREATE POLICY "Regional admin/HR can create promotions"
  ON employee_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Property HR can create promotions for their property employees
CREATE POLICY "Property HR can create property promotions"
  ON employee_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN user_properties emp_up ON emp_up.user_id = employee_promotions.employee_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'property_hr'
      AND up.property_id = emp_up.property_id
    )
  );

-- RLS Policies for employee_transfers

-- Users can view their own transfer history
CREATE POLICY "Users can view own transfers"
  ON employee_transfers
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Regional admin and regional HR can view all transfers
CREATE POLICY "Regional admin/HR can view all transfers"
  ON employee_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Property HR can view transfers involving their property
CREATE POLICY "Property HR can view property transfers"
  ON employee_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'property_hr'
      AND (up.property_id = employee_transfers.from_property_id OR up.property_id = employee_transfers.to_property_id)
    )
  );

-- Only regional admin and regional HR can create transfers (cross-property moves)
CREATE POLICY "Regional admin/HR can create transfers"
  ON employee_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('regional_admin', 'regional_hr')
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_employee_promotions_updated_at
  BEFORE UPDATE ON employee_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_transfers_updated_at
  BEFORE UPDATE ON employee_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update user_roles and user_properties on promotion/transfer
CREATE OR REPLACE FUNCTION apply_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply if effective date is today or in the past
  IF NEW.effective_date <= CURRENT_DATE THEN
    -- Update user role if role changed
    IF NEW.to_role IS NOT NULL AND NEW.to_role != NEW.from_role THEN
      UPDATE user_roles
      SET role = NEW.to_role::text
      WHERE user_id = NEW.employee_id;
    END IF;
    
    -- Update department if changed
    IF NEW.to_department_id IS NOT NULL AND NEW.to_department_id != NEW.from_department_id THEN
      UPDATE user_departments
      SET department_id = NEW.to_department_id
      WHERE user_id = NEW.employee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply if effective date is today or in the past
  IF NEW.effective_date <= CURRENT_DATE THEN
    -- Update property
    UPDATE user_properties
    SET property_id = NEW.to_property_id
    WHERE user_id = NEW.employee_id;
    
    -- Update department if specified
    IF NEW.to_department_id IS NOT NULL THEN
      UPDATE user_departments
      SET department_id = NEW.to_department_id
      WHERE user_id = NEW.employee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-apply promotions and transfers
CREATE TRIGGER auto_apply_promotion
  AFTER INSERT ON employee_promotions
  FOR EACH ROW
  EXECUTE FUNCTION apply_promotion();

CREATE TRIGGER auto_apply_transfer
  AFTER INSERT ON employee_transfers
  FOR EACH ROW
  EXECUTE FUNCTION apply_transfer();
