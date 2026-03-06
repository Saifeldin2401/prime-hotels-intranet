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

function countKeys(obj) {
    return getAllKeys(obj).length;
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json')).sort();

console.log('TRANSLATION AUDIT REPORT');
console.log('='.repeat(70));
console.log(`Generated: ${new Date().toISOString()}`);
console.log('='.repeat(70));

let totalEnKeys = 0;
let totalArKeys = 0;
let totalMissing = 0;

for (const file of enFiles) {
    const enPath = path.join(enDir, file);
    const arPath = path.join(arDir, file);
    
    let enContent, arContent = {};
    try {
        const enData = fs.readFileSync(enPath, 'utf8').replace(/^\uFEFF/, '');
        enContent = JSON.parse(enData);
    } catch (e) {
        console.log(`\n⚠️  Error reading ${file}: ${e.message}`);
        continue;
    }
    
    if (fs.existsSync(arPath)) {
        try {
            const arData = fs.readFileSync(arPath, 'utf8').replace(/^\uFEFF/, '');
            arContent = JSON.parse(arData);
        } catch (e) {
            console.log(`\n⚠️  Error reading Arabic ${file}: ${e.message}`);
        }
    }
    
    const enKeys = getAllKeys(enContent);
    const arKeys = getAllKeys(arContent);
    const enCount = enKeys.length;
    const arCount = arKeys.length;
    
    totalEnKeys += enCount;
    totalArKeys += arCount;
    
    const arKeySet = new Set(arKeys);
    const missingInAr = enKeys.filter(k => !arKeySet.has(k));
    totalMissing += missingInAr.length;
    
    const status = missingInAr.length === 0 && enCount === arCount ? '✅' : '⚠️';
    const coverage = enCount > 0 ? Math.round((arCount / enCount) * 100) : 100;
    
    console.log(`\n${status} ${file}`);
    console.log(`   English: ${enCount.toLocaleString()} keys`);
    console.log(`   Arabic:  ${arCount.toLocaleString()} keys`);
    console.log(`   Coverage: ${coverage}%`);
    
    if (missingInAr.length > 0) {
        console.log(`   Missing: ${missingInAr.length} keys`);
        missingInAr.slice(0, 3).forEach(k => console.log(`      - ${k}`));
        if (missingInAr.length > 3) {
            console.log(`      ... and ${missingInAr.length - 3} more`);
        }
    }
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Total English keys: ${totalEnKeys.toLocaleString()}`);
console.log(`Total Arabic keys:  ${totalArKeys.toLocaleString()}`);
console.log(`Missing in Arabic:  ${totalMissing.toLocaleString()}`);
console.log(`Overall Coverage:   ${Math.round((totalArKeys / totalEnKeys) * 100)}%`);
console.log('='.repeat(70));

if (totalMissing === 0) {
    console.log('\n✅ ALL TRANSLATIONS COMPLETE!');
} else {
    console.log('\n⚠️  Some translations are missing. Please review.');
}
