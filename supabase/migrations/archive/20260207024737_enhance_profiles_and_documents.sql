-- Enhance profiles table with emergency contact and identity fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS staff_id TEXT;

-- Enhance employee_documents table with expiry tracking
ALTER TABLE public.employee_documents
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring_soon', 'pending_verification'));

-- Create an index for expiry date queries
CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry_date ON public.employee_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_employee_documents_user_id ON public.employee_documents(user_id);
;
