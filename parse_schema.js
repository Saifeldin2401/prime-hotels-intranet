import fs from 'fs';

const data = fs.readFileSync('src/types/supabase.ts', 'utf-8');

const lines = data.split('\n');
let inTables = false;
let currentTable = null;
let inRow = false;
let output = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Tables: {')) {
        inTables = true;
        continue;
    }
    if (inTables && line.match(/^\s{12}\w+:\s*{/)) {
        currentTable = line.trim().split(':')[0];
        output += `\nTABLE: ${currentTable}\n`;
        continue;
    }
    if (currentTable && line.includes('Row: {')) {
        inRow = true;
        continue;
    }
    if (inRow) {
        if (line.match(/^\s{16}}/) || line.match(/^\s{12}}/)) {
            inRow = false;
            currentTable = null;
        } else if (line.trim()) {
            output += `  ${line.trim()}\n`;
        }
    }
    if (inTables && line.match(/^\s{8}}/)) {
        inTables = false;
    }
}

fs.writeFileSync('schema_summary.txt', output);
console.log('Done');
