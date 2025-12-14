-- Certificate System Migration
-- Enterprise-grade certificate storage with verification and audit trail

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Certificate identification
  certificate_number VARCHAR(20) UNIQUE NOT NULL,
  verification_code VARCHAR(32) UNIQUE NOT NULL,
  
  -- Recipient information
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255),
  
  -- Certificate type and source
  certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('training', 'sop_quiz', 'compliance', 'achievement')),
  
  -- Source references (mutually exclusive based on type)
  training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL,
  training_progress_id UUID REFERENCES training_progress(id) ON DELETE SET NULL,
  sop_id UUID REFERENCES sop_documents(id) ON DELETE SET NULL,
  quiz_attempt_id UUID REFERENCES sop_quiz_attempts(id) ON DELETE SET NULL,
  
  -- Certificate content
  title VARCHAR(500) NOT NULL,
  description TEXT,
  completion_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,
  score DECIMAL(5,2),
  passing_score DECIMAL(5,2),
  
  -- Property and department context
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Status and verification
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'superseded')),
  revocation_reason TEXT,
  revoked_by UUID REFERENCES profiles(id),
  revoked_at TIMESTAMPTZ,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadata
  issued_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificate history for audit trail
CREATE TABLE IF NOT EXISTS certificate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'viewed', 'downloaded', 'verified', 'revoked', 'reinstated', 'updated')),
  performed_by UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_training ON certificates(training_module_id);
CREATE INDEX IF NOT EXISTS idx_certificates_sop ON certificates(sop_id);
CREATE INDEX IF NOT EXISTS idx_certificate_history_cert ON certificate_history(certificate_id);

-- Function to generate unique certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  prefix VARCHAR(4);
  year_code VARCHAR(2);
  seq_num INTEGER;
  cert_number VARCHAR(20);
BEGIN
  prefix := 'PHC-'; -- Prime Hotels Certificate
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 8 FOR 6) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM certificates
  WHERE certificate_number LIKE prefix || year_code || '-%';
  
  cert_number := prefix || year_code || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS VARCHAR(32) AS $$
BEGIN
  RETURN UPPER(ENCODE(gen_random_bytes(16), 'hex'));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate certificate number and verification code
CREATE OR REPLACE FUNCTION set_certificate_identifiers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := generate_verification_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_certificate_identifiers
  BEFORE INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_identifiers();

-- Trigger to update updated_at
CREATE TRIGGER trigger_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT
  USING (user_id = auth.uid());

-- Managers can view certificates for their properties
CREATE POLICY "Managers can view property certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.property_id = certificates.property_id
      AND ur.role IN ('property_manager', 'property_hr', 'department_head')
    )
  );

-- Regional admins can view all certificates
CREATE POLICY "Regional admins can view all certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('regional_admin', 'regional_hr')
    )
  );

-- System can insert certificates (via service role)
CREATE POLICY "Service can insert certificates"
  ON certificates FOR INSERT
  WITH CHECK (true);

-- Certificate history policies
CREATE POLICY "Users can view own certificate history"
  ON certificate_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM certificates c
      WHERE c.id = certificate_history.certificate_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all certificate history"
  ON certificate_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('regional_admin', 'regional_hr', 'property_hr')
    )
  );

-- Public verification function (no auth required)
CREATE OR REPLACE FUNCTION verify_certificate(verification_code_param VARCHAR)
RETURNS TABLE (
  is_valid BOOLEAN,
  certificate_number VARCHAR,
  recipient_name VARCHAR,
  title VARCHAR,
  certificate_type VARCHAR,
  completion_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  status VARCHAR,
  issued_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at
  FROM certificates c
  WHERE c.verification_code = verification_code_param;
  
  -- Log the verification attempt
  INSERT INTO certificate_history (certificate_id, action, details)
  SELECT id, 'verified', '{"source": "public"}'::jsonb
  FROM certificates
  WHERE verification_code = verification_code_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
