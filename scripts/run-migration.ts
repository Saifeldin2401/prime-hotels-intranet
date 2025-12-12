/**
 * Run this script to apply the conversations table migration
 * 
 * Instructions:
 * 1. Open your Supabase Dashboard: https://supabase.com/dashboard
 * 2. Go to SQL Editor
 * 3. Copy the SQL from the migration file below
 * 4. Run it
 */

import { createClient } from '@supabase/supabase-js'

// You need to set these environment variables or replace them directly
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htsvjfrofcpkfzvjpwvx.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running conversations table migration...')

  const migrationSQL = `
-- Create document category type
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM ('cv', 'certificate', 'contract', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category document_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: View (Self + HR/Admins)
CREATE POLICY "Users can view own documents" ON employee_documents
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- Policy: Insert (Self only)
CREATE POLICY "Users can upload own documents" ON employee_documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Delete (Self only)
CREATE POLICY "Users can delete own documents" ON employee_documents
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to upload to employee-documents bucket
CREATE POLICY "Authenticated users can upload to employee-documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to read from employee-documents bucket
CREATE POLICY "Authenticated users can read employee-documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own files
-- Note: 'owner' column in storage.objects refers to the uploader's uuid
CREATE POLICY "Users can delete own employee-documents files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-documents' AND
    auth.uid() = owner
  );
`

  try {
    // Note: Supabase JS client doesn't support running raw SQL directly
    // You need to use the Supabase Dashboard SQL Editor or REST API
    console.log('\n⚠️  IMPORTANT: Supabase JS client cannot run DDL statements.')
    console.log('\nPlease run this SQL in your Supabase Dashboard:')
    console.log('1. Go to: https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/sql')
    console.log('2. Click "New Query"')
    console.log('3. Copy the SQL from: supabase/migrations/20250211000000_create_conversations.sql')
    console.log('4. Paste and run it\n')

    console.log('Migration SQL:')
    console.log(migrationSQL)
  } catch (error) {
    console.error('Error:', error)
  }
}

runMigration()
