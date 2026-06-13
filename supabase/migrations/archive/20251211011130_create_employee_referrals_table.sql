CREATE TABLE employee_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_by UUID REFERENCES profiles(id) NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  candidate_phone TEXT,
  position_applied TEXT,
  department TEXT,
  property_id UUID REFERENCES properties(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'interview_scheduled', 'offer_extended', 'accepted', 'rejected', 'withdrawn')),
  referral_date DATE,
  hire_date DATE,
  bonus_amount DECIMAL(10,2),
  bonus_status TEXT DEFAULT 'pending' CHECK (bonus_status IN ('pending', 'approved', 'paid', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_referrals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view referrals they made" ON employee_referrals
  FOR SELECT USING (
    referred_by = auth.uid()
  );

CREATE POLICY "Users can create referrals" ON employee_referrals
  FOR INSERT WITH CHECK (
    referred_by = auth.uid()
  );

CREATE POLICY "Users can update their own referrals" ON employee_referrals
  FOR UPDATE USING (
    referred_by = auth.uid()
  );

-- HR and managers can view referrals for their property/department
CREATE POLICY "HR can view all referrals for their property" ON employee_referrals
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('regional_hr', 'property_hr')
    ) AND
    property_id IN (
      SELECT property_id FROM user_properties WHERE user_id = auth.uid()
    )
  );;
