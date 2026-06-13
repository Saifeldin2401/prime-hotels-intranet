-- Create job posting system tables
-- Migration: 20250211100000_create_job_posting_system

-- Job Postings Table
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  seniority_level TEXT NOT NULL CHECK (seniority_level IN ('junior', 'mid', 'senior', 'manager', 'director', 'executive')),
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  salary_range_min DECIMAL,
  salary_range_max DECIMAL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'filled', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ
);

-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  cv_url TEXT,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected')),
  referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  routed_to UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add job_posting_id to employee_referrals if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_referrals' 
    AND column_name = 'job_posting_id'
  ) THEN
    ALTER TABLE employee_referrals 
    ADD COLUMN job_posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_property ON job_postings(property_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_by ON job_postings(created_by);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_referred_by ON job_applications(referred_by);

-- Enable RLS
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_postings
CREATE POLICY "Public can view open job postings" ON job_postings FOR SELECT TO public USING (status = 'open');
CREATE POLICY "Authenticated users can view job postings" ON job_postings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Regional admin/HR can manage all job postings" ON job_postings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can manage property job postings" ON job_postings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND up.property_id = job_postings.property_id));
CREATE POLICY "Property managers can manage property job postings" ON job_postings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_manager' AND up.property_id = job_postings.property_id));

-- RLS Policies for job_applications
CREATE POLICY "Public can submit applications" ON job_applications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view their referrals" ON job_applications FOR SELECT TO authenticated USING (referred_by = auth.uid());
CREATE POLICY "Regional admin/HR can view all applications" ON job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Regional admin/HR can update all applications" ON job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('regional_admin', 'regional_hr')));
CREATE POLICY "Property HR can view property applications" ON job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN job_postings jp ON jp.property_id = up.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND jp.id = job_applications.job_posting_id));
CREATE POLICY "Property HR can update property applications" ON job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN user_properties up ON up.user_id = ur.user_id JOIN job_postings jp ON jp.property_id = up.property_id WHERE ur.user_id = auth.uid() AND ur.role = 'property_hr' AND jp.id = job_applications.job_posting_id));
CREATE POLICY "Property managers can view routed applications" ON job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'property_manager' AND auth.uid() = ANY(job_applications.routed_to)));
CREATE POLICY "Property managers can update routed applications" ON job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'property_manager' AND auth.uid() = ANY(job_applications.routed_to)));

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON job_postings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
