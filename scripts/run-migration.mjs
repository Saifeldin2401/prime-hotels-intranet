import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration(filePath) {
  const migrationSQL = readFileSync(filePath, 'utf8')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log(`Applying migration: ${filePath}`)

    // Split by -- END_STATEMENT or just try to execute the whole thing if it's one function
    // For functions, splitting by ; is dangerous.
    // Let's try to execute the whole thing if it contains CREATE OR REPLACE FUNCTION

    if (migrationSQL.includes('CREATE OR REPLACE FUNCTION')) {
        const { error } = await supabase.rpc('exec_sql', { sql_statement: migrationSQL })
        if (error) throw error
    } else {
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

        for (const statement of statements) {
          const { error } = await supabase.rpc('exec_sql', { sql_statement: statement })
          if (error) throw error
        }
    }

    console.log('Migration applied successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

const filePath = process.argv[2]
if (!filePath) {
    console.error('Usage: node run-migration.mjs <path-to-sql>')
    process.exit(1)
}
runMigration(filePath)
