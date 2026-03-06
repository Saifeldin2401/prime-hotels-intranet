const fs = require('fs');
const path = require('path');

// Read the hardcoded report
const reportPath = path.join(__dirname, '..', 'hardcoded-report.txt');
const reportContent = fs.readFileSync(reportPath, 'utf8');

// Parse the report to extract hardcoded strings
const lines = reportContent.split('\n');
const files = new Map();

let currentFile = null;
let currentStrings = [];

for (const line of lines) {
    if (line.startsWith('Found in ')) {
        if (currentFile && currentStrings.length > 0) {
            files.set(currentFile, currentStrings);
        }
        currentFile = line.replace('Found in ', '').replace(':', '');
        currentStrings = [];
    } else if (line.startsWith('  "') && currentFile) {
        // Extract the string content
        const match = line.match(/^  "(.+)"$/);
        if (match) {
            const str = match[1];
            // Skip code snippets, variable names, and very short strings
            if (str.length > 2 && 
                !str.includes('(') && 
                !str.includes(')') &&
                !str.includes('{') &&
                !str.includes('}') &&
                !str.includes('=>') &&
                !str.startsWith('set') &&
                !str.startsWith('e.target') &&
                !str.startsWith('className') &&
                !str.startsWith('onClick') &&
                !str.startsWith('onChange') &&
                !str.startsWith('disabled') &&
                !str.startsWith('rows=') &&
                !str.startsWith('required') &&
                !str.startsWith('type=') &&
                !str.includes('.json') &&
                !str.includes('.tsx') &&
                !str.includes('.ts') &&
                !str.match(/^\d+$/) && // skip pure numbers
                !str.match(/^[a-z]+[A-Z]/) && // skip camelCase
                str !== 'true' &&
                str !== 'false' &&
                str !== 'null' &&
                str !== 'undefined') {
                currentStrings.push(str);
            }
        }
    }
}

if (currentFile && currentStrings.length > 0) {
    files.set(currentFile, currentStrings);
}

// Group strings by likely namespace
const grouped = {
    common: new Set(),
    admin: new Set(),
    announcements: new Set(),
    approvals: new Set(),
    auth: new Set(),
    dashboard: new Set(),
    documents: new Set(),
    hr: new Set(),
    jobs: new Set(),
    knowledge: new Set(),
    maintenance: new Set(),
    training: new Set(),
    profile: new Set(),
    settings: new Set(),
    nav: new Set(),
    errors: new Set(),
    other: new Set()
};

// Categorize strings based on file path
for (const [filePath, strings] of files) {
    let namespace = 'other';
    const lowerPath = filePath.toLowerCase();
    
    if (lowerPath.includes('admin')) namespace = 'admin';
    else if (lowerPath.includes('announcement')) namespace = 'announcements';
    else if (lowerPath.includes('approval')) namespace = 'approvals';
    else if (lowerPath.includes('auth') || lowerPath.includes('login')) namespace = 'auth';
    else if (lowerPath.includes('dashboard')) namespace = 'dashboard';
    else if (lowerPath.includes('document')) namespace = 'documents';
    else if (lowerPath.includes('hr/') || lowerPath.includes('hr\\')) namespace = 'hr';
    else if (lowerPath.includes('job')) namespace = 'jobs';
    else if (lowerPath.includes('knowledge')) namespace = 'knowledge';
    else if (lowerPath.includes('maintenance')) namespace = 'maintenance';
    else if (lowerPath.includes('training')) namespace = 'training';
    else if (lowerPath.includes('profile')) namespace = 'profile';
    else if (lowerPath.includes('setting')) namespace = 'settings';
    else if (lowerPath.includes('nav')) namespace = 'nav';
    else if (lowerPath.includes('error')) namespace = 'errors';
    
    for (const str of strings) {
        // Skip if it looks like code
        if (str.length < 50 && !str.includes('(') && !str.includes(')')) {
            grouped[namespace].add(str);
        }
    }
}

// Output summary
console.log('TRANSLATION EXTRACTION SUMMARY');
console.log('=' .repeat(50));
for (const [ns, strings] of Object.entries(grouped)) {
    if (strings.size > 0) {
        console.log(`\n${ns}: ${strings.size} unique strings`);
        // Show first 5 examples
        const examples = Array.from(strings).slice(0, 5);
        examples.forEach(s => console.log(`  - "${s}"`));
    }
}

// Save to file for review
const output = {};
for (const [ns, strings] of Object.entries(grouped)) {
    if (strings.size > 0) {
        output[ns] = Array.from(strings).sort();
    }
}

fs.writeFileSync(
    path.join(__dirname, '..', 'tmp', 'extracted-translations.json'),
    JSON.stringify(output, null, 2),
    'utf8'
);

console.log('\n\nFull extraction saved to: tmp/extracted-translations.json');
