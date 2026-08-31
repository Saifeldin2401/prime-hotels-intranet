import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const migrationsDir = path.resolve('supabase', 'migrations')
const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

const failures = []

for (const file of files) {
    const fullPath = path.join(migrationsDir, file)
    const size = statSync(fullPath).size
    if (size === 0) {
        failures.push(`${file}: empty migration file`)
        continue
    }

    const content = readFileSync(fullPath, 'utf8')
    if (content.includes('<<<<<<<') || content.includes('>>>>>>>')) {
        failures.push(`${file}: contains unresolved merge markers`)
    }
}

if (failures.length > 0) {
    console.error('Migration validation failed:')
    for (const failure of failures) {
        console.error(`- ${failure}`)
    }
    process.exit(1)
}

console.log(`Migration validation passed for ${files.length} SQL files.`)
