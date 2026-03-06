const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

function getKeyValuePairs(obj, prefix = '') {
    let pairs = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            pairs = pairs.concat(getKeyValuePairs(obj[k], `${prefix}${k}.`));
        } else {
            pairs.push({ key: `${prefix}${k}`, value: obj[k] });
        }
    }
    return pairs;
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

let englishCount = 0;

for (const file of enFiles) {
    let arText = fs.readFileSync(path.join(arDir, file), 'utf8');
    arText = arText.replace(/^\uFEFF/, '');
    const arContent = JSON.parse(arText);

    const arPairs = getKeyValuePairs(arContent);

    const untranslated = arPairs.filter(p => typeof p.value === 'string' && /[a-zA-Z]{3,}/.test(p.value) && !p.value.includes('{{') && p.key !== 'title' && p.key !== 'system_operational' && !p.value.includes('PRIME'));

    if (untranslated.length > 0) {
        console.log(`\nFile: ${file} (Contains ${untranslated.length} potentially untranslated English strings in Arabic)`);
        untranslated.slice(0, 5).forEach(m => console.log(`  - ${m.key}: "${m.value}"`));
        englishCount += untranslated.length;
    }
}

console.log(`\nTotal untranslated: ${englishCount}`);
