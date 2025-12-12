import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read the migration file
const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250301000002_create_leave_requests.sql')
const migrationSQL = readFileSync(migrationPath, 'utf8')

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htsvjfrofcpkfzvjpwvx.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    console.log('Applying leave_requests migration...')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql_statement: statement })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        throw error
      }
    }

    console.log('Migration applied successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

applyMigration
