import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let tables = {};
let currentTable = null;

for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    // Naive extraction of CREATE TABLE
    const tableRegex = /CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\);/g;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
        const tableName = match[1];
        const columnsText = match[2];
        const columns = columnsText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--') && !l.startsWith('CONSTRAINT') && !l.startsWith('PRIMARY KEY') && !l.startsWith('UNIQUE') && !l.startsWith('FOREIGN KEY'));
        tables[tableName] = columns;
    }

    // Capture DROP TABLE
    const dropRegex = /DROP TABLE IF EXISTS public\.(\w+)(?: CASCADE)?;/g;
    while ((match = dropRegex.exec(content)) !== null) {
        delete tables[match[1]];
    }

    // Capture ALTER TABLE ADD COLUMN
    const alterRegex = /ALTER TABLE public\.(\w+)\s+ADD COLUMN IF NOT EXISTS (.*);/g;
    while ((match = alterRegex.exec(content)) !== null) {
        if (tables[match[1]]) {
            tables[match[1]].push(match[2].trim());
        }
    }
}

let output = '';
for (const [tableName, columns] of Object.entries(tables)) {
    output += `TABLE: ${tableName}\n`;
    for (const col of columns) {
        output += `  ${col}\n`;
    }
    output += '\n';
}

fs.writeFileSync('db_schema.txt', output);
console.log(`Extracted ${Object.keys(tables).length} tables`);
