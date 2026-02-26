-- Payslips storage bucket + secure download RPC
-- Created: 2026-02-06

-- Create private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payslips',
  'payslips',
  false,
  20 * 1024 * 1024,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "payslips_select_own_or_hr" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.has_role_optimized('corporate_admin'::public.app_role) OR
      public.has_role_optimized('regional_admin'::public.app_role) OR
      public.has_role_optimized('regional_hr'::public.app_role) OR
      public.has_role_optimized('property_hr'::public.app_role)
    )
  );

CREATE POLICY "payslips_insert_hr" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payslips'
    AND (
      public.has_role_optimized('corporate_admin'::public.app_role) OR
      public.has_role_optimized('regional_admin'::public.app_role) OR
      public.has_role_optimized('regional_hr'::public.app_role) OR
      public.has_role_optimized('property_hr'::public.app_role)
    )
  );

CREATE POLICY "payslips_update_hr" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      public.has_role_optimized('corporate_admin'::public.app_role) OR
      public.has_role_optimized('regional_admin'::public.app_role) OR
      public.has_role_optimized('regional_hr'::public.app_role) OR
      public.has_role_optimized('property_hr'::public.app_role)
    )
  );

CREATE POLICY "payslips_delete_hr" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      public.has_role_optimized('corporate_admin'::public.app_role) OR
      public.has_role_optimized('regional_admin'::public.app_role) OR
      public.has_role_optimized('regional_hr'::public.app_role) OR
      public.has_role_optimized('property_hr'::public.app_role)
    )
  );

-- Secure signed URL generator
CREATE OR REPLACE FUNCTION public.get_secure_payslip_url(p_payslip_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  signed_url TEXT;
BEGIN
  SELECT * INTO p FROM public.payslips WHERE id = p_payslip_id LIMIT 1;

  IF p IS NULL THEN
    RAISE EXCEPTION 'Payslip not found';
  END IF;

  IF p.storage_path IS NULL THEN
    RAISE EXCEPTION 'Payslip file not available';
  END IF;

  IF p.employee_id <> auth.uid()
     AND NOT (
       public.has_role_optimized('corporate_admin'::public.app_role) OR
       public.has_role_optimized('regional_admin'::public.app_role) OR
       public.has_role_optimized('regional_hr'::public.app_role) OR
       public.has_role_optimized('property_hr'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'Not authorized to access this payslip';
  END IF;

  SELECT storage.create_signed_url('payslips', p.storage_path, 3600) INTO signed_url;

  RETURN signed_url;
END;
$$;;
