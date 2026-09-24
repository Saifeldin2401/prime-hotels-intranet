import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import * as pgQuery from 'libpg-query'

// Every SQL file we ship must be non-empty, free of merge markers and valid
// PostgreSQL (parsed with libpg_query, the real server parser).
const sqlDirs = [
    path.resolve('supabase', 'migrations'),
    path.resolve('supabase', 'schema'),
    path.resolve('supabase', 'tests'),
]

if (pgQuery.loadModule) await pgQuery.loadModule()
const parse = pgQuery.parse ?? pgQuery.default?.parse

const failures = []
let checked = 0

for (const dir of sqlDirs) {
    let entries = []
    try {
        entries = readdirSync(dir)
    } catch {
        continue
    }

    for (const file of entries.filter((name) => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
        const fullPath = path.join(dir, file)
        const label = path.relative(process.cwd(), fullPath)
        checked++

        if (statSync(fullPath).size === 0) {
            failures.push(`${label}: empty SQL file`)
            continue
        }

        const content = readFileSync(fullPath, 'utf8')
        if (content.includes('<<<<<<<') || content.includes('>>>>>>>')) {
            failures.push(`${label}: contains unresolved merge markers`)
            continue
        }
        if (content.charCodeAt(0) === 0xfeff) {
            failures.push(`${label}: starts with a UTF-8 byte-order mark (PostgreSQL rejects it)`)
            continue
        }

        try {
            await parse(content)
        } catch (error) {
            failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}

if (failures.length > 0) {
    console.error('SQL validation failed:')
    for (const failure of failures) {
        console.error(`- ${failure}`)
    }
    process.exit(1)
}

console.log(`SQL validation passed for ${checked} files (migrations, schema snapshot, tests).`)
