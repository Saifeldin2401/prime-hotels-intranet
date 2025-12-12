import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://htsvjfrofcpkfzvjpwvx.supabase.co'
const supabaseKey = 'sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyLeaveMigration() {
  try {
    console.log('Applying leave_requests migration...')
    
    // Create the enum types first
    console.log('Creating leave_request_status enum...')
    const { error: statusError } = await supabase.rpc('exec_sql', {
      sql_statement: "CREATE TYPE IF NOT EXISTS leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled')"
    })
    
    if (statusError && !statusError.message?.includes('already exists')) {
      console.error('Error creating status enum:', statusError)
    }
    
    console.log('Creating leave_type enum...')
    const { error: typeError } = await supabase.rpc('exec_sql', {
      sql_statement: "CREATE TYPE IF NOT EXISTS leave_type AS ENUM ('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'personal', 'other')"
    })
    
    if (typeError && !typeError.message?.includes('already exists')) {
      console.error('Error creating type enum:', typeError)
    }
    
    // Create the table
    console.log('Creating leave_requests table...')
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        type leave_type NOT NULL,
        reason TEXT,
        status leave_request_status NOT NULL DEFAULT 'pending',
        approved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        rejected_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (end_date >= start_date)
      )
    `
    
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql_statement: createTableSQL
    })
    
    if (tableError) {
      console.error('Error creating table:', tableError)
      throw tableError
    }
    
    // Create RLS policies
    console.log('Creating RLS policies...')
    const rlsPolicies = [
      // Enable RLS
      "ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY",
      
      // Users can see their own requests
      "CREATE POLICY IF NOT EXISTS users_view_own_leave ON leave_requests FOR SELECT USING (auth.uid() = requester_id)",
      
      // Users can insert their own requests
      "CREATE POLICY IF NOT EXISTS users_insert_own_leave ON leave_requests FOR INSERT WITH CHECK (auth.uid() = requester_id)",
      
      // Users can update their own requests (only cancel pending ones)
      "CREATE POLICY IF NOT EXISTS users_update_own_leave ON leave_requests FOR UPDATE USING (auth.uid() = requester_id AND status = 'pending')",
      
      // Department heads can see requests for their departments
      "CREATE POLICY IF NOT EXISTS dept_heads_view_dept_leave ON leave_requests FOR SELECT USING (EXISTS (SELECT 1 FROM user_departments WHERE user_id = auth.uid() AND department_id = leave_requests.department_id))",
      
      // Property HR/Managers can see requests for their properties
      "CREATE POLICY IF NOT EXISTS property_staff_view_property_leave ON leave_requests FOR SELECT USING (EXISTS (SELECT 1 FROM user_properties WHERE user_id = auth.uid() AND property_id = leave_requests.property_id))",
      
      // Regional admins and HR can see all requests
      "CREATE POLICY IF NOT EXISTS regional_admins_view_all_leave ON leave_requests FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr')))",
      
      // Approvers can update requests
      "CREATE POLICY IF NOT EXISTS approvers_update_leave ON leave_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')))"
    ]
    
    for (const policy of rlsPolicies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql_statement: policy
      })
      
      if (policyError && !policyError.message?.includes('already exists')) {
        console.error('Error creating policy:', policyError)
      }
    }
    
    // Create trigger for updated_at
    console.log('Creating updated_at trigger...')
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language plpgsql;
      
      DROP TRIGGER IF EXISTS update_leave_requests_updated_at_trigger ON leave_requests;
      CREATE TRIGGER update_leave_requests_updated_at_trigger
        BEFORE UPDATE ON leave_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_leave_requests_updated_at();
    `
    
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql_statement: triggerSQL
    })
    
    if (triggerError) {
      console.error('Error creating trigger:', triggerError)
      throw triggerError
    }
    
    console.log('Migration applied successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

applyLeaveMigration()
