const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getAllKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json')).sort();

let totalMissing = 0;
const missingReport = {};

for (const file of enFiles) {
    const enPath = path.join(enDir, file);
    const arPath = path.join(arDir, file);
    
    let enContent, arContent = {};
    try {
        const enData = fs.readFileSync(enPath, 'utf8').replace(/^\uFEFF/, '');
        enContent = JSON.parse(enData);
    } catch (e) {
        console.log(`Error reading ${file}: ${e.message}`);
        continue;
    }
    
    if (fs.existsSync(arPath)) {
        try {
            const arData = fs.readFileSync(arPath, 'utf8').replace(/^\uFEFF/, '');
            arContent = JSON.parse(arData);
        } catch (e) {
            console.log(`Error reading Arabic ${file}: ${e.message}`);
        }
    }
    
    const enKeys = getAllKeys(enContent);
    const arKeys = getAllKeys(arContent);
    
    const arKeySet = new Set(arKeys);
    const missingInAr = enKeys.filter(k => !arKeySet.has(k));
    
    if (missingInAr.length > 0) {
        missingReport[file] = missingInAr;
        totalMissing += missingInAr.length;
        console.log(`\n${file}: ${missingInAr.length} missing keys in Arabic`);
        missingInAr.forEach(k => console.log(`  - ${k}`));
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL MISSING KEYS: ${totalMissing}`);
console.log(`${'='.repeat(60)}`);

// Save report
fs.writeFileSync(
    path.join(__dirname, '..', 'tmp', 'missing-keys-report.json'),
    JSON.stringify(missingReport, null, 2),
    'utf8'
);
console.log('\nReport saved to: tmp/missing-keys-report.json');
